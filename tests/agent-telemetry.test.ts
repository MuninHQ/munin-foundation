import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';

test('agent telemetry normalizes timestamps and writes to sink', async () => {
  const sink = new MemoryAgentTelemetrySink();
  const telemetry = new AgentTelemetry(sink);
  telemetry.emit({ name: 'run.completed', runId: 'run-1', outcome: 'done', evidence: ['tests:pass'] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sink.events.length, 1);
  assert.equal(sink.events[0].runId, 'run-1');
  assert.equal(sink.events[0].name, 'run.completed');
  assert.ok(sink.events[0].at.includes('T'));
});

test('telemetry failures do not reject caller execution', async () => {
  const errors: unknown[] = [];
  const telemetry = new AgentTelemetry({ write: async () => { throw new Error('collector unavailable'); } }, error => errors.push(error));
  telemetry.emit({ name: 'tool.called', runId: 'run-2' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors.length, 1);
});
