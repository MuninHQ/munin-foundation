import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { EmailWorkerHealthStore, emailWorkerHealthStatus } from '../src/email-worker-health.js';

test('email worker health persists success without secrets',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-health-'));const file=path.join(root,'health.json');
  try{const store=new EmailWorkerHealthStore(file);const health=await store.success({providers:['gmail'],summary:'3 fetched · 1 added'},'2026-08-20T20:00:00Z');assert.equal(health.consecutiveFailures,0);assert.deepEqual(health.providers,['gmail']);assert.equal((await new EmailWorkerHealthStore(file).read())?.lastSuccessAt,'2026-08-20T20:00:00Z');}finally{await rm(root,{recursive:true,force:true})}
});

test('email worker health detects connection, degradation and staleness',async()=>{
  assert.equal(emailWorkerHealthStatus({updatedAt:'2026-08-20T20:00:00Z',lastSuccessAt:'2026-08-20T20:00:00Z',consecutiveFailures:0,needsConnection:true},Date.parse('2026-08-20T20:10:00Z')),'needs_connection');
  assert.equal(emailWorkerHealthStatus({updatedAt:'2026-08-20T20:00:00Z',lastSuccessAt:'2026-08-20T20:00:00Z',consecutiveFailures:2},Date.parse('2026-08-20T20:10:00Z')),'degraded');
  assert.equal(emailWorkerHealthStatus({updatedAt:'2026-08-20T18:00:00Z',lastSuccessAt:'2026-08-20T18:00:00Z',consecutiveFailures:0},Date.parse('2026-08-20T20:10:00Z')),'stale');
  assert.equal(emailWorkerHealthStatus({updatedAt:'2026-08-20T20:00:00Z',lastSuccessAt:'2026-08-20T20:00:00Z',consecutiveFailures:0},Date.parse('2026-08-20T20:10:00Z')),'healthy');
});

test('failures increment while preserving last success',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'munin-email-health-fail-'));const file=path.join(root,'health.json');
  try{const store=new EmailWorkerHealthStore(file);await store.success({providers:['outlook']},'2026-08-20T19:00:00Z');await store.failure('temporary provider failure','2026-08-20T19:10:00Z');const health=await store.failure('temporary provider failure','2026-08-20T19:20:00Z');assert.equal(health.consecutiveFailures,2);assert.equal(health.lastSuccessAt,'2026-08-20T19:00:00Z');assert.doesNotMatch(JSON.stringify(health),/token|authorization|bearer/i);}finally{await rm(root,{recursive:true,force:true})}
});
