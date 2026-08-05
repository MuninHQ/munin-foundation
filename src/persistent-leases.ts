import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TaskLease } from './leases.js';

interface LeaseDocument {
  leases: TaskLease[];
  versions: Record<string, number>;
}

export interface PersistentLeaseResult {
  acquired: boolean;
  lease?: TaskLease;
  reason?: 'active-lease' | 'invalid-duration' | 'stale-fence';
}

export class PersistentLeaseStore {
  constructor(private readonly root: string) {}

  private file(): string { return path.join(this.root, 'leases.json'); }
  private lockDir(): string { return path.join(this.root, '.leases.lock'); }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true });
    const deadline = Date.now() + 2_000;
    while (true) {
      try {
        await mkdir(this.lockDir());
        break;
      } catch {
        if (Date.now() >= deadline) throw new Error('Timed out acquiring persistent lease store lock');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    try { return await operation(); }
    finally { await rm(this.lockDir(), { recursive: true, force: true }); }
  }

  private async load(): Promise<LeaseDocument> {
    try {
      const parsed = JSON.parse(await readFile(this.file(), 'utf8')) as Partial<LeaseDocument>;
      return { leases: parsed.leases ?? [], versions: parsed.versions ?? {} };
    } catch {
      return { leases: [], versions: {} };
    }
  }

  private async save(document: LeaseDocument): Promise<void> {
    await writeFile(this.file(), JSON.stringify(document, null, 2) + '\n', 'utf8');
  }

  async acquire(taskId: string, workerId: string, durationMs: number, now = Date.now()): Promise<PersistentLeaseResult> {
    if (durationMs <= 0) return { acquired: false, reason: 'invalid-duration' };
    return this.withLock(async () => {
      const document = await this.load();
      const current = document.leases.find(lease => lease.taskId === taskId);
      if (current && new Date(current.expiresAt).getTime() > now && current.workerId !== workerId) {
        return { acquired: false, lease: { ...current }, reason: 'active-lease' };
      }
      const version = (document.versions[taskId] ?? current?.version ?? 0) + 1;
      const lease: TaskLease = {
        taskId,
        workerId,
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + durationMs).toISOString(),
        version,
      };
      document.leases = document.leases.filter(item => item.taskId !== taskId);
      document.leases.push(lease);
      document.versions[taskId] = version;
      await this.save(document);
      return { acquired: true, lease: { ...lease } };
    });
  }

  async renew(taskId: string, workerId: string, version: number, durationMs: number, now = Date.now()): Promise<PersistentLeaseResult> {
    if (durationMs <= 0) return { acquired: false, reason: 'invalid-duration' };
    return this.withLock(async () => {
      const document = await this.load();
      const current = document.leases.find(lease => lease.taskId === taskId);
      if (!current || current.workerId !== workerId || current.version !== version || new Date(current.expiresAt).getTime() <= now) {
        return { acquired: false, lease: current ? { ...current } : undefined, reason: 'stale-fence' };
      }
      current.expiresAt = new Date(now + durationMs).toISOString();
      await this.save(document);
      return { acquired: true, lease: { ...current } };
    });
  }

  async assertCurrent(taskId: string, workerId: string, version: number, now = Date.now()): Promise<TaskLease> {
    return this.withLock(async () => {
      const document = await this.load();
      const current = document.leases.find(lease => lease.taskId === taskId);
      if (!current || current.workerId !== workerId || current.version !== version || new Date(current.expiresAt).getTime() <= now) {
        throw new Error(`Stale fencing token for lease: ${taskId}`);
      }
      return { ...current };
    });
  }

  async release(taskId: string, workerId: string, version?: number): Promise<boolean> {
    return this.withLock(async () => {
      const document = await this.load();
      const current = document.leases.find(lease => lease.taskId === taskId);
      if (!current || current.workerId !== workerId || (version !== undefined && current.version !== version)) return false;
      document.leases = document.leases.filter(lease => lease.taskId !== taskId);
      await this.save(document);
      return true;
    });
  }

  async get(taskId: string, now = Date.now()): Promise<TaskLease | undefined> {
    return this.withLock(async () => {
      const document = await this.load();
      const current = document.leases.find(lease => lease.taskId === taskId);
      if (!current) return undefined;
      if (new Date(current.expiresAt).getTime() <= now) {
        document.leases = document.leases.filter(lease => lease.taskId !== taskId);
        await this.save(document);
        return undefined;
      }
      return { ...current };
    });
  }

  async reapExpired(now = Date.now()): Promise<TaskLease[]> {
    return this.withLock(async () => {
      const document = await this.load();
      const expired = document.leases.filter(lease => new Date(lease.expiresAt).getTime() <= now);
      if (expired.length) {
        const expiredIds = new Set(expired.map(lease => lease.taskId));
        document.leases = document.leases.filter(lease => !expiredIds.has(lease.taskId));
        await this.save(document);
      }
      return expired.map(lease => ({ ...lease }));
    });
  }
}
