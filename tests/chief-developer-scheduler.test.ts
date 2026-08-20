import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkGraph } from '../src/chief-developer-scheduler.js';
import { BlockerLedger } from '../src/blocker-ledger.js';

test('work graph advances independent lanes while device lane is blocked', async () => {
  const result = await runWorkGraph([
    { id: 'repo', title: 'repository work', kind: 'repository', priority: 10 },
    { id: 'device', title: 'iphone acceptance', kind: 'device', priority: 9 },
    { id: 'cloud', title: 'cloud docs', kind: 'cloud', priority: 8 },
  ], async lane => {
    if (lane.kind === 'device') return { laneId: lane.id, status: 'blocked', summary: 'device unavailable', blocker: 'physical device required' };
    return { laneId: lane.id, status: 'completed', summary: `${lane.kind} complete` };
  }, { maxParallel: 3 });

  assert.equal(result.status, 'partial');
  assert.deepEqual(result.completed.map(x => x.laneId).sort(), ['cloud', 'repo']);
  assert.deepEqual(result.deferred.map(x => x.laneId), ['device']);
});

test('work graph respects dependencies before running downstream lane', async () => {
  const calls: string[] = [];
  const result = await runWorkGraph([
    { id: 'build', title: 'build', kind: 'repository' },
    { id: 'verify', title: 'verify', kind: 'repository', dependsOn: ['build'] },
  ], async lane => { calls.push(lane.id); return { laneId: lane.id, status: 'completed', summary: 'ok' }; }, { maxParallel: 2 });
  assert.equal(result.status, 'done');
  assert.deepEqual(calls, ['build', 'verify']);
});

test('blocker ledger is idempotent and resolves with evidence', () => {
  const ledger = new BlockerLedger();
  ledger.add({ id: 'b1', laneId: 'device', category: 'device', disposition: 'defer', reason: 'iphone required' });
  ledger.add({ id: 'b1', laneId: 'device', category: 'device', disposition: 'defer', reason: 'duplicate' });
  assert.equal(ledger.listAll().length, 1);
  assert.equal(ledger.listOpen().length, 1);
  ledger.resolve('b1', ['accepted on device']);
  assert.equal(ledger.listOpen().length, 0);
  assert.deepEqual(ledger.listAll()[0].evidence, ['accepted on device']);
});
