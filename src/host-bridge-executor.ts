import { validateHostJob, redactHostOutput, type HostJob, type HostJobResult } from './host-bridge-protocol.js';

export interface HostExecutionAdapter {
  runtimeHealth(): Promise<string>;
  gitFastForward(): Promise<string>;
  deployMain(): Promise<string>;
  restartMunin(): Promise<string>;
  runAcceptance(): Promise<string>;
  tailscaleHealth(): Promise<string>;
  creativeReview(): Promise<string>;
}

export class HostBridgeExecutor {
  constructor(private readonly adapter: HostExecutionAdapter) {}

  async execute(job: HostJob): Promise<HostJobResult> {
    const gate = validateHostJob(job);
    if (gate.status !== 'approved') return gate;
    if (job.dryRun) return { id: job.id, status: 'completed', summary: 'Dry-run approved; no host mutation executed.', evidence: [job.type] };

    try {
      const raw = await this.dispatch(job);
      const sanitized = redactHostOutput(raw);
      return { id: job.id, status: 'completed', summary: `${job.type} completed.`, evidence: sanitized ? [sanitized] : [] };
    } catch (error) {
      return { id: job.id, status: 'failed', summary: redactHostOutput(error instanceof Error ? error.message : String(error)) };
    }
  }

  private dispatch(job: HostJob): Promise<string> {
    switch (job.type) {
      case 'runtime-health': return this.adapter.runtimeHealth();
      case 'git-fast-forward': return this.adapter.gitFastForward();
      case 'deploy-main': return this.adapter.deployMain();
      case 'restart-munin': return this.adapter.restartMunin();
      case 'run-acceptance': return this.adapter.runAcceptance();
      case 'tailscale-health': return this.adapter.tailscaleHealth();
      case 'creative-review': return this.adapter.creativeReview();
    }
  }
}
