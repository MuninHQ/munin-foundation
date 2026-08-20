import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ChiefDeveloperRuntime } from '../src/chief-developer-runtime.js';

const opinions=[
 {role:'product' as const,vote:'approve' as const,reason:'value'},
 {role:'architecture' as const,vote:'approve' as const,reason:'reversible'},
 {role:'security' as const,vote:'approve' as const,reason:'safe'},
 {role:'qa' as const,vote:'approve' as const,reason:'testable'},
];

test('default Chief Developer ledger persists device blockers in runtime data dir',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-chief-default-'));
 const previous=process.env.MUNIN_DATA_DIR; process.env.MUNIN_DATA_DIR=dir;
 try{
  const runtime=new ChiefDeveloperRuntime(async lane=>({laneId:lane.id,status:'blocked',summary:'device needed',blocker:'device needed'}));
  const result=await runtime.run({objective:'accept device',opinions,lanes:[{id:'iphone',title:'iphone',kind:'device'}]});
  assert.equal(result.status,'partial');
  const parsed=JSON.parse(await readFile(path.join(dir,'chief-developer-blockers.json'),'utf8')) as {records:Array<{category:string}>};
  assert.equal(parsed.records[0].category,'device');
 }finally{if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true})}
});
