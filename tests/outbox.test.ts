import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PersistentLeaseStore } from '../src/persistent-leases.js';
import { TransactionalOutbox } from '../src/outbox.js';
import type { SideEffectAdapter } from '../src/side-effects.js';

class RecordingAdapter implements SideEffectAdapter<Record<string, unknown>, { ok: boolean }> {
  id = 'recording'; calls = 0; fail = false;
  async apply(): Promise<{ ok: boolean }> {
    this.calls += 1;
    if (this.fail) throw new Error('temporary failure');
    return { ok: true };
  }
}

async function withLease(root: string) {
  const acquired = await new PersistentLeaseStore(root).acquire('plan:1', 'worker-a', 60_000);
  if (!acquired.lease) throw new Error('Lease not acquired');
  return acquired.lease;
}

test('enqueues idempotently before dispatch', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-outbox-'));
  try {
    const lease = await withLease(root); const outbox = new TransactionalOutbox(root);
    const request = { operation: 'publish', resourceId: 'doc-1', payload: { title: 'A' }, leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.version };
    const first = await outbox.enqueue('recording', request); const second = await outbox.enqueue('recording', request);
    assert.equal(first.id, second.id); assert.equal((await outbox.list()).length, 1); assert.equal(first.status, 'pending');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('dispatches and marks an entry applied', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-outbox-'));
  try {
    const lease = await withLease(root); const outbox = new TransactionalOutbox(root); const adapter = new RecordingAdapter();
    await outbox.enqueue(adapter.id, { operation: 'publish', resourceId: 'doc-1', payload: { title: 'A' }, leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.version });
    const summary = await outbox.dispatch([adapter]); const [entry] = await outbox.list();
    assert.deepEqual(summary, { attempted: 1, applied: 1, failed: 0, deadLettered: 0, skipped: 0 });
    assert.equal(entry.status, 'applied'); assert.equal(entry.attempts, 1); assert.equal(adapter.calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('retries failed entries without duplicating applied effects', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-outbox-'));
  try {
    const lease = await withLease(root);
    const outbox = new TransactionalOutbox(root, { maxAttempts: 5, initialBackoffMs: 0, maxBackoffMs: 0, multiplier: 1 });
    const adapter = new RecordingAdapter(); adapter.fail = true;
    await outbox.enqueue(adapter.id, { operation: 'publish', resourceId: 'doc-1', payload: { title: 'A' }, leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.version });
    assert.equal((await outbox.dispatch([adapter])).failed, 1); adapter.fail = false;
    assert.equal((await outbox.dispatch([adapter])).applied, 1); assert.equal(adapter.calls, 2);
    assert.equal((await outbox.list())[0].status, 'applied'); assert.equal((await outbox.dispatch([adapter])).attempted, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('recovers stale dispatch claims', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-outbox-'));
  try {
    const lease = await withLease(root); const outbox = new TransactionalOutbox(root);
    const entry = await outbox.enqueue('missing', { operation: 'publish', resourceId: 'doc-1', payload: {}, leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: lease.version });
    const file = path.join(root, 'outbox.json'); const fs = await import('node:fs/promises'); const entries = JSON.parse(await fs.readFile(file, 'utf8'));
    entries[0].status = 'dispatching'; entries[0].claimedAt = new Date(1_000).toISOString(); await fs.writeFile(file, JSON.stringify(entries, null, 2) + '\n');
    assert.equal(await outbox.recoverStaleDispatches(100, 1_101), 1); assert.equal((await outbox.list()).find(item => item.id === entry.id)?.status, 'pending');
  } finally { await rm(root, { recursive: true, force: true }); }
});
