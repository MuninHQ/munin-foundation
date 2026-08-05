import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PersistentLeaseStore } from '../src/persistent-leases.js';
import { LeasedRuntime } from '../src/leased-runtime.js';
import type { ExecutionPlan } from '../src/runtime.js';

class SlowEngine {
  calls = 0;
  constructor(private readonly delayMs: number) {}
  async run(planId: string): Promise<ExecutionPlan> {
    this.calls += 1;
    await new Promise(resolve => setTimeout(resolve, this.delayMs));
    return { id: planId, objective: 'test', status: 'DONE', createdAt: new Date(0).toISOString(), updatedAt: new Date().toISOString(), tasks: [] };
  }
}

test('renews a lease only for the current worker and fencing version', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-fence-'));
  try {
    const store = new PersistentLeaseStore(root);
    const acquired = await store.acquire('task-1', 'worker-a', 100, 1_000);
    assert.equal(acquired.acquired, true);
    const version = acquired.lease!.version;
    const renewed = await store.renew('task-1', 'worker-a', version, 100, 1_050);
    assert.equal(renewed.acquired, true);
    assert.equal(renewed.lease?.expiresAt, new Date(1_150).toISOString());
    assert.equal((await store.renew('task-1', 'worker-b', version, 100, 1_060)).reason, 'stale-fence');
    assert.equal((await store.renew('task-1', 'worker-a', version + 1, 100, 1_060)).reason, 'stale-fence');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects stale workers after lease takeover', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-fence-'));
  try {
    const store = new PersistentLeaseStore(root);
    const first = await store.acquire('task-1', 'worker-a', 100, 1_000);
    const second = await store.acquire('task-1', 'worker-b', 100, 1_101);
    assert.equal(second.acquired, true);
    await assert.rejects(
      store.assertCurrent('task-1', 'worker-a', first.lease!.version, 1_102),
      /Stale fencing token/,
    );
    assert.equal((await store.assertCurrent('task-1', 'worker-b', second.lease!.version, 1_102)).workerId, 'worker-b');
    assert.equal(await store.release('task-1', 'worker-a', first.lease!.version), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('leased runtime keeps long execution alive with heartbeats', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-heartbeat-'));
  try {
    const engine = new SlowEngine(90);
    const runtime = new LeasedRuntime(engine as never, root, 60, 20);
    const result = await runtime.run('plan-1', 'worker-a');
    assert.equal(result.status, 'DONE');
    assert.equal(engine.calls, 1);
    assert.equal(await new PersistentLeaseStore(root).get('plan:plan-1'), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects invalid heartbeat configuration', () => {
  const engine = new SlowEngine(1);
  assert.throws(() => new LeasedRuntime(engine as never, '/tmp/munin', 100, 100), /Heartbeat interval/);
});
