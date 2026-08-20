import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCiRecovery } from '../src/ci-recovery-policy.js';

test('transient CI failure retries within bounded budget', () => {
  const d = decideCiRecovery({ message:'Server disconnected without sending a response', attempt:1, maxAttempts:2 });
  assert.equal(d.classification, 'transient');
  assert.equal(d.action, 'retry-job');
});

test('deterministic test failure goes to code fix instead of blind retry', () => {
  const d = decideCiRecovery({ message:'AssertionError: expected values to be strictly equal', attempt:1 });
  assert.equal(d.classification, 'deterministic');
  assert.equal(d.action, 'fix-code');
});

test('unknown CI failure gets one bounded retry then human review', () => {
  assert.equal(decideCiRecovery({ message:'mystery', attempt:1, maxAttempts:2 }).action, 'retry-failed-run');
  assert.equal(decideCiRecovery({ message:'mystery', attempt:2, maxAttempts:2 }).action, 'human-review');
});
