import type { AgentExecutionContext, AgentExecutionResult, MuninAgentId, OrchestratorRunResult } from './agent-orchestrator.js';
import { ControlPlaneRuntimeStore } from './control-plane-runtime-store.js';
import {
  addControlPlaneEvidence,
  createControlPlaneTask,
  transitionControlPlaneTask,
  type ControlPlaneTask,
  type ControlPlaneTaskStatus,
} from './control-plane-state.js';

const forward: ControlPlaneTaskStatus[] = ['queued', 'planning', 'building', 'testing', 'verifying', 'done'];

function targetForAgent(agentId: MuninAgentId): ControlPlaneTaskStatus {
  if (agentId === 'product-state-manager') return 'planning';
  if (agentId === 'researcher' || agentId === 'engineer') return 'building';
  if (agentId === 'qa-verifier') return 'testing';
  return 'verifying';
}

export class ControlPlaneExecutionTracker {
  private task?: ControlPlaneTask;

  constructor(
    private readonly store: ControlPlaneRuntimeStore,
    private readonly objective: string,
  ) {}

  private async ensure(context: AgentExecutionContext): Promise<ControlPlaneTask> {
    if (this.task) return this.task;
    this.task = createControlPlaneTask({
      id: `run-${context.runId}`,
      title: this.objective,
      priority: 'P1',
      owner: 'munin-orchestrator',
      source: `orchestrator:${context.runId}`,
      dependencies: [],
      acceptanceCriteria: ['Orchestration completes with verified evidence or an explicit blocker.'],
    });
    await this.store.upsert(this.task);
    return this.task;
  }

  private async advance(target: ControlPlaneTaskStatus): Promise<void> {
    if (!this.task || this.task.status === 'blocked' || this.task.status === 'done') return;
    const current = forward.indexOf(this.task.status);
    const desired = forward.indexOf(target);
    for (let index = current + 1; index <= desired; index += 1) {
      const next = forward[index];
      if (!next || next === 'done') break;
      this.task = transitionControlPlaneTask(this.task, next);
      await this.store.upsert(this.task);
    }
  }

  async beforeAgent(context: AgentExecutionContext): Promise<void> {
    await this.ensure(context);
    await this.advance(targetForAgent(context.agent.id));
  }

  async afterAgent(context: AgentExecutionContext, result: AgentExecutionResult): Promise<void> {
    await this.ensure(context);
    if (!this.task) return;
    for (const value of result.evidence ?? []) {
      this.task = addControlPlaneEvidence(this.task, { kind: 'note', value, at: new Date().toISOString() });
    }
    if (result.status === 'blocked') {
      this.task = transitionControlPlaneTask(this.task, 'blocked', {
        blocker: {
          reason: result.blocker ?? result.summary,
          requiresHuman: false,
        },
      });
    } else if (context.agent.id === 'qa-verifier' && result.status === 'completed') {
      await this.advance('verifying');
    }
    await this.store.upsert(this.task);
  }

  async finish(result: OrchestratorRunResult): Promise<void> {
    if (!this.task) return;
    if (result.status === 'done') {
      await this.advance('verifying');
      if (this.task.status === 'verifying') {
        if (this.task.evidence.length === 0) {
          this.task = addControlPlaneEvidence(this.task, {
            kind: 'note',
            value: `orchestrator:${result.runId}:done`,
            at: new Date().toISOString(),
          });
        }
        this.task = transitionControlPlaneTask(this.task, 'done');
      }
    } else if (this.task.status !== 'blocked' && this.task.status !== 'done') {
      this.task = transitionControlPlaneTask(this.task, 'blocked', {
        blocker: {
          reason: result.blocker ?? `Orchestration ended as ${result.status}.`,
          requiresHuman: result.status === 'blocked',
        },
      });
    } else if (this.task.status === 'blocked' && result.status === 'blocked' && this.task.blocker) {
      this.task = {
        ...this.task,
        blocker: { ...this.task.blocker, requiresHuman: true, reason: result.blocker ?? this.task.blocker.reason },
        updatedAt: new Date().toISOString(),
      };
    }
    await this.store.upsert(this.task);
  }
}
