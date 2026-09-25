import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';
import { runObservedOrchestration } from '../src/orchestrator-observability.js';
import type { MuninAgentExecutors } from '../src/agent-orchestrator.js';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';
import { TokenEfficiencyObserver } from '../src/token-efficiency-observer.js';

const completed = async () => ({ status: 'completed' as const, summary: 'ok', evidence: ['verified'] });

test('observed orchestration emits agent events and returns an execution receipt', async () => {
  const sink = new MemoryAgentTelemetrySink();
  const telemetry = new AgentTelemetry(sink);
  const executors: MuninAgentExecutors = {
    'product-state-manager': completed,
    engineer: completed,
    'qa-verifier': completed,
    'memory-curator': completed,
    operator: completed,
  };

  const { result, receipt } = await runObservedOrchestration('build feature', {}, executors, telemetry);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result.status, 'done');
  assert.equal(receipt.runId, result.runId);
  assert.ok(sink.events.some(event => event.name === 'run.started' && event.runId === result.runId));
  assert.ok(!sink.events.some(event => event.runId === 'pending'));
  assert.ok(sink.events.some(event => event.name === 'agent.started' && event.agentId === 'engineer'));
  assert.ok(sink.events.some(event => event.name === 'run.completed' && event.runId === result.runId));
});

test('token efficiency observation adds events without changing orchestration outcome', async () => {
  const baselineSink = new MemoryAgentTelemetrySink();
  const enabledSink = new MemoryAgentTelemetrySink();
  const executors: MuninAgentExecutors = {
    'product-state-manager': completed,
    engineer: async () => ({ status: 'completed', summary: 'ok', evidence: ['verified'], usage: { inputTokens: 100, outputTokens: 20, providerId: 'ollama' } }),
    'qa-verifier': completed,
    'memory-curator': completed,
    operator: completed,
  };
  const baseline = await runObservedOrchestration('build feature', {}, executors, new AgentTelemetry(baselineSink));
  const enabledTelemetry = new AgentTelemetry(enabledSink);
  const observer = new TokenEfficiencyObserver(loadTokenEfficiencyConfig({ MUNIN_TOKEN_EFFICIENCY_ENABLED: '1' }), enabledTelemetry);
  const observed = await runObservedOrchestration('build feature', {}, executors, enabledTelemetry, {}, observer);
  await enabledTelemetry.flush();
  assert.equal(observed.result.status, baseline.result.status);
  assert.deepEqual(observed.result.plan, baseline.result.plan);
  assert.deepEqual(observed.result.trace.map(item => ({ agentId: item.agentId, status: item.status, summary: item.summary, evidence: item.evidence })), baseline.result.trace.map(item => ({ agentId: item.agentId, status: item.status, summary: item.summary, evidence: item.evidence })));
  assert.ok(enabledSink.events.some(event => event.name === 'efficiency.route_recommended'));
  assert.ok(enabledSink.events.some(event => event.name === 'efficiency.usage_observed' && event.agentId === 'engineer'));
});

test('observed orchestration propagates explicit high risk into strong model recommendation', async () => {
  const sink = new MemoryAgentTelemetrySink(); const telemetry = new AgentTelemetry(sink);
  const observer = new TokenEfficiencyObserver(loadTokenEfficiencyConfig({ MUNIN_TOKEN_EFFICIENCY_ENABLED: '1' }), telemetry);
  const executors: MuninAgentExecutors = { 'product-state-manager': completed, engineer: completed, 'qa-verifier': completed, 'memory-curator': completed, operator: completed };
  await runObservedOrchestration('build safety-critical architecture', { efficiencyRisk: 'high' }, executors, telemetry, {}, observer);
  await telemetry.flush();
  const routes = sink.events.filter(event => event.name === 'efficiency.route_recommended');
  assert.ok(routes.length > 0); assert.ok(routes.every(event => event.metadata?.recommendedTier === 'strong_model'));
});
