import { runtimePath } from './config.js';
import { assessCapability, type CapabilityAssessment } from './capability-radar.js';
import { discoverGitHubCapabilities, type DiscoveredCapability } from './capability-radar-github.js';
import { collectDuplicationEvidence } from './capability-duplication.js';
import { benchmarkCapabilityCandidate, type CapabilityBenchmarkResult } from './capability-promotion-benchmark.js';
import { JsonCapabilityDecisionLog, type PersistedCapabilityDecision } from './json-capability-decision-log.js';
import { ProjectMemoryStore } from './project-memory.js';

export interface CapabilityRadarRunOptions {
  query: string;
  limit?: number;
  revisit?: boolean;
  fetcher?: typeof fetch;
  log?: JsonCapabilityDecisionLog;
  memory?: ProjectMemoryStore;
  root?: string;
  duplicationCollector?: typeof collectDuplicationEvidence;
  benchmark?: typeof benchmarkCapabilityCandidate;
}

export interface CapabilityRadarRunResult {
  query: string;
  discovered: number;
  assessed: number;
  skipped: number;
  adopt: number;
  review: number;
  reject: number;
  promoted: number;
  benchmarkHeld: number;
  decisions: PersistedCapabilityDecision[];
  benchmarks: CapabilityBenchmarkResult[];
  skippedIds: string[];
}

export async function runCapabilityRadar(options: CapabilityRadarRunOptions): Promise<CapabilityRadarRunResult> {
  const discovered: DiscoveredCapability[] = await discoverGitHubCapabilities({ query: options.query, limit: options.limit, fetcher: options.fetcher });
  const log = options.log ?? new JsonCapabilityDecisionLog(runtimePath('capability-radar-decisions.json'));
  const memory = options.memory ?? new ProjectMemoryStore(runtimePath('project-memory.json'));
  const decisions: PersistedCapabilityDecision[] = [];
  const benchmarks: CapabilityBenchmarkResult[] = [];
  const skippedIds: string[] = [];
  const duplicationCollector=options.duplicationCollector??collectDuplicationEvidence;
  const benchmark=options.benchmark??benchmarkCapabilityCandidate;
  let promoted=0;

  for (const item of discovered) {
    if (!options.revisit && !(await log.shouldReassess(item.candidate.id))) {
      skippedIds.push(item.candidate.id);
      continue;
    }
    const duplication=await duplicationCollector(item.candidate,options.root??process.cwd());
    const enriched={...item.candidate,duplicationScore:duplication.score,evidence:[...(item.candidate.evidence??[]),...duplication.matches.map(match=>`Munin duplication match: ${match}`)]};
    const assessment: CapabilityAssessment = assessCapability(enriched);
    decisions.push(await log.record(assessment));
    if(assessment.decision!=='adopt')continue;
    const benchmarkResult=benchmark(enriched);benchmarks.push(benchmarkResult);
    if(benchmarkResult.status!=='promote')continue;
    await memory.capture({
      kind:'research',
      title:`Capability radar · ${enriched.name}`,
      content:[`Decision: ${assessment.decision}.`,`Assessment score: ${assessment.score}.`,`Promotion benchmark: ${benchmarkResult.score}.`,`Source: ${enriched.source}.`,`License: ${enriched.license??'unknown'}.`,...(enriched.evidence??[])].join('\n'),
      project:'munin',source:enriched.source,observedAt:new Date().toISOString(),confidence:'confirmed',tags:['capability-radar','zero-cost','promotion'],relatedIssues:['#242'],
    });
    promoted++;
  }

  return {
    query: options.query,
    discovered: discovered.length,
    assessed: decisions.length,
    skipped: skippedIds.length,
    adopt: decisions.filter(item => item.decision === 'adopt').length,
    review: decisions.filter(item => item.decision === 'review').length,
    reject: decisions.filter(item => item.decision === 'reject').length,
    promoted,
    benchmarkHeld:benchmarks.filter(item=>item.status==='hold').length,
    decisions,benchmarks,skippedIds,
  };
}

export function formatCapabilityRadarReport(result: CapabilityRadarRunResult): string {
  const lines = [
    `Capability Radar: ${result.query}`,
    `Discovered: ${result.discovered} · Assessed: ${result.assessed} · Skipped known: ${result.skipped}`,
    `Adopt: ${result.adopt} · Review: ${result.review} · Reject: ${result.reject}`,
    `Promoted to Munin memory: ${result.promoted} · Benchmark held: ${result.benchmarkHeld}`,
  ];
  for (const decision of result.decisions) lines.push(`- ${decision.id}: ${decision.decision.toUpperCase()} (${decision.score}) — ${decision.reasons.join('; ')}`);
  if (result.skippedIds.length) lines.push(`Known decisions skipped: ${result.skippedIds.join(', ')}`);
  return lines.join('\n');
}
