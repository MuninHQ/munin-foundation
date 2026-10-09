import { assessOpportunity, type OpportunityAssessment } from './opportunity-assessment.js';
import { buildOfferArchitecture, type OfferArchitectInput, type OfferArchitectResult } from './offer-architect.js';

export interface OfferOpportunityMeta {
  id: string;
  problem?: string;
  existingCapabilityOverlap: number;
  integrationCost: number;
  securityImpact: number;
}

export interface OfferBackedOpportunityAssessment {
  offer: OfferArchitectResult;
  opportunity: OpportunityAssessment;
}

export function assessOfferBackedOpportunity(
  input: OfferArchitectInput,
  meta: OfferOpportunityMeta,
): OfferBackedOpportunityAssessment {
  const offer = buildOfferArchitecture(input);
  const proven = offer.evidenceGate.filter(item => item.status === 'PROVEN');
  const evidence = proven.map(item => item.claim);
  const evidenceFactor = proven.length > 0 ? 1 : 0.65;
  const expectedValue = Math.max(0, Math.min(1, (offer.qualityGate.score / 100) * evidenceFactor));
  const opportunity = assessOpportunity({
    id: meta.id,
    problem: meta.problem?.trim() || input.pain.trim(),
    evidence,
    existingCapabilityOverlap: meta.existingCapabilityOverlap,
    expectedValue,
    integrationCost: meta.integrationCost,
    securityImpact: meta.securityImpact,
  });
  return { offer, opportunity };
}
