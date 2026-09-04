import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ModelRoute } from './model-router.js';

export type ExecutivePhase = 'UNDERSTAND' | 'CHALLENGE' | 'PLAN' | 'EXECUTE' | 'VERIFY' | 'REMEMBER';
export type ExecutiveCheckpoint = {
  id: string;
  objective: string;
  phase: ExecutivePhase;
  completed: ExecutivePhase[];
  route?: ModelRoute;
  status: 'running' | 'done' | 'blocked' | 'failed';
  blocker?: string;
  summary?: string;
  updatedAt: string;
};

export function objectiveCheckpointId(objective: string): string {
  return createHash('sha256').update(objective.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export class ExecutiveCheckpointStore {
  constructor(private readonly root = process.cwd()) {}
  private directory() { return path.join(this.root, 'data', 'runtime', 'executive-checkpoints'); }
  private file(id: string) { return path.join(this.directory(), `${id}.json`); }

  async load(objective: string): Promise<ExecutiveCheckpoint | undefined> {
    const id = objectiveCheckpointId(objective);
    try { return JSON.parse(await readFile(this.file(id), 'utf8')) as ExecutiveCheckpoint; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }

  async list(limit = 30): Promise<ExecutiveCheckpoint[]> {
    try {
      const names = (await readdir(this.directory())).filter(name => name.endsWith('.json'));
      const values = await Promise.all(names.map(async name => JSON.parse(await readFile(path.join(this.directory(), name), 'utf8')) as ExecutiveCheckpoint));
      return values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, Math.max(1, limit));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async save(checkpoint: ExecutiveCheckpoint): Promise<ExecutiveCheckpoint> {
    await mkdir(this.directory(), { recursive: true });
    const next = { ...checkpoint, updatedAt: new Date().toISOString() };
    await writeFile(this.file(checkpoint.id), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
  }

  async advance(objective: string, phase: ExecutivePhase, patch: Partial<ExecutiveCheckpoint> = {}): Promise<ExecutiveCheckpoint> {
    const previous = await this.load(objective);
    const completed = previous?.completed.includes(phase) ? previous.completed : [...(previous?.completed ?? []), phase];
    return this.save({
      id: previous?.id ?? objectiveCheckpointId(objective),
      objective: objective.trim(),
      phase,
      completed,
      status: patch.status ?? previous?.status ?? 'running',
      route: patch.route ?? previous?.route,
      blocker: patch.blocker ?? previous?.blocker,
      summary: patch.summary ?? previous?.summary,
      updatedAt: previous?.updatedAt ?? new Date().toISOString(),
    });
  }
}
