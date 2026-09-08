import { appendFile, readFile } from 'node:fs/promises';
import { runtimePath } from './config.js';

export interface MemoryRecallMetric {
  at: string;
  project: string;
  candidateCount: number;
  compactCount: number;
  timelineCount: number;
  fullCount: number;
  baselineChars: number;
  compactChars: number;
}

export interface MemoryRecallMetricsSummary {
  samples: number;
  averageCandidateCount: number;
  averageCompactCount: number;
  averageContextReductionPct: number;
  fullExpansionRatePct: number;
}

const metricsFile = () => runtimePath('memory-observation-metrics.jsonl');
export async function recordMemoryRecallMetric(metric: MemoryRecallMetric): Promise<void> {
  await appendFile(metricsFile(), `${JSON.stringify(metric)}\n`, 'utf8');
}

export function summarizeMemoryRecallMetrics(metrics: MemoryRecallMetric[]): MemoryRecallMetricsSummary {
  if (!metrics.length) {
    return { samples: 0, averageCandidateCount: 0, averageCompactCount: 0, averageContextReductionPct: 0, fullExpansionRatePct: 0 };
  }
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const baseline = sum(metrics.map(metric => metric.baselineChars));
  const compact = sum(metrics.map(metric => metric.compactChars));
  const fullExpansions = metrics.filter(metric => metric.fullCount > 0).length;
  return {
    samples: metrics.length,
    averageCandidateCount: sum(metrics.map(metric => metric.candidateCount)) / metrics.length,
    averageCompactCount: sum(metrics.map(metric => metric.compactCount)) / metrics.length,
    averageContextReductionPct: baseline > 0 ? Math.max(0, (1 - compact / baseline) * 100) : 0,
    fullExpansionRatePct: (fullExpansions / metrics.length) * 100,
  };
}
export async function readMemoryRecallMetrics(limit = 500): Promise<MemoryRecallMetric[]> {
  let raw = '';
  try { raw = await readFile(metricsFile(), 'utf8'); } catch { return []; }
  return raw.split(/\r?\n/)
    .filter(Boolean)
    .slice(-Math.max(1, limit))
    .flatMap(line => {
      try { return [JSON.parse(line) as MemoryRecallMetric]; } catch { return []; }
    });
}

export async function memoryRecallMetricsSummary(limit = 500): Promise<MemoryRecallMetricsSummary & { file: string }> {
  const metrics = await readMemoryRecallMetrics(limit);
  return { file: metricsFile(), ...summarizeMemoryRecallMetrics(metrics) };
}
