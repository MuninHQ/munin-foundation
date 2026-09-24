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
