import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionEngine } from '../src/execution-engine.js';
import { RuntimeCapabilityAdapter } from '../src/runtime-capability-adapter.js';

test('runtime capability adapter stays disabled by default when explicitly false',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 assert.equal(adapter.health().enabled,false);
 assert.deepEqual(adapter.health().capabilities,[]);
});

test('runtime capability adapter exposes governed capabilities only when enabled',()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const health=adapter.health();
 assert.equal(health.enabled,true);
 assert.ok(health.capabilities.includes('browser.operator'));
 assert.ok(health.capabilities.includes('autonomy.loop'));
 assert.ok(health.capabilities.includes('engineering.mission'));
 assert.ok(health.capabilities.includes('code.semantic-intelligence'));
 assert.ok(health.capabilities.includes('observability.sentry'));
 assert.ok(health.capabilities.includes('intelligence.external'));
 assert.ok(health.capabilities.includes('engineering.independent-review'));
 assert.ok(health.capabilities.includes('media.local-video'));
});

test('disabled adapter fails closed before capability execution',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 await assert.rejects(adapter.browser({action:'health'}),/disabled/i);
});

test('enabled adapter executes browser health through policy-gated seam',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.browser({action:'health'});
 assert.equal(result.capability,'browser.operator');
 assert.equal(result.output.backend,'playwright-cli');
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter executes autonomous loop through capability seam',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.autonomousLoop({objective:'verify bounded loop'});
 assert.equal(result.capability,'autonomy.loop');
 assert.equal(result.output.status,'DONE');
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter executes engineering mission with injectable runtime',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true,engineeringRuntime:async()=>({status:'completed',summary:'done',evidence:['test passed']})});
 const result=await adapter.engineeringMission({objective:'implement safe local change'});
 assert.equal(result.capability,'engineering.mission');
 assert.equal(result.output.status,'DONE');
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter exposes native semantic fallback without overclaiming Serena',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.semanticIntelligence({action:'health',backend:'native'});
 assert.equal(result.capability,'code.semantic-intelligence');
 assert.equal(result.output.health.backend,'native');
 assert.equal(result.output.health.available,true);
 assert.equal(result.output.promotion.promoteSerena,false);
 assert.equal(result.output.policy.authoritativeSource,'repository');
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter triages Sentry evidence without enabling external mutation',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const result=await adapter.sentryObservability({action:'triage',issue:{id:'s1',title:'Checkout crash',level:'error',count:101,userCount:21}});
 assert.equal(result.capability,'observability.sentry');
 assert.equal(result.output.action,'triage');
 if(result.output.action!=='triage')throw new Error('unexpected output');
 assert.equal(result.output.incident.severity,'high');
 assert.equal(result.output.policy.externalWriteAllowed,false);
 assert.deepEqual(result.trace.map(event=>event.phase),['before','execute']);
});

test('enabled adapter exposes zero-cost external intelligence fallback and reviewer',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
 const intelligence=await adapter.externalIntelligence({objective:'research architecture'});
 assert.equal(intelligence.capability,'intelligence.external');
 assert.equal(typeof intelligence.output.summary,'string');
 const review=await adapter.independentReview({objective:'review feature',implementationSummary:'implemented'});
 assert.equal(review.capability,'engineering.independent-review');
 assert.equal(review.output.independent,true);
 assert.deepEqual(review.trace.map(event=>event.phase),['before','execute']);
});

test('local video stays opt-in and never auto-downloads models',async()=>{
 const oldEnabled=process.env.MUNIN_LOCAL_VIDEO_ENABLED;const oldRunner=process.env.MUNIN_LOCAL_VIDEO_RUNNER;
 delete process.env.MUNIN_LOCAL_VIDEO_ENABLED;delete process.env.MUNIN_LOCAL_VIDEO_RUNNER;
 try{
  const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:true});
  const health=await adapter.localVideo({action:'health'});
  assert.equal(health.capability,'media.local-video');
  assert.equal(health.output.ready,false);
  assert.equal(health.output.policy.automaticModelDownloadAllowed,false);
 }finally{
  if(oldEnabled===undefined)delete process.env.MUNIN_LOCAL_VIDEO_ENABLED;else process.env.MUNIN_LOCAL_VIDEO_ENABLED=oldEnabled;
  if(oldRunner===undefined)delete process.env.MUNIN_LOCAL_VIDEO_RUNNER;else process.env.MUNIN_LOCAL_VIDEO_RUNNER=oldRunner;
 }
});
