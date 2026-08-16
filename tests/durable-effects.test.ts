import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DurableEffectLedger } from '../src/durable-effects.js';

test('executes a durable effect once and reuses completion evidence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-effects-'));const file=path.join(dir,'ledger.json');const ledger=new DurableEffectLedger(file);const first=ledger.begin('git-push','agent/test@abc');assert.equal(first.decision,'execute');ledger.complete('git-push','agent/test@abc','origin/agent/test abc');const again=ledger.begin('git-push','agent/test@abc');assert.equal(again.decision,'already_completed');assert.match(again.record.evidence??'',/origin/);await rm(dir,{recursive:true,force:true});
});

test('restart fails closed when previous side effect outcome is unknown',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-effects-restart-'));const file=path.join(dir,'ledger.json');const ledger=new DurableEffectLedger(file);ledger.begin('create-pr','agent/test@abc');const restarted=new DurableEffectLedger(file);const result=restarted.begin('create-pr','agent/test@abc');assert.equal(result.decision,'needs_reconciliation');await rm(dir,{recursive:true,force:true});
});

test('reconciliation explicitly permits a bounded retry',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-effects-retry-'));const file=path.join(dir,'ledger.json');const ledger=new DurableEffectLedger(file);ledger.begin('external-write','job-1');ledger.uncertain('external-write','job-1','connection dropped');assert.equal(ledger.begin('external-write','job-1').decision,'needs_reconciliation');const retry=ledger.retryAfterReconciliation('external-write','job-1');assert.equal(retry.attempts,2);ledger.complete('external-write','job-1','confirmed');assert.equal(ledger.begin('external-write','job-1').decision,'already_completed');await rm(dir,{recursive:true,force:true});
});
