import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep } from '../src/operator-sitrep.js';

test('operator sitrep remains healthy when chief developer has no open blockers',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-operator-chief-empty-'));
 const data=await mkdtemp(path.join(os.tmpdir(),'munin-operator-chief-data-'));
 const previous=process.env.MUNIN_DATA_DIR; process.env.MUNIN_DATA_DIR=data;
 try{
  await mkdir(path.join(root,'ops'),{recursive:true});
  await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n');
  await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n');
  await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n');
  const result=await buildOperatorSitrep(root,{jobs:async()=>[],browser:async()=>({backend:'playwright-cli',available:true,command:'playwright-cli'}),ledgerCount:async()=>0,connectors:async()=>[]});
  assert.equal(result.chiefDeveloper.openBlockers,0);
  assert.equal(result.severity,'ok');
 }finally{if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(root,{recursive:true,force:true});await rm(data,{recursive:true,force:true})}
});
