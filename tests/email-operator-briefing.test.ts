import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep, type OperatorSitrepDependencies } from '../src/operator-sitrep.js';
import type { EmailIntelligenceSnapshot } from '../src/email-intelligence.js';

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-operator-'));await mkdir(path.join(root,'ops'),{recursive:true});await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n','utf8');await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n','utf8');await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n','utf8');return root}

const snapshot:EmailIntelligenceSnapshot={generatedAt:'2026-08-20T12:00:00Z',syncedAt:'2026-08-20T11:59:00Z',total:4,unreadActionable:2,careerActionable:1,generalActionable:1,reviewRequired:1,reference:1,noise:1,topActions:[{id:'mail-1',subject:'Interview tomorrow',receivedAt:'2026-08-20T11:00:00Z',attention:'career',linkedJobId:'job-1'}]};

const deps:OperatorSitrepDependencies={
 jobs:async()=>[],
 browser:async()=>({backend:'playwright-cli' as const,available:true,command:'playwright-cli'}),
 ledgerCount:async()=>0,
 connectors:async()=>[],
 blockers:async()=>[],
 scorecard:async()=>undefined,
 email:async()=>snapshot,
};

test('operator surfaces actionable email without turning it into a human hard block',async()=>{
 const root=await fixture();try{const result=await buildOperatorSitrep(root,deps);assert.equal(result.severity,'attention');assert.equal(result.email.actionable,2);assert.equal(result.email.generalActionable,1);assert.equal(result.email.reviewRequired,1);assert.match(result.attention.join('\n'),/2 actionable email/i);}finally{await rm(root,{recursive:true,force:true})}
});

test('operator remains healthy when email intelligence has no open action',async()=>{
 const root=await fixture();try{const result=await buildOperatorSitrep(root,{...deps,email:async()=>({...snapshot,unreadActionable:0,careerActionable:0,generalActionable:0,reviewRequired:0,topActions:[]})});assert.equal(result.severity,'ok');assert.equal(result.email.actionable,0);}finally{await rm(root,{recursive:true,force:true})}
});
