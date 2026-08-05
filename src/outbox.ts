import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  FencedSideEffectExecutor,
  type SideEffectAdapter,
  type SideEffectRequest,
  type SideEffectResult,
} from './side-effects.js';

export type OutboxStatus = 'pending' | 'dispatching' | 'applied' | 'failed';

export interface OutboxEntry<TPayload = unknown> {
  id: string;
  adapterId: string;
  request: SideEffectRequest<TPayload>;
  idempotencyKey: string;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  appliedAt?: string;
  lastError?: string;
  result?: unknown;
}

export interface OutboxDispatchSummary {
  attempted: number;
  applied: number;
  failed: number;
  skipped: number;
}

export class TransactionalOutbox {
  private readonly executor: FencedSideEffectExecutor;

  constructor(private readonly root: string) {
    this.executor = new FencedSideEffectExecutor(root);
  }

  private file(): string { return path.join(this.root, 'outbox.json'); }
  private lockDir(): string { return path.join(this.root, '.outbox.lock'); }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true });
    const deadline = Date.now() + 2_000;
    while (true) {
      try {
        await mkdir(this.lockDir());
        break;
      } catch {
        if (Date.now() >= deadline) throw new Error('Timed out acquiring outbox lock');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    try { return await operation(); }
    finally { await rm(this.lockDir(), { recursive: true, force: true }); }
  }

  private async load(): Promise<OutboxEntry[]> {
    await mkdir(this.root, { recursive: true });
    try { return JSON.parse(await readFile(this.file(), 'utf8')) as OutboxEntry[]; }
    catch { return []; }
  }

  private async save(entries: OutboxEntry[]): Promise<void> {
    await writeFile(this.file(), JSON.stringify(entries, null, 2) + '\n', 'utf8');
  }

  private key(request: SideEffectRequest): string {
    if (request.idempotencyKey?.trim()) return request.idempotencyKey;
    return createHash('sha256')
      .update(JSON.stringify([request.operation, request.resourceId, request.payload]))
      .digest('hex');
  }

  async enqueue<TPayload>(adapterId: string, request: SideEffectRequest<TPayload>): Promise<OutboxEntry<TPayload>> {
    if (!adapterId.trim()) throw new Error('Adapter id is required');
    return this.withLock(async () => {
      const entries = await this.load();
      const idempotencyKey = this.key(request);
      const existing = entries.find(entry => entry.idempotencyKey === idempotencyKey);
      if (existing) return existing as OutboxEntry<TPayload>;
      const now = new Date().toISOString();
      const entry: OutboxEntry<TPayload> = {
        id: `out-${randomUUID().slice(0, 8)}`,
        adapterId,
        request: { ...request, idempotencyKey },
        idempotencyKey,
        status: 'pending',
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(entry as OutboxEntry);
      await this.save(entries);
      return entry;
    });
  }

  async list(): Promise<OutboxEntry[]> { return this.load(); }

  async recoverStaleDispatches(staleAfterMs: number, now = Date.now()): Promise<number> {
    if (staleAfterMs <= 0) throw new Error('Stale dispatch timeout must be positive');
    return this.withLock(async () => {
      const entries = await this.load();
      let recovered = 0;
      for (const entry of entries) {
        if (entry.status !== 'dispatching' || !entry.claimedAt) continue;
        if (now - new Date(entry.claimedAt).getTime() < staleAfterMs) continue;
        entry.status = 'pending';
        entry.claimedAt = undefined;
        entry.updatedAt = new Date(now).toISOString();
        recovered += 1;
      }
      if (recovered) await this.save(entries);
      return recovered;
    });
  }

  private async claim(entryId: string): Promise<OutboxEntry | undefined> {
    return this.withLock(async () => {
      const entries = await this.load();
      const entry = entries.find(item => item.id === entryId);
      if (!entry || !['pending', 'failed'].includes(entry.status)) return undefined;
      const now = new Date().toISOString();
      entry.status = 'dispatching';
      entry.claimedAt = now;
      entry.updatedAt = now;
      entry.attempts += 1;
      await this.save(entries);
      return { ...entry, request: { ...entry.request } };
    });
  }

  private async settle(entryId: string, outcome: { result?: SideEffectResult; error?: unknown }): Promise<void> {
    await this.withLock(async () => {
      const entries = await this.load();
      const entry = entries.find(item => item.id === entryId);
      if (!entry) throw new Error(`Outbox entry not found: ${entryId}`);
      const now = new Date().toISOString();
      entry.updatedAt = now;
      entry.claimedAt = undefined;
      if (outcome.error !== undefined) {
        entry.status = 'failed';
        entry.lastError = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
      } else {
        entry.status = 'applied';
        entry.appliedAt = now;
        entry.lastError = undefined;
        entry.result = outcome.result?.result;
      }
      await this.save(entries);
    });
  }

  async dispatch(
    adapters: SideEffectAdapter[],
    options: { limit?: number } = {},
  ): Promise<OutboxDispatchSummary> {
    const adapterById = new Map(adapters.map(adapter => [adapter.id, adapter]));
    const candidates = (await this.load())
      .filter(entry => entry.status === 'pending' || entry.status === 'failed')
      .slice(0, Math.max(0, options.limit ?? Number.POSITIVE_INFINITY));
    const summary: OutboxDispatchSummary = { attempted: 0, applied: 0, failed: 0, skipped: 0 };

    for (const candidate of candidates) {
      const adapter = adapterById.get(candidate.adapterId);
      if (!adapter) { summary.skipped += 1; continue; }
      const claimed = await this.claim(candidate.id);
      if (!claimed) { summary.skipped += 1; continue; }
      summary.attempted += 1;
      try {
        const result = await this.executor.execute(adapter, claimed.request);
        await this.settle(claimed.id, { result });
        summary.applied += 1;
      } catch (error) {
        await this.settle(claimed.id, { error });
        summary.failed += 1;
      }
    }
    return summary;
  }
}
