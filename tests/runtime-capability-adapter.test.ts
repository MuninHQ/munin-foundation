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
 assert.deepEqual(adapter.capabilityNames(),['browser.operator','code.semantic-intelligence','engineering.autonomous-mission','engineering.independent-review','execution.autonomous-loop','intelligence.external','media.local-video','observability.sentry']);
});

test('disabled adapter fails closed before capability execution',async()=>{
 const adapter=new RuntimeCapabilityAdapter(new ExecutionEngine(),{enabled:false});
 await assert.rejects(adapter.browser({action:'health'}),/capability seam is disabled/);
 await assert.rejects(adapter.autonomousLoop({objective:'x',executor:async()=>({status:'PASS'})}),/capability seam is disabled/);
 await assert.rejects(adapter.engineeringMission({objective:'Build local feature'}),/capability seam is disabled/);
 await assert.rejects(adapter.semanticIntelligence({action:'health',backend:'native'}),/capability seam is disabled/);
 await assert.rejects(adapter.sentryObservability({action:'health'}),/capability seam is disabled/);
 await assert.rejects(adapter.externalIntelligence({objective:'research'}),/capability seam is disabled/);
 await assert.rejects(adapter.independentReview({objective:'review',implementationSummary:'done'}),/capability seam is disabled/);
 await assert.rejects(adapter.localVideo({action:'health'}),/capability seam is disabled/);
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
 assert.deepEqual(review.trace.map(event=>event.phase),['execute']);
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
  assert.equal(health.output.policy.empiricalBenchmarkRequired,true);
  const plan=await adapter.localVideo({action:'plan',prompt:'A restrained executive technology scene'});
  assert.equal(plan.output.action,'plan');
  assert.equal(plan.output.request?.width,832);
  await assert.rejects(adapter.localVideo({action:'generate',prompt:'test'}),/disabled/);
 } finally {if(oldEnabled===undefined)delete process.env.MUNIN_LOCAL_VIDEO_ENABLED;else process.env.MUNIN_LOCAL_VIDEO_ENABLED=oldEnabled;if(oldRunner===undefined)delete process.env.MUNIN_LOCAL_VIDEO_RUNNER;else process.env.MUNIN_LOCAL_VIDEO_RUNNER=oldRunner;}
});
