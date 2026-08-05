import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeOutbox, formatOutboxReport } from '../src/outbox-operations.js';
import type { OutboxEntry } from '../src/outbox.js';

function entry(overrides: Partial<OutboxEntry>): OutboxEntry {
  return {
    id: 'out-1',
    adapterId: 'test',
    request: {
      operation: 'publish', resourceId: 'doc-1', payload: {},
      leaseKey: 'plan:1', workerId: 'worker-a', fencingVersion: 1,
    },
    idempotencyKey: 'key-1',
    status: 'pending',
    attempts: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

test('reports healthy empty outbox', () => {
  const metrics = analyzeOutbox([], 10_000);
  assert.equal(metrics.health, 'healthy');
  assert.equal(metrics.total, 0);
  assert.deepEqual(metrics.alerts, []);
  assert.match(formatOutboxReport(metrics), /Health: HEALTHY/);
});

test('separates ready and delayed work', () => {
  const metrics = analyzeOutbox([
    entry({ id: 'ready', createdAt: new Date(9_000).toISOString() }),
    entry({ id: 'delayed', idempotencyKey: 'key-2', nextAttemptAt: new Date(20_000).toISOString() }),
  ], 10_000);
  assert.equal(metrics.ready, 1);
  assert.equal(metrics.delayed, 1);
  assert.equal(metrics.byStatus.pending, 2);
});

test('marks dead-letter and old pending work as critical', () => {
  const now = 25 * 60 * 60 * 1000;
  const metrics = analyzeOutbox([
    entry({ id: 'old', createdAt: new Date(0).toISOString() }),
    entry({ id: 'dead', idempotencyKey: 'key-2', status: 'dead-letter' }),
  ], now);
  assert.equal(metrics.health, 'critical');
  assert.equal(metrics.byStatus['dead-letter'], 1);
  assert.ok(metrics.alerts.some(alert => alert.includes('dead-lettered')));
  assert.ok(metrics.alerts.some(alert => alert.includes('Oldest pending')));
});

test('marks retry backlog as degraded and exposes attempts', () => {
  const metrics = analyzeOutbox([
    entry({ status: 'failed', attempts: 3, nextAttemptAt: new Date(20_000).toISOString() }),
  ], 10_000);
  assert.equal(metrics.health, 'degraded');
  assert.equal(metrics.maxAttempts, 3);
  assert.equal(metrics.delayed, 1);
});
