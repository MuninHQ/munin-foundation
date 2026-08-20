import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChiefDeveloperRuntime } from '../src/chief-developer-runtime.js';
import { JsonBlockerLedger } from '../src/json-blocker-ledger.js';

const approvalOpinions = [
  { role:'product' as const, vote:'approve' as const, reason:'High-value objective.' },
  { role:'architecture' as const, vote:'approve' as const, reason:'Reversible design.' },
  { role:'security' as const, vote:'approve' as const, reason:'No elevated risk.' },
  { role:'qa' as const, vote:'approve' as const, reason:'Testable acceptance.' },
];

test('paid proposal is blocked before any lane executes', async () => {
  let calls=0;
  const runtime = new ChiefDeveloperRuntime(async lane => { calls+=1; return { laneId:lane.id,status:'completed',summary:'done' }; });
  const result = await runtime.run({ objective:'Build paid feature', lanes:[{id:'repo',title:'repo',kind:'repository'}], opinions:approvalOpinions, cost:{paidApiRequired:true} });
  assert.equal(result.status,'blocked');
  assert.equal(calls,0);
  assert.equal(result.committee.outcome,'block');
});

test('security block prevents execution even when cost is zero', async () => {
  let calls=0;
  const runtime = new ChiefDeveloperRuntime(async lane => { calls+=1; return { laneId:lane.id,status:'completed',summary:'done' }; });
  const result = await runtime.run({
    objective:'Unsafe feature', lanes:[{id:'repo',title:'repo',kind:'repository'}],
    opinions:[...approvalOpinions.filter(x=>x.role!=='security'),{role:'security',vote:'block',reason:'Unsafe privilege expansion.'}],
  });
  assert.equal(result.status,'blocked');
  assert.equal(calls,0);
});

test('device blocker is persisted while repository lane completes', async () => {
  const dir=await mkdtemp(join(tmpdir(),'munin-chief-'));
  const ledger=new JsonBlockerLedger(join(dir,'blockers.json'));
  const runtime=new ChiefDeveloperRuntime(async lane => lane.kind==='device'
    ? {laneId:lane.id,status:'blocked',summary:'iPhone required',blocker:'physical device required'}
    : {laneId:lane.id,status:'completed',summary:'repo complete',evidence:['commit']}, ledger);
  const result=await runtime.run({
    objective:'Finish all safe lanes', opinions:approvalOpinions, maxParallel:2,
    lanes:[{id:'repo',title:'repository',kind:'repository'},{id:'iphone',title:'device acceptance',kind:'device'}],
  });
  assert.equal(result.status,'partial');
  assert.deepEqual(result.scheduler?.completed.map(x=>x.laneId),['repo']);
  assert.deepEqual(result.scheduler?.deferred.map(x=>x.laneId),['iphone']);
  assert.equal((await ledger.listOpen()).length,1);
  assert.equal((await ledger.listOpen())[0].category,'device');
  assert.equal(result.blockerIds.length,1);
});

test('approved zero-cost work completes and emits evidence scorecard', async () => {
  const runtime=new ChiefDeveloperRuntime(async lane => ({laneId:lane.id,status:'completed',summary:'done',evidence:['ci'] }));
  const result=await runtime.run({ objective:'Build safe feature', opinions:approvalOpinions, lanes:[{id:'repo',title:'repository',kind:'repository'}] });
  assert.equal(result.status,'completed');
  assert.equal(result.scorecard?.completionRate,1);
  assert.equal(result.scorecard?.evidenceRate,1);
});
