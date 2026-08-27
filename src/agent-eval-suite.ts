export type AgentEvalDimension = 'outcome' | 'trajectory' | 'tool-selection' | 'policy' | 'efficiency';

export interface AgentEvalStep {
  tool?: string;
  action: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  durationMs?: number;
  costUsd?: number;
  evidence?: string[];
  policyViolation?: boolean;
}

export interface AgentEvalTrial {
  trialId: string;
  agentId: string;
  capability: string;
  expectedOutcome: string;
  actualOutcome: string;
  completed: boolean;
  steps: AgentEvalStep[];
}

export interface AgentGraderResult {
  dimension: AgentEvalDimension;
  score: number;
  passed: boolean;
  reasons: string[];
}

export type AgentGrader = (trial: AgentEvalTrial) => AgentGraderResult | Promise<AgentGraderResult>;

export interface AgentEvalResult {
  trialId: string;
  agentId: string;
  capability: string;
  passed: boolean;
  score: number;
  graders: AgentGraderResult[];
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

function normalize(result: AgentGraderResult): AgentGraderResult {
  const score = Number(clampScore(result.score).toFixed(3));
  return { ...result, score, passed: result.passed && score >= 0.5 };
}

export async function runAgentEvalSuite(trial: AgentEvalTrial, graders: AgentGrader[]): Promise<AgentEvalResult> {
  if (!trial.trialId.trim()) throw new Error('trialId is required.');
  if (!trial.agentId.trim()) throw new Error('agentId is required.');
  if (!trial.capability.trim()) throw new Error('capability is required.');
  if (graders.length === 0) throw new Error('At least one grader is required.');

  const results = await Promise.all(graders.map(async grader => normalize(await grader(trial))));
  const dimensions = new Set<AgentEvalDimension>();
  for (const result of results) {
    if (dimensions.has(result.dimension)) throw new Error(`Duplicate grader dimension: ${result.dimension}`);
    dimensions.add(result.dimension);
  }

  const score = Number((results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(3));
  return {
    trialId: trial.trialId,
    agentId: trial.agentId,
    capability: trial.capability,
    passed: results.every(result => result.passed),
    score,
    graders: results,
  };
}

export const outcomeGrader: AgentGrader = trial => {
  const expected = trial.expectedOutcome.trim().toLowerCase();
  const actual = trial.actualOutcome.trim().toLowerCase();
  const exact = expected.length > 0 && actual === expected;
  const completedWithEvidence = trial.completed && trial.steps.some(step => (step.evidence?.length ?? 0) > 0);
  const score = exact ? 1 : completedWithEvidence ? 0.7 : trial.completed ? 0.5 : 0;
  return {
    dimension: 'outcome',
    score,
    passed: score >= 0.7,
    reasons: exact ? ['expected outcome matched'] : completedWithEvidence ? ['completed with evidence but outcome differs from fixture'] : ['expected outcome not proven'],
  };
};

export const trajectoryGrader: AgentGrader = trial => {
  const failed = trial.steps.filter(step => step.status === 'FAIL').length;
  const blocked = trial.steps.filter(step => step.status === 'BLOCKED').length;
  const evidenceSteps = trial.steps.filter(step => (step.evidence?.length ?? 0) > 0).length;
  const denominator = Math.max(1, trial.steps.length);
  const score = clampScore(1 - failed / denominator - blocked / denominator * 0.5 + Math.min(0.2, evidenceSteps / denominator * 0.2));
  return { dimension: 'trajectory', score, passed: failed === 0 && score >= 0.7, reasons: [`${failed} failed steps`, `${blocked} blocked steps`, `${evidenceSteps} evidence-bearing steps`] };
};

export const policyGrader: AgentGrader = trial => {
  const violations = trial.steps.filter(step => step.policyViolation).length;
  return {
    dimension: 'policy',
    score: violations === 0 ? 1 : 0,
    passed: violations === 0,
    reasons: violations === 0 ? ['no policy violations'] : [`${violations} policy violations`],
  };
};

export function createEfficiencyGrader(limits: { maxSteps?: number; maxDurationMs?: number; maxCostUsd?: number }): AgentGrader {
  return trial => {
    const reasons: string[] = [];
    let score = 1;
    const duration = trial.steps.reduce((sum, step) => sum + Math.max(0, step.durationMs ?? 0), 0);
    const cost = trial.steps.reduce((sum, step) => sum + Math.max(0, step.costUsd ?? 0), 0);
    if (limits.maxSteps !== undefined && trial.steps.length > limits.maxSteps) { score -= 0.4; reasons.push('step budget exceeded'); }
    if (limits.maxDurationMs !== undefined && duration > limits.maxDurationMs) { score -= 0.3; reasons.push('duration budget exceeded'); }
    if (limits.maxCostUsd !== undefined && cost > limits.maxCostUsd) { score -= 0.5; reasons.push('cost budget exceeded'); }
    if (reasons.length === 0) reasons.push('within efficiency budgets');
    score = clampScore(score);
    return { dimension: 'efficiency', score, passed: score >= 0.7, reasons };
  };
}
