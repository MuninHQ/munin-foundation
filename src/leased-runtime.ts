import path from 'node:path';
import { PersistentLeaseStore } from './persistent-leases.js';
import { ExecutionEngine, type ExecutionPlan } from './runtime.js';

export class LeasedRuntime {
  private readonly leases: PersistentLeaseStore;

  constructor(
    private readonly engine: ExecutionEngine,
    root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime'),
    private readonly leaseDurationMs = 30_000,
  ) {
    this.leases = new PersistentLeaseStore(root);
  }

  async run(planId: string, workerId: string): Promise<ExecutionPlan> {
    if (!workerId.trim()) throw new Error('Worker id is required');
    const key = `plan:${planId}`;
    const acquired = await this.leases.acquire(key, workerId, this.leaseDurationMs);
    if (!acquired.acquired) {
      throw new Error(`Execution plan is already leased by worker: ${acquired.lease?.workerId ?? 'unknown'}`);
    }
    try {
      return await this.engine.run(planId);
    } finally {
      await this.leases.release(key, workerId);
    }
  }
}
