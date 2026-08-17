import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionEngine } from '../src/runtime.js';
import { RuntimeCapabilityAdapter } from '../src/runtime-capability-adapter.js';

test('runtime capability adapter stays disabled by default when explicitly false',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 assert.deepEqual(adapter.capabilityNames(),[]);
});

test('runtime capability adapter exposes browser capability only when enabled',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 assert.deepEqual(adapter.capabilityNames(),['browser.operator']);
});

test('disabled adapter fails closed before capability execution',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 await assert.rejects(adapter.browser({action:'health'}),/capability seam is disabled/);
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
