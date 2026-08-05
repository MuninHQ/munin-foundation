import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type ExecutionProvider, type ProviderRequest } from './providers.js';
import {
  defaultProviderProfiles,
  ProviderRegistry,
  ProviderSelectionError,
  type ProviderDecision,
  type ProviderPolicy,
  type ProviderProfile,
} from './provider-policy.js';
import { reviewOutput, type ReviewReport } from './review.js';

export type TaskStatus = 'READY' | 'RUNNING' | 'WAITING' | 'BLOCKED' | 'FAILED' | 'DONE';
export type AgentId = 'planner' | 'research' | 'writer' | 'career' | 'git' | 'reviewer';

export interface AgentDefinition {
  id: AgentId;
  mission: string;
  capabilities: string[];
}

export interface ExecutionTask {
  id: string;
  objectiveId: string;
  title: string;
  capability: string;
  owner: AgentId;
  status: TaskStatus;
  priority: number;
  dependencies: string[];
  expectedOutput: string;
  result?: string;
  error?: string;
  providerId?: string;
  providerMetadata?: Record<string, unknown>;
  providerDecision?: ProviderDecision;
  review?: ReviewReport;
  startedAt?: string;
  finishedAt?: string;
}

export interface ExecutionPlan {
  id: string;
  objective: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  tasks: ExecutionTask[];
}

export interface RuntimeTelemetry {
  plans: number;
  tasks: number;
  done: number;
  failed: number;
  blocked: number;
  rejectedByQualityGate: number;
  rejectedByProviderPolicy: number;
  averageDurationMs: number;
  averageReviewScore: number;
  byAgent: Record<string, number>;
  byProvider: Record<string, number>;
}

const registry: AgentDefinition[] = [
  { id: 'planner', mission: 'Decompose objectives into auditable work.', capabilities: ['plan'] },
  { id: 'research', mission: 'Gather and synthesize evidence.', capabilities: ['research', 'evidence'] },
  { id: 'writer', mission: 'Produce structured written artifacts.', capabilities: ['write', 'draft'] },
  { id: 'career', mission: 'Operate career workflows.', capabilities: ['career', 'jobs'] },
  { id: 'git', mission: 'Prepare repository changes.', capabilities: ['code', 'git'] },
  { id: 'reviewer', mission: 'Validate outputs and quality.', capabilities: ['review', 'validate'] },
];

function selectAgent(capability: string): AgentId {
  return registry.find(agent => agent.capabilities.includes(capability))?.id ?? 'reviewer';
}

function inferWorkflow(objective: string): Array<{ title: string; capability: string; expectedOutput: string }> {
  const normalized = objective.toLowerCase();
  if (normalized.includes('white paper') || normalized.includes('artigo') || normalized.includes('paper')) {
    return [
      { title: 'Research evidence', capability: 'research', expectedOutput: 'Evidence set' },
      { title: 'Draft artifact', capability: 'write', expectedOutput: 'Draft document' },
      { title: 'Review artifact', capability: 'review', expectedOutput: 'Quality review' },
    ];
  }
  if (normalized.includes('vaga') || normalized.includes('currículo') || normalized.includes('career')) {
    return [
      { title: 'Analyze career objective', capability: 'career', expectedOutput: 'Career analysis' },
      { title: 'Draft response or asset', capability: 'write', expectedOutput: 'Career artifact' },
      { title: 'Review fit and quality', capability: 'review', expectedOutput: 'Review report' },
    ];
  }
  if (normalized.includes('build') || normalized.includes('código') || normalized.includes('code')) {
    return [
      { title: 'Plan implementation', capability: 'plan', expectedOutput: 'Implementation plan' },
      { title: 'Implement change', capability: 'code', expectedOutput: 'Repository change' },
      { title: 'Validate implementation', capability: 'validate', expectedOutput: 'Validation report' },
    ];
  }
  return [
    { title: 'Plan objective', capability: 'plan', expectedOutput: 'Execution plan' },
    { title: 'Execute objective', capability: 'write', expectedOutput: 'Primary result' },
    { title: 'Review result', capability: 'review', expectedOutput: 'Review report' },
  ];
}

const defaultPolicy: ProviderPolicy = { offlineOnly: true };

export class ExecutionEngine {
  private readonly providerRegistry: ProviderRegistry;

  constructor(
    private readonly root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime'),
    providerProfilesOrProvider: ProviderProfile[] | ExecutionProvider = defaultProviderProfiles(),
    private readonly providerPolicy: ProviderPolicy = defaultPolicy,
  ) {
    const profiles = Array.isArray(providerProfilesOrProvider)
      ? providerProfilesOrProvider
      : [{
          id: providerProfilesOrProvider.id,
          provider: providerProfilesOrProvider,
          capabilities: ['*'],
          mode: 'offline' as const,
          estimatedCostPerCall: 0,
          estimatedLatencyMs: 1,
          enabled: true,
        }];
    this.providerRegistry = new ProviderRegistry(profiles);
  }

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

