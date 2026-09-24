import test from 'node:test';
import assert from 'node:assert/strict';
import { observeTokenUsage } from '../src/token-governor.js';
import { tokenGovernorStatus } from '../src/token-governor-cli.js';

test('status CLI reports shadow metrics without claiming realized savings', async () => {
  const observation = observeTokenUsage({ runId: 'r1', source: 'terminal', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: 'request', output: 'start\n' + 'routine\n'.repeat(500) + 'FAIL one test\nexit code 1' }, { largeOutputChars: 100, maxSummaryChars: 220 });
  const result = await tokenGovernorStatus({ async list() { return [observation]; } });
  assert.equal(result.mode, 'shadow');
  assert.equal(result.metrics.appliedChanges, 0);
  assert.equal(result.savingsKind, 'estimated-avoidable-context-tokens');
  assert.match(result.promotionRequired, /explicit approval/i);
  assert.ok(result.metrics.estimatedSavedTokens > 0);
});
