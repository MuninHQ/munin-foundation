import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const MIN_CASES = 10;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const finiteNonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function validateTelemetry(data, type, label) {
  if (data === undefined) return;
  if (!object(data) || !['reported','estimated'].includes(data.provenance)) throw new Error(label + ': ' + type + ' must identify provenance (reported or estimated).');
  if (type === 'tokens' && (!integer(data.input) || !integer(data.output))) throw new Error(label + ': invalid token counts.');
  if (type === 'costUSD' && !finiteNonnegative(data.value)) throw new Error(label + ': invalid cost value.');
}

function validateRun(run, label) {
  if (!object(run) || !nonempty(run.caseId) || !/^[a-f0-9]{64}$/i.test(run.inputDigest ?? '') ||
      !nonempty(run.environmentId) || typeof run.claimedCompleted !== 'boolean' ||
      typeof run.verifiedSuccess !== 'boolean' || !integer(run.humanInterventions) ||
      !Number.isSafeInteger(run.durationMs) || run.durationMs <= 0 ||
      !integer(run.securityViolations) ||
      !Array.isArray(run.evidenceRefs) || run.evidenceRefs.length === 0 ||
      run.evidenceRefs.some(value => !nonempty(value))) {
    throw new Error(label + ': invalid run; require id, input digest, environment, verification, interventions, security, timing and evidence references.');
  }
  if (run.verifiedSuccess && !run.claimedCompleted) throw new Error(label + ': verifiedSuccess cannot be true when completion was not claimed.');
  validateTelemetry(run.tokens, 'tokens', label);
  validateTelemetry(run.costUSD, 'costUSD', label);
  return run;
}
function indexedRuns(runs, label) {
  if (!Array.isArray(runs) || !runs.length) throw new Error(label + ': expected non-empty runs array.');
  const output = new Map();
  for (const row of runs) {
    validateRun(row, label);
    if (output.has(row.caseId)) throw new Error(label + ': duplicate caseId ' + row.caseId);
    output.set(row.caseId, row);
  }
  return output;
}
function median(numbers) {
  const sorted = [...numbers].sort((a,b) => a-b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle-1] + sorted[middle])/2;
}
function aggregate(index) {
  const rows = [...index.values()], n = rows.length;
  const verifiedSuccesses = rows.filter(row => row.verifiedSuccess).length;
  const falseCompletions = rows.filter(row => row.claimedCompleted && !row.verifiedSuccess).length;
  const humanInterventions = rows.reduce((total,row) => total + row.humanInterventions,0);
  const securityViolations = rows.reduce((total,row) => total + row.securityViolations,0);
  const telemetry = {};
  for (const field of ['tokens','costUSD']) {
    const reported = rows.filter(row => row[field]?.provenance === 'reported');
    const estimated = rows.filter(row => row[field]?.provenance === 'estimated');
    const sum = field === 'tokens' ? row => row.tokens.input + row.tokens.output : row => row.costUSD.value;
    telemetry[field] = {
      reported: reported.length, estimated: estimated.length,
      unavailable: n-reported.length-estimated.length,
      reportedTotal: reported.length === n ? Number(reported.reduce((total,row) => total+sum(row),0).toFixed(field === 'tokens' ? 0 : 6)) : null
    };
  }
  return {cases:n, verifiedSuccesses, verifiedSuccessRate:Number((verifiedSuccesses/n).toFixed(4)),
    falseCompletions, humanInterventions, securityViolations,
    medianDurationMs:median(rows.map(row => row.durationMs)), telemetry};
}

/**
 * Read-only paired comparison of external receipts.
 * Does not replay tasks, independently validate references, or promote candidate code.
 */
