export interface TaskLease {
  taskId: string;
  workerId: string;
  acquiredAt: string;
  expiresAt: string;
  version: number;
}

export interface LeaseResult {
  acquired: boolean;
  lease?: TaskLease;
  reason?: 'active-lease' | 'invalid-duration';
}

export class TaskLeaseManager {
  private readonly leases = new Map<string, TaskLease>();

  acquire(taskId: string, workerId: string, durationMs: number, now = Date.now()): LeaseResult {
    if (durationMs <= 0) return { acquired: false, reason: 'invalid-duration' };
    const current = this.leases.get(taskId);
    if (current && new Date(current.expiresAt).getTime() > now && current.workerId !== workerId) {
      return { acquired: false, lease: { ...current }, reason: 'active-lease' };
    }
    const lease: TaskLease = {
      taskId,
      workerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + durationMs).toISOString(),
      version: (current?.version ?? 0) + 1,
    };
    this.leases.set(taskId, lease);
    return { acquired: true, lease: { ...lease } };
  }

  renew(taskId: string, workerId: string, durationMs: number, now = Date.now()): LeaseResult {
    const current = this.leases.get(taskId);
    if (!current || current.workerId !== workerId || new Date(current.expiresAt).getTime() <= now) {
      return { acquired: false, lease: current ? { ...current } : undefined, reason: 'active-lease' };
    }
    return this.acquire(taskId, workerId, durationMs, now);
  }

  release(taskId: string, workerId: string): boolean {
    const current = this.leases.get(taskId);
    if (!current || current.workerId !== workerId) return false;
    this.leases.delete(taskId);
    return true;
  }

  get(taskId: string, now = Date.now()): TaskLease | undefined {
    const current = this.leases.get(taskId);
    if (!current) return undefined;
    if (new Date(current.expiresAt).getTime() <= now) {
      this.leases.delete(taskId);
      return undefined;
    }
    return { ...current };
  }

  reapExpired(now = Date.now()): TaskLease[] {
    const expired: TaskLease[] = [];
    for (const [taskId, lease] of this.leases) {
      if (new Date(lease.expiresAt).getTime() <= now) {
        expired.push({ ...lease });
        this.leases.delete(taskId);
      }
    }
    return expired;
  }
}
