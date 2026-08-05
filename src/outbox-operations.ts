import type { OutboxEntry, OutboxStatus } from './outbox.js';

export type OutboxHealth = 'healthy' | 'degraded' | 'critical';

export interface OutboxMetrics {
  total: number;
  byStatus: Record<OutboxStatus, number>;
  ready: number;
  delayed: number;
  oldestPendingAgeMs: number;
  maxAttempts: number;
  health: OutboxHealth;
  alerts: string[];
}

const statuses: OutboxStatus[] = ['pending', 'dispatching', 'applied', 'failed', 'dead-letter'];

export function analyzeOutbox(entries: OutboxEntry[], now = Date.now()): OutboxMetrics {
  const byStatus = Object.fromEntries(statuses.map(status => [status, 0])) as Record<OutboxStatus, number>;
  let ready = 0;
  let delayed = 0;
  let oldestPendingAgeMs = 0;
  let maxAttempts = 0;

  for (const entry of entries) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    maxAttempts = Math.max(maxAttempts, entry.attempts);
    if (entry.status !== 'pending' && entry.status !== 'failed') continue;
    const eligibleAt = entry.nextAttemptAt ? new Date(entry.nextAttemptAt).getTime() : 0;
    if (eligibleAt > now) delayed += 1;
    else ready += 1;
    oldestPendingAgeMs = Math.max(oldestPendingAgeMs, Math.max(0, now - new Date(entry.createdAt).getTime()));
  }

  const alerts: string[] = [];
  if (byStatus['dead-letter'] > 0) alerts.push(`${byStatus['dead-letter']} outbox entr${byStatus['dead-letter'] === 1 ? 'y is' : 'ies are'} dead-lettered`);
  if (byStatus.failed > 0) alerts.push(`${byStatus.failed} outbox entr${byStatus.failed === 1 ? 'y is' : 'ies are'} waiting for retry`);
  if (byStatus.dispatching > 0) alerts.push(`${byStatus.dispatching} outbox entr${byStatus.dispatching === 1 ? 'y is' : 'ies are'} currently dispatching`);
  if (oldestPendingAgeMs >= 60 * 60 * 1000) alerts.push(`Oldest pending outbox entry is ${Math.floor(oldestPendingAgeMs / 60000)} minutes old`);

  const health: OutboxHealth = byStatus['dead-letter'] > 0 || oldestPendingAgeMs >= 24 * 60 * 60 * 1000
    ? 'critical'
    : byStatus.failed > 0 || oldestPendingAgeMs >= 60 * 60 * 1000
      ? 'degraded'
      : 'healthy';

  return { total: entries.length, byStatus, ready, delayed, oldestPendingAgeMs, maxAttempts, health, alerts };
}

export function formatOutboxReport(metrics: OutboxMetrics): string {
  const lines = [
    '# Outbox Operations',
    '',
    `Health: ${metrics.health.toUpperCase()}`,
    `Total: ${metrics.total}`,
    `Ready: ${metrics.ready}`,
    `Delayed: ${metrics.delayed}`,
    `Pending: ${metrics.byStatus.pending}`,
    `Dispatching: ${metrics.byStatus.dispatching}`,
    `Failed: ${metrics.byStatus.failed}`,
    `Dead-letter: ${metrics.byStatus['dead-letter']}`,
    `Applied: ${metrics.byStatus.applied}`,
    `Oldest pending age: ${Math.floor(metrics.oldestPendingAgeMs / 1000)}s`,
    `Maximum attempts observed: ${metrics.maxAttempts}`,
    '',
    '## Alerts',
    ...(metrics.alerts.length ? metrics.alerts.map(alert => `- ${alert}`) : ['- None']),
  ];
  return lines.join('\n');
}
