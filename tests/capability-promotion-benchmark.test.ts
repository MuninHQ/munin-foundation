import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { benchmarkCapabilityCandidate } from '../src/capability-promotion-benchmark.js';
import { runCapabilityRadar } from '../src/capability-radar-service.js';
import { JsonCapabilityDecisionLog } from '../src/json-capability-decision-log.js';
import { ProjectMemoryStore } from '../src/project-memory.js';

test('promotion benchmark clears only strong zero-cost evidence without executing code',()=>{
 const result=benchmarkCapabilityCandidate({id:'x',name:'example/tool',source:'https://github.com/example/tool',license:'MIT',recurringCost:0,metered:false,paidApiRequired:false,maintenanceScore:1,securityScore:.9,duplicationScore:.1,evidence:['license','maintenance','security','rollback']});
 assert.equal(result.status,'promote');assert.equal(result.checks.zeroCost,true);assert.equal(result.checks.secure,true);
 const held=benchmarkCapabilityCandidate({id:'y',name:'example/paid',source:'https://example.com',license:'MIT',recurringCost:1,maintenanceScore:1,securityScore:1,duplicationScore:0,evidence:['a','b','c','d']});
 assert.equal(held.status,'hold');assert.match(held.reasons.join('\n'),/paid or metered/i);
});

test('strong adopted candidate is promoted into canonical project memory',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-radar-promotion-'));try{
  const log=new JsonCapabilityDecisionLog(path.join(dir,'decisions.json'));const memory=new ProjectMemoryStore(path.join(dir,'project-memory.json'));
  const fetcher=async()=>new Response(JSON.stringify({items:[{full_name:'example/strong-tool',html_url:'https://github.com/example/strong-tool',description:'strong',archived:false,stargazers_count:10000,open_issues_count:2,updated_at:new Date().toISOString(),license:{spdx_id:'MIT'}}]}),{status:200});
  const result=await runCapabilityRadar({query:'strong',fetcher:fetcher as typeof fetch,log,memory,duplicationCollector:async()=>({score:0,matches:[]}),benchmark:()=>({id:'github:example/strong-tool',status:'promote',score:1,checks:{zeroCost:true,licensed:true,maintained:true,secure:true,nonDuplicate:true,evidence:true,rollback:true},reasons:['pass']})});
  assert.equal(result.promoted,1);const records=await memory.search('Capability radar');assert.equal(records.length,1);assert.match(records[0].content,/Promotion benchmark/);assert.deepEqual(records[0].relatedIssues,['#242']);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('adopt assessment does not promote when benchmark holds',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-radar-hold-'));try{
  const log=new JsonCapabilityDecisionLog(path.join(dir,'decisions.json'));const memory=new ProjectMemoryStore(path.join(dir,'project-memory.json'));
  const fetcher=async()=>new Response(JSON.stringify({items:[{full_name:'example/held-tool',html_url:'https://github.com/example/held-tool',description:'held',archived:false,stargazers_count:10000,open_issues_count:2,updated_at:new Date().toISOString(),license:{spdx_id:'MIT'}}]}),{status:200});
  const result=await runCapabilityRadar({query:'held',fetcher:fetcher as typeof fetch,log,memory,duplicationCollector:async()=>({score:0,matches:[]}),benchmark:candidate=>({...benchmarkCapabilityCandidate(candidate),status:'hold'})});
  assert.equal(result.adopt,1);assert.equal(result.promoted,0);assert.equal(result.benchmarkHeld,1);assert.equal((await memory.currentState()).length,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
