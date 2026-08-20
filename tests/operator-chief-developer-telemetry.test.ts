import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep, type OperatorSitrepDependencies } from '../src/operator-sitrep.js';
import type { BlockerRecord } from '../src/blocker-ledger.js';

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'munin-chief-telemetry-'));await mkdir(path.join(root,'ops'),{recursive:true});await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n','utf8');await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n','utf8');await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n','utf8');return root}
const connectors:NonNullable<OperatorSitrepDependencies['connectors']>=async()=>[];
const healthy={jobs:async()=>[],browser:async()=>({backend:'playwright-cli',available:true,command:'playwright-cli'}),ledgerCount:async()=>0,connectors};

test('device blocker stays attention and does not falsely stop unrelated work',async()=>{
 const root=await fixture();try{
  const blockers:BlockerRecord[]=[{id:'d1',laneId:'iphone',category:'device',disposition:'defer',reason:'physical acceptance',createdAt:'2026-08-20T10:00:00Z'}];
  const result=await buildOperatorSitrep(root,{...healthy,blockers:async()=>blockers});
  assert.equal(result.severity,'attention');
  assert.equal(result.chiefDeveloper.deviceBlockers,1);
  assert.equal(result.chiefDeveloper.humanBlockers,0);
  assert.match(result.attention.join('\n'),/unrelated lanes may continue/i);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('credential or 2fa blocker is reported as a genuine human boundary',async()=>{
 const root=await fixture();try{
  const blockers:BlockerRecord[]=[{id:'h1',laneId:'gmail',category:'2fa',disposition:'human',reason:'interactive 2FA required',createdAt:'2026-08-20T10:00:00Z'}];
  const result=await buildOperatorSitrep(root,{...healthy,blockers:async()=>blockers});
  assert.equal(result.severity,'blocked');
  assert.equal(result.chiefDeveloper.humanBlockers,1);
  assert.match(result.attention.join('\n'),/genuine human action/i);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('recoverable repository blocker remains autonomous attention',async()=>{
 const root=await fixture();try{
  const blockers:BlockerRecord[]=[{id:'r1',laneId:'ci',category:'repository',disposition:'reroute',reason:'transient CI failure',createdAt:'2026-08-20T10:00:00Z'}];
  const result=await buildOperatorSitrep(root,{...healthy,blockers:async()=>blockers});
  assert.equal(result.severity,'attention');
  assert.equal(result.chiefDeveloper.recoverableBlockers,1);
  assert.match(result.attention.join('\n'),/rerouted or retried autonomously/i);
 }finally{await rm(root,{recursive:true,force:true})}
});
