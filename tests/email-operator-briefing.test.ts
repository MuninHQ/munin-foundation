import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep, type OperatorSitrepDependencies } from '../src/operator-sitrep.js';
import type { EmailIntelligenceSnapshot } from '../src/email-intelligence.js';

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-operator-'));await mkdir(path.join(root,'ops'),{recursive:true});await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n','utf8');await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n','utf8');await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n','utf8');return root}

const snapshot:EmailIntelligenceSnapshot={generatedAt:'2026-08-20T12:00:00Z',syncedAt:'2026-08-20T11:59:00Z',total:5,unreadActionable:2,careerActionable:1,generalActionable:1,reviewRequired:1,interestingReads:1,reference:2,noise:1,topActions:[{id:'mail-1',subject:'Interview tomorrow',receivedAt:'2026-08-20T11:00:00Z',attention:'career',linkedJobId:'job-1'}],topReads:[{id:'read-1',subject:'BCB stablecoin update',receivedAt:'2026-08-20T10:00:00Z',score:8,reasons:['digital assets','regulation / market infrastructure']}]};

const deps:OperatorSitrepDependencies={
 jobs:async()=>[],
 browser:async()=>({backend:'playwright-cli' as const,available:true,command:'playwright-cli'}),
 ledgerCount:async()=>0,
 connectors:async()=>[],
 blockers:async()=>[],
 scorecard:async()=>undefined,
 email:async()=>snapshot,
};

test('operator surfaces actionable and interesting email without human hard block',async()=>{
 const root=await fixture();try{const result=await buildOperatorSitrep(root,deps);assert.equal(result.severity,'attention');assert.equal(result.email.actionable,2);assert.equal(result.email.generalActionable,1);assert.equal(result.email.reviewRequired,1);assert.equal(result.email.interestingReads,1);assert.equal(result.email.topReads[0].id,'read-1');assert.match(result.attention.join('\n'),/worth reading/i);}finally{await rm(root,{recursive:true,force:true})}
});

test('operator remains healthy when email intelligence has no open action or interesting read',async()=>{
 const root=await fixture();try{const result=await buildOperatorSitrep(root,{...deps,email:async()=>({...snapshot,unreadActionable:0,careerActionable:0,generalActionable:0,reviewRequired:0,interestingReads:0,topActions:[],topReads:[]})});assert.equal(result.severity,'ok');assert.equal(result.email.actionable,0);assert.equal(result.email.interestingReads,0);}finally{await rm(root,{recursive:true,force:true})}
});
