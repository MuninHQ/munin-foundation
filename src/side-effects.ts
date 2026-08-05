import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PersistentLeaseStore } from './persistent-leases.js';

export interface SideEffectRequest<TPayload = unknown> {
  operation: string;
  resourceId: string;
  payload: TPayload;
  leaseKey: string;
  workerId: string;
  fencingVersion: number;
  idempotencyKey?: string;
}

export interface SideEffectResult<TResult = unknown> {
  applied: boolean;
  duplicate: boolean;
  adapterId: string;
  idempotencyKey: string;
  result?: TResult;
}

export interface SideEffectAdapter<TPayload = unknown, TResult = unknown> {
  id: string;
  apply(request: SideEffectRequest<TPayload>): Promise<TResult>;
}

interface SideEffectRecord {
  idempotencyKey: string;
  operation: string;
  resourceId: string;
  adapterId: string;
  workerId: string;
  fencingVersion: number;
  appliedAt: string;
  result?: unknown;
}

export class FencedSideEffectExecutor {
  private readonly leases: PersistentLeaseStore;

  constructor(private readonly root: string) {
    this.leases = new PersistentLeaseStore(root);
  }

  private file(): string { return path.join(this.root, 'side-effects.json'); }

  private async load(): Promise<SideEffectRecord[]> {
    await mkdir(this.root, { recursive: true });
    try { return JSON.parse(await readFile(this.file(), 'utf8')) as SideEffectRecord[]; }
    catch { return []; }
  }

  private async save(records: SideEffectRecord[]): Promise<void> {
    await writeFile(this.file(), JSON.stringify(records, null, 2) + '\n', 'utf8');
  }

  private key(request: SideEffectRequest): string {
    if (request.idempotencyKey?.trim()) return request.idempotencyKey;
    return createHash('sha256')
      .update(JSON.stringify([request.operation, request.resourceId, request.payload]))
      .digest('hex');
  }

  async execute<TPayload, TResult>(
    adapter: SideEffectAdapter<TPayload, TResult>,
    request: SideEffectRequest<TPayload>,
  ): Promise<SideEffectResult<TResult>> {
    const idempotencyKey = this.key(request);
    const records = await this.load();
    const existing = records.find(record => record.idempotencyKey === idempotencyKey);
    if (existing) {
      return {
        applied: false,
        duplicate: true,
        adapterId: existing.adapterId,
        idempotencyKey,
        result: existing.result as TResult | undefined,
      };
    }

    await this.leases.assertCurrent(
      request.leaseKey,
      request.workerId,
      request.fencingVersion,
    );

    const result = await adapter.apply({ ...request, idempotencyKey });
    records.push({
      idempotencyKey,
      operation: request.operation,
      resourceId: request.resourceId,
      adapterId: adapter.id,
      workerId: request.workerId,
      fencingVersion: request.fencingVersion,
      appliedAt: new Date().toISOString(),
      result,
    });
    await this.save(records);

    return { applied: true, duplicate: false, adapterId: adapter.id, idempotencyKey, result };
  }
}
