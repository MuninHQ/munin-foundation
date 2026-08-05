import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PersistentLeaseStore } from '../src/persistent-leases.js';
import { TransactionalOutbox } from '../src/outbox.js';
import type { SideEffectAdapter } from '../src/side-effects.js';

class FailingAdapter implements SideEffectAdapter<Record<string, unknown>, { ok: boolean }> {
  id = 'failing'; calls = 0; fail = true;
  async apply(): Promise<{ ok: boolean }> {
    this.calls += 1; if (this.fail) throw new Error('temporary failure'); return { ok: true };
  }
}

async function setup(root: string) {
  const lease = await new PersistentLeaseStore(root).acquire('plan:1', 'worker-a', 60_000);
  if (!lease.lease) throw new Error('Lease not acquired');
  return { operation: 'publish', resourceId: 'doc-1', payload: { title: 'A' }, leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.lease.version };
}

test('delays retries using exponential backoff', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-policy-'));
  try {
    const outbox = new TransactionalOutbox(root, { maxAttempts: 3, initialBackoffMs: 100, maxBackoffMs: 1_000, multiplier: 2 });
    const adapter = new FailingAdapter(); await outbox.enqueue(adapter.id, await setup(root));
    assert.equal((await outbox.dispatch([adapter], { now: 1_000 })).failed, 1);
    assert.equal((await outbox.list())[0].nextAttemptAt, new Date(1_100).toISOString());
    assert.equal((await outbox.dispatch([adapter], { now: 1_099 })).attempted, 0);
    assert.equal((await outbox.dispatch([adapter], { now: 1_100 })).failed, 1);
    assert.equal((await outbox.list())[0].nextAttemptAt, new Date(1_300).toISOString());
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('moves exhausted entries to dead-letter', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-policy-'));
  try {
    const outbox = new TransactionalOutbox(root, { maxAttempts: 2, initialBackoffMs: 10, maxBackoffMs: 10, multiplier: 2 });
    const adapter = new FailingAdapter(); await outbox.enqueue(adapter.id, await setup(root));
    await outbox.dispatch([adapter], { now: 1_000 });
    const summary = await outbox.dispatch([adapter], { now: 1_010 }); const [entry] = await outbox.list();
    assert.equal(summary.deadLettered, 1); assert.equal(entry.status, 'dead-letter');
    assert.equal(entry.deadLetteredAt, new Date(1_010).toISOString()); assert.equal((await outbox.dispatch([adapter], { now: 2_000 })).attempted, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('supports explicit dead-letter requeue', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-policy-'));
  try {
    const outbox = new TransactionalOutbox(root, { maxAttempts: 1, initialBackoffMs: 0, maxBackoffMs: 0, multiplier: 1 });
    const adapter = new FailingAdapter(); const queued = await outbox.enqueue(adapter.id, await setup(root));
    await outbox.dispatch([adapter], { now: 1_000 }); const requeued = await outbox.requeueDeadLetter(queued.id, 2_000);
    assert.equal(requeued.status, 'pending'); assert.equal(requeued.attempts, 0); adapter.fail = false;
    assert.equal((await outbox.dispatch([adapter], { now: 2_000 })).applied, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
