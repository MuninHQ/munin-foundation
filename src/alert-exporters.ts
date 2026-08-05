import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { OutboxHealth, OutboxMetrics } from './outbox-operations.js';

export type AlertKind = 'incident' | 'recovery';

export interface AlertEvent {
  id: string;
  source: 'outbox';
  kind: AlertKind;
  severity: OutboxHealth;
  title: string;
  details: string[];
  fingerprint: string;
  occurredAt: string;
  metrics: Pick<OutboxMetrics, 'total' | 'ready' | 'delayed' | 'oldestPendingAgeMs' | 'maxAttempts'>;
}

export interface AlertExporter {
  id: string;
  send(event: AlertEvent): Promise<void>;
}

interface AlertState {
  lastFingerprint?: string;
  lastHealth?: OutboxHealth;
  lastSentAt?: string;
}

export interface AlertDispatchResult {
  sent: boolean;
  reason: 'sent' | 'healthy' | 'duplicate';
  event?: AlertEvent;
  exporters: string[];
}

export class AlertDispatcher {
  constructor(private readonly root: string) {}

  private file(): string { return path.join(this.root, 'alert-state.json'); }

  private async load(): Promise<AlertState> {
    await mkdir(this.root, { recursive: true });
    try { return JSON.parse(await readFile(this.file(), 'utf8')) as AlertState; }
    catch { return {}; }
  }

  private async save(state: AlertState): Promise<void> {
    await writeFile(this.file(), JSON.stringify(state, null, 2) + '\n', 'utf8');
  }

  private fingerprint(kind: AlertKind, metrics: OutboxMetrics): string {
    return createHash('sha256')
      .update(JSON.stringify([kind, metrics.health, metrics.alerts, metrics.byStatus]))
      .digest('hex');
  }

  private event(kind: AlertKind, metrics: OutboxMetrics, now: number): AlertEvent {
    const fingerprint = this.fingerprint(kind, metrics);
    return {
      id: `alert-${fingerprint.slice(0, 12)}`,
      source: 'outbox',
      kind,
      severity: metrics.health,
      title: kind === 'recovery' ? 'Outbox recovered' : `Outbox health is ${metrics.health}`,
      details: kind === 'recovery' ? ['Outbox health returned to healthy'] : [...metrics.alerts],
      fingerprint,
      occurredAt: new Date(now).toISOString(),
      metrics: {
        total: metrics.total,
        ready: metrics.ready,
        delayed: metrics.delayed,
        oldestPendingAgeMs: metrics.oldestPendingAgeMs,
        maxAttempts: metrics.maxAttempts,
      },
    };
  }

  async dispatch(metrics: OutboxMetrics, exporters: AlertExporter[], now = Date.now()): Promise<AlertDispatchResult> {
    const state = await this.load();
    const recovering = metrics.health === 'healthy' && state.lastHealth && state.lastHealth !== 'healthy';
    if (metrics.health === 'healthy' && !recovering) {
      await this.save({ ...state, lastHealth: 'healthy' });
      return { sent: false, reason: 'healthy', exporters: [] };
    }

    const kind: AlertKind = recovering ? 'recovery' : 'incident';
    const event = this.event(kind, metrics, now);
    if (state.lastFingerprint === event.fingerprint) {
      await this.save({ ...state, lastHealth: metrics.health });
      return { sent: false, reason: 'duplicate', event, exporters: [] };
    }

    for (const exporter of exporters) await exporter.send(event);
    await this.save({
      lastFingerprint: event.fingerprint,
      lastHealth: metrics.health,
      lastSentAt: event.occurredAt,
    });
    return { sent: true, reason: 'sent', event, exporters: exporters.map(exporter => exporter.id) };
  }
}
