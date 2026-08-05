import path from 'node:path';
import { PersistentLeaseStore } from './persistent-leases.js';
import { ExecutionEngine, type ExecutionPlan } from './runtime.js';

export class LeasedRuntime {
  private readonly leases: PersistentLeaseStore;

  constructor(
    private readonly engine: ExecutionEngine,
    root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime'),
    private readonly leaseDurationMs = 30_000,
    private readonly heartbeatMs = Math.max(1_000, Math.floor(leaseDurationMs / 3)),
  ) {
    if (heartbeatMs >= leaseDurationMs) throw new Error('Heartbeat interval must be shorter than lease duration');
    this.leases = new PersistentLeaseStore(root);
  }

  async run(planId: string, workerId: string): Promise<ExecutionPlan> {
    if (!workerId.trim()) throw new Error('Worker id is required');
    const key = `plan:${planId}`;
    const acquired = await this.leases.acquire(key, workerId, this.leaseDurationMs);
    if (!acquired.acquired || !acquired.lease) {
      throw new Error(`Execution plan is already leased by worker: ${acquired.lease?.workerId ?? 'unknown'}`);
    }

    const version = acquired.lease.version;
    let heartbeatError: Error | undefined;
    const timer = setInterval(() => {
      void this.leases.renew(key, workerId, version, this.leaseDurationMs)
        .then(result => {
          if (!result.acquired) heartbeatError = new Error(`Lost execution lease for plan: ${planId}`);
        })
        .catch(error => { heartbeatError = error instanceof Error ? error : new Error(String(error)); });
    }, this.heartbeatMs);

    try {
      const result = await this.engine.run(planId);
      if (heartbeatError) throw heartbeatError;
      await this.leases.assertCurrent(key, workerId, version);
      return result;
    } finally {
      clearInterval(timer);
      await this.leases.release(key, workerId, version);
    }
  }
}
