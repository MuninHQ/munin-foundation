import test from 'node:test';
import assert from 'node:assert/strict';
import { compactWorkflowContext } from '../src/token-efficiency-compaction.js';

test('compaction preserves priority fields while redacting and bounding text', () => {
  const compact = compactWorkflowContext({
    objective: 'ship', status: 'blocked',
    decisions: [{ summary: 'Use local provider', evidence: ['ADR-3'] }],
    errors: ['Authorization: Bearer synthetic-super-secret-value'],
    artifacts: [{ id: 'spec', path: 'docs/spec.md' }],
    blockers: ['human approval'], nextSteps: ['review'], verification: ['tests pending'],
    commentary: ['x'.repeat(20_000)],
  }, { maxTextChars: 500, maxItemsPerSection: 10 });
  const serialized = JSON.stringify(compact);
  assert.match(serialized, /Use local provider/);
  assert.match(serialized, /docs\/spec.md/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /synthetic-super-secret-value/);
  assert.ok(compact.metrics.compactedBytes < compact.metrics.originalBytes);
  assert.ok(compact.coverage.omissions.includes('commentary truncated'));
});

test('compaction deduplicates normalized entries and keeps verification failures', () => {
  const compact = compactWorkflowContext({
    objective: 'verify', status: 'failed', decisions: [], errors: ['Build failed', ' build failed '],
    artifacts: [], blockers: [], nextSteps: [], verification: ['npm test: failed'], commentary: [],
  });
  assert.deepEqual(compact.errors, ['Build failed']);
  assert.deepEqual(compact.verification, ['npm test: failed']);
});
