import { HostBridgeExecutor } from './host-bridge-executor.js';
import { LocalHostAdapter } from './local-host-adapter.js';
import { JsonHostJobQueue } from './json-host-job-queue.js';

export interface HostBridgeWorkerOptions {
  queuePath: string;
  intervalMs?: number;
  leaseMs?: number;
  onCompleted?: (observation: HostBridgeWorkerObservation) => unknown;
}

export interface HostBridgeWorkerObservation { jobId: string; durationMs: number; status: string }

export class HostBridgeWorker {
  readonly queue: JsonHostJobQueue;
  private readonly executor: HostBridgeExecutor;

  constructor(private readonly options: HostBridgeWorkerOptions, executor = new HostBridgeExecutor(new LocalHostAdapter())) {
    this.queue = new JsonHostJobQueue(options.queuePath);
    this.executor = executor;
  }

  async runOnce(): Promise<boolean> {
    const leaseMs = Math.max(5_000, Math.min(30 * 60_000, this.options.leaseMs ?? 120_000));
    const claimed = await this.queue.claimNext({ leaseMs });
    if (!claimed) return false;
    const startedAt = Date.now();
    const heartbeatMs = Math.max(1_000, Math.floor(leaseMs / 3));
    const heartbeat = setInterval(() => {
      void this.queue.renew(claimed.job.id, { leaseMs }).catch(() => undefined);
    }, heartbeatMs);
    heartbeat.unref?.();
    try {
      const result = await this.executor.execute(claimed.job);
      await this.queue.finish(claimed.job.id, result);
      try {
        const observed=this.options.onCompleted?.({ jobId: claimed.job.id, durationMs: Date.now() - startedAt, status: result.status });
        if(observed)void Promise.resolve(observed).catch(()=>undefined);
      } catch {}
      return true;
    } finally {
      clearInterval(heartbeat);
    }
  }

  async runUntilEmpty(maxJobs = 25): Promise<number> {
    const bounded = Math.max(1, Math.min(100, maxJobs));
    let processed = 0;
    while (processed < bounded && await this.runOnce()) processed += 1;
    return processed;
  }
}
