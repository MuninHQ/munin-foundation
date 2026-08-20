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
}
interface QueueFile { version: 1; jobs: QueuedHostJob[] }

export class JsonHostJobQueue {
  constructor(private readonly path: string) {}

  private async read(): Promise<QueueFile> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as QueueFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.jobs)) throw new Error('Unsupported Host Bridge queue format.');
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

  async enqueue(job: HostJob): Promise<QueuedHostJob> {
    const file = await this.read();
    const existing = file.jobs.find(item => item.job.id === job.id);
    if (existing) return existing;
    const queued: QueuedHostJob = { job, status:'queued', enqueuedAt:new Date().toISOString() };
    file.jobs.push(queued);
    await this.write(file);
    return queued;
  }

  async claimNext(): Promise<QueuedHostJob | undefined> {
    const file = await this.read();
    const index = file.jobs.findIndex(item => item.status === 'queued');
    if (index < 0) return undefined;
    file.jobs[index] = { ...file.jobs[index], status:'running', startedAt:new Date().toISOString() };
    await this.write(file);
    return file.jobs[index];
  }

  async finish(id: string, result: HostJobResult): Promise<QueuedHostJob> {
    const file = await this.read();
    const index = file.jobs.findIndex(item => item.job.id === id);
    if (index < 0) throw new Error(`Unknown host job: ${id}`);
    const status: QueuedHostJobStatus = result.status === 'completed' ? 'completed' : result.status === 'blocked' ? 'blocked' : 'failed';
    file.jobs[index] = { ...file.jobs[index], status, finishedAt:new Date().toISOString(), result };
    await this.write(file);
    return file.jobs[index];
  }

  async list(): Promise<QueuedHostJob[]> { return (await this.read()).jobs; }
}
