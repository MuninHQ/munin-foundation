import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectDuplicationEvidence } from '../src/capability-duplication.js';
import { runCapabilityRadar } from '../src/capability-radar-service.js';
import { JsonCapabilityDecisionLog } from '../src/json-capability-decision-log.js';

test('duplication collector detects existing dependency and source capability',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-dup-'));try{
  await mkdir(path.join(root,'src'),{recursive:true});
  await writeFile(path.join(root,'package.json'),JSON.stringify({dependencies:{playwright:'1.0.0'}}));
  await writeFile(path.join(root,'src','browser-operator.ts'),'export {}');
  const exact=await collectDuplicationEvidence({id:'x',name:'microsoft/playwright',source:'https://github.com/microsoft/playwright'},root);
  assert.equal(exact.score,1);
  const related=await collectDuplicationEvidence({id:'y',name:'example/browser-operator',source:'https://github.com/example/browser-operator'},root);
  assert.ok(related.score>=0.5);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('radar routes high duplication to review instead of auto-adopt',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-radar-dup-'));try{
  const fetcher=async()=>new Response(JSON.stringify({items:[{full_name:'microsoft/playwright',html_url:'https://github.com/microsoft/playwright',description:'browser',archived:false,stargazers_count:99999,open_issues_count:1,updated_at:new Date().toISOString(),license:{spdx_id:'Apache-2.0'}}]}),{status:200});
  const log=new JsonCapabilityDecisionLog(path.join(dir,'decisions.json'));
  const result=await runCapabilityRadar({query:'browser',fetcher:fetcher as typeof fetch,log,duplicationCollector:async()=>({score:0.95,matches:['playwright (1.00)']})});
  assert.equal(result.review,1);
  assert.equal(result.adopt,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
