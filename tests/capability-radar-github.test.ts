import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverGitHubCapabilities } from '../src/capability-radar-github.js';
import { runCapabilityRadar } from '../src/capability-radar-service.js';
import { JsonCapabilityDecisionLog } from '../src/json-capability-decision-log.js';

const payload={items:[{
 full_name:'example/tool',html_url:'https://github.com/example/tool',description:'tool',archived:false,stargazers_count:1000,open_issues_count:12,updated_at:new Date().toISOString(),license:{spdx_id:'MIT'},
}]};
const fetcher=async()=>new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});

test('GitHub discovery yields zero-cost candidates with evidence',async()=>{
 const result=await discoverGitHubCapabilities({query:'playwright automation',fetcher:fetcher as typeof fetch});
 assert.equal(result.length,1);
 assert.equal(result[0].candidate.recurringCost,0);
 assert.equal(result[0].candidate.metered,false);
 assert.equal(result[0].candidate.paidApiRequired,false);
 assert.equal(result[0].candidate.license,'MIT');
 assert.ok(result[0].candidate.securityScore!>=0.5);
 assert.match(result[0].evidence.join('\n'),/MIT/);
});

test('radar persists decision and skips known candidate on later run',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-radar-github-'));try{
  const log=new JsonCapabilityDecisionLog(path.join(dir,'decisions.json'));
  const first=await runCapabilityRadar({query:'tool',fetcher:fetcher as typeof fetch,log});
  const second=await runCapabilityRadar({query:'tool',fetcher:fetcher as typeof fetch,log});
  assert.equal(first.assessed,1);
  assert.equal(second.assessed,0);
  assert.equal(second.skipped,1);
  assert.equal((await log.list()).length,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('radar can explicitly revisit a known candidate',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'munin-radar-revisit-'));try{
  const log=new JsonCapabilityDecisionLog(path.join(dir,'decisions.json'));
  await runCapabilityRadar({query:'tool',fetcher:fetcher as typeof fetch,log});
  const revisited=await runCapabilityRadar({query:'tool',fetcher:fetcher as typeof fetch,log,revisit:true});
  assert.equal(revisited.assessed,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
