export type TokenGovernorSource = 'tool' | 'terminal' | 'provider';
export type ShadowModelTier = 'economy' | 'premium';
export type ShadowReasoningEffort = 'low' | 'medium' | 'high';

export interface TokenGovernorOptions {
  largeOutputChars?: number;
  maxSummaryChars?: number;
  prefixChars?: number;
  suffixChars?: number;
}

export interface ContextSummary {
  summary: string;
  compressed: boolean;
  originalChars: number;
  retainedChars: number;
  omittedLines: number;
  estimatedOriginalTokens: number;
  estimatedRetainedTokens: number;
  estimatedSavedTokens: number;
}

export interface ShadowRouteInput {
  capability: string;
  risk: 'low' | 'medium' | 'high';
  inputTokens: number;
  outputTokens: number;
  selectedProviderId?: string;
}

export interface ShadowRouteRecommendation {
  modelTier: ShadowModelTier;
  effort: ShadowReasoningEffort;
  applied: false;
  selectedProviderId?: string;
  reasons: string[];
}

export interface TokenObservationInput {
  runId: string;
  source: TokenGovernorSource;
  capability: string;
  risk: 'low' | 'medium' | 'high';
  selectedProviderId?: string;
  input: string;
  output: string;
  observedAt?: string;
}

export interface TokenGovernorObservation {
  runId: string;
  mode: 'shadow';
  source: TokenGovernorSource;
  capability: string;
  observedAt: string;
  input: { chars: number; estimatedTokens: number };
  output: ContextSummary;
  recommendation: ShadowRouteRecommendation;
}

const DEFAULTS = {
  largeOutputChars: 4_000,
  maxSummaryChars: 2_000,
  prefixChars: 600,
  suffixChars: 600,
} as const;

const DIAGNOSTIC = /\b(?:fail(?:ed|ure)?|error|warn(?:ing)?|exception|traceback|stack|duration|elapsed)\b|^\s*(?:at |[+-]{3}|@@)|\bexit(?:ed)?(?:\s+code|\s+status)?\b/i;
const TEST_RESULT = /\btests?\b.{0,80}\b(?:pass(?:ed)?|fail(?:ed)?|skip(?:ped)?)\b/i;
const MAX_INSPECTED_LINE_CHARS = 4_096;

function bounded(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.floor(value!))) : fallback;
}

function options(input: TokenGovernorOptions = {}) {
  const maxSummaryChars = bounded(input.maxSummaryChars, DEFAULTS.maxSummaryChars, 80, 100_000);
  const prefixChars = bounded(input.prefixChars, Math.min(DEFAULTS.prefixChars, Math.floor(maxSummaryChars / 3)), 1, maxSummaryChars);
  const suffixChars = bounded(input.suffixChars, Math.min(DEFAULTS.suffixChars, Math.floor(maxSummaryChars / 3)), 1, maxSummaryChars);
  return {
    largeOutputChars: bounded(input.largeOutputChars, DEFAULTS.largeOutputChars, 1, 10_000_000),
    maxSummaryChars,
    prefixChars,
    suffixChars,
  };
}

export function estimateTokens(text: string): number {
  const characters = Array.from(text).length;
  return characters === 0 ? 0 : Math.ceil(characters / 4);
}

function clipped(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit);
}

function metrics(original: string, summary: string, compressed: boolean, omittedLines: number): ContextSummary {
  const estimatedOriginalTokens = estimateTokens(original);
  const estimatedRetainedTokens = estimateTokens(summary);
  return {
    summary,
    compressed,
    originalChars: original.length,
    retainedChars: summary.length,
    omittedLines,
    estimatedOriginalTokens,
    estimatedRetainedTokens,
    estimatedSavedTokens: Math.max(0, estimatedOriginalTokens - estimatedRetainedTokens),
  };
}

