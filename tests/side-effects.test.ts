import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PersistentLeaseStore } from '../src/persistent-leases.js';
import { FencedSideEffectExecutor, type SideEffectAdapter } from '../src/side-effects.js';

class RecordingAdapter implements SideEffectAdapter<{ value: number }, { accepted: number }> {
  id = 'recording';
  calls = 0;
  async apply(request: { payload: { value: number } }): Promise<{ accepted: number }> {
    this.calls += 1;
    return { accepted: request.payload.value };
  }
}

test('applies a side effect only with the current fencing token', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-effect-'));
  try {
    const leases = new PersistentLeaseStore(root);
    const lease = await leases.acquire('plan:1', 'worker-a', 10_000);
    const adapter = new RecordingAdapter();
    const result = await new FencedSideEffectExecutor(root).execute(adapter, {
      operation: 'publish', resourceId: 'artifact-1', payload: { value: 7 },
      leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.lease!.version,
    });
    assert.equal(result.applied, true);
    assert.equal(result.result?.accepted, 7);
    assert.equal(adapter.calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects a stale worker before invoking the adapter', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-effect-'));
  try {
    const leases = new PersistentLeaseStore(root);
    const first = await leases.acquire('plan:1', 'worker-a', 1, 1_000);
    await leases.acquire('plan:1', 'worker-b', 10_000, 1_002);
    const adapter = new RecordingAdapter();
    await assert.rejects(
      new FencedSideEffectExecutor(root).execute(adapter, {
        operation: 'publish', resourceId: 'artifact-1', payload: { value: 7 },
        leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: first.lease!.version,
      }),
      /Stale fencing token/,
    );
    assert.equal(adapter.calls, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('deduplicates repeated effects with the same idempotency key', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-effect-'));
  try {
    const leases = new PersistentLeaseStore(root);
    const lease = await leases.acquire('plan:1', 'worker-a', 10_000);
    const adapter = new RecordingAdapter();
    const executor = new FencedSideEffectExecutor(root);
    const request = {
      operation: 'publish', resourceId: 'artifact-1', payload: { value: 7 },
      leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.lease!.version,
      idempotencyKey: 'effect-1',
    };
    const first = await executor.execute(adapter, request);
    const second = await executor.execute(adapter, request);
    assert.equal(first.applied, true);
    assert.equal(second.duplicate, true);
    assert.equal(adapter.calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
