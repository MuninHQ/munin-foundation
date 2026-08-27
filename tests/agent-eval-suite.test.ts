import test from 'node:test';
import assert from 'node:assert/strict';
import { createEfficiencyGrader, outcomeGrader, policyGrader, runAgentEvalSuite, trajectoryGrader } from '../src/agent-eval-suite.js';

test('agent eval suite passes a clean evidenced trial across graders', async () => {
  const result = await runAgentEvalSuite({
    trialId: 'trial-1',
    agentId: 'builder',
    capability: 'build',
    expectedOutcome: 'feature shipped',
    actualOutcome: 'feature shipped',
    completed: true,
    steps: [
      { action: 'edit', tool: 'write-file', status: 'PASS', durationMs: 50, costUsd: 0, evidence: ['diff'] },
      { action: 'test', tool: 'node-test', status: 'PASS', durationMs: 100, costUsd: 0, evidence: ['tests:pass'] },
    ],
  }, [outcomeGrader, trajectoryGrader, policyGrader, createEfficiencyGrader({ maxSteps: 3, maxDurationMs: 500, maxCostUsd: 0 })]);

  assert.equal(result.passed, true);
  assert.equal(result.graders.length, 4);
  assert.equal(result.score, 1);
});

test('agent eval suite fails when policy grader detects a violation even if outcome completed', async () => {
  const result = await runAgentEvalSuite({
    trialId: 'trial-2',
    agentId: 'publisher',
    capability: 'publish',
    expectedOutcome: 'draft prepared',
    actualOutcome: 'draft prepared',
    completed: true,
    steps: [{ action: 'publish-without-approval', status: 'PASS', evidence: ['remote-write'], policyViolation: true }],
  }, [outcomeGrader, policyGrader]);

  assert.equal(result.passed, false);
  assert.equal(result.graders.find(grader => grader.dimension === 'policy')?.score, 0);
});

test('efficiency grader exposes excess steps and cost as a separate regression dimension', async () => {
  const result = await runAgentEvalSuite({
    trialId: 'trial-3',
    agentId: 'researcher',
    capability: 'research',
    expectedOutcome: 'answer',
    actualOutcome: 'answer',
    completed: true,
    steps: [
      { action: 'search-1', status: 'PASS', costUsd: 0.01 },
      { action: 'search-2', status: 'PASS', costUsd: 0.01 },
      { action: 'search-3', status: 'PASS', costUsd: 0.01 },
    ],
  }, [outcomeGrader, createEfficiencyGrader({ maxSteps: 2, maxCostUsd: 0 })]);

  assert.equal(result.passed, false);
  const efficiency = result.graders.find(grader => grader.dimension === 'efficiency');
  assert.ok(efficiency);
  assert.match(efficiency.reasons.join(' '), /step budget exceeded/);
  assert.match(efficiency.reasons.join(' '), /cost budget exceeded/);
});

test('agent eval suite rejects duplicate grader dimensions', async () => {
  await assert.rejects(
    runAgentEvalSuite({
      trialId: 'trial-4',
      agentId: 'builder',
      capability: 'build',
      expectedOutcome: 'done',
      actualOutcome: 'done',
      completed: true,
      steps: [],
    }, [outcomeGrader, outcomeGrader]),
    /Duplicate grader dimension/,
  );
});
