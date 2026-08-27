import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { OrchestrationTraceStore, summarizeOrchestrationTraces } from '../src/orchestration-trace-store.js';
import type { OrchestrationTrace } from '../src/orchestration-trace.js';

function trace(overrides:Partial<OrchestrationTrace>={}):OrchestrationTrace{return {planId:'p1',route:'direct',attempts:[{providerId:'local',ok:true}],selectedProviderId:'local',startedAt:'2026-08-25T10:00:00.000Z',completedAt:'2026-08-25T10:00:02.000Z',...overrides}}

test('durable orchestration trace store survives new instances and redacts secrets',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'munin-traces-'));const file=path.join(dir,'traces.jsonl');try{await new OrchestrationTraceStore(file).append(trace({attempts:[{providerId:'x',ok:false,error:'Authorization: Bearer super-secret-value'}]}));const items=await new OrchestrationTraceStore(file).list();assert.equal(items.length,1);assert.match(items[0].attempts[0].error??'',/\[REDACTED\]/);assert.doesNotMatch(items[0].attempts[0].error??'',/super-secret-value/)}finally{await rm(dir,{recursive:true,force:true})}});

test('orchestration metrics summarize completion retries failures and duration',()=>{const metrics=summarizeOrchestrationTraces([trace(),trace({planId:'p2',attempts:[{providerId:'a',ok:false,error:'timeout'},{providerId:'b',ok:true}],startedAt:'2026-08-25T10:00:00.000Z',completedAt:'2026-08-25T10:00:04.000Z'})],new Date('2026-08-25T11:00:00.000Z'));assert.equal(metrics.runs,2);assert.equal(metrics.completionRate,1);assert.equal(metrics.retryRate,0.5);assert.equal(metrics.providerFailures,1);assert.equal(metrics.medianDurationMs,3000)});
