import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimePath } from './config.js';
import { redactSecretText } from './secret-redaction.js';
import type { ShadowModelTier, ShadowReasoningEffort, TokenGovernorObservation } from './token-governor.js';

export interface TokenGovernorMetrics {
  observations: number;
  oversizedObservations: number;
  estimatedOriginalTokens: number;
  estimatedRetainedTokens: number;
  estimatedSavedTokens: number;
  estimatedSavingsRatio: number;
  appliedChanges: number;
  byModelTier: Record<ShadowModelTier, number>;
  byEffort: Record<ShadowReasoningEffort, number>;
}

function isObservation(value: unknown): value is TokenGovernorObservation {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TokenGovernorObservation>;
  return candidate.mode === 'shadow'
    && typeof candidate.runId === 'string'
    && typeof candidate.output?.estimatedOriginalTokens === 'number'
    && typeof candidate.output?.estimatedRetainedTokens === 'number'
    && typeof candidate.output?.estimatedSavedTokens === 'number'
    && candidate.recommendation?.applied === false;
}

export class TokenGovernorStore {
  constructor(private readonly file = runtimePath('token-governor-observations.jsonl')) {}

  async append(observation: TokenGovernorObservation): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const redacted = JSON.stringify(observation, (_key, value: unknown) => typeof value === 'string' ? redactSecretText(value) : value);
    await appendFile(this.file, redacted + '\n', 'utf8');
  }

  async list(limit = 100): Promise<TokenGovernorObservation[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit must be an integer between 1 and 1000');
    try {
      const text = await readFile(this.file, 'utf8');
      const observations: TokenGovernorObservation[] = [];
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        try {
          const parsed: unknown = JSON.parse(line);
          if (isObservation(parsed)) observations.push(parsed);
        } catch {
          // Malformed telemetry is ignored so observation never blocks execution.
        }
      }
      return observations.slice(-limit).reverse();
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
}

export function summarizeTokenGovernorObservations(observations: TokenGovernorObservation[]): TokenGovernorMetrics {
  const estimatedOriginalTokens = observations.reduce((sum, item) => sum + item.output.estimatedOriginalTokens, 0);
  const estimatedRetainedTokens = observations.reduce((sum, item) => sum + item.output.estimatedRetainedTokens, 0);
  const estimatedSavedTokens = observations.reduce((sum, item) => sum + item.output.estimatedSavedTokens, 0);
  const byModelTier: Record<ShadowModelTier, number> = { economy: 0, premium: 0 };
  const byEffort: Record<ShadowReasoningEffort, number> = { low: 0, medium: 0, high: 0 };
  for (const item of observations) {
    byModelTier[item.recommendation.modelTier] += 1;
    byEffort[item.recommendation.effort] += 1;
  }
  return {
    observations: observations.length,
    oversizedObservations: observations.filter(item => item.output.compressed).length,
    estimatedOriginalTokens,
    estimatedRetainedTokens,
    estimatedSavedTokens,
    estimatedSavingsRatio: estimatedOriginalTokens ? estimatedSavedTokens / estimatedOriginalTokens : 0,
    appliedChanges: observations.filter(item => item.recommendation.applied).length,
    byModelTier,
    byEffort,
  };
}