  agents(): AgentDefinition[] { return registry; }
  providers(): Array<{ id: string; active: boolean; mode: string }> {
    return this.providerRegistry.list().map(profile => ({ id: profile.id, active: profile.enabled, mode: profile.mode }));
  }

  async createPlan(objective: string): Promise<ExecutionPlan> {
    if (!objective.trim()) throw new Error('Objective is required');
    const now = new Date().toISOString();
    const objectiveId = `obj-${randomUUID().slice(0, 8)}`;
    const workflow = inferWorkflow(objective);
    const tasks: ExecutionTask[] = workflow.map((step, index) => ({
      id: `tsk-${randomUUID().slice(0, 8)}`,
      objectiveId,
      title: step.title,
      capability: step.capability,
      owner: selectAgent(step.capability),
      status: index === 0 ? 'READY' : 'WAITING',
      priority: index,
      dependencies: [],
      expectedOutput: step.expectedOutput,
    }));
    for (let index = 1; index < tasks.length; index += 1) tasks[index].dependencies = [tasks[index - 1].id];
    const plan: ExecutionPlan = { id: objectiveId, objective, status: 'READY', createdAt: now, updatedAt: now, tasks };
    const plans = await this.load(); plans.push(plan); await this.save(plans); return plan;
  }

  async listPlans(): Promise<ExecutionPlan[]> { return this.load(); }

  async run(planId: string): Promise<ExecutionPlan> {
    const plans = await this.load();
    const plan = plans.find(item => item.id === planId);
    if (!plan) throw new Error(`Execution plan not found: ${planId}`);
    plan.status = 'RUNNING';
    for (const task of plan.tasks) {
      const dependenciesDone = task.dependencies.every(id => plan.tasks.find(item => item.id === id)?.status === 'DONE');
      if (!dependenciesDone) { task.status = 'BLOCKED'; continue; }
      task.status = 'RUNNING'; task.startedAt = new Date().toISOString();
      const dependencyResults = task.dependencies
        .map(id => plan.tasks.find(item => item.id === id)?.result)
        .filter((value): value is string => Boolean(value));
      const request: ProviderRequest = {
        taskId: task.id,
        objective: plan.objective,
        title: task.title,
        capability: task.capability,
        expectedOutput: task.expectedOutput,
        context: { dependencyResults },
      };
      try {
        const selection = this.providerRegistry.select(request, this.providerPolicy);
        task.providerDecision = selection.decision;
        const response = await selection.provider.execute(request);
        task.result = response.output;
        task.providerId = response.providerId;
        task.providerMetadata = response.metadata;
        task.review = reviewOutput(task.expectedOutput, response.output);
        if (!task.review.accepted) {
          task.status = 'FAILED';
          task.error = `Quality gate rejected output with score ${task.review.score}`;
        } else {
          task.status = 'DONE';
        }
      } catch (error) {
        task.status = 'FAILED';
        if (error instanceof ProviderSelectionError) task.providerDecision = error.decision;
        task.error = error instanceof Error ? error.message : String(error);
      }
      task.finishedAt = new Date().toISOString();
    }
    plan.status = plan.tasks.every(task => task.status === 'DONE') ? 'DONE' : plan.tasks.some(task => task.status === 'FAILED') ? 'FAILED' : 'BLOCKED';
    plan.updatedAt = new Date().toISOString(); await this.save(plans); return plan;
  }

  async telemetry(): Promise<RuntimeTelemetry> {
    const plans = await this.load(); const tasks = plans.flatMap(plan => plan.tasks);
    const durations = tasks.filter(task => task.startedAt && task.finishedAt).map(task => new Date(task.finishedAt!).getTime() - new Date(task.startedAt!).getTime());
    const reviewScores = tasks.map(task => task.review?.score).filter((score): score is number => score !== undefined);
    const byAgent: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    for (const task of tasks) {
      byAgent[task.owner] = (byAgent[task.owner] ?? 0) + 1;
      if (task.providerId) byProvider[task.providerId] = (byProvider[task.providerId] ?? 0) + 1;
    }
    return {
      plans: plans.length,
      tasks: tasks.length,
      done: tasks.filter(task => task.status === 'DONE').length,
      failed: tasks.filter(task => task.status === 'FAILED').length,
      blocked: tasks.filter(task => task.status === 'BLOCKED').length,
      rejectedByQualityGate: tasks.filter(task => task.error?.startsWith('Quality gate rejected')).length,
      rejectedByProviderPolicy: tasks.filter(task => task.error?.startsWith('No provider satisfies policy')).length,
      averageDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      averageReviewScore: reviewScores.length ? Math.round(reviewScores.reduce((a, b) => a + b, 0) / reviewScores.length) : 0,
      byAgent,
      byProvider,
    };
  }
}
