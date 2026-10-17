import test from 'node:test';
import assert from 'node:assert/strict';
import { auditReverseEngineeringDossier } from '../scripts/reverse-engineering-audit.mjs';

const valid = () => ({
  target: { name: 'Example OSS', sourceUrl: 'https://github.com/example/tool', accessBasis: 'open-source-code', authorizationEvidence: 'https://github.com/example/tool/blob/main/LICENSE', license: 'MIT' },
  patterns: [{ id: 'workflow-replay', feature: 'Comparison of workflow replays', observation: 'Repository documents deterministic evaluation runs.', evidenceUrl: 'https://github.com/example/tool', muninModule: 'src/orchestration-runtime-core.ts', overlap: 'partial', replaySteps: ['Run baseline without change', 'Run same input with proposed change'], hypothesis: { name: 'median_duration_ms', baseline: 1000, target: 900, direction: 'lower' }, rollbackPlan: 'Revert the feature branch.' }],
});

test('authorized, evidenced feature becomes benchmark-ready, never auto-adopted', () => {
  const result = auditReverseEngineeringDossier(valid());
  assert.equal(result.patterns[0].status, 'ready-to-benchmark');
  assert.equal(result.summary.readyToBenchmark, 1);
  assert.match(result.note, /No target execution/);
});

test('missing rights documentation and benchmark details fail closed', () => {
  const dossier = valid();
  delete dossier.target.authorizationEvidence;
  delete dossier.patterns[0].rollbackPlan;
  delete dossier.patterns[0].hypothesis;
  const result = auditReverseEngineeringDossier(dossier);
  assert.equal(result.accessEvidenceSupplied, false);
  assert.equal(result.patterns[0].status, 'needs-evidence');
  assert.ok(result.patterns[0].gaps.some(gap => /Authorized/.test(gap)));
  assert.ok(result.patterns[0].gaps.some(gap => /numeric/.test(gap)));
});

test('existing Munin behavior avoids duplicate development', () => {
  const dossier = valid();
  dossier.patterns[0].overlap = 'existing';
  assert.equal(auditReverseEngineeringDossier(dossier).patterns[0].status, 'skip-duplicate');
});

test('public UI observation does not imply permission to inspect private binaries', () => {
  const dossier = valid();
  dossier.target = { name: 'Visible interface', sourceUrl: 'https://example.com', accessBasis: 'public-behavior' };
  const result = auditReverseEngineeringDossier(dossier);
  assert.equal(result.accessEvidenceSupplied, true);
  assert.equal(result.accessBasis, 'public-behavior');
});

test('duplicate IDs, invalid access and invalid URLs are rejected', () => {
  const dossier = valid();
  dossier.patterns.push({ ...dossier.patterns[0] });
  assert.throws(() => auditReverseEngineeringDossier(dossier), /unique/);
  dossier.patterns.pop(); dossier.target.accessBasis = 'unknown';
  assert.throws(() => auditReverseEngineeringDossier(dossier), /accessBasis/);
  dossier.target.accessBasis = 'open-source-code'; dossier.target.sourceUrl = 'file:///secret';
  assert.throws(() => auditReverseEngineeringDossier(dossier), /source URL/);
});
