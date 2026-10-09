import type { CapabilityBenchmarkResult } from './capability-promotion-benchmark.js';
import type { CapabilityCandidate } from './capability-radar.js';
import type { TokenEfficiencyConfig } from './token-efficiency-config.js';
import { estimateTokens } from './token-efficiency-usage.js';

export interface TokenEfficiencyPromotionObservation {
  candidateId: string;
  contextTokens: number;
  recommendedTier: 'local_model' | 'strong_model';
  zeroCostCompatible: boolean;
  sufficientEvidence: boolean;
  benchmarkStatus: CapabilityBenchmarkResult['status'];
}

export function buildPromotionEfficiencyObservation(candidate: CapabilityCandidate, benchmark: CapabilityBenchmarkResult): TokenEfficiencyPromotionObservation {
  const zeroCostCompatible = (candidate.recurringCost ?? 0) === 0 && !candidate.metered && !candidate.paidApiRequired;
  const sufficientEvidence = (candidate.evidence?.length ?? 0) >= 4;
  return Object.freeze({
    candidateId: candidate.id,
    contextTokens: estimateTokens(JSON.stringify(candidate)),
    recommendedTier: zeroCostCompatible && (candidate.securityScore ?? 0) >= 0.7 ? 'local_model' : 'strong_model',
    zeroCostCompatible,
    sufficientEvidence,
    benchmarkStatus: benchmark.status,
  });
}

export function observePromotionEfficiency(candidate: CapabilityCandidate, benchmark: CapabilityBenchmarkResult, config: Readonly<TokenEfficiencyConfig>): TokenEfficiencyPromotionObservation | undefined {
  if (!config.enabled || !config.promotionObservationEnabled) return undefined;
  return buildPromotionEfficiencyObservation(candidate, benchmark);
}
