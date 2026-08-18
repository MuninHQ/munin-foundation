import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MuninControlRoomOrchestrator } from '../src/control-room-orchestrator.js';

async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-e2e-continuity-'));
 await mkdir(path.join(root,'ops'),{recursive:true});
 await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n\nphase: integration\n','utf8');
 await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n\n- [ ] next safe action\n','utf8');
 await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Session Log\n','utf8');
 return root;
}

test('canonical Control Room write-back is rehydrated by a fresh execution instance',async()=>{
 const root=await fixture();
 try{
  const first=new MuninControlRoomOrchestrator(root);
  const firstRun=await first.execute({objective:'Atualizar backlog e prioridade do produto'});
  assert.equal(firstRun.status,'done');
  assert.deepEqual(firstRun.plan,['product-state-manager','memory-curator']);
  const afterFirst=await readFile(path.join(root,'ops/SESSION_LOG.md'),'utf8');
  assert.match(afterFirst,/Atualizar backlog e prioridade do produto/);
  const firstBytes=Buffer.byteLength(afterFirst,'utf8');

  // Simulate a new process/session: no in-memory result is reused.
  const resumed=new MuninControlRoomOrchestrator(root);
  const secondRun=await resumed.execute({objective:'Revisar backlog e definir a próxima prioridade do produto'});
  assert.equal(secondRun.status,'done');
  assert.equal(secondRun.trace[0]?.agentId,'product-state-manager');
  const hydrationEvidence=secondRun.trace[0]?.evidence??[];
  const sessionEvidence=hydrationEvidence.find(item=>item.startsWith('session-log:'));
  assert.ok(sessionEvidence,'fresh execution must prove it hydrated the durable session log');
  const hydratedBytes=Number(sessionEvidence?.split(':')[1]);
  assert.ok(hydratedBytes>=firstBytes,'fresh execution must observe prior durable write-back');

  const afterSecond=await readFile(path.join(root,'ops/SESSION_LOG.md'),'utf8');
  assert.match(afterSecond,/Atualizar backlog e prioridade do produto/);
  assert.match(afterSecond,/Revisar backlog e definir a próxima prioridade do produto/);
  assert.ok(Buffer.byteLength(afterSecond,'utf8')>firstBytes);
 }finally{await rm(root,{recursive:true,force:true})}
});
