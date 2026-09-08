export interface ProgressiveRecallCandidate<T = unknown> {
  id: string | number;
  score: number;
  preview: string;
  value?: T;
}

export interface ProgressiveRecallPlan<T = unknown> {
  compact: ProgressiveRecallCandidate<T>[];
  timelineIds: Array<string | number>;
  fullMemoryIds: Array<string | number>;
}

/**
 * Observation-mode planner for staged memory retrieval.
 * It does not fetch or mutate storage; it only decides which candidates should
 * be expanded to timeline/full detail based on rank and configurable limits.
 */
export function planProgressiveRecall<T>(
  candidates: ProgressiveRecallCandidate<T>[],
  options: { compactLimit?: number; timelineLimit?: number; fullLimit?: number; minScore?: number } = {},
): ProgressiveRecallPlan<T> {
  const compactLimit = options.compactLimit ?? 8;
  const timelineLimit = Math.min(options.timelineLimit ?? 3, compactLimit);
  const fullLimit = Math.min(options.fullLimit ?? 1, timelineLimit);
  const minScore = options.minScore ?? Number.NEGATIVE_INFINITY;

  const compact = [...candidates]
    .filter((candidate) => Number.isFinite(candidate.score) && candidate.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, compactLimit);

  return {
    compact,
    timelineIds: compact.slice(0, timelineLimit).map((candidate) => candidate.id),
    fullMemoryIds: compact.slice(0, fullLimit).map((candidate) => candidate.id),
  };
}
