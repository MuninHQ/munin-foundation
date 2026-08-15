import test from 'node:test';
import assert from 'node:assert/strict';
import { repositoryIntelligenceHealth, repositoryIntelligencePolicy } from '../src/repository-intelligence.js';

test('keeps repository authoritative with rag-rat preferred and native fallback',()=>{
 const policy=repositoryIntelligencePolicy();assert.equal(policy.authoritativeSource,'repository');assert.equal(policy.preferredIndex,'rag-rat');assert.equal(policy.structuralGraphExperiment,'graphify');assert.equal(policy.fallback,'native');assert.equal(policy.externalIndexAuthoritative,false);assert.equal(policy.paidDependencyRequired,false);
});

test('native repository inspection is always available',async()=>{
 const health=await repositoryIntelligenceHealth('native');assert.equal(health.available,true);assert.equal(health.backend,'native');
});
