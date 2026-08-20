export type HostJobType = 'runtime-health' | 'git-fast-forward' | 'restart-munin' | 'run-acceptance' | 'tailscale-health';
export type HostJobStatus = 'queued' | 'approved' | 'running' | 'completed' | 'blocked' | 'failed';

export interface HostJob {
  id: string;
  type: HostJobType;
  repo?: 'MuninHQ/munin-foundation';
  branch?: 'main';
  dryRun?: boolean;
  createdAt: string;
}

export interface HostJobResult {
  id: string;
  status: HostJobStatus;
  summary: string;
  evidence?: string[];
}

const ALLOWED: ReadonlySet<HostJobType> = new Set(['runtime-health','git-fast-forward','restart-munin','run-acceptance','tailscale-health']);

export function validateHostJob(job: HostJob): HostJobResult {
  if (!job.id.trim()) return { id: job.id, status: 'blocked', summary: 'Missing job id.' };
  if (!ALLOWED.has(job.type)) return { id: job.id, status: 'blocked', summary: 'Host job type is not allowlisted.' };
  if (job.type === 'git-fast-forward' && (job.repo !== 'MuninHQ/munin-foundation' || job.branch !== 'main')) return { id: job.id, status: 'blocked', summary: 'Git update is restricted to approved repository main branch.' };
  return { id: job.id, status: 'approved', summary: job.dryRun ? 'Approved for dry-run only.' : 'Approved typed host action.' };
}

export function redactHostOutput(value: string): string {
  return value
    .replace(/(authorization:\s*bearer\s+)[^\s]+/ig, '$1[REDACTED]')
    .replace(/(api[_-]?key\s*[=:]\s*)[^\s]+/ig, '$1[REDACTED]')
    .replace(/(token\s*[=:]\s*)[^\s]+/ig, '$1[REDACTED]')
    .slice(0, 12000);
}

export class HostAcceptanceQueue {
  private readonly jobs = new Map<string, HostJob>();
  enqueue(job: HostJob): HostJob { if (!this.jobs.has(job.id)) this.jobs.set(job.id, job); return this.jobs.get(job.id)! }
  list(): HostJob[] { return [...this.jobs.values()] }
}