export function compareMuninReplays(dossier) {
  if (!object(dossier) || dossier.schemaVersion !== 1 || !nonempty(dossier.suite) ||
      !object(dossier.baseline) || !object(dossier.candidate) ||
      !nonempty(dossier.baseline.name) || !nonempty(dossier.candidate.name)) {
    throw new Error('Expected schemaVersion=1, suite and named baseline/candidate groups.');
  }
  const baseline = indexedRuns(dossier.baseline.runs,'baseline');
  const candidate = indexedRuns(dossier.candidate.runs,'candidate');
  if (baseline.size !== candidate.size) throw new Error('Case counts differ; cannot compare unpaired runs.');
  const paired = [];
  for (const [caseId, oldRun] of baseline) {
    const newRun = candidate.get(caseId);
    if (!newRun) throw new Error('Candidate missing caseId ' + caseId);
    if (oldRun.inputDigest !== newRun.inputDigest || oldRun.environmentId !== newRun.environmentId) {
      throw new Error('Replay inputs or environment differ for ' + caseId);
    }
    paired.push({
      caseId, beforeVerified:oldRun.verifiedSuccess, afterVerified:newRun.verifiedSuccess,
      beforeFalseCompletion:oldRun.claimedCompleted&&!oldRun.verifiedSuccess,
      afterFalseCompletion:newRun.claimedCompleted&&!newRun.verifiedSuccess,
      durationDeltaMs:newRun.durationMs-oldRun.durationMs,
      humanInterventionDelta:newRun.humanInterventions-oldRun.humanInterventions,
      securityViolationDelta:newRun.securityViolations-oldRun.securityViolations
    });
  }
  paired.sort((a,b) => a.caseId.localeCompare(b.caseId));
  const before=aggregate(baseline),after=aggregate(candidate);
  const reasons=[];
  if (paired.some(row => row.beforeVerified && !row.afterVerified)) reasons.push('One or more individual scenarios lost verified success.');
  if (paired.some(row => !row.beforeFalseCompletion && row.afterFalseCompletion)) reasons.push('One or more individual scenarios developed a false completion.');
  if (after.securityViolations>before.securityViolations || after.securityViolations>0) reasons.push('Candidate records security violations.');
  if (after.verifiedSuccesses<before.verifiedSuccesses) reasons.push('Verified success rate declined.');
  if (after.falseCompletions>before.falseCompletions) reasons.push('False completions increased.');
  if (after.humanInterventions>before.humanInterventions) reasons.push('Human interventions increased.');
  if (after.medianDurationMs>before.medianDurationMs*1.10) reasons.push('Median duration worsened by more than 10%.');
  if (before.telemetry.costUSD.reportedTotal!==null && after.telemetry.costUSD.reportedTotal!==null &&
      after.telemetry.costUSD.reportedTotal>before.telemetry.costUSD.reportedTotal) reasons.push('Reported cost increased.');
  const improvement=after.verifiedSuccesses>before.verifiedSuccesses ||
    after.falseCompletions<before.falseCompletions ||
    after.humanInterventions<before.humanInterventions ||
    after.medianDurationMs<=before.medianDurationMs*0.90;
  let verdict;
  if (reasons.length) verdict='regression';
  else if (baseline.size<MIN_CASES) {
    verdict='insufficient-evidence';
    reasons.push('Need at least '+MIN_CASES+' paired scenarios before recommending a change.');
  } else if (improvement) {
    verdict='candidate-improves';
    reasons.push('Aggregate improvement detected; independent review is required before adoption.');
  } else {
    verdict='no-material-gain';
    reasons.push('No material gain against defined thresholds.');
  }
  return {
    schemaVersion:1,suite:dossier.suite,
    baseline:{name:dossier.baseline.name,...before},
    candidate:{name:dossier.candidate.name,...after},
    comparison:{
      verifiedSuccessDelta:after.verifiedSuccesses-before.verifiedSuccesses,
      falseCompletionDelta:after.falseCompletions-before.falseCompletions,
      humanInterventionDelta:after.humanInterventions-before.humanInterventions,
      securityViolationDelta:after.securityViolations-before.securityViolations,
      medianDurationChangeFraction:Number(((after.medianDurationMs-before.medianDurationMs)/before.medianDurationMs).toFixed(4)),
      paired
    },
    verdict,reasons,automaticPromotionAllowed:false,
    note:'External evidence references are not verified by this tool. No task execution, automatic promotion, or proof of production performance. Values are only as reliable as provided receipts.'
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const filename=process.argv[2];
  if (!filename) {console.error('Usage: node scripts/munin-eval-compare.mjs <paired-replays.json>');process.exitCode=2;}
  else try {
    const report=compareMuninReplays(JSON.parse(await readFile(filename,'utf8')));
    console.log(JSON.stringify(report,null,2));
    if (report.verdict==='regression') process.exitCode=3;
    if (report.verdict==='insufficient-evidence') process.exitCode=2;
  } catch(error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode=1;
  }
}
