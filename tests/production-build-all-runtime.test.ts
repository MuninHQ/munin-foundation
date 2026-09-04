import assert from 'node:assert/strict';
import test from 'node:test';
import { planParallelAgentWaves } from '../src/parallel-agent-waves.js';
import { ProductionBuildAllRuntime, type ProductionWaveEngineeringLike } from '../src/production-build-all-runtime.js';
import { __productionBuildAllPlannerInternals } from '../src/production-build-all-planner.js';
import type { ProductionBuildAllPlannerLike } from '../src/production-build-all-planner.js';
import type { ProductionBuildAllVerifierLike } from '../src/production-build-all-verifier.js';

const basePlan = {
  objective: 'deliver feature',
  tasks: [
    { id: 'api', objective: 'build api', files: ['src/api.ts'], dependsOn: [] },
    { id: 'ui', objective: 'build ui', files: ['apps/web/App.tsx'], dependsOn: [] },
    { id: 'wire', objective: 'wire together', files: ['src/wire.ts'], dependsOn: ['api', 'ui'] },
  ],
  completionCriteria: ['npm test passes', 'integrated behavior is present'],
};

test('planner normalization preserves safe dependency-aware tasks', () => {
  const normalized = __productionBuildAllPlannerInternals.normalizePlan(basePlan, 'deliver feature');
  const waves = planParallelAgentWaves(normalized.tasks);
  assert.deepEqual(waves.waves, [
    { index: 1, taskIds: ['api', 'ui'] },
    { index: 2, taskIds: ['wire'] },
  ]);
});

test('planner rejects protected paths and forward dependencies', () => {
  assert.throws(
    () => __productionBuildAllPlannerInternals.normalizePlan({
      objective: 'deliver feature',
      tasks: [{ id: 'bad', objective: 'bad', files: ['.env'], dependsOn: [] }],
      completionCriteria: ['done'],
    }, 'deliver feature'),
    /protected/i,
  );

  assert.throws(
    () => __productionBuildAllPlannerInternals.normalizePlan({
      objective: 'deliver feature',
      tasks: [
        { id: 'first', objective: 'first', files: ['first.ts'], dependsOn: ['later'] },
        { id: 'later', objective: 'later', files: ['later.ts'], dependsOn: [] },
      ],
      completionCriteria: ['done'],
    }, 'deliver feature'),
    /must appear earlier/i,
  );
});

test('production runtime completes only after integrated engineering and verifier evidence', async () => {
  const planner: ProductionBuildAllPlannerLike = { async plan() { return basePlan; } };
  const engineering: ProductionWaveEngineeringLike = {
    async run(_objective, plan) {
      assert.equal(plan.waves.length, 2);
      return {
        status: 'completed',
        integrationBranch: 'buildall/integration-x',
        integrationHead: 'integrated-sha',
        completedWaves: 2,
        taskResults: [],
        evidence: ['reconciled'],
      };
    },
  };
  const verifier: ProductionBuildAllVerifierLike = {
    async verify(context) {
      assert.equal(context.integrationHead, 'integrated-sha');
      return { status: 'PASS', summary: 'verified', evidence: ['npm-test:passed'] };
    },
  };

  const result = await new ProductionBuildAllRuntime(planner, engineering, verifier).run('deliver feature');
  assert.equal(result.status, 'DONE');
  assert.equal(result.verification?.status, 'PASS');
});

test('production runtime never verifies after failed engineering', async () => {
  let verified = false;
  const planner: ProductionBuildAllPlannerLike = { async plan() { return basePlan; } };
  const engineering: ProductionWaveEngineeringLike = {
    async run() {
      return {
        status: 'failed',
        completedWaves: 0,
        taskResults: [],
        evidence: [],
        blocker: 'reconciliation conflict',
      };
    },
  };
  const verifier: ProductionBuildAllVerifierLike = {
    async verify() {
      verified = true;
      return { status: 'PASS', summary: 'should not run', evidence: ['x'] };
    },
  };

  const result = await new ProductionBuildAllRuntime(planner, engineering, verifier).run('deliver feature');
  assert.equal(result.status, 'FAILED');
  assert.equal(verified, false);
  assert.match(result.blocker ?? '', /conflict/i);
});

test('production runtime fails closed when verifier provides no evidence', async () => {
  const planner: ProductionBuildAllPlannerLike = { async plan() { return basePlan; } };
  const engineering: ProductionWaveEngineeringLike = {
    async run() {
      return {
        status: 'completed',
        integrationHead: 'integrated-sha',
        completedWaves: 2,
        taskResults: [],
        evidence: ['reconciled'],
      };
    },
  };
  const verifier: ProductionBuildAllVerifierLike = {
    async verify() { return { status: 'PASS', summary: 'claimed pass', evidence: [] }; },
  };

  const result = await new ProductionBuildAllRuntime(planner, engineering, verifier).run('deliver feature');
  assert.equal(result.status, 'FAILED');
  assert.match(result.blocker ?? '', /requires durable evidence/i);
});
