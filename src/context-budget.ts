import { estimateTokens } from './token-governor.js';

export interface ContextBudget {
  maxChars: number;
  maxEstimatedTokens: number;
  maxFileChars: number;
}

export interface ContextCandidate {
  path: string;
  content: string;
  evidence: string[];
  score?: number;
  generated?: boolean;
  ignored?: boolean;
  binary?: boolean;
}

export interface ContextSelection {
  selected: ContextCandidate[];
  rejected: Array<{ path: string; reason: string }>;
  usedChars: number;
  remainingChars: number;
  avoidedChars: number;
  estimatedSelectedTokens: number;
  estimatedAvoidedTokens: number;
}

function positiveInteger(name: keyof ContextBudget, value: number): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
}

function normalizedPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function applyContextBudget(candidates: ContextCandidate[], budget: ContextBudget): ContextSelection {
  positiveInteger('maxChars', budget.maxChars);
  positiveInteger('maxEstimatedTokens', budget.maxEstimatedTokens);
  positiveInteger('maxFileChars', budget.maxFileChars);

  const selected: ContextCandidate[] = [];
  const rejected: ContextSelection['rejected'] = [];
  let usedChars = 0;
  let estimatedSelectedTokens = 0;
  const ordered = candidates
    .map(candidate => ({ ...candidate, path: normalizedPath(candidate.path) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.path.localeCompare(b.path));

  for (const candidate of ordered) {
    const candidateTokens = estimateTokens(candidate.content);
    let reason: string | undefined;
    if (!candidate.evidence.length) reason = 'missing-relevance-evidence';
    else if (candidate.generated) reason = 'generated-file';
    else if (candidate.ignored) reason = 'ignored-file';
    else if (candidate.binary) reason = 'binary-file';
    else if (candidate.content.length > budget.maxFileChars) reason = 'per-file-budget-exceeded';
    else if (usedChars + candidate.content.length > budget.maxChars || estimatedSelectedTokens + candidateTokens > budget.maxEstimatedTokens) reason = 'context-budget-exceeded';

    if (reason) {
      rejected.push({ path: candidate.path, reason });
      continue;
    }
    selected.push(candidate);
    usedChars += candidate.content.length;
    estimatedSelectedTokens += candidateTokens;
  }

  const totalChars = ordered.reduce((sum, candidate) => sum + candidate.content.length, 0);
  const totalTokens = ordered.reduce((sum, candidate) => sum + estimateTokens(candidate.content), 0);
  return {
    selected,
    rejected,
    usedChars,
    remainingChars: budget.maxChars - usedChars,
    avoidedChars: Math.max(0, totalChars - usedChars),
    estimatedSelectedTokens,
    estimatedAvoidedTokens: Math.max(0, totalTokens - estimatedSelectedTokens),
  };
}
