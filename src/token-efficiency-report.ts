import { readFile, stat } from 'node:fs/promises';
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
  savings: { tokens?: number; tokenPercent?: number; costUsd?: number; costPercent?: number };
  coverage: { tokenCoverage: number; costCoverage: number; invalidLines: number };
  confidence: 'low' | 'medium' | 'high';
  methodology: string[];
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export async function readEfficiencyEvents(filePath: string): Promise<{ events: AgentTelemetryEvent[]; invalidLines: number }> {
  let text: string;
  try {
    const info = await stat(filePath);
    if (info.size > 10 * 1024 * 1024) throw new Error('Efficiency telemetry exceeds the 10 MiB bounded reader limit.');
    text = await readFile(filePath, 'utf8');
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { events: [], invalidLines: 0 };
    throw error;
  }
  const events: AgentTelemetryEvent[] = [];
  let invalidLines = 0;
  for (const line of text.split(/\r?\n/).filter(Boolean).slice(-10_000)) {
    try {
      const event = JSON.parse(line) as AgentTelemetryEvent;
      if (!event || typeof event.name !== 'string' || typeof event.runId !== 'string') { invalidLines += 1; continue; }
      if (event.name.startsWith('efficiency.')) events.push(event);
    } catch { invalidLines += 1; }
  }
  return { events, invalidLines };
}

function parsedWindow(window: ReportWindow): { from: number; to: number } {
  const from = Date.parse(window.from); const to = Date.parse(window.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) throw new Error('Report windows require valid ordered ISO dates.');
  return { from, to };
}

function inWindow(events: AgentTelemetryEvent[], window: { from: number; to: number }): AgentTelemetryEvent[] {
  return events.filter(event => { const at = Date.parse(event.at); return Number.isFinite(at) && at >= window.from && at < window.to; });
}

function aggregateActual(events: AgentTelemetryEvent[]): { tokens?: number; costUsd?: number } {
  const usage = events.filter(event => event.name === 'efficiency.usage_observed' && ['measured', 'provider_reported'].includes(String(event.metadata?.quality)));
  const tokenValues = usage.map(event => finite(event.metadata?.totalTokens)).filter((value): value is number => value !== undefined);
  const costs = usage.map(event => finite(event.cost) ?? finite(event.metadata?.costUsd)).filter((value): value is number => value !== undefined);
  return {
    tokens: tokenValues.length === usage.length && usage.length ? tokenValues.reduce((sum, value) => sum + value, 0) : undefined,
    costUsd: costs.length === usage.length && usage.length ? costs.reduce((sum, value) => sum + value, 0) : undefined,
  };
}

export function buildTokenEfficiencyReport(events: AgentTelemetryEvent[], options: TokenEfficiencyReportOptions): TokenEfficiencyReport {
  let baselineEvents: AgentTelemetryEvent[] | undefined; let observationEvents: AgentTelemetryEvent[] | undefined;
  if (options.mode === 'observed') {
    if (!options.baselineWindow || !options.observationWindow) throw new Error('Observed comparison requires baseline and observation windows.');
    const baselineWindow = parsedWindow(options.baselineWindow); const observationWindow = parsedWindow(options.observationWindow);
    baselineEvents = inWindow(events, baselineWindow); observationEvents = inWindow(events, observationWindow);
  }
  const usage = events.filter(event => event.name === 'efficiency.usage_observed');
  const qualities = usage.map(event => event.metadata?.quality as UsageQuality | undefined);
  const measured = qualities.filter(value => value === 'measured' || value === 'provider_reported').length;
  const estimated = qualities.filter(value => value === 'estimated').length;
  const unavailable = usage.length - measured - estimated;
  const actual = options.mode === 'observed' ? aggregateActual(baselineEvents!) : aggregateActual(events);
  const observedAfter = options.mode === 'observed' ? aggregateActual(observationEvents!) : undefined;
  const projectedSavings = events.filter(event => event.name === 'efficiency.route_recommended' || event.name === 'efficiency.context_compacted')
    .reduce((sum, event) => sum + (finite(event.metadata?.estimatedTokenReduction) ?? 0), 0);
  const savingsTokens = options.mode === 'observed'
    ? (actual.tokens !== undefined && observedAfter?.tokens !== undefined ? Math.max(0, actual.tokens - observedAfter.tokens) : undefined)
    : (projectedSavings > 0 ? Math.min(actual.tokens ?? projectedSavings, projectedSavings) : undefined);
  const counterfactualTokens = options.mode === 'observed' ? observedAfter?.tokens : (actual.tokens !== undefined && savingsTokens !== undefined ? Math.max(0, actual.tokens - savingsTokens) : undefined);
  const costSavings = options.mode === 'observed' && actual.costUsd !== undefined && observedAfter?.costUsd !== undefined ? Math.max(0, actual.costUsd - observedAfter.costUsd) : undefined;
  const tokenCoverage = usage.length ? Number((measured / usage.length).toFixed(3)) : 0;
  const costKnown = usage.filter(event => finite(event.cost) !== undefined || finite(event.metadata?.costUsd) !== undefined).length;
  const costCoverage = usage.length ? Number((costKnown / usage.length).toFixed(3)) : 0;
  return {
    comparison: options.mode,
    samples: { total: usage.length, measured, estimated, unavailable },
    actual,
    counterfactual: { tokens: counterfactualTokens, costUsd: observedAfter?.costUsd },
    savings: {
      tokens: savingsTokens,
      tokenPercent: actual.tokens && actual.tokens > 0 && savingsTokens !== undefined ? Number((savingsTokens / actual.tokens * 100).toFixed(2)) : undefined,
      costUsd: costSavings,
      costPercent: actual.costUsd && actual.costUsd > 0 && costSavings !== undefined ? Number((costSavings / actual.costUsd * 100).toFixed(2)) : undefined,
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
