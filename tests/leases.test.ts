import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskLeaseManager } from '../src/leases.js';

test('prevents a second worker from acquiring an active lease', () => {
  const leases = new TaskLeaseManager();
  const first = leases.acquire('task-1', 'worker-a', 1_000, 10_000);
  const second = leases.acquire('task-1', 'worker-b', 1_000, 10_100);
  assert.equal(first.acquired, true);
  assert.equal(second.acquired, false);
  assert.equal(second.reason, 'active-lease');
  assert.equal(second.lease?.workerId, 'worker-a');
});

test('allows takeover after lease expiry with a higher fencing version', () => {
  const leases = new TaskLeaseManager();
  const first = leases.acquire('task-1', 'worker-a', 100, 10_000);
  const second = leases.acquire('task-1', 'worker-b', 100, 10_101);
  assert.equal(second.acquired, true);
  assert.equal(second.lease?.workerId, 'worker-b');
  assert.equal(second.lease?.version, (first.lease?.version ?? 0) + 1);
});

test('only the owner can renew or release a lease', () => {
  const leases = new TaskLeaseManager();
  leases.acquire('task-1', 'worker-a', 1_000, 10_000);
  assert.equal(leases.renew('task-1', 'worker-b', 1_000, 10_100).acquired, false);
  assert.equal(leases.release('task-1', 'worker-b'), false);
  assert.equal(leases.renew('task-1', 'worker-a', 1_000, 10_100).acquired, true);
  assert.equal(leases.release('task-1', 'worker-a'), true);
  assert.equal(leases.get('task-1', 10_101), undefined);
});

test('reaps expired leases deterministically', () => {
  const leases = new TaskLeaseManager();
  leases.acquire('task-1', 'worker-a', 100, 10_000);
  leases.acquire('task-2', 'worker-b', 1_000, 10_000);
  const expired = leases.reapExpired(10_101);
  assert.deepEqual(expired.map(item => item.taskId), ['task-1']);
  assert.equal(leases.get('task-2', 10_101)?.workerId, 'worker-b');
});
