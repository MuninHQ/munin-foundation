import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionEngine } from '../src/runtime.js';
import { RuntimeCapabilityAdapter } from '../src/runtime-capability-adapter.js';

test('runtime capability adapter stays disabled by default when explicitly false',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 assert.deepEqual(adapter.capabilityNames(),[]);
});

test('runtime capability adapter exposes governed capabilities only when enabled',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 assert.deepEqual(adapter.capabilityNames(),['browser.operator','engineering.autonomous-mission','execution.autonomous-loop']);
});

test('disabled adapter fails closed before capability execution',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 await assert.rejects(adapter.browser({action:'health'}),/capability seam is disabled/);
 await assert.rejects(adapter.autonomousLoop({objective:'x',executor:async()=>({status:'PASS'})}),/capability seam is disabled/);
 await assert.rejects(adapter.engineeringMission({objective:'Build local feature'}),/capability seam is disabled/);
});

test('enabled adapter executes browser health through policy-gated seam',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.browser({action:'health',backend:'playwright-cli'});
 assert.equal(result.capability,'browser.operator');
 assert.equal(result.output.backend,'playwright-cli');
 assert.equal(result.output.policy.cloudRequired,false);
 assert.equal(result.output.policy.paidDependencyRequired,false);
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter executes autonomous loop through capability seam',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.autonomousLoop({objective:'Build safely',executor:async()=>({status:'PASS'})});
 assert.equal(result.capability,'execution.autonomous-loop');
 assert.equal(result.output.status,'DONE');
 assert.equal(result.output.trace.length,4);
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter executes engineering mission with injectable runtime',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{
  enabled:true,
  engineeringRuntime:{execute:async objective=>({status:'completed',objective,branch:'agent/test',commit:'abc123',changedFiles:['src/test.ts'],events:[],validation:'npm test passed',delivery:'local-commit',message:'Build validated.'})},
 });
 const result=await adapter.engineeringMission({objective:'Build local feature'});
 assert.equal(result.capability,'engineering.autonomous-mission');
 assert.equal(result.output.loop.status,'DONE');
 assert.equal(result.output.engineering?.commit,'abc123');
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});
