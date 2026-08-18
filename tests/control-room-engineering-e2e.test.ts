import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createProductionAgentExecutors } from '../src/agent-runtime-adapters.js';
import { MuninControlRoomOrchestrator, type ControlRoomExecutorFactory } from '../src/control-room-orchestrator.js';

async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-engineering-e2e-'));
 await mkdir(path.join(root,'ops'),{recursive:true});
 await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n\nphase: integration\n','utf8');
 await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n\n- [ ] harden engineering acceptance\n','utf8');
 await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Session Log\n','utf8');
 return root;
}

test('engineering objective recovers from missing evidence, passes production QA, writes memory and hands off healthy',async()=>{
 const root=await fixture();
 let engineerAttempts=0;
 const factory:ControlRoomExecutorFactory=(runtimeRoot)=>{
  const production=createProductionAgentExecutors(runtimeRoot);
  return {
   ...production,
   engineer:async()=>{
    engineerAttempts++;
    if(engineerAttempts===1)return{status:'completed',summary:'Implementation claimed complete but emitted no evidence.'};
    return{status:'completed',summary:'Implementation fixed and verified.',evidence:['commit:test-e2e','tests:passed','verification:accepted']};
   },
  };
 };
 try{
  const result=await new MuninControlRoomOrchestrator(root,factory).execute({objective:'Build feature and validate engineering evidence'});
  assert.equal(result.workType,'engineering');
  assert.equal(result.status,'done');
  assert.equal(engineerAttempts,2);
  assert.deepEqual(result.trace.map(item=>item.agentId),[
   'product-state-manager','engineer','qa-verifier','engineer','qa-verifier','memory-curator','operator',
  ]);
  const firstQa=result.trace[2];
  assert.equal(firstQa.status,'retry');
  assert.match(firstQa.summary,/without durable verification evidence/i);
  const secondQa=result.trace[4];
  assert.equal(secondQa.status,'completed');
  assert.deepEqual(secondQa.evidence,['commit:test-e2e','tests:passed','verification:accepted']);
  assert.equal(result.trace.at(-1)?.status,'completed');
  assert.match(result.trace.at(-1)?.summary??'',/healthy/i);
  const session=await readFile(path.join(root,'ops/SESSION_LOG.md'),'utf8');
  assert.match(session,/Multi-agent orchestration completed durable work/);
  assert.match(session,/Build feature and validate engineering evidence/);
  assert.match(session,/commit:test-e2e/);
  assert.match(session,/qa-verifier/);
 }finally{await rm(root,{recursive:true,force:true})}
});
