import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareManualWebHandoff } from '../src/manual-web-handoff.js';
import type { EfficiencyBuildState } from '../src/efficiency-build-state.js';

const buildState: EfficiencyBuildState = { taskId: 't1', revision: 1, objective: 'review', status: 'running', decisions: [], relevantFiles: ['src/a.ts'], blockers: [], tests: [], nextAction: 'review', historyDigest: 'abc', updatedAt: '2026-09-28T00:00:00.000Z' };
test('manual packet is bounded redacted and copy-only when launcher is unavailable', () => {
  const secret = `ghp_${'q'.repeat(24)}`;
  const packet = prepareManualWebHandoff({ objective: 'review change', constraints: ['zero cost'], buildState, selectedContext: [{ path: 'src/a.ts', excerpt: `safe ${secret}` }], responseContract: 'Return findings only.', launcher: { status: 'unavailable' }, maxChars: 4000 });
  assert.equal(packet.mode, 'copy-only');
  assert.equal(packet.launcher.status, 'unavailable');
  assert.doesNotMatch(packet.text, new RegExp(secret));
  assert.match(packet.text, /MANUAL ONLY/);
  assert.ok(packet.text.length <= 4000);
  assert.equal('send' in packet, false);
  assert.equal('ingestResponse' in packet, false);
});
