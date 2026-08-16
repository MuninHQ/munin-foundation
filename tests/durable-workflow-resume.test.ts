import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DurableEffectLedger } from '../src/durable-effects.js';

/**
 * Simulates the contract used by a multi-step Munin workflow:
 * local preparation -> consequential side effect -> crash -> restart -> reconciliation -> continuation.
 * The external effect counter is the observable side effect and must remain exactly one.
 */
test('interrupted multi-step workflow resumes without duplicating consequential side effect',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-durable-workflow-'));const file=path.join(dir,'effects.json');let externalEffectCount=0;let remoteObserved=false;
 const identity='workflow-42:publish-artifact-v1';

 // Process A reaches its consequential step.
 const beforeCrash=new DurableEffectLedger(file);const first=beforeCrash.begin('publish-artifact',identity);assert.equal(first.decision,'execute');
 externalEffectCount++;remoteObserved=true;
 // Crash happens after the remote side effect but before Munin can persist completion.

 // Process B restarts from durable state. Blind replay must be refused.
 const afterRestart=new DurableEffectLedger(file);const resumed=afterRestart.begin('publish-artifact',identity);assert.equal(resumed.decision,'needs_reconciliation');assert.equal(externalEffectCount,1);

 // Workflow reconciles reality first, then records the already-observed effect as complete.
 if(remoteObserved)afterRestart.complete('publish-artifact',identity,'remote artifact exists');
 else throw new Error('test setup expected remote effect');

 // Remaining workflow steps may continue; revisiting the same effect must be a no-op.
 const replay=afterRestart.begin('publish-artifact',identity);assert.equal(replay.decision,'already_completed');assert.equal(externalEffectCount,1);assert.match(replay.record.evidence??'',/remote artifact exists/);
 await rm(dir,{recursive:true,force:true});
});
