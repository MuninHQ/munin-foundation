import type { TokenEfficiencyConfig } from './token-efficiency-config.js';
import type { TokenUsageSample } from './token-efficiency-usage.js';

export type ContextBudgetState = 'healthy' | 'warning' | 'critical' | 'checkpoint_recommended' | 'unavailable';
export interface ContextBudgetAssessment {
  scope: 'task' | 'session';
  state: ContextBudgetState;
  usedTokens?: number;
  thresholdTokens?: number;
  percentUsed?: number;
  reason: string;
}

export function evaluateContextBudget(scope: 'task' | 'session', samples: TokenUsageSample[], config: Readonly<TokenEfficiencyConfig>): ContextBudgetAssessment {
  if (!samples.length || samples.some(sample => sample.totalTokens === undefined || sample.quality === 'unavailable')) return { scope, state: 'unavailable', reason: 'Complete token usage is unavailable for this scope.' };
  const totals = samples.map(sample => sample.totalTokens).filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (!totals.length) return { scope, state: 'unavailable', reason: 'Token usage is unavailable for this scope.' };
  const usedTokens = totals.reduce((sum, value) => sum + value, 0);
  const warning = scope === 'task' ? config.taskWarningTokens : config.sessionWarningTokens;
  const critical = scope === 'task' ? config.taskCriticalTokens : config.sessionCriticalTokens;
  let state: ContextBudgetState = 'healthy';
  let thresholdTokens = warning;
  if (scope === 'session' && usedTokens >= config.freshSessionTokens) {
    state = 'checkpoint_recommended';
    thresholdTokens = config.freshSessionTokens;
  } else if (usedTokens >= critical) {
    state = 'critical';
    thresholdTokens = critical;
  } else if (usedTokens >= warning) {
    state = 'warning';
    thresholdTokens = warning;
  }
  return {
    scope,
    state,
    usedTokens,
    thresholdTokens,
    percentUsed: Number((usedTokens / critical * 100).toFixed(2)),
    reason: state === 'healthy' ? 'Context usage is below the warning threshold.' : `${scope} context reached ${state} threshold.`,
  };
}
