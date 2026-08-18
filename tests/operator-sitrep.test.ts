import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep } from '../src/operator-sitrep.js';

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'munin-operator-sitrep-'));await mkdir(path.join(root,'ops'),{recursive:true});await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n','utf8');await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n','utf8');await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n','utf8');return root}

const connectors=async()=>[
 {provider:'gmail' as const,connected:true,configured:true,expiresAt:Date.now()+1000,scope:'gmail.readonly',security:{provider:'gmail' as const,scopes:['gmail.readonly'],writeScopes:[],readOnly:true,tokenStorage:'local-runtime-json' as const,externalMutationAllowed:false as const}},
 {provider:'outlook' as const,connected:false,configured:false,security:{provider:'outlook' as const,scopes:['Mail.Read'],writeScopes:[],readOnly:true,tokenStorage:'local-runtime-json' as const,externalMutationAllowed:false as const}},
];

test('operator SITREP aggregates healthy execution surfaces into one snapshot',async()=>{
 const root=await fixture();try{
  const result=await buildOperatorSitrep(root,{
   jobs:async()=>[{id:'1',objective:'done',status:'completed',createdAt:'2026-08-18T10:00:00Z'}],
   browser:async()=>({backend:'playwright-cli',available:true,command:'playwright-cli'}),
   ledgerCount:async()=>42,
   connectors,
  });
  assert.equal(result.severity,'ok');
  assert.equal(result.controlRoom.ready,true);
  assert.equal(result.engineering.byStatus.completed,1);
  assert.equal(result.engineering.active,0);
  assert.equal(result.browser.available,true);
  assert.equal(result.browser.readOnly,true);
  assert.equal(result.memory.ledgerEntries,42);
  assert.equal(result.connectors[0].readOnly,true);
  assert.deepEqual(result.attention,[]);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('operator SITREP surfaces failed jobs and unavailable browser as attention',async()=>{
 const root=await fixture();try{
  const result=await buildOperatorSitrep(root,{
   jobs:async()=>[{id:'1',objective:'bad',status:'failed',createdAt:'2026-08-18T10:00:00Z',error:'boom'}],
   browser:async()=>({backend:'playwright-cli',available:false,command:'playwright-cli',detail:'not installed'}),
   ledgerCount:async()=>0,
   connectors,
  });
  assert.equal(result.severity,'attention');
  assert.equal(result.engineering.failed,1);
  assert.ok(result.attention.some(item=>/failed/i.test(item)));
  assert.ok(result.attention.some(item=>/unavailable/i.test(item)));
 }finally{await rm(root,{recursive:true,force:true})}
});

test('operator SITREP blocks when canonical Control Room files are missing',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-operator-missing-'));try{
  const result=await buildOperatorSitrep(root,{jobs:async()=>[],browser:async()=>({backend:'playwright-cli',available:true,command:'playwright-cli'}),ledgerCount:async()=>0,connectors});
  assert.equal(result.severity,'blocked');
  assert.equal(result.controlRoom.ready,false);
  assert.equal(result.controlRoom.missing.length,3);
 }finally{await rm(root,{recursive:true,force:true})}
});
