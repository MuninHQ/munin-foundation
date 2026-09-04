import path from 'node:path';
import { completeWithLlm } from './llm-provider.js';
import { RepoIntelligenceProvider } from './repo-intelligence.js';
import type { BuildAllPlan } from './build-all-wave-runtime.js';
import type { ParallelAgentTask } from './parallel-agent-waves.js';

interface PlannerPayload {
  objective?: string;
  tasks?: Array<{
    id?: string;
    objective?: string;
    files?: string[];
    dependsOn?: string[];
  }>;
  completionCriteria?: string[];
}

const plannerSystem = `You are Munin's production BUILD ALL planner. Return ONLY JSON with this shape:
{"objective":"exact requested objective","tasks":[{"id":"short-stable-id","objective":"concrete implementation task","files":["relative/path"],"dependsOn":["task-id"]}],"completionCriteria":["observable criterion"]}
Rules:
- decompose only when it creates real parallelism or dependency clarity;
- at most 8 tasks and at most 8 files per task;
- Files is an ownership boundary, not a guess: include every file the worker may modify;
- use repository-relative paths only; never include .git, .env, node_modules, data/runtime, secrets, credentials, or absolute paths;
- tasks that touch the same file may exist but should be ordered with dependsOn when one logically builds on the other;
- dependencies must reference earlier task ids and must be acyclic;
- completionCriteria must be observable and testable;
- do not add speculative features or cleanup unrelated to the objective.`;

function parseJson(raw: string): PlannerPayload {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as PlannerPayload;
}

function safePath(value: string): string {
  const normalized = value.trim().replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || path.posix.isAbsolute(normalized) || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Unsafe BUILD ALL file path: ${value}`);
  }
  const lowered = normalized.toLowerCase();
  if (
    lowered === '.env' ||
    lowered.startsWith('.env.') ||
    lowered.startsWith('.git/') ||
    lowered.startsWith('node_modules/') ||
    lowered.startsWith('data/runtime/')
  ) throw new Error(`Protected BUILD ALL file path: ${value}`);
  return normalized;
}

function normalizeTask(input: NonNullable<PlannerPayload['tasks']>[number]): ParallelAgentTask {
  const id = input.id?.trim() ?? '';
  const objective = input.objective?.trim() ?? '';
  if (!id || !/^[a-z0-9][a-z0-9._-]{0,47}$/i.test(id)) throw new Error(`Invalid BUILD ALL task id: ${id || '(missing)'}`);
  if (!objective) throw new Error(`BUILD ALL task ${id} requires an objective.`);
  const files = [...new Set((input.files ?? []).map(safePath))];
  if (files.length > 8) throw new Error(`BUILD ALL task ${id} exceeds the 8-file ownership limit.`);
  const dependsOn = [...new Set((input.dependsOn ?? []).map(item => item.trim()).filter(Boolean))];
  return { id, objective, files, dependsOn };
}

function normalizePlan(payload: PlannerPayload, objective: string): BuildAllPlan {
  if ((payload.objective ?? '').trim() !== objective.trim()) throw new Error('Planner objective does not exactly match the requested objective.');
  if (!Array.isArray(payload.tasks) || payload.tasks.length === 0 || payload.tasks.length > 8) {
    throw new Error('Planner must return between 1 and 8 tasks.');
  }
  const tasks = payload.tasks.map(normalizeTask);
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`Duplicate BUILD ALL task id: ${task.id}`);
    for (const dependency of task.dependsOn ?? []) {
      if (!ids.has(dependency)) throw new Error(`Task ${task.id} depends on ${dependency}, which must appear earlier in the plan.`);
    }
    ids.add(task.id);
  }
  const completionCriteria = [...new Set((payload.completionCriteria ?? []).map(item => item.trim()).filter(Boolean))];
  if (completionCriteria.length === 0 || completionCriteria.length > 12) throw new Error('Planner must return between 1 and 12 completion criteria.');
  return { objective, tasks, completionCriteria };
}

export interface ProductionBuildAllPlannerLike {
  plan(objective: string): Promise<BuildAllPlan>;
}

export class ProductionBuildAllPlanner implements ProductionBuildAllPlannerLike {
  constructor(private readonly root = process.cwd()) {}

  async plan(objective: string): Promise<BuildAllPlan> {
    if (!objective.trim()) throw new Error('BUILD ALL objective is required.');
    const impact = await new RepoIntelligenceProvider(this.root).impact(objective);
    const repositoryContext = {
      files: impact.files.slice(0, 60),
      tests: impact.tests.slice(0, 40),
      symbols: impact.symbols.slice(0, 40),
      evidence: impact.evidence.slice(0, 12).map(item => ({ path: item.path, symbol: item.symbol, rationale: item.rationale })),
    };
    const raw = await completeWithLlm(
      plannerSystem,
      `Objective:\n${objective}\n\nRepository impact map:\n${JSON.stringify(repositoryContext, null, 2)}`,
      3000,
    );
    return normalizePlan(parseJson(raw), objective);
  }
}

export const __productionBuildAllPlannerInternals = { parseJson, normalizePlan, safePath };
