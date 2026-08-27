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

test('completion contract requires an independent evaluator and fails closed when absent', async () => {
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    {},
    { contract: { criteria: ['Tests pass and required behavior is evidenced.'] } },
  );

  const result = await loop.run('Ship guarded capability');
  assert.equal(result.status, 'FAILED');
  assert.match(result.blocker ?? '', /independent evaluator/i);
});

test('completion contract rejects COMPLETE without required evidence and continues', async () => {
  let evaluations = 0;
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    { maxIterations: 2 },
    {
      contract: {
        criteria: ['Behavior is verified externally.'],
        minimumEvidenceItems: 2,
      },
      evaluator: async () => {
        evaluations += 1;
        return { decision: 'COMPLETE', evidence: ['only-one-proof'] };
      },
    },
  );

  const result = await loop.run('Prove completion');
  assert.equal(result.status, 'LIMIT_REACHED');
  assert.equal(evaluations, 2);
  assert.equal(result.completionEvaluations?.length, 2);
  assert.deepEqual(result.completionEvaluations?.map(item => item.decision), ['CONTINUE', 'CONTINUE']);
  assert.match(result.completionEvaluations?.[0]?.summary ?? '', /Completion rejected/);
});

test('completion contract only completes when independent evaluator supplies enough evidence', async () => {
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    {},
    {
      contract: {
        criteria: ['Outcome verified.', 'No unresolved blocker remains.'],
        minimumEvidenceItems: 2,
      },
      evaluator: async context => ({
        decision: 'COMPLETE',
        summary: `Verified ${context.contract.criteria.length} completion criteria.`,
        evidence: ['test-suite:pass', 'spec-convergence:pass'],
      }),
    },
  );

  const result = await loop.run('Complete with proof');
  assert.equal(result.status, 'DONE');
  assert.equal(result.iterations, 1);
  assert.equal(result.completionEvaluations?.[0]?.decision, 'COMPLETE');
  assert.deepEqual(result.completionEvaluations?.[0]?.evidence, ['test-suite:pass', 'spec-convergence:pass']);
});

test('completion evaluator exception fails closed rather than declaring DONE', async () => {
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    { maxIterations: 1 },
    {
      contract: { criteria: ['External evaluator confirms completion.'] },
      evaluator: async () => {
        throw new Error('grader offline');
      },
    },
  );

  const result = await loop.run('Do not self-certify');
  assert.equal(result.status, 'LIMIT_REACHED');
  assert.equal(result.completionEvaluations?.[0]?.decision, 'CONTINUE');
  assert.match(result.completionEvaluations?.[0]?.summary ?? '', /failed closed/i);
});

test('completion evaluator can escalate a run into a human blocker', async () => {
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    {},
    {
      contract: { criteria: ['No approval-sensitive action remains.'] },
      evaluator: async () => ({
        decision: 'ESCALATE',
        blocker: 'Publisher approval is required.',
        evidence: ['publish-step:approval-gated'],
      }),
    },
  );

  const result = await loop.run('Prepare publication');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.blocker, 'Publisher approval is required.');
});
