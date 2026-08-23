export type CapabilityDecision = 'adopt' | 'reject' | 'review';

export interface GithubMomentumEvidence {
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  archived?: boolean;
  observedAt?: string;
}

export interface GithubMomentumAssessment {
  score: number;
  starsPerDay: number;
  ageDays: number;
  daysSincePush: number;
  reasons: string[];
}

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
  github?: GithubMomentumEvidence;
  evidence?: string[];
}

export interface CapabilityAssessment {
  id: string;
  decision: CapabilityDecision;
  score: number;
  reasons: string[];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function validDate(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function assessGithubMomentum(evidence: GithubMomentumEvidence): GithubMomentumAssessment {
  const created = validDate(evidence.createdAt);
  const pushed = validDate(evidence.pushedAt);
  const observed = validDate(evidence.observedAt ?? '') ?? Date.now();
  if (created === undefined || pushed === undefined || created > observed || pushed > observed) {
    return { score: 0, starsPerDay: 0, ageDays: 0, daysSincePush: 0, reasons: ['GitHub momentum dates are invalid.'] };
  }

  const ageDays = Math.max(1, (observed - created) / 86_400_000);
  const daysSincePush = Math.max(0, (observed - pushed) / 86_400_000);
  const stars = Math.max(0, evidence.stars);
  const forks = Math.max(0, evidence.forks);
  const starsPerDay = stars / ageDays;
  const velocity = clamp(starsPerDay / 50);
  const popularity = clamp(Math.log10(stars + 1) / 5);
  const activity = clamp(1 - daysSincePush / 180);
  const community = clamp(Math.log10(forks + 1) / 4);
  const score = Number((velocity * 0.45 + popularity * 0.25 + activity * 0.2 + community * 0.1).toFixed(3));
  const reasons: string[] = [];
  if (evidence.archived) reasons.push('Repository is archived.');
  if (daysSincePush > 180) reasons.push('Repository has not been pushed in more than 180 days.');
  if (starsPerDay < 1) reasons.push('Star velocity is below one star per day.');
  return { score, starsPerDay: Number(starsPerDay.toFixed(2)), ageDays: Number(ageDays.toFixed(1)), daysSincePush: Number(daysSincePush.toFixed(1)), reasons };
}

export function assessCapability(candidate: CapabilityCandidate): CapabilityAssessment {
  const reasons: string[] = [];
  if ((candidate.recurringCost ?? 0) > 0 || candidate.metered || candidate.paidApiRequired) return { id: candidate.id, decision: 'reject', score: 0, reasons: ['Violates zero-additional-cost default.'] };
  if (candidate.github?.archived) return { id: candidate.id, decision: 'reject', score: 0, reasons: ['Repository is archived.'] };
  if (!candidate.license) reasons.push('License evidence missing.');

  const maintenance = clamp(candidate.maintenanceScore ?? 0.5);
  const security = clamp(candidate.securityScore ?? 0.5);
  const duplication = clamp(candidate.duplicationScore ?? 0);
  const githubSource = candidate.source.toLowerCase().includes('github');
  const momentum = candidate.github ? assessGithubMomentum(candidate.github) : undefined;
  if (githubSource && !momentum) reasons.push('GitHub momentum evidence missing.');
  if (momentum) reasons.push(...momentum.reasons);

  const momentumScore = momentum?.score ?? 0.5;
  const score = Number((maintenance * 0.3 + security * 0.4 + (1 - duplication) * 0.2 + momentumScore * 0.1).toFixed(3));
  if (security < 0.5) reasons.push('Security confidence is below threshold.');
  if (duplication > 0.7) reasons.push('Likely duplicates existing Munin capability.');
  if (momentum && momentum.score < 0.35) reasons.push('GitHub momentum is below the adoption threshold.');

  const requiresReview = !candidate.license || security < 0.5 || duplication > 0.7 || (githubSource && !momentum) || Boolean(momentum && momentum.score < 0.35);
  if (requiresReview) return { id: candidate.id, decision: 'review', score, reasons };
  return { id: candidate.id, decision: score >= 0.7 ? 'adopt' : 'review', score, reasons: reasons.length ? reasons : ['Zero-cost candidate clears cost, license, security, duplication, maintenance, and momentum gates.'] };
}

export class CapabilityDecisionLog {
  private readonly assessments = new Map<string, CapabilityAssessment>();
  record(assessment: CapabilityAssessment): CapabilityAssessment { this.assessments.set(assessment.id, assessment); return assessment }
  get(id: string): CapabilityAssessment | undefined { return this.assessments.get(id) }
  shouldReassess(id: string): boolean { return !this.assessments.has(id) }
  list(): CapabilityAssessment[] { return [...this.assessments.values()] }
}
