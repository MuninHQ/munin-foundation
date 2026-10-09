import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfferArchitecture, type OfferArchitectInput } from '../src/offer-architect.js';
import { assessOfferBackedOpportunity } from '../src/offer-opportunity-adapter.js';

function base(overrides: Partial<OfferArchitectInput> = {}): OfferArchitectInput {
  return {
    id: 'offer-test',
    productService: 'AI Operations Sprint',
    avatar: 'small operations teams',
    pain: 'manual repetitive work',
    dreamOutcome: 'automate the highest-friction workflows',
    mechanism: 'concierge automation sprint',
    objections: ['fear of breaking existing workflows'],
    coreDeliverables: ['workflow map', 'three automations', 'rollback runbook'],
    bonuses: [{
      name: 'Rollback Pack',
      purpose: 'reduce operational risk',
      objection: 'fear of breaking existing workflows',
    }],
    dreamOutcomeStrength: 8,
    perceivedLikelihood: 7,
    timeDelay: 4,
    effortAndSacrifice: 4,
    ...overrides,
  };
}
test('builds value equation and keeps the dream outcome as an assumption by default', () => {
  const result = buildOfferArchitecture(base());
  assert.equal(result.valueEquation.rawValue, 3.5);
  assert.equal(result.evidenceGate.find(item => item.id === 'dream-outcome')?.status, 'ASSUMPTION');
  assert.equal(result.qualityGate.publishSafe, false);
  assert.equal(result.qualityGate.readiness, 'NEEDS_EVIDENCE');
});

test('downgrades unsupported PROVEN claims to TEST', () => {
  const result = buildOfferArchitecture(base({
    claims: [{ id: 'dream-outcome', claim: 'Customer gets the promised outcome.', status: 'PROVEN', evidenceIds: ['missing'] }],
  }));
  assert.equal(result.evidenceGate[0]?.status, 'TEST');
  assert.match(result.evidenceGate[0]?.rationale ?? '', /requires linked evidence/i);
});

test('blocks unsupported scarcity rather than inventing urgency', () => {
  const result = buildOfferArchitecture(base({
    scarcity: { type: 'capacity', detail: 'Only three slots remain.' },
  }));
  assert.equal(result.evidenceGate.find(item => item.id === 'scarcity')?.status, 'INVALID');
  assert.equal(result.qualityGate.readiness, 'BLOCKED');
  assert.equal(result.qualityGate.publishSafe, false);
});
test('accepts linked evidence and exposes research hooks without paid dependencies', () => {
  const result = buildOfferArchitecture(base({
    evidence: [{ id: 'e1', source: 'pilot', detail: 'Observed two successful controlled workflows.' }],
    claims: [{ id: 'dream-outcome', claim: 'The target workflow can be automated.', status: 'PROVEN', evidenceIds: ['e1'] }],
    alternatives: [{ name: 'traditional consulting', note: 'slower implementation' }],
  }));
  assert.equal(result.evidenceGate[0]?.status, 'PROVEN');
  assert.equal(result.qualityGate.checks.find(item => item.id === 'proof')?.pass, true);
  assert.ok(result.researchPlan.queries.some(query => query.includes('traditional consulting')));
});

test('offer-backed opportunity stays in clarification when evidence is absent', () => {
  const result = assessOfferBackedOpportunity(base(), {
    id: 'side-income-idea',
    existingCapabilityOverlap: 0.1,
    integrationCost: 0.2,
    securityImpact: 0.1,
  });
  assert.equal(result.opportunity.decision, 'CLARIFY');
  assert.ok(result.opportunity.reasons.includes('Evidence is missing.'));
});
