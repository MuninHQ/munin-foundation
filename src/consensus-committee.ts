export type CommitteeRole = 'product' | 'architecture' | 'security' | 'qa' | 'cost';
export type CommitteeVote = 'approve' | 'revise' | 'block';
export interface CommitteeOpinion { role: CommitteeRole; vote: CommitteeVote; reason: string; evidence?: string[] }
export interface CommitteeDecision { outcome: CommitteeVote; score: number; opinions: CommitteeOpinion[]; rationale: string[] }
const WEIGHTS: Record<CommitteeRole, number> = { product: 2, architecture: 2, security: 3, qa: 2, cost: 3 };
export function decideByConsensus(opinions: CommitteeOpinion[]): CommitteeDecision {
  const unique = new Map<CommitteeRole, CommitteeOpinion>();
  for (const opinion of opinions) unique.set(opinion.role, opinion);
  const normalized = [...unique.values()];
  const hardBlock = normalized.some(o => (o.role === 'security' || o.role === 'cost') && o.vote === 'block');
  const weighted = normalized.reduce((sum, o) => sum + WEIGHTS[o.role] * (o.vote === 'approve' ? 1 : o.vote === 'block' ? -1 : 0), 0);
  const max = normalized.reduce((sum, o) => sum + WEIGHTS[o.role], 0) || 1;
  const score = Number((weighted / max).toFixed(3));
  let outcome: CommitteeVote = 'revise';
  if (hardBlock || score < -0.25) outcome = 'block';
  else if (normalized.length >= 3 && score >= 0.5 && !normalized.some(o => o.vote === 'block')) outcome = 'approve';
  return { outcome, score, opinions: normalized, rationale: normalized.map(o => `${o.role}: ${o.vote} — ${o.reason}`) };
}
export interface CostGateInput { recurringCost?: number; meteredService?: boolean; paidApiRequired?: boolean; explicitHumanApproval?: boolean }
export function zeroCostGate(input: CostGateInput): CommitteeOpinion {
  const paid = (input.recurringCost ?? 0) > 0 || input.meteredService === true || input.paidApiRequired === true;
  if (paid && !input.explicitHumanApproval) return { role: 'cost', vote: 'block', reason: 'Violates zero-additional-cost default policy.' };
  return { role: 'cost', vote: 'approve', reason: paid ? 'Paid path explicitly approved by human.' : 'No additional paid dependency detected.' };
}
