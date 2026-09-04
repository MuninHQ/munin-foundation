import { runtimePath } from './config.js';
import { createContentVideoCapability, contentVideoPolicy, type ContentVideoInput, type ContentVideoOutput } from './content-video-capability.js';
import { readJsonFile, writeJsonAtomic } from './storage.js';
import type { ViralProductionJob } from './viral-engine.js';

export type ViralDispatchAction = 'plan' | 'generate';
export interface ViralDispatchReceipt {
  jobId: string;
  topicId: string;
  action: ViralDispatchAction;
  status: 'planned' | 'generated';
  reused: boolean;
  detail: string;
  result?: unknown;
  createdAt: string;
}
interface DispatchState { version: 1; receipts: ViralDispatchReceipt[]; updatedAt: string }
type ExecuteVideo = (input: ContentVideoInput) => Promise<ContentVideoOutput>;
type Policy = () => { enabled: boolean; runnerConfigured: boolean };

const emptyState = (): DispatchState => ({ version: 1, receipts: [], updatedAt: new Date(0).toISOString() });

export class ViralProductionDispatcher {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly file = runtimePath('viral-engine', 'production-dispatch.json'),
    private readonly executeVideo: ExecuteVideo = input => createContentVideoCapability().execute(input, {
      capability: 'media.content-video', executionId: `viral-${Date.now()}`, startedAt: new Date().toISOString(), input, metadata: { source: 'viral-engine' },
    }),
    private readonly policy: Policy = contentVideoPolicy,
  ) {}

  dispatch(job: ViralProductionJob): Promise<ViralDispatchReceipt> {
    const run = this.tail.then(async () => {
      const state = await readJsonFile(this.file, emptyState);
      const existing = state.receipts.find(receipt => receipt.jobId === job.id);
      if (existing) return { ...existing, reused: true };
      const p = this.policy();
      const action: ViralDispatchAction = p.enabled && p.runnerConfigured ? 'generate' : 'plan';
      const output = await this.executeVideo({
        action,
        topic: job.handoff.topic,
        script: job.handoff.script,
        aspectRatio: job.handoff.aspectRatio,
        provider: 'moneyprinterturbo',
      });
      const receipt: ViralDispatchReceipt = {
        jobId: job.id,
        topicId: job.topicId,
        action,
        status: action === 'generate' ? 'generated' : 'planned',
        reused: false,
        detail: output.detail,
        result: output.result ?? output.request,
        createdAt: new Date().toISOString(),
      };
      state.receipts.unshift(receipt);
      state.receipts = state.receipts.slice(0, 200);
      state.updatedAt = receipt.createdAt;
      await writeJsonAtomic(this.file, state);
      return receipt;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  async list(): Promise<ViralDispatchReceipt[]> {
    return (await readJsonFile(this.file, emptyState)).receipts;
  }
}
