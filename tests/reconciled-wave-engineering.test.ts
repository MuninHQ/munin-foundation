import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ReconciledWaveEngineeringRuntime,
  type BaseAwareEngineeringRuntime,
  type WaveReconcilerPort,
} from '../src/reconciled-wave-engineering.js';
import { planParallelAgentWaves } from '../src/parallel-agent-waves.js';
import type { GitWaveSession, WaveCommitDelivery } from '../src/git-wave-reconciler.js';

class FakeReconciler implements WaveReconcilerPort {
  readonly calls: Array<{ base: string; deliveries: WaveCommitDelivery[] }> = [];
  disposed = false;
  private head = 'main-sha';

  async start(_objective: string, baseRef = 'main'): Promise<GitWaveSession> {
    this.head = `${baseRef}-sha`;
    return { branch: 'buildall/integration-test', worktree: '/tmp/fake', baseRef };
  }

  async reconcile(_session: GitWaveSession, deliveries: WaveCommitDelivery[]) {
    const base = this.head;
    this.calls.push({ base, deliveries });
    this.head = `${base}+${deliveries.map(item => item.commit ?? 'no-change').join('+')}`;
    return {
      status: 'completed' as const,
      head: this.head,
      evidence: deliveries.map(item => `${item.taskId}:${item.commit ?? 'no-change'}`),
    };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

test('passes the reconciled head from one wave as the base for the next wave', async () => {
  const bases: Record<string, string> = {};
  const runtime: BaseAwareEngineeringRuntime = {
    async execute(task, baseRef) {
      bases[task.id] = baseRef;
      return {
        status: 'completed',
        summary: `${task.id} done`,
        commit: `commit-${task.id}`,
        changedFiles: task.files,
        evidence: [`evidence-${task.id}`],
      };
    },
  };
  const reconciler = new FakeReconciler();
  const plan = planParallelAgentWaves([
    { id: 'api', objective: 'build api', files: ['src/api.ts'] },
    { id: 'ui', objective: 'build ui', files: ['apps/web/App.tsx'] },
    { id: 'integration', objective: 'wire ui to api', files: ['src/integration.ts'], dependsOn: ['api', 'ui'] },
  ]);

  const result = await new ReconciledWaveEngineeringRuntime(runtime, reconciler).run('deliver feature', plan);

  assert.equal(result.status, 'completed');
  assert.equal(result.completedWaves, 2);
  assert.equal(bases.api, 'main');
  assert.equal(bases.ui, 'main');
  assert.equal(bases.integration, 'main-sha+commit-api+commit-ui');
  assert.equal(reconciler.calls.length, 2);
  assert.equal(reconciler.disposed, true);
});

test('does not reconcile a wave when any worker fails', async () => {
  const reconciler = new FakeReconciler();
  const runtime: BaseAwareEngineeringRuntime = {
    async execute(task) {
      if (task.id === 'bad') return { status: 'failed', summary: 'compile failed' };
      return { status: 'completed', summary: 'ok', commit: `commit-${task.id}` };
    },
  };
  const plan = planParallelAgentWaves([
    { id: 'good', objective: 'good', files: ['good.ts'] },
    { id: 'bad', objective: 'bad', files: ['bad.ts'] },
    { id: 'later', objective: 'later', files: ['later.ts'], dependsOn: ['good'] },
  ]);

  const result = await new ReconciledWaveEngineeringRuntime(runtime, reconciler).run('failing feature', plan);

  assert.equal(result.status, 'failed');
  assert.equal(result.completedWaves, 0);
  assert.equal(reconciler.calls.length, 0);
  assert.match(result.blocker ?? '', /compile failed/i);
  assert.equal(result.taskResults.some(item => item.taskId === 'later'), false);
});

test('stops after a reconciliation conflict and never starts dependent work', async () => {
  const seen: string[] = [];
  const runtime: BaseAwareEngineeringRuntime = {
    async execute(task) {
      seen.push(task.id);
      return { status: 'completed', summary: 'done', commit: `commit-${task.id}` };
    },
  };
  const reconciler: WaveReconcilerPort = {
    async start(_objective, baseRef = 'main') {
      return { branch: 'integration/conflict', worktree: '/tmp/conflict', baseRef };
    },
    async reconcile() {
      return { status: 'failed', blocker: 'cherry-pick conflict', evidence: [] };
    },
    async dispose() {},
  };
  const plan = planParallelAgentWaves([
    { id: 'a', objective: 'a', files: ['a.ts'] },
    { id: 'b', objective: 'b', files: ['b.ts'] },
    { id: 'c', objective: 'c', files: ['c.ts'], dependsOn: ['a', 'b'] },
  ]);

  const result = await new ReconciledWaveEngineeringRuntime(runtime, reconciler).run('conflict feature', plan);

  assert.equal(result.status, 'failed');
  assert.deepEqual(seen.sort(), ['a', 'b']);
  assert.match(result.blocker ?? '', /conflict/i);
});
