import test from 'node:test';
import assert from 'node:assert/strict';
import { HostBridgeExecutor } from '../src/host-bridge-executor.js';

function adapter(){
  return {
    runtimeHealth: async()=> 'healthy',
    gitFastForward: async()=> 'updated',
    deployMain: async()=> 'deployed',
    restartMunin: async()=> 'restarted',
    runAcceptance: async()=> 'Authorization: Bearer secret accepted',
    tailscaleHealth: async()=> 'tailscale ok',
  };
}

test('dry-run does not invoke host adapter', async () => {
  let calls=0;
  const a=adapter();
  a.runtimeHealth=async()=>{calls+=1;return 'healthy'};
  const result=await new HostBridgeExecutor(a).execute({id:'d1',type:'runtime-health',dryRun:true,createdAt:new Date().toISOString()});
  assert.equal(result.status,'completed');
  assert.equal(calls,0);
});

test('executor dispatches only validated typed jobs', async () => {
  const result=await new HostBridgeExecutor(adapter()).execute({id:'g1',type:'git-fast-forward',repo:'MuninHQ/munin-foundation',branch:'main',createdAt:new Date().toISOString()});
  assert.equal(result.status,'completed');
  assert.deepEqual(result.evidence,['updated']);
});

test('executor sanitizes returned evidence', async () => {
  const result=await new HostBridgeExecutor(adapter()).execute({id:'a1',type:'run-acceptance',createdAt:new Date().toISOString()});
  assert.equal(result.status,'completed');
  assert.doesNotMatch(result.evidence?.join(' ')??'',/secret/);
  assert.match(result.evidence?.join(' ')??'',/REDACTED/);
});
