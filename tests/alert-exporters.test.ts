import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AlertDispatcher, type AlertEvent, type AlertExporter } from '../src/alert-exporters.js';
import type { OutboxMetrics } from '../src/outbox-operations.js';

class RecordingExporter implements AlertExporter {
  id = 'recording';
  events: AlertEvent[] = [];
  async send(event: AlertEvent): Promise<void> { this.events.push(event); }
}

function metrics(health: OutboxMetrics['health'], alerts: string[] = []): OutboxMetrics {
  return {
    total: health === 'healthy' ? 0 : 1,
    byStatus: { pending: 0, dispatching: 0, applied: 0, failed: health === 'degraded' ? 1 : 0, 'dead-letter': health === 'critical' ? 1 : 0 },
    ready: 0,
    delayed: health === 'degraded' ? 1 : 0,
    oldestPendingAgeMs: 0,
    maxAttempts: health === 'healthy' ? 0 : 3,
    health,
    alerts,
  };
}

test('does not emit alerts for an initially healthy outbox', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-alerts-'));
  try {
    const exporter = new RecordingExporter();
    const result = await new AlertDispatcher(root).dispatch(metrics('healthy'), [exporter], 1_000);
    assert.equal(result.reason, 'healthy');
    assert.equal(exporter.events.length, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('emits a structured incident once and suppresses duplicates', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-alerts-'));
  try {
    const exporter = new RecordingExporter();
    const dispatcher = new AlertDispatcher(root);
    const current = metrics('critical', ['1 outbox entry is dead-lettered']);
    const first = await dispatcher.dispatch(current, [exporter], 1_000);
    const second = await dispatcher.dispatch(current, [exporter], 2_000);
    assert.equal(first.sent, true);
    assert.equal(first.event?.kind, 'incident');
    assert.equal(first.event?.severity, 'critical');
    assert.equal(second.reason, 'duplicate');
    assert.equal(exporter.events.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('emits a recovery after a non-healthy state becomes healthy', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-alerts-'));
  try {
    const exporter = new RecordingExporter();
    const dispatcher = new AlertDispatcher(root);
    await dispatcher.dispatch(metrics('degraded', ['retry backlog']), [exporter], 1_000);
    const recovery = await dispatcher.dispatch(metrics('healthy'), [exporter], 2_000);
    assert.equal(recovery.sent, true);
    assert.equal(recovery.event?.kind, 'recovery');
    assert.equal(exporter.events.length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('changed alert details create a new incident fingerprint', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-alerts-'));
  try {
    const exporter = new RecordingExporter();
    const dispatcher = new AlertDispatcher(root);
    await dispatcher.dispatch(metrics('degraded', ['1 retry waiting']), [exporter], 1_000);
    const changed = await dispatcher.dispatch(metrics('degraded', ['2 retries waiting']), [exporter], 2_000);
    assert.equal(changed.sent, true);
    assert.equal(exporter.events.length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});
