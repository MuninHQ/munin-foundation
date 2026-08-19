import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ControlPlaneTask } from './control-plane-state.js';

interface RuntimeStateFile {
  version: 1;
  tasks: ControlPlaneTask[];
}

export class ControlPlaneRuntimeStore {
  constructor(private readonly root = process.cwd()) {}

  private file(): string {
    return path.join(this.root, 'data/runtime/control-plane-tasks.json');
  }

  async list(): Promise<ControlPlaneTask[]> {
    try {
      const parsed = JSON.parse(await readFile(this.file(), 'utf8')) as RuntimeStateFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.tasks)) return [];
      return parsed.tasks;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async upsert(task: ControlPlaneTask): Promise<void> {
    const tasks = await this.list();
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index >= 0) tasks[index] = task;
    else tasks.push(task);
    await mkdir(path.dirname(this.file()), { recursive: true });
    await writeFile(this.file(), `${JSON.stringify({ version: 1, tasks }, null, 2)}\n`, 'utf8');
  }
}
