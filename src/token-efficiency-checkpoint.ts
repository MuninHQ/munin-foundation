import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompactWorkflowContext } from './token-efficiency-compaction.js';
import { redactSecrets } from './secret-redaction.js';
import type { TokenEfficiencyConfig } from './token-efficiency-config.js';

export interface TokenEfficiencyCheckpointInput {
  runId: string;
  sessionId: string;
  sourceRevision: string;
  compact: CompactWorkflowContext;
  repository?: string;
  branch?: string;
  nextAction?: string;
}
export interface TokenEfficiencyCheckpoint extends TokenEfficiencyCheckpointInput {
  id: string;
  createdAt: string;
  continuationPrompt: string;
}

export class TokenEfficiencyCheckpointStore {
  constructor(readonly directory: string, private readonly config?: Readonly<TokenEfficiencyConfig>) {}

  async write(input: TokenEfficiencyCheckpointInput): Promise<{ created: boolean; path: string; checkpoint: TokenEfficiencyCheckpoint }> {
    if (this.config && (!this.config.enabled || !this.config.checkpointEnabled)) throw new Error('Token efficiency checkpoint writing is disabled.');
    const id = createHash('sha256').update(`${input.runId}\0${input.sessionId}\0${input.sourceRevision}`).digest('hex').slice(0, 24);
    const filePath = path.join(this.directory, `checkpoint-${id}.json`);
    try {
      const checkpoint = JSON.parse(await readFile(filePath, 'utf8')) as TokenEfficiencyCheckpoint;
      return { created: false, path: filePath, checkpoint };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await mkdir(this.directory, { recursive: true });
    const bounded = (value: string | undefined, max: number) => value === undefined ? undefined : redactSecrets(value).slice(0, max);
    const checkpoint = redactSecrets<TokenEfficiencyCheckpoint>({
      runId: bounded(input.runId, 256) ?? '', sessionId: bounded(input.sessionId, 256) ?? '', sourceRevision: bounded(input.sourceRevision, 256) ?? '', compact: input.compact,
      repository: bounded(input.repository, 512), branch: bounded(input.branch, 256), nextAction: bounded(input.nextAction, 2_000),
      id,
      createdAt: new Date().toISOString(),
      continuationPrompt: `Continue from this structured handoff summary for run ${bounded(input.runId, 256) ?? ''}. Preserve evidence-quality labels and begin with: ${bounded(input.nextAction ?? input.compact.nextSteps[0], 2_000) ?? 'review the remaining next steps'}.`,
    });
    const temporary = path.join(this.directory, `.checkpoint-${id}-${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
    try { await rename(temporary, filePath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      return { created: false, path: filePath, checkpoint: JSON.parse(await readFile(filePath, 'utf8')) as TokenEfficiencyCheckpoint };
    }
    return { created: true, path: filePath, checkpoint };
  }
}
