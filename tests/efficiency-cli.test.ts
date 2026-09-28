import test from 'node:test';
import assert from 'node:assert/strict';
import { efficiencyStatus } from '../src/efficiency-cli.js';

test('status labels context metrics and credit proxy separately', async () => {
  const fakeRuntime = { status: async () => ({ contextEfficiency: { avoidedContextChars: 10 }, creditSavingsProxy: { kind: 'estimated-avoidable-context-tokens', estimatedTokens: 3, limitation: 'Estimate only' } }) };
  const status = await efficiencyStatus(fakeRuntime);
  assert.ok(status.contextEfficiency);
  assert.equal(status.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
  assert.match(status.limitations.join(' '), /not realized provider billing savings/i);
});
