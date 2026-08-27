export type OpportunityDecision = 'GO' | 'CLARIFY' | 'KILL';

export interface OpportunityAssessmentInput {
  id: string;
  problem: string;
  evidence: string[];
  existingCapabilityOverlap: number;
  expectedValue: number;
  integrationCost: number;
  securityImpact: number;
}

export interface OpportunityAssessment {
  id: string;
  decision: OpportunityDecision;
  score: number;
  reasons: string[];
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function assessOpportunity(input: OpportunityAssessmentInput): OpportunityAssessment {
  if (!input.problem.trim()) return { id: input.id, decision: 'KILL', score: 0, reasons: ['Problem statement is missing.'] };
  const overlap = clamp(input.existingCapabilityOverlap);
  const value = clamp(input.expectedValue);
  const cost = clamp(input.integrationCost);
  const security = clamp(input.securityImpact);
  const reasons: string[] = [];

  if (input.evidence.length === 0) reasons.push('Evidence is missing.');
  if (overlap >= 0.85) reasons.push('Existing capability overlap is too high.');
  if (value < 0.35) reasons.push('Expected value is below threshold.');
  if (security >= 0.8) reasons.push('Security impact is too high for autonomous promotion.');

  const score = Number((value * 0.45 + (1 - overlap) * 0.25 + (1 - cost) * 0.15 + (1 - security) * 0.15).toFixed(3));
  if (overlap >= 0.95 || value < 0.2) return { id: input.id, decision: 'KILL', score, reasons };
  if (!input.evidence.length || overlap >= 0.7 || security >= 0.65 || score < 0.65) return { id: input.id, decision: 'CLARIFY', score, reasons };
  return { id: input.id, decision: 'GO', score, reasons: reasons.length ? reasons : ['Opportunity clears evidence, value, overlap, cost, and security gates.'] };
}
