export type CapabilityDecision = 'adopt' | 'reject' | 'review';

export interface CapabilityCandidate {
  id: string;
  name: string;
  source: string;
  license?: string;
  recurringCost?: number;
  metered?: boolean;
  paidApiRequired?: boolean;
  maintenanceScore?: number;
  securityScore?: number;
  duplicationScore?: number;
  evidence?: string[];
}

export interface CapabilityAssessment {
  id: string;
  decision: CapabilityDecision;
  score: number;
  reasons: string[];
}

export function assessCapability(candidate: CapabilityCandidate): CapabilityAssessment {
  const reasons: string[] = [];
  if ((candidate.recurringCost ?? 0) > 0 || candidate.metered || candidate.paidApiRequired) return { id: candidate.id, decision: 'reject', score: 0, reasons: ['Violates zero-additional-cost default.'] };
  if (!candidate.license) reasons.push('License evidence missing.');
  const maintenance = Math.max(0, Math.min(1, candidate.maintenanceScore ?? 0.5));
  const security = Math.max(0, Math.min(1, candidate.securityScore ?? 0.5));
  const duplication = Math.max(0, Math.min(1, candidate.duplicationScore ?? 0));
  const score = Number((maintenance * 0.35 + security * 0.45 + (1 - duplication) * 0.2).toFixed(3));
  if (security < 0.5) reasons.push('Security confidence is below threshold.');
  if (duplication > 0.7) reasons.push('Likely duplicates existing Munin capability.');
  if (!candidate.license || security < 0.5 || duplication > 0.7) return { id: candidate.id, decision: 'review', score, reasons };
  return { id: candidate.id, decision: score >= 0.7 ? 'adopt' : 'review', score, reasons: reasons.length ? reasons : ['Zero-cost candidate clears baseline evidence gates.'] };
}

export class CapabilityDecisionLog {
  private readonly assessments = new Map<string, CapabilityAssessment>();
  record(assessment: CapabilityAssessment): CapabilityAssessment { this.assessments.set(assessment.id, assessment); return assessment }
  get(id: string): CapabilityAssessment | undefined { return this.assessments.get(id) }
  shouldReassess(id: string): boolean { return !this.assessments.has(id) }
  list(): CapabilityAssessment[] { return [...this.assessments.values()] }
}
