import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';
import { runObservedOrchestration } from '../src/orchestrator-observability.js';
import type { MuninAgentExecutors } from '../src/agent-orchestrator.js';

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
  assert.ok(sink.events.some(event => event.name === 'agent.started' && event.agentId === 'engineer'));
  assert.ok(sink.events.some(event => event.name === 'run.completed' && event.runId === result.runId));
});
