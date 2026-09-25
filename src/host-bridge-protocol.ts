export type HostJobType = 'runtime-health' | 'git-fast-forward' | 'deploy-main' | 'restart-munin' | 'run-acceptance' | 'tailscale-health' | 'creative-review' | 'build-all';
export type HostJobStatus = 'queued' | 'approved' | 'running' | 'completed' | 'blocked' | 'failed';

export interface HostJob {
  id: string;
  type: HostJobType;
  repo?: 'MuninHQ/munin-foundation';
  branch?: 'main';
  objective?: string;
  dryRun?: boolean;
  createdAt: string;
}

export interface HostJobResult {
  id: string;
  status: HostJobStatus;
  summary: string;
  evidence?: string[];
}

const ALLOWED: ReadonlySet<HostJobType> = new Set(['runtime-health','git-fast-forward','deploy-main','restart-munin','run-acceptance','tailscale-health','creative-review','build-all']);

export function validateHostJob(job: HostJob): HostJobResult {
  if (!job.id.trim()) return { id: job.id, status: 'blocked', summary: 'Missing job id.' };
  if (!ALLOWED.has(job.type)) return { id: job.id, status: 'blocked', summary: 'Host job type is not allowlisted.' };
  if ((job.type === 'git-fast-forward'||job.type==='deploy-main'||job.type==='build-all') && (job.repo !== 'MuninHQ/munin-foundation' || job.branch !== 'main')) return { id: job.id, status: 'blocked', summary: 'Repository mutation is restricted to approved Munin main context.' };
  if (job.type === 'build-all') {
    const objective = job.objective?.trim() ?? '';
    if (!objective) return { id: job.id, status: 'blocked', summary: 'BUILD ALL requires a non-empty objective.' };
    if (objective.length > 2000) return { id: job.id, status: 'blocked', summary: 'BUILD ALL objective exceeds the 2000 character safety limit.' };
  }
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
