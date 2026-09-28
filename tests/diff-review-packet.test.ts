import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiffReviewPacket } from '../src/diff-review-packet.js';
import type { EfficiencyBuildState } from '../src/efficiency-build-state.js';

const buildState: EfficiencyBuildState = { taskId: 't1', revision: 1, objective: 'add gate', status: 'verifying', decisions: [], relevantFiles: ['src/gate.ts'], blockers: [], tests: [], nextAction: 'review', historyDigest: 'abc', updatedAt: '2026-09-28T00:00:00.000Z' };

test('review packet contains affected hunks and names unrelated dirty paths without reading them', () => {
  const packet = buildDiffReviewPacket({ objective: 'add gate', constraints: ['zero cost'], buildState, affected: [{ path: 'src/gate.ts', patch: '@@ -1 +1 @@\n-old\n+new' }], unrelatedDirtyPaths: ['src/offer-architect.ts'], tests: [{ command: 'npm test', outcome: 'passed', summary: '200 passed' }] });
  assert.match(packet.text, /src\/gate.ts/);
  assert.match(packet.text, /@@ -1 \+1 @@/);
  assert.match(packet.text, /src\/offer-architect.ts/);
  assert.doesNotMatch(packet.text, /offer architect implementation/);
  assert.ok(packet.includedFiles < 10);
});
