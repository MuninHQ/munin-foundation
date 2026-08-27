import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousExecutionLoop } from '../src/autonomous-execution-loop.js';
import { outcomeGrader, trajectoryGrader, policyGrader, createEfficiencyGrader } from '../src/agent-eval-suite.js';
import { evaluateAutonomousRun } from '../src/autonomous-eval-pipeline.js';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';
import { buildAgentScorecard } from '../src/agent-scorecards.js';

test('autonomous run flows through independent completion, eval, telemetry, and scorecard', async () => {
  const loop = new AutonomousExecutionLoop(
    async context => ({ status: 'PASS', summary: `${context.phase} ok` }),
    { maxIterations: 2 },
    {
      contract: { criteria: ['tests pass', 'verification complete'], minimumEvidenceItems: 2 },
      evaluator: async () => ({ decision: 'COMPLETE', evidence: ['tests pass', 'verification complete'] }),
    },
  );
  const run = await loop.run('Ship verified capability');
  assert.equal(run.status, 'DONE');

  const sink = new MemoryAgentTelemetrySink();
  const telemetry = new AgentTelemetry(sink);
  const pipeline = await evaluateAutonomousRun(run, 'builder', 'engineering.build', [outcomeGrader, trajectoryGrader, policyGrader, createEfficiencyGrader({ maxSteps: 6, maxCostUsd: 0 })], telemetry);
  await telemetry.flush();

  assert.equal(pipeline.evaluation.passed, true);
  assert.equal(pipeline.sample.completed, true);
  assert.ok(pipeline.sample.evidenceCount >= 2);
  assert.equal(sink.events.at(-1)?.name, 'agent.completed');
  const scorecard = buildAgentScorecard('builder', [pipeline.sample]);
  assert.equal(scorecard.samples, 1);
  assert.ok(scorecard.score >= 0.9);
});

test('failed completion never becomes a successful scorecard sample', async () => {
  const loop = new AutonomousExecutionLoop(
    async () => ({ status: 'PASS' }),
    { maxIterations: 1 },
    { contract: { criteria: ['proof'], minimumEvidenceItems: 1 }, evaluator: async () => ({ decision: 'CONTINUE', evidence: [] }) },
  );
  const run = await loop.run('Do not self-certify');
  assert.equal(run.status, 'LIMIT_REACHED');
  const pipeline = await evaluateAutonomousRun(run, 'builder', 'engineering.build', [outcomeGrader, trajectoryGrader, policyGrader]);
  assert.equal(pipeline.evaluation.passed, false);
  assert.equal(pipeline.sample.completed, false);
});
