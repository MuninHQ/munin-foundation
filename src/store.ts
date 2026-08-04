import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { MuninEvent, MuninState } from './types.js';

const emptyState: MuninState = { projects: [], decisions: [], actions: [], jobs: [] };

export class ContextStore {
  constructor(private readonly root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime')) {}

  private statePath(): string { return path.join(this.root, 'state.json'); }
  private eventsPath(): string { return path.join(this.root, 'events.jsonl'); }

  async ensure(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    try { await readFile(this.statePath(), 'utf8'); }
    catch { await writeFile(this.statePath(), JSON.stringify(emptyState, null, 2) + '\n', 'utf8'); }
  }

  async load(): Promise<MuninState> {
    await this.ensure();
    const state = JSON.parse(await readFile(this.statePath(), 'utf8')) as Partial<MuninState>;
    return {
      projects: state.projects ?? [],
      decisions: state.decisions ?? [],
      actions: state.actions ?? [],
      jobs: state.jobs ?? [],
    };
  }

  async save(state: MuninState): Promise<void> {
    await this.ensure();
    await writeFile(this.statePath(), JSON.stringify(state, null, 2) + '\n', 'utf8');
  }

  async event(type: string, entityType: MuninEvent['entityType'], entityId: string, payload: Record<string, unknown> = {}): Promise<MuninEvent> {
    await this.ensure();
    const event: MuninEvent = { id: randomUUID(), type, entityType, entityId, timestamp: new Date().toISOString(), payload };
    await appendFile(this.eventsPath(), JSON.stringify(event) + '\n', 'utf8');
    return event;
  }

  async events(): Promise<MuninEvent[]> {
    await this.ensure();
    try {
      const raw = await readFile(this.eventsPath(), 'utf8');
      return raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as MuninEvent);
    } catch { return []; }
  }
}
