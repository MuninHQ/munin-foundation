import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildOperatorSitrep, type OperatorSitrepDependencies } from '../src/operator-sitrep.js';

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'munin-operator-score-'));await mkdir(path.join(root,'ops'),{recursive:true});await writeFile(path.join(root,'ops/CURRENT_STATE.md'),'# Current\n');await writeFile(path.join(root,'ops/BACKLOG.md'),'# Backlog\n');await writeFile(path.join(root,'ops/SESSION_LOG.md'),'# Sessions\n');return root}
const base:OperatorSitrepDependencies={jobs:async()=>[],browser:async()=>({backend:'playwright-cli',available:true,command:'playwright-cli'}),ledgerCount:async()=>0,connectors:async()=>[],blockers:async()=>[],email:async()=>undefined,emailHealth:async()=>undefined};

test('operator exposes latest chief developer scorecard without degrading a strong run',async()=>{const root=await fixture();try{const result=await buildOperatorSitrep(root,{...base,scorecard:async()=>({agentId:'chief-developer',samples:4,completionRate:1,evidenceRate:1,retryRate:0,defectEscapeRate:0,humanEscalationRate:0,score:1,updatedAt:new Date().toISOString()})});assert.equal(result.severity,'ok');assert.equal(result.chiefDeveloper.scorecard?.score,1)}finally{await rm(root,{recursive:true,force:true})}});

test('degraded chief developer scorecard becomes attention not hard block',async()=>{const root=await fixture();try{const result=await buildOperatorSitrep(root,{...base,scorecard:async()=>({agentId:'chief-developer',samples:4,completionRate:.5,evidenceRate:.5,retryRate:.5,defectEscapeRate:.25,humanEscalationRate:.25,score:.5,updatedAt:new Date().toISOString()})});assert.equal(result.severity,'attention');assert.match(result.attention.join('\n'),/scorecard is degraded/i)}finally{await rm(root,{recursive:true,force:true})}});
