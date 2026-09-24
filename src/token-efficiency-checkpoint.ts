import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompactWorkflowContext } from './token-efficiency-compaction.js';
import { redactSecrets } from './secret-redaction.js';

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
  constructor(readonly directory: string) {}

  async write(input: TokenEfficiencyCheckpointInput): Promise<{ created: boolean; path: string; checkpoint: TokenEfficiencyCheckpoint }> {
    const id = createHash('sha256').update(`${input.runId}\0${input.sessionId}\0${input.sourceRevision}`).digest('hex').slice(0, 24);
    const filePath = path.join(this.directory, `checkpoint-${id}.json`);
    try {
      const checkpoint = JSON.parse(await readFile(filePath, 'utf8')) as TokenEfficiencyCheckpoint;
      return { created: false, path: filePath, checkpoint };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await mkdir(this.directory, { recursive: true });
    const checkpoint = redactSecrets<TokenEfficiencyCheckpoint>({
      ...input,
      id,
      createdAt: new Date().toISOString(),
      continuationPrompt: `Continue from this structured handoff summary for run ${input.runId}. Preserve evidence-quality labels and begin with: ${input.nextAction ?? input.compact.nextSteps[0] ?? 'review the remaining next steps'}.`,
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
