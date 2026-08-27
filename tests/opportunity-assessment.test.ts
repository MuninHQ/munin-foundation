import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOpportunity } from '../src/opportunity-assessment.js';

test('opportunity gate promotes evidenced high-value low-overlap work', () => {
  const result = assessOpportunity({ id:'new', problem:'Improve completion proof', evidence:['eval gap'], existingCapabilityOverlap:0.1, expectedValue:0.95, integrationCost:0.2, securityImpact:0.1 });
  assert.equal(result.decision, 'GO');
});

test('opportunity gate kills near-duplicate work', () => {
  const result = assessOpportunity({ id:'duplicate', problem:'Add another tripwire', evidence:['repo scan'], existingCapabilityOverlap:0.98, expectedValue:0.8, integrationCost:0.1, securityImpact:0.1 });
  assert.equal(result.decision, 'KILL');
});

test('opportunity gate requests clarification without evidence', () => {
  const result = assessOpportunity({ id:'idea', problem:'Maybe useful', evidence:[], existingCapabilityOverlap:0.1, expectedValue:0.8, integrationCost:0.1, securityImpact:0.1 });
  assert.equal(result.decision, 'CLARIFY');
});
