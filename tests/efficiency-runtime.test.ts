import test from 'node:test';
import assert from 'node:assert/strict';
import { EfficiencyRuntime } from '../src/efficiency-runtime.js';

test('prepare combines bounded context capabilities route and checkpoint without invoking a provider', async () => {
  let providerCalls = 0;
  const runtime = new EfficiencyRuntime({
    contextSelector: { select: async () => ({ selection: { selected: [{ path: 'src/auth.ts', content: 'auth', evidence: ['git:changed'] }], rejected: [], usedChars: 4, remainingChars: 4996, avoidedChars: 0, estimatedSelectedTokens: 1, estimatedAvoidedTokens: 0 }, discovery: [], broadReadRefused: true, degraded: false, diagnostics: [] }) },
    descriptors: [{ id: 'repo', provides: ['repo.search', 'diff.read'], activationCost: 0, locality: 'local', available: true, core: true }],
    telemetryStore: { append: async () => undefined, list: async () => [] },
    buildStateStore: { load: async () => undefined },
    providerExecute: async () => { providerCalls += 1; },
  });
  const result = await runtime.prepare({ runId: 'r1', objective: 'review changed auth code', root: 'C:/repo', taskKind: 'review', risk: 'high', complexity: 8, impact: 8, budget: { maxChars: 5000, maxEstimatedTokens: 1250, maxFileChars: 3000 }, requiredCapabilities: ['repo.search', 'diff.read'] });
  assert.ok(result.context.selection.selected.length > 0);
  assert.equal(result.route.applied, false);
  assert.equal(providerCalls, 0);
});
