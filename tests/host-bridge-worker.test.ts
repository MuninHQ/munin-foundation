import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { HostBridgeWorker } from '../src/host-bridge-worker.js';
import { HostBridgeExecutor, type HostExecutionAdapter } from '../src/host-bridge-executor.js';

const adapter: HostExecutionAdapter = {
  runtimeHealth: async () => 'healthy', gitFastForward: async () => 'ok', deployMain: async () => 'ok',
  restartMunin: async () => 'ok', runAcceptance: async () => 'ok', tailscaleHealth: async () => 'ok',
  buildAll: async objective => `built:${objective}`,
};

test('host worker reports a completed observation without changing queue result', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-host-worker-'));
  try {
    const observations: Array<{ jobId: string; durationMs: number; status: string }> = [];
    const worker = new HostBridgeWorker({ queuePath: path.join(dir, 'queue.json'), onCompleted: observation => observations.push(observation) }, new HostBridgeExecutor(adapter));
    await worker.queue.enqueue({ id: 'job-1', type: 'runtime-health', createdAt: new Date().toISOString(), dryRun: false });
    assert.equal(await worker.runOnce(), true);
    const [queued] = await worker.queue.list();
    assert.equal(queued.status, 'completed');
    assert.equal(observations[0].jobId, 'job-1');
    assert.equal(observations[0].status, 'completed');
    assert.ok(observations[0].durationMs >= 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejected async worker observer is consumed without unhandled rejection', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-host-worker-reject-'));
  try {
    const worker = new HostBridgeWorker({ queuePath: path.join(dir, 'queue.json'), onCompleted: async () => { throw new Error('observer failed'); } }, new HostBridgeExecutor(adapter));
    await worker.queue.enqueue({ id: 'job-reject', type: 'runtime-health', createdAt: new Date().toISOString() });
    assert.equal(await worker.runOnce(), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await worker.queue.list())[0].status, 'completed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
