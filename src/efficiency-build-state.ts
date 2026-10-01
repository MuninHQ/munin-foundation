import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimePath } from './config.js';
import { redactSecretText } from './secret-redaction.js';

export type EfficiencyBuildStatus = 'planned' | 'running' | 'blocked' | 'verifying' | 'complete' | 'failed';
export interface EfficiencyBuildState {
  taskId: string;
  revision: number;
  objective: string;
  status: EfficiencyBuildStatus;
  decisions: string[];
  relevantFiles: string[];
  blockers: string[];
  tests: Array<{ command: string; outcome: 'passed' | 'failed' | 'not-run'; summary: string }>;
  nextAction: string;
  historyDigest: string;
  updatedAt: string;
}
export interface EfficiencyBuildStateUpdate {
  taskId: string;
  expectedRevision: number;
  objective: string;
  status: EfficiencyBuildStatus;
  decisions: string[];
  relevantFiles: string[];
  blockers: string[];
  tests: EfficiencyBuildState['tests'];
  nextAction: string;
  consolidatedHistory: string;
  revision?: number;
  historyDigest?: string;
  updatedAt?: string;
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const text = (value: string, limit: number) => redactSecretText(value).replace(/\s+/g, ' ').trim().slice(0, limit);
const list = (values: string[], count = 40) => values.slice(0, count).map(value => text(value, 300));

export function historyReuse(state: EfficiencyBuildState, consolidatedHistory: string): { reused: boolean; digest: string; avoidedChars: number } {
  const historyDigest = digest(consolidatedHistory);
  const reused = state.historyDigest === historyDigest;
  return { reused, digest: historyDigest, avoidedChars: reused ? consolidatedHistory.length : 0 };
}

export class EfficiencyBuildStateStore {
  constructor(private readonly file = runtimePath('efficiency-build-state.json')) {}

  async load(): Promise<EfficiencyBuildState | undefined> {
    try { return JSON.parse(await readFile(this.file, 'utf8')) as EfficiencyBuildState; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }

  async save(update: EfficiencyBuildStateUpdate): Promise<EfficiencyBuildState> {
    const current = await this.load();
    const revision = current?.revision ?? 0;
    if (update.expectedRevision !== revision) throw new Error(`Build State revision conflict: expected ${update.expectedRevision}, current ${revision}`);
    const state: EfficiencyBuildState = {
      taskId: text(update.taskId, 120), revision: revision + 1, objective: text(update.objective, 1000), status: update.status,
      decisions: list(update.decisions), relevantFiles: list(update.relevantFiles, 100), blockers: list(update.blockers),
      tests: update.tests.slice(0, 30).map(item => ({ command: text(item.command, 500), outcome: item.outcome, summary: text(item.summary, 1000) })),
      nextAction: text(update.nextAction, 1000), historyDigest: digest(update.consolidatedHistory), updatedAt: new Date().toISOString(),
    };
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(state, null, 2) + '\n', 'utf8');
    await rename(temporary, this.file);
    return state;
  }
}
