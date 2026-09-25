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

function bounded(value: string | undefined, max = 256): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export function normalizeTokenUsage(input: TokenUsageInput): TokenUsageSample {
  const reportedInput = nonNegative(input.inputTokens);
  const reportedOutput = nonNegative(input.outputTokens);
  const inputTokens = reportedInput ?? (input.inputText === undefined ? undefined : estimateTokens(input.inputText));
  const outputTokens = reportedOutput ?? (input.outputText === undefined ? undefined : estimateTokens(input.outputText));
  const reportedTotal = nonNegative(input.totalTokens);
  const hasReported = reportedInput !== undefined || reportedOutput !== undefined || reportedTotal !== undefined;
  const hasEstimated = (reportedInput === undefined && input.inputText !== undefined) || (reportedOutput === undefined && input.outputText !== undefined);
  const hasAnyTokens = inputTokens !== undefined || outputTokens !== undefined || reportedTotal !== undefined;
  const requestedQuality = hasAnyTokens ? input.quality : undefined;
  return {
    runId: bounded(input.runId), taskId: bounded(input.taskId), sessionId: bounded(input.sessionId), agentId: bounded(input.agentId),
    providerId: bounded(input.providerId), modelId: bounded(input.modelId),
    inputTokens,
    outputTokens,
    cachedInputTokens: nonNegative(input.cachedInputTokens),
    reasoningTokens: nonNegative(input.reasoningTokens),
    totalTokens: reportedTotal ?? (inputTokens === undefined && outputTokens === undefined ? undefined : (inputTokens ?? 0) + (outputTokens ?? 0)),
    costUsd: nonNegative(input.costUsd),
    contextBytes: nonNegative(input.contextBytes),
    itemCount: nonNegative(input.itemCount),
    durationMs: nonNegative(input.durationMs),
    quality: !hasAnyTokens ? 'unavailable' : requestedQuality ?? (hasEstimated ? 'estimated' : hasReported ? 'provider_reported' : 'unavailable'),
  };
}
