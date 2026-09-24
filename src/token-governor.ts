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

const DIAGNOSTIC = /(?:\bfail(?:ed|ure)?\b|\berror\b|\bwarn(?:ing)?\b|\bexception\b|\btraceback\b|\bstack\b|^\s*(?:at |[+-]{3}|@@)|\btests?\b.*\b(?:pass|fail|skip)|\b(?:duration|elapsed)\b|\bexit(?:ed)?(?:\s+code|\s+status)?\b)/i;

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
  const prefix = clipped(text, config.prefixChars);
  const suffix = text.slice(Math.max(prefix.length, text.length - config.suffixChars));
  const diagnosticLines = lines.filter(line => DIAGNOSTIC.test(line)).map(line => clipped(line, Math.max(40, Math.floor(config.maxSummaryChars / 3))));
  const unique = [...new Set(diagnosticLines)].filter(line => !prefix.includes(line) && !suffix.includes(line));
  const omission = `\n… ${Math.max(0, lines.length - unique.length - 2)} lines omitted …\n`;
  const middleBudget = Math.max(0, config.maxSummaryChars - prefix.length - suffix.length - omission.length);
  const diagnostics = clipped(unique.join('\n'), middleBudget);
  let summary = `${prefix}${omission}${diagnostics}${diagnostics ? '\n' : ''}${suffix}`;
  if (summary.length > config.maxSummaryChars) {
    const marker = `\n… ${Math.max(0, text.length - config.maxSummaryChars)} chars omitted …\n`;
    const remaining = Math.max(2, config.maxSummaryChars - marker.length);
    const head = Math.floor(remaining / 2);
    summary = `${text.slice(0, head)}${marker}${text.slice(text.length - (remaining - head))}`;
  }
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
  const output = summarizeContext(input.output, inputOptions);
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
      selectedProviderId: input.selectedProviderId,
    })),
  });
}
