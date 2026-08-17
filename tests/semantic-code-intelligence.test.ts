import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSemanticPromotion, semanticBackendHealth, semanticCodeIntelligencePolicy, type SemanticHealth } from '../src/semantic-code-intelligence.js';

test('semantic intelligence policy keeps repository authoritative and native fallback',()=>{
 const policy=semanticCodeIntelligencePolicy();
 assert.equal(policy.authoritativeSource,'repository');
 assert.equal(policy.preferredSemanticBackend,'serena');
 assert.equal(policy.fallback,'native');
 assert.equal(policy.cloudRequired,false);
 assert.equal(policy.paidDependencyRequired,false);
 assert.equal(policy.autoInstallAllowed,false);
});

test('native semantic health is always available without overclaiming symbols',async()=>{
 const health=await semanticBackendHealth('native');
 assert.equal(health.available,true);
 assert.deepEqual(health.capabilities,[]);
 assert.match(health.detail??'',/does not claim symbol\/reference semantics/);
});

test('semantic promotion fails closed when Serena is unavailable',()=>{
 const sample:SemanticHealth={backend:'serena',available:false,capabilities:[],detail:'not installed'};
 const decision=decideSemanticPromotion(sample);
 assert.equal(decision.promoteSerena,false);
 assert.equal(decision.recommended,'native');
 assert.ok(decision.reasons.some(reason=>reason.includes('unavailable')));
});

test('semantic promotion requires symbols references and diagnostics',()=>{
 const sample:SemanticHealth={backend:'serena',available:true,command:'serena',capabilities:['symbols','references']};
 const decision=decideSemanticPromotion(sample);
 assert.equal(decision.promoteSerena,false);
 assert.ok(decision.reasons.some(reason=>reason.includes('diagnostics')));
});

test('semantic promotion recommends Serena only when health contract is satisfied',()=>{
 const sample:SemanticHealth={backend:'serena',available:true,command:'serena',capabilities:['symbols','references','diagnostics','symbol-editing']};
 const decision=decideSemanticPromotion(sample);
 assert.equal(decision.promoteSerena,true);
 assert.equal(decision.recommended,'serena');
});
