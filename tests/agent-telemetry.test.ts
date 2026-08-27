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

test('telemetry redacts secrets in strings, arrays and nested metadata', async () => {
  const sink = new MemoryAgentTelemetrySink();
  const telemetry = new AgentTelemetry(sink);
  telemetry.emit({
    name: 'agent.failed',
    runId: 'run-3',
    evidence: ['Authorization: Bearer super-secret-value'],
    metadata: { apiKey: 'nested-secret', nested: { error: 'refresh_token=another-secret Authorization: Basic basic-secret https://example.test?access_token=url-secret' } },
  });
  await new Promise(resolve => setImmediate(resolve));
  const serialized = JSON.stringify(sink.events[0]);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /super-secret-value|nested-secret|another-secret|basic-secret|url-secret/);
});

test('telemetry flush waits for local writes but remains bounded for a stalled collector', async () => {
  let release: (() => void) | undefined;
  const telemetry = new AgentTelemetry({ write: () => new Promise<void>(resolve => { release = resolve; }) });
  telemetry.emit({ name: 'run.completed', runId: 'run-flush' });
  const waiting = telemetry.flush(100);
  release?.();
  await waiting;

  const stalled = new AgentTelemetry({ write: () => new Promise<void>(() => undefined) });
  stalled.emit({ name: 'run.completed', runId: 'run-stalled' });
  const startedAt = Date.now();
  await stalled.flush(10);
  assert.ok(Date.now() - startedAt < 100);
});
