import test from 'node:test';
import assert from 'node:assert/strict';
import { browserHealth, browserOperatorPolicy, recommendBrowserBackend, scoreBrowserBenchmark } from '../src/browser-operator.js';

test('prefers Playwright CLI without requiring a paid cloud',()=>{
 const policy=browserOperatorPolicy();assert.equal(policy.preferred,'playwright-cli');assert.equal(policy.fallback,'browser-use');assert.equal(policy.cloudRequired,false);assert.equal(policy.paidDependencyRequired,false);assert.equal(policy.actionPolicyRequired,true);assert.equal(policy.benchmarkRequiredBeforePromotion,true);
});

test('missing local browser backend degrades to health status instead of crashing',async()=>{
 const health=await browserHealth('playwright-cli');assert.equal(health.backend,'playwright-cli');assert.equal(typeof health.available,'boolean');assert.ok(health.command);
});

test('browser benchmark rejects backends without audit and permission gates',()=>{
 const result=scoreBrowserBenchmark({backend:'browser-use',available:true,actionLog:false,replay:true,permissionGate:false,mobileTrigger:true,navigationMs:100,formMs:100,recoveryMs:100,contextTokens:100,memoryMb:100});
 assert.equal(result.eligible,false);assert.equal(result.score,0);assert.ok(result.reasons.includes('missing action log'));assert.ok(result.reasons.includes('missing deterministic permission gate'));
});

test('browser benchmark recommends highest-scoring eligible backend',()=>{
 const recommendation=recommendBrowserBackend([
  {backend:'playwright-cli',available:true,actionLog:true,replay:true,permissionGate:true,mobileTrigger:true,navigationMs:500,formMs:700,recoveryMs:1200,contextTokens:1200,memoryMb:250},
  {backend:'browser-use',available:true,actionLog:true,replay:true,permissionGate:true,mobileTrigger:true,navigationMs:1200,formMs:1800,recoveryMs:800,contextTokens:9000,memoryMb:600},
 ]);
 assert.equal(recommendation.recommended,'playwright-cli');assert.equal(recommendation.ranked.length,2);assert.ok(recommendation.ranked[0].score>recommendation.ranked[1].score);
});