export function summarizeContext(text: string, inputOptions: TokenGovernorOptions = {}): ContextSummary {
  const config = options(inputOptions);
  if (text.length <= config.largeOutputChars) return metrics(text, text, false, 0);

  const lines = text.split(/\r?\n/);
  const diagnosticLines = lines
    .map(line => line.slice(0, MAX_INSPECTED_LINE_CHARS))
    .filter(line => DIAGNOSTIC.test(line) || TEST_RESULT.test(line))
    .map(line => clipped(line, 240));
  const unique = [...new Set(diagnosticLines)];
  const omission = `\n… ${Math.max(0, lines.length - unique.length - 2)} lines omitted …\n`;
  const diagnosticBudget = unique.length ? Math.min(Math.floor(config.maxSummaryChars * 0.4), config.maxSummaryChars - omission.length - 2) : 0;
  const diagnostics = clipped(unique.join('\n'), Math.max(0, diagnosticBudget));
  const diagnosticSeparator = diagnostics ? '\n' : '';
  const outerBudget = Math.max(0, config.maxSummaryChars - omission.length - diagnostics.length - diagnosticSeparator.length);
  let prefixLength = Math.min(config.prefixChars, Math.ceil(outerBudget / 2));
  let suffixLength = Math.min(config.suffixChars, outerBudget - prefixLength);
  const unused = outerBudget - prefixLength - suffixLength;
  if (unused > 0) {
    const prefixRoom = Math.max(0, config.prefixChars - prefixLength);
    const addPrefix = Math.min(unused, prefixRoom);
    prefixLength += addPrefix;
    suffixLength += Math.min(unused - addPrefix, Math.max(0, config.suffixChars - suffixLength));
  }
  const prefix = text.slice(0, prefixLength);
  const suffix = suffixLength ? text.slice(-suffixLength) : '';
  const summary = `${prefix}${omission}${diagnostics}${diagnosticSeparator}${suffix}`;
  return metrics(text, summary, true, Math.max(0, lines.length - unique.length - 2));
}

export function recommendShadowRoute(input: ShadowRouteInput): ShadowRouteRecommendation {
  const totalTokens = Math.max(0, input.inputTokens) + Math.max(0, input.outputTokens);
  const highComplexity = input.risk === 'high' && totalTokens >= 20_000 && ['review', 'strategy', 'code'].includes(input.capability);
  const mediumComplexity = input.risk !== 'low' && (totalTokens >= 8_000 || ['review', 'strategy'].includes(input.capability));
  return {
    modelTier: highComplexity ? 'premium' : 'economy',
    effort: highComplexity ? 'high' : mediumComplexity ? 'medium' : 'low',
    applied: false,
    selectedProviderId: input.selectedProviderId,
    reasons: highComplexity
      ? ['High risk, context volume, and capability complexity justify evaluation of a premium route.', 'Shadow recommendation only; Provider Registry selection is unchanged.']
      : mediumComplexity
        ? ['Moderate complexity justifies medium reasoning effort.', 'Shadow recommendation only; Provider Registry selection is unchanged.']
        : ['Economy tier and low reasoning effort appear sufficient.', 'Shadow recommendation only; Provider Registry selection is unchanged.'],
  };
}

export function observeTokenUsage(input: TokenObservationInput, inputOptions: TokenGovernorOptions = {}): TokenGovernorObservation {
  const safeOutput = redactSecretText(input.output);
  const summarized = summarizeContext(safeOutput, inputOptions);
  const estimatedOriginalTokens = estimateTokens(input.output);
  const output: ContextSummary = {
    ...summarized,
    originalChars: input.output.length,
    estimatedOriginalTokens,
    estimatedSavedTokens: Math.max(0, estimatedOriginalTokens - summarized.estimatedRetainedTokens),
  };
  const inputTokens = estimateTokens(input.input);
  return Object.freeze({
    runId: input.runId,
    mode: 'shadow' as const,
    source: input.source,
    capability: input.capability,
    observedAt: input.observedAt ?? new Date().toISOString(),
    input: Object.freeze({ chars: input.input.length, estimatedTokens: inputTokens }),
    output: Object.freeze(output),
    recommendation: Object.freeze(recommendShadowRoute({
      capability: input.capability,
      risk: input.risk,
      inputTokens,
      outputTokens: output.estimatedOriginalTokens,
      selectedProviderId: input.selectedProviderId ? redactSecretText(input.selectedProviderId) : undefined,
    })),
  });
}
import { redactSecretText } from './secret-redaction.js';
