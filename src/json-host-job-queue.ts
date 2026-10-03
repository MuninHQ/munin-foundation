import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { HostJob, HostJobResult } from './host-bridge-protocol.js';

export type QueuedHostJobStatus = 'queued' | 'running' | 'completed' | 'blocked' | 'failed';
export interface QueuedHostJob {
  job: HostJob;
  status: QueuedHostJobStatus;
  enqueuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: HostJobResult;
  attempts?: number;
  leaseUntil?: string;
  recoveredAt?: string;
}
interface QueueFile { version: 1; jobs: QueuedHostJob[] }

const SAFE_RETRY_AFTER_CRASH: ReadonlySet<HostJob['type']> = new Set([
  'runtime-health',
  'tailscale-health',
  'run-acceptance',
]);

function iso(now: number): string { return new Date(now).toISOString(); }

export class JsonHostJobQueue {
  private operation: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {}

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.operation.then(fn, fn);
    this.operation = next.then(() => undefined, () => undefined);
    return next;
  }

  private async read(): Promise<QueueFile> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as QueueFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.jobs)) throw new Error('Unsupported Host Bridge queue format.');
      parsed.jobs = parsed.jobs.map(item => ({ ...item, attempts: item.attempts ?? (item.startedAt ? 1 : 0) }));
      return parsed;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { version: 1, jobs: [] };
      throw error;
    }
  }

  private async write(file: QueueFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(file, null, 2) + '\n', 'utf8');
    await rename(tmp, this.path);
  }

  private recoverExpiredInFile(file: QueueFile, now: number): number {
    let recovered = 0;
    for (let index = 0; index < file.jobs.length; index += 1) {
      const item = file.jobs[index];
      if (item.status !== 'running' || !item.leaseUntil || Date.parse(item.leaseUntil) > now) continue;
      recovered += 1;
      if (SAFE_RETRY_AFTER_CRASH.has(item.job.type)) {
        file.jobs[index] = {
          ...item,
          status: 'queued',
          startedAt: undefined,
          leaseUntil: undefined,
          recoveredAt: iso(now),
          result: undefined,
          finishedAt: undefined,
        };
      } else {
        file.jobs[index] = {
          ...item,
          status: 'blocked',
          leaseUntil: undefined,
          recoveredAt: iso(now),
          finishedAt: iso(now),
          result: {
            id: item.job.id,
            status: 'blocked',
            summary: 'Worker lease expired after a potentially consequential host action. Automatic replay is blocked until external state is reconciled.',
          },
        };
      }
    }
    return recovered;
  }

  async enqueue(job: HostJob): Promise<QueuedHostJob> {
    return this.serial(async () => {
      const file = await this.read();
      const existing = file.jobs.find(item => item.job.id === job.id);
      if (existing) return existing;
      const queued: QueuedHostJob = { job, status:'queued', enqueuedAt:new Date().toISOString(), attempts:0 };
      file.jobs.push(queued);
      await this.write(file);
      return queued;
    });
  }

  async recoverExpired(now = Date.now()): Promise<number> {
    return this.serial(async () => {
      const file = await this.read();
      const recovered = this.recoverExpiredInFile(file, now);
      if (recovered) await this.write(file);
      return recovered;
    });
  }

  async claimNext(options: { leaseMs?: number; now?: number } = {}): Promise<QueuedHostJob | undefined> {
    return this.serial(async () => {
      const now = options.now ?? Date.now();
      const leaseMs = Math.max(5_000, Math.min(30 * 60_000, options.leaseMs ?? 120_000));
      const file = await this.read();
      this.recoverExpiredInFile(file, now);
      const index = file.jobs.findIndex(item => item.status === 'queued');
      if (index < 0) {
        await this.write(file);
        return undefined;
      }
      file.jobs[index] = {
        ...file.jobs[index],
        status:'running',
        startedAt:iso(now),
        finishedAt:undefined,
        result:undefined,
        attempts:(file.jobs[index].attempts ?? 0) + 1,
        leaseUntil:iso(now + leaseMs),
      };
      await this.write(file);
      return file.jobs[index];
    });
  }

  async renew(id: string, options: { leaseMs?: number; now?: number } = {}): Promise<boolean> {
    return this.serial(async () => {
      const now = options.now ?? Date.now();
      const leaseMs = Math.max(5_000, Math.min(30 * 60_000, options.leaseMs ?? 120_000));
      const file = await this.read();
      const index = file.jobs.findIndex(item => item.job.id === id);
      if (index < 0 || file.jobs[index].status !== 'running') return false;
      file.jobs[index] = { ...file.jobs[index], leaseUntil: iso(now + leaseMs) };
      await this.write(file);
      return true;
    });
  }

  async finish(id: string, result: HostJobResult): Promise<QueuedHostJob> {
    return this.serial(async () => {
      const file = await this.read();
      const index = file.jobs.findIndex(item => item.job.id === id);
      if (index < 0) throw new Error(`Unknown host job: ${id}`);
      const status: QueuedHostJobStatus = result.status === 'completed' ? 'completed' : result.status === 'blocked' ? 'blocked' : 'failed';
      file.jobs[index] = {
        ...file.jobs[index],
        status,
        leaseUntil:undefined,
        finishedAt:new Date().toISOString(),
        result,
      };
      await this.write(file);
      return file.jobs[index];
    });
  }

  async list(): Promise<QueuedHostJob[]> {
    return this.serial(async () => (await this.read()).jobs);
  }
}
