import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';
import { JsonTokenEfficiencyHealthSink, TokenEfficiencyObserver } from '../src/token-efficiency-observer.js';

const task = { workType: 'operations' as const, capabilities: ['format'], localCapable: true, risk: 'low' as const, ambiguity: 'low' as const, verificationRequired: false };

test('disabled observer emits no events', async () => {
  const sink = new MemoryAgentTelemetrySink();
  const observer = new TokenEfficiencyObserver(loadTokenEfficiencyConfig({}), new AgentTelemetry(sink));
  observer.observeStart({ runId: 'r1', taskId: 't1', agentId: 'operator', task, profiles: [] });
  observer.observeCompletion({ runId: 'r1', taskId: 't1', agentId: 'operator', usage: { inputTokens: 10, outputTokens: 5 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(sink.events, []);
});

test('enabled observer emits advisory route, usage and budget events', async () => {
  const sink = new MemoryAgentTelemetrySink();
  const config = loadTokenEfficiencyConfig({ MUNIN_TOKEN_EFFICIENCY_ENABLED: '1', MUNIN_TOKEN_TASK_WARNING_TOKENS: '10', MUNIN_TOKEN_TASK_CRITICAL_TOKENS: '20' });
  const telemetry = new AgentTelemetry(sink);
  const observer = new TokenEfficiencyObserver(config, telemetry);
  observer.observeStart({ runId: 'r1', taskId: 't1', agentId: 'operator', task, profiles: [] });
  observer.observeCompletion({ runId: 'r1', taskId: 't1', agentId: 'operator', usage: { inputTokens: 10, outputTokens: 5 } });
  await telemetry.flush();
  assert.deepEqual(sink.events.map(event => event.name), ['efficiency.route_recommended', 'efficiency.usage_observed', 'efficiency.budget_warning']);
  assert.equal(sink.events[0].metadata?.recommendedTier, 'deterministic_local');
});

test('observer failures do not escape into productive execution', () => {
  const config = loadTokenEfficiencyConfig({ MUNIN_TOKEN_EFFICIENCY_ENABLED: '1' });
  const telemetry = new AgentTelemetry({ write: () => { throw new Error('sync sink failure'); } });
  const observer = new TokenEfficiencyObserver(config, telemetry);
  assert.doesNotThrow(() => observer.observeStart({ runId: 'r1', taskId: 't1', agentId: 'operator', task, profiles: [] }));
});

test('observer publishes a bounded aggregate health snapshot for the supervisor', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-health-'));
  try {
    const file = path.join(dir, 'health.json');
    const telemetry = new AgentTelemetry(new MemoryAgentTelemetrySink());
    const config = loadTokenEfficiencyConfig({ MUNIN_TOKEN_EFFICIENCY_ENABLED: '1', MUNIN_TOKEN_TASK_WARNING_TOKENS: '10', MUNIN_TOKEN_TASK_CRITICAL_TOKENS: '20' });
    const observer = new TokenEfficiencyObserver(config, telemetry, new JsonTokenEfficiencyHealthSink(file));
    observer.observeStart({ runId: 'r-health', taskId: 't1', agentId: 'operator', task, profiles: [] });
    observer.observeCompletion({ runId: 'r-health', taskId: 't1', agentId: 'operator', usage: { inputTokens: 15 } });
    await observer.flushHealth();
    const health = JSON.parse(await readFile(file, 'utf8')) as { enabled: boolean; latestBudgetState: string; observations: number; latestRunId: string };
    assert.deepEqual(health, { enabled: true, latestBudgetState: 'warning', observations: 2, latestRunId: 'r-health' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
