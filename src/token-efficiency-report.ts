import { readFile } from 'node:fs/promises';
import type { AgentTelemetryEvent } from './agent-telemetry.js';
import type { UsageQuality } from './token-efficiency-usage.js';

export interface ReportWindow { from: string; to: string }
export interface TokenEfficiencyReportOptions {
  mode: 'observed' | 'projected';
  baselineWindow?: ReportWindow;
  observationWindow?: ReportWindow;
  invalidLines?: number;
}
export interface TokenEfficiencyReport {
  comparison: 'observed' | 'projected';
  samples: { total: number; measured: number; estimated: number; unavailable: number };
  actual: { tokens?: number; costUsd?: number };
  counterfactual: { tokens?: number; costUsd?: number };
  savings: { tokens: number; tokenPercent?: number; costUsd?: number; costPercent?: number };
  coverage: { tokenCoverage: number; costCoverage: number; invalidLines: number };
  confidence: 'low' | 'medium' | 'high';
  methodology: string[];
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export async function readEfficiencyEvents(filePath: string): Promise<{ events: AgentTelemetryEvent[]; invalidLines: number }> {
  let text: string;
  try { text = await readFile(filePath, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { events: [], invalidLines: 0 };
    throw error;
  }
  const events: AgentTelemetryEvent[] = [];
  let invalidLines = 0;
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    try {
      const event = JSON.parse(line) as AgentTelemetryEvent;
      if (!event || typeof event.name !== 'string' || typeof event.runId !== 'string') { invalidLines += 1; continue; }
      if (event.name.startsWith('efficiency.')) events.push(event);
    } catch { invalidLines += 1; }
  }
  return { events, invalidLines };
}

export function buildTokenEfficiencyReport(events: AgentTelemetryEvent[], options: TokenEfficiencyReportOptions): TokenEfficiencyReport {
  if (options.mode === 'observed' && (!options.baselineWindow || !options.observationWindow)) {
    throw new Error('Observed comparison requires baseline and observation windows.');
  }
  const usage = events.filter(event => event.name === 'efficiency.usage_observed');
  const qualities = usage.map(event => event.metadata?.quality as UsageQuality | undefined);
  const measured = qualities.filter(value => value === 'measured' || value === 'provider_reported').length;
  const estimated = qualities.filter(value => value === 'estimated').length;
  const unavailable = usage.length - measured - estimated;
  const knownUsage = usage.filter(event => event.metadata?.quality !== 'unavailable' && finite(event.metadata?.totalTokens) !== undefined);
  const actualTokens = knownUsage.length ? knownUsage.reduce((sum, event) => sum + (finite(event.metadata?.totalTokens) ?? 0), 0) : undefined;
  const costs = usage.map(event => finite(event.cost) ?? finite(event.metadata?.costUsd)).filter((value): value is number => value !== undefined);
  const actualCost = costs.length === usage.length && usage.length > 0 ? costs.reduce((sum, value) => sum + value, 0) : undefined;
  const projectedSavings = events.filter(event => event.name === 'efficiency.route_recommended' || event.name === 'efficiency.context_compacted')
    .reduce((sum, event) => sum + (finite(event.metadata?.estimatedTokenReduction) ?? 0), 0);
  const savingsTokens = Math.min(actualTokens ?? projectedSavings, projectedSavings);
  const counterfactualTokens = actualTokens === undefined ? undefined : Math.max(0, actualTokens - savingsTokens);
  const tokenCoverage = usage.length ? Number(((measured + estimated) / usage.length).toFixed(3)) : 0;
  const costCoverage = usage.length ? Number((costs.length / usage.length).toFixed(3)) : 0;
  return {
    comparison: options.mode,
    samples: { total: usage.length, measured, estimated, unavailable },
    actual: { tokens: actualTokens, costUsd: actualCost },
    counterfactual: { tokens: counterfactualTokens },
    savings: {
      tokens: savingsTokens,
      tokenPercent: actualTokens && actualTokens > 0 ? Number((savingsTokens / actualTokens * 100).toFixed(2)) : undefined,
      costUsd: undefined,
      costPercent: undefined,
    },
    coverage: { tokenCoverage, costCoverage, invalidLines: options.invalidLines ?? 0 },
    confidence: tokenCoverage >= 0.8 && measured >= 5 ? 'high' : tokenCoverage >= 0.5 && measured >= 1 ? 'medium' : 'low',
    methodology: [
      'Measured and provider-reported samples are treated as observed usage.',
      'Estimated samples contribute to coverage but remain labeled estimates.',
      'Projected token savings use advisory route and compaction observations; they do not assert execution changes.',
      'Dollar savings are omitted unless both actual and counterfactual cost bases are known.',
    ],
  };
}
