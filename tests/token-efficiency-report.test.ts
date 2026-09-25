import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AgentTelemetryEvent } from '../src/agent-telemetry.js';
import { buildTokenEfficiencyReport, readEfficiencyEvents } from '../src/token-efficiency-report.js';

test('report separates observed from projected savings and reports coverage', () => {
  const events: AgentTelemetryEvent[] = [
    { name: 'efficiency.usage_observed', at: '2026-09-24T00:00:00Z', runId: 'r1', metadata: { totalTokens: 1000, quality: 'provider_reported' } },
    { name: 'efficiency.usage_observed', at: '2026-09-24T00:01:00Z', runId: 'r2', metadata: { totalTokens: 500, quality: 'unavailable' } },
    { name: 'efficiency.route_recommended', at: '2026-09-24T00:00:00Z', runId: 'r1', metadata: { recommendedTier: 'deterministic_local', estimatedTokenReduction: 300 } },
  ];
  const report = buildTokenEfficiencyReport(events, { mode: 'projected' });
  assert.equal(report.comparison, 'projected');
  assert.equal(report.samples.total, 2);
  assert.equal(report.samples.measured, 1);
  assert.equal(report.coverage.tokenCoverage, 0.5);
  assert.equal(report.savings.costUsd, undefined);
  assert.equal(report.savings.tokens, 300);
});

test('malformed telemetry is skipped and counted', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-report-'));
  try {
    const file = path.join(dir, 'events.jsonl');
    await writeFile(file, '{"name":"efficiency.usage_observed","at":"2026-09-24T00:00:00Z","runId":"r1","metadata":{"totalTokens":10,"quality":"measured"}}\nnot-json\n');
    const result = await readEfficiencyEvents(file);
    assert.equal(result.events.length, 1);
    assert.equal(result.invalidLines, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('observed comparison requires two explicit windows', () => {
  assert.throws(() => buildTokenEfficiencyReport([], { mode: 'observed' }), /baseline and observation windows/i);
});

test('observed comparison filters validated windows and compares baseline to observation', () => {
  const events: AgentTelemetryEvent[] = [
    { name: 'efficiency.usage_observed', at: '2026-09-01T00:00:00Z', runId: 'base', metadata: { totalTokens: 1000, quality: 'provider_reported' } },
    { name: 'efficiency.usage_observed', at: '2026-09-20T00:00:00Z', runId: 'after', metadata: { totalTokens: 400, quality: 'provider_reported' } },
  ];
  const report = buildTokenEfficiencyReport(events, { mode: 'observed', baselineWindow: { from: '2026-09-01T00:00:00Z', to: '2026-09-02T00:00:00Z' }, observationWindow: { from: '2026-09-19T00:00:00Z', to: '2026-09-21T00:00:00Z' } });
  assert.equal(report.actual.tokens, 1000);
  assert.equal(report.counterfactual.tokens, 400);
  assert.equal(report.savings.tokens, 600);
  assert.equal(report.savings.tokenPercent, 60);
});

test('invalid observed windows fail closed', () => {
  assert.throws(() => buildTokenEfficiencyReport([], { mode: 'observed', baselineWindow: { from: 'bad', to: 'also-bad' }, observationWindow: { from: '2026-09-20T00:00:00Z', to: '2026-09-21T00:00:00Z' } }), /valid ordered ISO dates/i);
});

test('estimated samples are not counted as actual tokens', () => {
  const report = buildTokenEfficiencyReport([{ name: 'efficiency.usage_observed', at: '2026-09-24T00:00:00Z', runId: 'r', metadata: { totalTokens: 100, quality: 'estimated' } }], { mode: 'projected' });
  assert.equal(report.actual.tokens, undefined);
});
