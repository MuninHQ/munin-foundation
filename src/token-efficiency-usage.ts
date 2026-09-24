export type UsageQuality = 'measured' | 'provider_reported' | 'estimated' | 'unavailable';

export interface TokenUsageInput {
  runId?: string;
  taskId?: string;
  sessionId?: string;
  agentId?: string;
  providerId?: string;
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  contextBytes?: number;
  itemCount?: number;
  durationMs?: number;
  inputText?: string;
  outputText?: string;
  quality?: UsageQuality;
}

export interface TokenUsageSample extends Omit<TokenUsageInput, 'inputText' | 'outputText' | 'quality'> {
  quality: UsageQuality;
}

export function estimateTokens(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}

function nonNegative(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function normalizeTokenUsage(input: TokenUsageInput): TokenUsageSample {
  const reportedInput = nonNegative(input.inputTokens);
  const reportedOutput = nonNegative(input.outputTokens);
  const inputTokens = reportedInput ?? (input.inputText === undefined ? undefined : estimateTokens(input.inputText));
  const outputTokens = reportedOutput ?? (input.outputText === undefined ? undefined : estimateTokens(input.outputText));
  const hasReported = reportedInput !== undefined || reportedOutput !== undefined || nonNegative(input.totalTokens) !== undefined;
  const hasEstimated = !hasReported && (input.inputText !== undefined || input.outputText !== undefined);
  const { inputText: _inputText, outputText: _outputText, quality: requestedQuality, ...identifiers } = input;
  return {
    ...identifiers,
    inputTokens,
    outputTokens,
    cachedInputTokens: nonNegative(input.cachedInputTokens),
    reasoningTokens: nonNegative(input.reasoningTokens),
    totalTokens: nonNegative(input.totalTokens) ?? (inputTokens === undefined && outputTokens === undefined ? undefined : (inputTokens ?? 0) + (outputTokens ?? 0)),
    costUsd: nonNegative(input.costUsd),
    contextBytes: nonNegative(input.contextBytes),
    itemCount: nonNegative(input.itemCount),
    durationMs: nonNegative(input.durationMs),
    quality: requestedQuality ?? (hasReported ? 'provider_reported' : hasEstimated ? 'estimated' : 'unavailable'),
  };
}
