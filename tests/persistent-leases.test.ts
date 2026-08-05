import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PersistentLeaseStore } from '../src/persistent-leases.js';

test('persists ownership across store instances', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-leases-'));
  const first = new PersistentLeaseStore(root);
  const second = new PersistentLeaseStore(root);
  assert.equal((await first.acquire('task-1', 'worker-a', 1_000, 10_000)).acquired, true);
  const blocked = await second.acquire('task-1', 'worker-b', 1_000, 10_100);
  assert.equal(blocked.acquired, false);
  assert.equal(blocked.lease?.workerId, 'worker-a');
});

test('supports takeover after expiry with monotonic fencing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-leases-'));
  const store = new PersistentLeaseStore(root);
  const first = await store.acquire('task-1', 'worker-a', 100, 10_000);
  const second = await store.acquire('task-1', 'worker-b', 100, 10_101);
  assert.equal(second.acquired, true);
  assert.equal(second.lease?.version, (first.lease?.version ?? 0) + 1);
});

test('release is owner-only and durable', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-leases-'));
  const store = new PersistentLeaseStore(root);
  await store.acquire('task-1', 'worker-a', 1_000, 10_000);
  assert.equal(await store.release('task-1', 'worker-b'), false);
  assert.equal(await store.release('task-1', 'worker-a'), true);
  assert.equal(await store.get('task-1', 10_100), undefined);
  const document = JSON.parse(await readFile(path.join(root, 'leases.json'), 'utf8')) as { leases: unknown[] };
  assert.equal(document.leases.length, 0);
});

test('reaps expired leases without resetting fencing history', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-leases-'));
  const store = new PersistentLeaseStore(root);
  const first = await store.acquire('task-1', 'worker-a', 100, 10_000);
  assert.deepEqual((await store.reapExpired(10_101)).map(item => item.taskId), ['task-1']);
  const second = await store.acquire('task-1', 'worker-b', 100, 10_200);
  assert.equal(second.lease?.version, (first.lease?.version ?? 0) + 1);
});
