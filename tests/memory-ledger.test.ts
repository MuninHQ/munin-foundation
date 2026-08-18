import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MemoryLedger } from '../src/memory-ledger.js';

test('memory ledger is append-only and idempotent for the same semantic entry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-ledger-'));
  const ledger = new MemoryLedger(root);
  const first = await ledger.append({ kind: 'decision', source: 'chatgpt', summary: 'Keep Lovable isolated from core work', projectId: 'munin', payload: { priority: 'P0' } });
  const second = await ledger.append({ kind: 'decision', source: 'chatgpt', summary: 'Keep Lovable isolated from core work', projectId: 'munin', payload: { priority: 'P0' } });
  assert.equal(first.added, true);
  assert.equal(second.added, false);
  assert.equal(second.entry.id, first.entry.id);
  assert.equal((await ledger.list()).length, 1);
});

test('memory ledger filters project and kind', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-ledger-'));
  const ledger = new MemoryLedger(root);
  await ledger.append({ kind: 'observation', source: 'test', summary: 'one', projectId: 'career' });
  await ledger.append({ kind: 'decision', source: 'test', summary: 'two', projectId: 'munin' });
  const result = await ledger.list({ kind: 'observation', projectId: 'career' });
  assert.equal(result.length, 1);
  assert.equal(result[0]?.summary, 'one');
});
