import test from 'node:test';
import assert from 'node:assert/strict';
import { sentryConfigurationHealth, sentryObservabilityPolicy, triageSentryIssue, validateSentryBaseUrl } from '../src/sentry-observability.js';

test('Sentry observability policy is read-only and keeps consequential actions disabled',()=>{
 const policy=sentryObservabilityPolicy();
 assert.equal(policy.mode,'read-only-triage');
 assert.equal(policy.externalWriteAllowed,false);
 assert.equal(policy.issueMutationAllowed,false);
 assert.equal(policy.autoResolveAllowed,false);
 assert.equal(policy.autoDeployAllowed,false);
});

test('Sentry configuration health never exposes secret values and degrades when auth is absent',()=>{
 const health=sentryConfigurationHealth({SENTRY_AUTH_TOKEN:'super-secret'} as NodeJS.ProcessEnv);
 assert.equal(health.available,false);
 assert.equal(health.configured,false);
 assert.doesNotMatch(JSON.stringify(health),/super-secret/);
});

test('Sentry base URL requires credential-free https origin',()=>{
 assert.equal(validateSentryBaseUrl('https://sentry.io/api/0'),'https://sentry.io');
 assert.throws(()=>validateSentryBaseUrl('http://sentry.local'),/must use https/);
 assert.throws(()=>validateSentryBaseUrl('https://user:pass@sentry.example.com'),/embedded credentials/);
});

test('Sentry issue triage produces bounded incident seed without authorizing release',()=>{
 const incident=triageSentryIssue({id:'123',title:'TypeError in checkout',level:'error',status:'unresolved',count:'132',userCount:24,culprit:'checkout.submit'});
 assert.equal(incident.source,'sentry');
 assert.equal(incident.severity,'high');
 assert.equal(incident.autoFixEligible,true);
 assert.match(incident.recommendedNextStep,/tests plus verification/i);
 assert.ok(incident.evidence.some(item=>item==='culprit=checkout.submit'));
});

test('critical Sentry issue is never marked auto-fix eligible',()=>{
 const incident=triageSentryIssue({id:'999',title:'Fatal startup crash',level:'fatal',count:1,userCount:1});
 assert.equal(incident.severity,'critical');
 assert.equal(incident.autoFixEligible,false);
});
