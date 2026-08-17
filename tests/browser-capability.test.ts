import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserCapability, installBrowserPolicyGate, registerBrowserCapability, type BrowserCapabilityInput, type BrowserCapabilityOutput } from '../src/browser-capability.js';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';

test('browser operator registers as removable runtime capability',()=>{
 const registry=new RuntimeCapabilityRegistry();
 const registration=registerBrowserCapability(registry);
 assert.equal(registry.has('browser.operator'),true);
 registration.dispose();
 assert.equal(registry.has('browser.operator'),false);
});

test('browser health executes through seam with auditable trace',async()=>{
 const registry=new RuntimeCapabilityRegistry();
 registerBrowserCapability(registry);
 installBrowserPolicyGate(registry);
 const input:BrowserCapabilityInput={action:'health',backend:'playwright-cli'};
 const result=await registry.execute<BrowserCapabilityInput,BrowserCapabilityOutput>('browser.operator',input,{source:'test'});
 assert.equal(result.capability,'browser.operator');
 assert.equal(result.output.backend,'playwright-cli');
 assert.equal(typeof result.output.available,'boolean');
 assert.equal(result.output.policy.cloudRequired,false);
 assert.equal(result.output.policy.paidDependencyRequired,false);
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
 assert.equal(result.trace[0].detail,'browser-policy-gate');
});

test('browser policy gate permits only validated Playwright read-only inspection',async()=>{
 const registry=new RuntimeCapabilityRegistry();
 registry.register({name:'browser.operator',async execute(input){return input}});
 installBrowserPolicyGate(registry);
 const allowed=await registry.execute('browser.operator',{action:'inspect',url:'http://127.0.0.1:5173/dashboard',backend:'playwright-cli'});
 assert.equal((allowed.output as {action:string}).action,'inspect');
 await assert.rejects(registry.execute('browser.operator',{action:'inspect',url:'file:///etc/passwd',backend:'playwright-cli'}),/only http\/https/);
 await assert.rejects(registry.execute('browser.operator',{action:'inspect',url:'https://example.com',backend:'browser-use'}),/promoted only for Playwright CLI/);
});

test('browser policy gate fails closed for unapproved interaction actions',async()=>{
 const registry=new RuntimeCapabilityRegistry();
 registry.register(createBrowserCapability());
 installBrowserPolicyGate(registry);
 await assert.rejects(
   registry.execute('browser.operator',{action:'click' as never,ref:'e1'} as never),
   /unsupported or unapproved action/,
 );
});
