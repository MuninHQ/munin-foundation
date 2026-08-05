import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExecutionPlan, ExecutionTask } from './runtime.js';

export interface RecoveryCheckpoint {
  planId: string;
  recoverableTaskIds: string[];
  completedTaskIds: string[];
  capturedAt: string;
}

export function buildRecoveryCheckpoint(plan: ExecutionPlan, capturedAt = new Date().toISOString()): RecoveryCheckpoint {
  return {
    planId: plan.id,
    recoverableTaskIds: plan.tasks
      .filter(task => ['READY', 'WAITING', 'RUNNING', 'BLOCKED', 'FAILED'].includes(task.status))
      .map(task => task.id),
    completedTaskIds: plan.tasks.filter(task => task.status === 'DONE').map(task => task.id),
    capturedAt,
  };
}

export function prepareTaskForRecovery(task: ExecutionTask, forceFailed = false): ExecutionTask {
  if (task.status === 'DONE') return task;
  if (task.status === 'FAILED' && !forceFailed) return task;
  return {
    ...task,
    status: task.dependencies.length ? 'WAITING' : 'READY',
    error: undefined,
    startedAt: undefined,
    finishedAt: undefined,
  };
}

export function recoverPlan(plan: ExecutionPlan, forceFailed = false, now = new Date().toISOString()): ExecutionPlan {
  return {
    ...plan,
    status: 'READY',
    updatedAt: now,
    tasks: plan.tasks.map(task => prepareTaskForRecovery(task, forceFailed)),
  };
}

export class RuntimeRecovery {
  constructor(private readonly root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime')) {}

  private file(): string { return path.join(this.root, 'executions.json'); }

  private async load(): Promise<ExecutionPlan[]> {
    await mkdir(this.root, { recursive: true });
    try { return JSON.parse(await readFile(this.file(), 'utf8')) as ExecutionPlan[]; }
    catch { return []; }
  }

  private async save(plans: ExecutionPlan[]): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.file(), JSON.stringify(plans, null, 2) + '\n', 'utf8');
  }

  async checkpoint(planId: string): Promise<RecoveryCheckpoint> {
    const plan = (await this.load()).find(item => item.id === planId);
    if (!plan) throw new Error(`Execution plan not found: ${planId}`);
    return buildRecoveryCheckpoint(plan);
  }

  async recover(planId: string, forceFailed = false): Promise<ExecutionPlan> {
    const plans = await this.load();
    const index = plans.findIndex(item => item.id === planId);
    if (index < 0) throw new Error(`Execution plan not found: ${planId}`);
    const checkpoint = buildRecoveryCheckpoint(plans[index]);
    if (!checkpoint.recoverableTaskIds.length) return plans[index];
    plans[index] = recoverPlan(plans[index], forceFailed);
    await this.save(plans);
    return plans[index];
  }
}
