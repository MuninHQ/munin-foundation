import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonBlockerLedger } from '../src/json-blocker-ledger.js';

test('durable blocker ledger survives a new store instance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'munin-blockers-'));
  const path = join(dir, 'blockers.json');
  const first = new JsonBlockerLedger(path);
  await first.add({ id:'b1', laneId:'device', category:'device', disposition:'defer', reason:'iphone required' });
  const second = new JsonBlockerLedger(path);
  assert.equal((await second.listOpen()).length, 1);
  await second.resolve('b1', ['accepted']);
  const third = new JsonBlockerLedger(path);
  assert.equal((await third.listOpen()).length, 0);
  assert.deepEqual((await third.listAll())[0].evidence, ['accepted']);
  const raw = await readFile(path, 'utf8');
  assert.match(raw, /"version": 1/);
});

test('durable blocker ledger deduplicates blocker ids', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'munin-blockers-'));
  const path = join(dir, 'blockers.json');
  const store = new JsonBlockerLedger(path);
  await store.add({ id:'same', laneId:'repo', category:'repository', disposition:'retry', reason:'first' });
  await store.add({ id:'same', laneId:'repo', category:'repository', disposition:'retry', reason:'duplicate' });
  assert.equal((await store.listAll()).length, 1);
  assert.equal((await store.listAll())[0].reason, 'first');
});
