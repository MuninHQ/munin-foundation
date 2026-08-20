import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ChiefDeveloperRuntime } from '../src/chief-developer-runtime.js';
import { JsonBlockerLedger } from '../src/json-blocker-ledger.js';
import { JsonAgentScorecardStore } from '../src/json-agent-scorecard-store.js';
import { ChiefDeveloperDecisionPromoter } from '../src/chief-developer-decision-promoter.js';
import { ProjectMemoryStore } from '../src/project-memory.js';

const opinions=[{role:'product' as const,vote:'approve' as const,reason:'value'},{role:'architecture' as const,vote:'approve' as const,reason:'reversible'},{role:'security' as const,vote:'approve' as const,reason:'safe'},{role:'qa' as const,vote:'approve' as const,reason:'verified'}];

test('completed evidence-backed chief run persists scorecard and canonical decision memory',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-chief-promotion-'));try{
  const blockers=new JsonBlockerLedger(path.join(dir,'blockers.json'));const scorecards=new JsonAgentScorecardStore(path.join(dir,'scorecards.json'));const memory=new ProjectMemoryStore(path.join(dir,'project-memory.json'));const promoter=new ChiefDeveloperDecisionPromoter(memory);
  const runtime=new ChiefDeveloperRuntime(async lane=>({laneId:lane.id,status:'completed',summary:'done',evidence:['tests green','merge verified']}),blockers,scorecards,promoter);
  const result=await runtime.run({objective:'ship durable feature',opinions,lanes:[{id:'repo',title:'repo',kind:'repository'}]});
  assert.equal(result.status,'completed');assert.equal(result.promotion?.promoted,true);assert.ok((await scorecards.get('chief-developer'))?.score!>=0.7);
  const records=await memory.search('Chief Developer');assert.equal(records.length,1);assert.match(records[0].content,/tests green/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('partial run keeps scorecard but does not promote durable decision',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-chief-partial-'));try{
  const blockers=new JsonBlockerLedger(path.join(dir,'blockers.json'));const scorecards=new JsonAgentScorecardStore(path.join(dir,'scorecards.json'));const memory=new ProjectMemoryStore(path.join(dir,'project-memory.json'));const promoter=new ChiefDeveloperDecisionPromoter(memory);
  const runtime=new ChiefDeveloperRuntime(async lane=>lane.kind==='device'?{laneId:lane.id,status:'blocked',summary:'device',blocker:'device needed'}:{laneId:lane.id,status:'completed',summary:'done',evidence:['repo done']},blockers,scorecards,promoter);
  const result=await runtime.run({objective:'mixed lanes',opinions,lanes:[{id:'repo',title:'repo',kind:'repository'},{id:'device',title:'device',kind:'device'}]});
  assert.equal(result.status,'partial');assert.equal(result.promotion?.promoted,false);assert.ok(await scorecards.get('chief-developer'));assert.equal((await memory.currentState()).length,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
