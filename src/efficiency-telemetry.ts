import type { EconomicModelTier } from './token-governor.js';
import { estimateTokens } from './token-governor.js';

export type ZeroRiskMode = 'disabled' | 'copy-only' | 'copy-and-open';
export interface EfficiencyObservationInput { runId: string; candidateFiles: number; selectedFiles: number; inputChars: number; selectedChars: number; outputOriginalChars: number; outputRetainedChars: number; capabilitiesConsidered: number; capabilitiesActive: number; reusedHistoryChars: number; modelTier: EconomicModelTier; reasonCode: string; zeroRiskMode: ZeroRiskMode; observedAt?: string; }
export interface EfficiencyObservation {
  runId: string;
  observedAt: string;
  contextEfficiency: { candidateFiles: number; selectedFiles: number; inputChars: number; selectedChars: number; avoidedContextChars: number; estimatedAvoidedContextTokens: number; outputOriginalChars: number; outputRetainedChars: number; truncatedOutputChars: number; capabilitiesConsidered: number; capabilitiesActive: number; reusedHistoryChars: number; modelTier: EconomicModelTier; reasonCode: string; zeroRiskMode: ZeroRiskMode; };
  creditSavingsProxy: { kind: 'estimated-avoidable-context-tokens'; estimatedTokens: number; limitation: string; };
}
const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function observeEfficiency(input: EfficiencyObservationInput): EfficiencyObservation {
  const inputChars = nonNegative(input.inputChars), selectedChars = Math.min(inputChars, nonNegative(input.selectedChars));
  const outputOriginalChars = nonNegative(input.outputOriginalChars), outputRetainedChars = Math.min(outputOriginalChars, nonNegative(input.outputRetainedChars));
  const avoidedContextChars = inputChars - selectedChars;
  return { runId: input.runId, observedAt: input.observedAt ?? new Date().toISOString(), contextEfficiency: { candidateFiles: nonNegative(input.candidateFiles), selectedFiles: nonNegative(input.selectedFiles), inputChars, selectedChars, avoidedContextChars, estimatedAvoidedContextTokens: estimateTokens('x'.repeat(avoidedContextChars)), outputOriginalChars, outputRetainedChars, truncatedOutputChars: outputOriginalChars - outputRetainedChars, capabilitiesConsidered: nonNegative(input.capabilitiesConsidered), capabilitiesActive: nonNegative(input.capabilitiesActive), reusedHistoryChars: nonNegative(input.reusedHistoryChars), modelTier: input.modelTier, reasonCode: input.reasonCode.slice(0, 120), zeroRiskMode: input.zeroRiskMode }, creditSavingsProxy: { kind: 'estimated-avoidable-context-tokens', estimatedTokens: estimateTokens('x'.repeat(avoidedContextChars + Math.max(0, input.reusedHistoryChars))), limitation: 'Estimate only; not realized provider billing savings or monetary savings.' } };
}
export function summarizeEfficiencyObservations(items: EfficiencyObservation[]) {
  return { observations: items.length, contextEfficiency: { avoidedContextChars: items.reduce((n, x) => n + x.contextEfficiency.avoidedContextChars, 0), truncatedOutputChars: items.reduce((n, x) => n + x.contextEfficiency.truncatedOutputChars, 0), reusedHistoryChars: items.reduce((n, x) => n + x.contextEfficiency.reusedHistoryChars, 0) }, creditSavingsProxy: { kind: 'estimated-avoidable-context-tokens' as const, estimatedTokens: items.reduce((n, x) => n + x.creditSavingsProxy.estimatedTokens, 0), limitation: 'Estimate only; not realized provider billing savings or monetary savings.' } };
}
