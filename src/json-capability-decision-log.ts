import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CapabilityAssessment } from './capability-radar.js';

export interface PersistedCapabilityDecision extends CapabilityAssessment {
  assessedAt: string;
}
interface DecisionFile { version: 1; decisions: PersistedCapabilityDecision[] }

export class JsonCapabilityDecisionLog {
  constructor(private readonly path: string) {}

  private async read(): Promise<DecisionFile> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as DecisionFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.decisions)) throw new Error('Unsupported capability decision log format.');
      return parsed;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { version: 1, decisions: [] };
      throw error;
    }
  }

  private async write(file: DecisionFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(file, null, 2) + '\n', 'utf8');
    await rename(tmp, this.path);
  }

  async record(assessment: CapabilityAssessment, assessedAt = new Date().toISOString()): Promise<PersistedCapabilityDecision> {
    const file = await this.read();
    const stored = { ...assessment, assessedAt };
    const index = file.decisions.findIndex(item => item.id === assessment.id);
    if (index >= 0) file.decisions[index] = stored; else file.decisions.push(stored);
    await this.write(file);
    return stored;
  }

  async get(id: string): Promise<PersistedCapabilityDecision | undefined> { return (await this.read()).decisions.find(item => item.id === id); }
  async shouldReassess(id: string): Promise<boolean> { return !(await this.get(id)); }
  async list(): Promise<PersistedCapabilityDecision[]> { return (await this.read()).decisions; }
}
