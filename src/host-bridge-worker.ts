import { HostBridgeExecutor } from './host-bridge-executor.js';
import { LocalHostAdapter } from './local-host-adapter.js';
import { JsonHostJobQueue } from './json-host-job-queue.js';

export interface HostBridgeWorkerOptions {
  queuePath: string;
  intervalMs?: number;
}

export class HostBridgeWorker {
  readonly queue: JsonHostJobQueue;
  private readonly executor: HostBridgeExecutor;

  constructor(options: HostBridgeWorkerOptions, executor = new HostBridgeExecutor(new LocalHostAdapter())) {
    this.queue = new JsonHostJobQueue(options.queuePath);
    this.executor = executor;
  }

  async runOnce(): Promise<boolean> {
    const claimed = await this.queue.claimNext();
    if (!claimed) return false;
    const result = await this.executor.execute(claimed.job);
    await this.queue.finish(claimed.job.id, result);
    return true;
  }

  async runUntilEmpty(maxJobs = 25): Promise<number> {
    const bounded = Math.max(1, Math.min(100, maxJobs));
    let processed = 0;
    while (processed < bounded && await this.runOnce()) processed += 1;
    return processed;
  }
}
