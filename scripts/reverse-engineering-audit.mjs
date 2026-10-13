import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ACCESS_BASES = new Set(['open-source-code', 'authorized-binary', 'public-behavior']);
const OVERLAPS = new Set(['existing', 'partial', 'missing', 'unknown']);

function validHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname); }
  catch { return false; }
}

/**
 * Read-only intake for REA/source-inspection findings. Never runs an analyzed target,
 * installs dependencies, or grants permission to adopt a competing implementation.
 */
export function auditReverseEngineeringDossier(dossier) {
  if (!dossier || typeof dossier !== 'object' || Array.isArray(dossier)) throw new Error('Dossier must be an object.');
  const target = dossier.target;
  if (!target || typeof target.name !== 'string' || !target.name.trim() || !validHttpUrl(target.sourceUrl)) {
    throw new Error('Target requires a name and an HTTP(S) source URL.');
  }
  if (!ACCESS_BASES.has(target.accessBasis)) throw new Error('Target accessBasis must describe the authorized inspection boundary.');
  if (!Array.isArray(dossier.patterns)) throw new Error('Dossier patterns must be an array.');

  const accessDocumented = target.accessBasis === 'public-behavior' ||
    (typeof target.authorizationEvidence === 'string' && validHttpUrl(target.authorizationEvidence));
  const licenseDocumented = target.accessBasis !== 'open-source-code' ||
    (typeof target.license === 'string' && target.license.trim().length > 0);
  const seen = new Set();
  const patterns = dossier.patterns.map(pattern => {
    if (!pattern || typeof pattern !== 'object' || typeof pattern.id !== 'string' || !pattern.id.trim() || seen.has(pattern.id)) {
      throw new Error('Each pattern requires a unique non-empty id.');
    }
    seen.add(pattern.id);
    if (!OVERLAPS.has(pattern.overlap)) throw new Error(`Invalid Munin overlap for ${pattern.id}.`);
    const gaps = [];
    if (!accessDocumented) gaps.push('Authorized inspection evidence is missing.');
    if (!licenseDocumented) gaps.push('Target source license is missing.');
    if (typeof pattern.feature !== 'string' || !pattern.feature.trim()) gaps.push('Feature name is missing.');
    if (typeof pattern.observation !== 'string' || !pattern.observation.trim() || !validHttpUrl(pattern.evidenceUrl)) {
      gaps.push('Verifiable observation and evidence URL are required.');
    }
    if (typeof pattern.muninModule !== 'string' || !pattern.muninModule.trim()) gaps.push('Munin comparison module is missing.');
    if (!Array.isArray(pattern.replaySteps) || pattern.replaySteps.length === 0 || pattern.replaySteps.some(step => typeof step !== 'string' || !step.trim())) {
      gaps.push('Reproduction steps are missing.');
    }
    const metric = pattern.hypothesis;
    if (!metric || typeof metric.name !== 'string' || !metric.name.trim() ||
        !Number.isFinite(metric.baseline) || !Number.isFinite(metric.target) ||
        !['higher', 'lower'].includes(metric.direction) ||
        (metric.direction === 'higher' ? metric.target <= metric.baseline : metric.target >= metric.baseline)) {
      gaps.push('A numeric before/after benchmark hypothesis is missing.');
    }
    if (typeof pattern.rollbackPlan !== 'string' || !pattern.rollbackPlan.trim()) gaps.push('Rollback plan is missing.');
    const status = pattern.overlap === 'existing' ? 'skip-duplicate' :
      gaps.length ? 'needs-evidence' : 'ready-to-benchmark';
    return { id: pattern.id, feature: pattern.feature ?? '', status, gaps };
  });
  return {
    target: target.name,
    accessBasis: target.accessBasis,
    accessEvidenceSupplied: accessDocumented,
    note: 'Observational research only. Access evidence is user-supplied, not independently verified. No target execution, code copying, installation, promotion, or autonomous action.',
    patterns,
    summary: {
      readyToBenchmark: patterns.filter(item => item.status === 'ready-to-benchmark').length,
      needsEvidence: patterns.filter(item => item.status === 'needs-evidence').length,
      skippedDuplicates: patterns.filter(item => item.status === 'skip-duplicate').length,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/reverse-engineering-audit.mjs <dossier.json>');
    process.exitCode = 2;
  } else {
    try {
      const report = auditReverseEngineeringDossier(JSON.parse(await readFile(file, 'utf8')));
      console.log(JSON.stringify(report, null, 2));
      if (!report.accessEvidenceSupplied) process.exitCode = 2;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    }
  }
}
