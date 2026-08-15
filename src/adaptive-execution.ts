import { runtimePath } from './config.js';
import { readJsonFile, writeJsonAtomic } from './storage.js';

export type ExecutionRole = 'orchestrator' | 'researcher' | 'builder' | 'reviewer';
export type TaskKind = 'research' | 'build' | 'review' | 'strategy' | 'general';
export type ExecutionStatus = 'planned' | 'running' | 'passed' | 'failed';

export interface AdaptiveTask {
  id: string;
  objective: string;
  capability: string;
  kind?: TaskKind;
  risk?: 'low' | 'medium' | 'high';
  context?: Record<string, unknown>;
}

export interface ExecutionRoute {
  primary: ExecutionRole;
  reviewers: ExecutionRole[];
  rationale: string[];
}

export interface ValidationResult {
  passed: boolean;
  checks: { name: string; passed: boolean; evidence?: string }[];
}

export interface OutcomeRecord {
  id: string;
  taskId: string;
  objective: string;
  capability: string;
  route: ExecutionRoute;
  status: 'passed' | 'failed';
  evidence: string[];
  lesson: string;
  tags: string[];
  createdAt: string;
}

export interface OutcomeStore {
  save(record: OutcomeRecord): Promise<void>;
  findRelevant(task: AdaptiveTask): Promise<OutcomeRecord[]>;
}

export type LifecycleEvent =
  | 'session:start'
  | 'task:pre'
  | 'task:post'
  | 'validation:pre'
  | 'validation:post'
  | 'session:end';

export interface LifecycleHookContext {
  task?: AdaptiveTask;
  route?: ExecutionRoute;
  outcome?: OutcomeRecord;
  validation?: ValidationResult;
}

export type LifecycleHook = (event: LifecycleEvent, context: LifecycleHookContext) => Promise<void> | void;

export class LifecycleHooks {
  private readonly hooks: LifecycleHook[] = [];

  register(hook: LifecycleHook): void {
    this.hooks.push(hook);
  }

  async emit(event: LifecycleEvent, context: LifecycleHookContext = {}): Promise<void> {
    for (const hook of this.hooks) await hook(event, context);
  }
}

export class TaskRouter {
  route(task: AdaptiveTask): ExecutionRoute {
    const kind = task.kind ?? this.inferKind(task);
    if (kind === 'research') return { primary: 'researcher', reviewers: ['reviewer'], rationale: ['Research task routed to researcher with independent review.'] };
    if (kind === 'build') return { primary: 'builder', reviewers: ['reviewer'], rationale: ['Build task routed to builder with reviewer gate.'] };
    if (kind === 'review') return { primary: 'reviewer', reviewers: [], rationale: ['Review task is already an independent validation activity.'] };
    if (kind === 'strategy' || task.risk === 'high') return { primary: 'orchestrator', reviewers: ['reviewer'], rationale: ['Strategy/high-risk task requires orchestration plus independent review.'] };
    return { primary: 'orchestrator', reviewers: ['reviewer'], rationale: ['General task routed through orchestrator with validation.'] };
  }

  private inferKind(task: AdaptiveTask): TaskKind {
    const text = `${task.capability} ${task.objective}`.toLowerCase();
    if (/research|pesquis|investig|discover/.test(text)) return 'research';
    if (/build|implement|code|refactor|fix|criar|implementar/.test(text)) return 'build';
    if (/review|validate|test|audit|revis|valid/.test(text)) return 'review';
    if (/strategy|strateg|decision|architecture|arquitet/.test(text)) return 'strategy';
    return 'general';
  }
}

function scoreOutcomes(records: OutcomeRecord[], task: AdaptiveTask): OutcomeRecord[] {
  const terms = `${task.capability} ${task.objective}`.toLowerCase().split(/\s+/).filter(x => x.length > 2);
  return records
    .map(record => {
      const haystack = `${record.capability} ${record.objective} ${record.tags.join(' ')} ${record.lesson}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { record, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.record)
    .slice(0, 5);
}

export class InMemoryOutcomeStore implements OutcomeStore {
  private readonly records: OutcomeRecord[] = [];

  async save(record: OutcomeRecord): Promise<void> {
    this.records.unshift(record);
  }

  async findRelevant(task: AdaptiveTask): Promise<OutcomeRecord[]> {
    return scoreOutcomes(this.records, task);
  }
}

type OutcomeState = { schemaVersion: 1; records: OutcomeRecord[]; updatedAt: string };

export class JsonOutcomeStore implements OutcomeStore {
  constructor(private readonly file = runtimePath('adaptive-outcomes.json')) {}

  private async load(): Promise<OutcomeState> {
    return readJsonFile<OutcomeState>(this.file, () => ({ schemaVersion: 1, records: [], updatedAt: new Date(0).toISOString() }));
  }

  async save(record: OutcomeRecord): Promise<void> {
    const state = await this.load();
    const records = [record, ...state.records.filter(item => item.id !== record.id)].slice(0, 500);
    await writeJsonAtomic(this.file, { schemaVersion: 1, records, updatedAt: new Date().toISOString() } satisfies OutcomeState);
  }

  async findRelevant(task: AdaptiveTask): Promise<OutcomeRecord[]> {
    return scoreOutcomes((await this.load()).records, task);
  }
}

export interface ExecuteResult {
  task: AdaptiveTask;
  route: ExecutionRoute;
  priorOutcomes: OutcomeRecord[];
  validation: ValidationResult;
  outcome: OutcomeRecord;
}

export class AdaptiveExecutionEngine {
  constructor(
    private readonly store: OutcomeStore = new JsonOutcomeStore(),
    private readonly hooks: LifecycleHooks = new LifecycleHooks(),
    private readonly router: TaskRouter = new TaskRouter(),
  ) {}

  async execute(
    task: AdaptiveTask,
    runner: (task: AdaptiveTask, route: ExecutionRoute, prior: OutcomeRecord[]) => Promise<{ evidence?: string[]; lesson?: string }>,
    validator: (task: AdaptiveTask, evidence: string[]) => Promise<ValidationResult>,
  ): Promise<ExecuteResult> {
    await this.hooks.emit('session:start', { task });
    await this.hooks.emit('task:pre', { task });

    const route = this.router.route(task);
    const priorOutcomes = await this.store.findRelevant(task);
    const execution = await runner(task, route, priorOutcomes);
    const evidence = execution.evidence ?? [];

    await this.hooks.emit('validation:pre', { task, route });
    const validation = await validator(task, evidence);
    await this.hooks.emit('validation:post', { task, route, validation });

    const status = validation.passed ? 'passed' : 'failed';
    const outcome: OutcomeRecord = {
      id: `outcome-${task.id}-${Date.now()}`,
      taskId: task.id,
      objective: task.objective,
      capability: task.capability,
      route,
      status,
      evidence,
      lesson: execution.lesson ?? (validation.passed ? 'Execution validated successfully.' : 'Execution failed reviewer validation.'),
      tags: [task.capability, task.kind ?? 'inferred', status],
      createdAt: new Date().toISOString(),
    };

    await this.store.save(outcome);
    await this.hooks.emit('task:post', { task, route, outcome, validation });
    await this.hooks.emit('session:end', { task, route, outcome, validation });

    if (!validation.passed) {
      const failed = validation.checks.filter(check => !check.passed).map(check => check.name).join(', ');
      throw new Error(`Reviewer gate rejected task ${task.id}${failed ? `: ${failed}` : ''}`);
    }

    return { task, route, priorOutcomes, validation, outcome };
  }
}
