import test from 'node:test';
import assert from 'node:assert/strict';
import { ReconciledWaveEngineeringRuntime, type BaseAwareEngineeringRuntime, type WaveReconcilerPort } from '../src/reconciled-wave-engineering.js';
import { planParallelAgentWaves } from '../src/parallel-agent-waves.js';

test('fails closed before reconciliation when engineering touches undeclared files', async () => {
  let reconcileCalls = 0;
  const runtime: BaseAwareEngineeringRuntime = {
    async execute() {
      return {
        status: 'completed',
        summary: 'worker claimed success',
        commit: 'commit-worker',
        changedFiles: ['src/owned.ts', 'src/not-owned.ts'],
      };
    },
  };
  const reconciler: WaveReconcilerPort = {
    async start(_objective, baseRef = 'main') {
      return { branch: 'integration/ownership', worktree: '/tmp/ownership', baseRef };
    },
    async reconcile() {
      reconcileCalls += 1;
      return { status: 'completed', head: 'unexpected', evidence: [] };
    },
    async dispose() {},
  };
  const plan = planParallelAgentWaves([
    { id: 'worker', objective: 'change owned file', files: ['src/owned.ts'] },
  ]);

  const result = await new ReconciledWaveEngineeringRuntime(runtime, reconciler).run('ownership gate', plan);

  assert.equal(result.status, 'failed');
  assert.equal(reconcileCalls, 0);
  assert.match(result.blocker ?? '', /undeclared files/i);
  assert.equal(result.completedWaves, 0);
});

test('normalizes Windows-style changed file paths before ownership comparison', async () => {
  let reconcileCalls = 0;
  const runtime: BaseAwareEngineeringRuntime = {
    async execute() {
      return {
        status: 'completed',
        summary: 'done',
        commit: 'commit-worker',
        changedFiles: ['src\\owned.ts'],
      };
    },
  };
  const reconciler: WaveReconcilerPort = {
    async start(_objective, baseRef = 'main') {
      return { branch: 'integration/windows', worktree: '/tmp/windows', baseRef };
    },
    async reconcile() {
      reconcileCalls += 1;
      return { status: 'completed', head: 'integrated-head', evidence: ['ok'] };
    },
    async dispose() {},
  };
  const plan = planParallelAgentWaves([
    { id: 'worker', objective: 'change owned file', files: ['./src/owned.ts'] },
  ]);

  const result = await new ReconciledWaveEngineeringRuntime(runtime, reconciler).run('windows ownership', plan);

  assert.equal(result.status, 'completed');
  assert.equal(reconcileCalls, 1);
  assert.deepEqual(result.taskResults[0].changedFiles, ['src/owned.ts']);
});
