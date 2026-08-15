import test from 'node:test';
import assert from 'node:assert/strict';
import { browserHealth, browserOperatorPolicy } from '../src/browser-operator.js';

test('prefers Playwright CLI without requiring a paid cloud',()=>{
 const policy=browserOperatorPolicy();assert.equal(policy.preferred,'playwright-cli');assert.equal(policy.fallback,'browser-use');assert.equal(policy.cloudRequired,false);assert.equal(policy.paidDependencyRequired,false);assert.equal(policy.actionPolicyRequired,true);
});

test('missing local browser backend degrades to health status instead of crashing',async()=>{
 const health=await browserHealth('playwright-cli');assert.equal(health.backend,'playwright-cli');assert.equal(typeof health.available,'boolean');assert.ok(health.command);
});
