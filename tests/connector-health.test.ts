import test from 'node:test';
import assert from 'node:assert/strict';
import { planConnectorRecovery, summarizeConnectorFleet } from '../src/connector-health.js';

test('connector recovery avoids human escalation for retryable faults', () => {
  assert.equal(planConnectorRecovery({ id:'gmail', state:'degraded', error:'temporary network failure' }).action, 'retry');
  assert.equal(planConnectorRecovery({ id:'calendar', state:'degraded', error:'session expired' }).action, 'refresh-session');
});

test('connector recovery escalates only genuine interactive auth', () => {
  assert.equal(planConnectorRecovery({ id:'gmail', state:'blocked', error:'2FA required', interactiveAuthRequired:true }).action, 'human-auth');
});

test('fleet summary separates auto-recoverable from human-required connectors', () => {
  const s = summarizeConnectorFleet([
    { id:'gmail', state:'healthy' },
    { id:'calendar', state:'degraded', error:'temporary network failure' },
    { id:'outlook', state:'blocked', error:'login required', interactiveAuthRequired:true },
  ]);
  assert.deepEqual(s.autoRecoverable, ['calendar']);
  assert.deepEqual(s.humanRequired, ['outlook']);
});
