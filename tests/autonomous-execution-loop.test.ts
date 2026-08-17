import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousExecutionLoop, type AutonomousPhase } from '../src/autonomous-execution-loop.js';

test('autonomous loop completes PLAN BUILD TEST VERIFY when all phases pass', async () => {
  const phases: AutonomousPhase[] = [];
  const loop = new AutonomousExecutionLoop(async context => {
    phases.push(context.phase);
    return { status: 'PASS', summary: `${context.phase} ok` };
  });

  const result = await loop.run('Build capability');
  assert.equal(result.status, 'DONE');
  assert.equal(result.iterations, 1);
  assert.deepEqual(phases, ['PLAN', 'BUILD', 'TEST', 'VERIFY']);
});

test('autonomous loop executes FIX and retries after a retryable failure', async () => {
  const phases: AutonomousPhase[] = [];
  let testAttempts = 0;
  const loop = new AutonomousExecutionLoop(async context => {
    phases.push(context.phase);
    if (context.phase === 'TEST') {
      testAttempts += 1;
      if (testAttempts === 1) return { status: 'RETRY', fingerprint: 'test:red' };
    }
    return { status: 'PASS' };
  });

  const result = await loop.run('Build and verify');
  assert.equal(result.status, 'DONE');
  assert.equal(result.iterations, 2);
  assert.deepEqual(phases, ['PLAN', 'BUILD', 'TEST', 'FIX', 'PLAN', 'BUILD', 'TEST', 'VERIFY']);
});

test('autonomous loop stops immediately on a real human blocker', async () => {
  const loop = new AutonomousExecutionLoop(async context => {
    if (context.phase === 'BUILD') return { status: 'BLOCKED', blocker: 'Interactive authentication required.' };
    return { status: 'PASS' };
  });

  const result = await loop.run('Deploy guarded change');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.blocker, 'Interactive authentication required.');
  assert.deepEqual(result.trace.map(item => item.phase), ['PLAN', 'BUILD']);
});

test('autonomous loop stops on repeated failure fingerprint', async () => {
  const loop = new AutonomousExecutionLoop(async context => {
    if (context.phase === 'TEST') return { status: 'FAILED', fingerprint: 'ci:same-error' };
    return { status: 'PASS' };
  }, { maxIterations: 5, maxRepeatedFailureFingerprints: 2 });

  const result = await loop.run('Fix CI');
  assert.equal(result.status, 'FAILED');
  assert.match(result.blocker ?? '', /Repeated failure threshold reached/);
  assert.equal(result.iterations, 2);
});

test('autonomous loop enforces a hard iteration ceiling', async () => {
  const loop = new AutonomousExecutionLoop(async context => {
    if (context.phase === 'VERIFY') return { status: 'RETRY' };
    return { status: 'PASS' };
  }, { maxIterations: 2 });

  const result = await loop.run('Converge safely');
  assert.equal(result.status, 'LIMIT_REACHED');
  assert.equal(result.iterations, 2);
  assert.equal(result.trace.filter(item => item.phase === 'FIX').length, 2);
});

test('autonomous loop validates objective and policy bounds', async () => {
  assert.throws(() => new AutonomousExecutionLoop(async () => ({ status: 'PASS' }), { maxIterations: 0 }), /maxIterations/);
  const loop = new AutonomousExecutionLoop(async () => ({ status: 'PASS' }));
  await assert.rejects(loop.run('  '), /Objective is required/);
});
