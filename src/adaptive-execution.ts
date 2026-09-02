import { runtimePath } from './config.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationMode, type OrchestrationPlan } from './intelligence-orchestration.js';
import { buildMissionContextPacket } from './mission-context-packet.js';
import { evaluateSpecConvergence, type RequirementEvidence, type SpecContract } from './spec-convergence.js';
import {
  OutcomeFeedbackValidationError,
  rankRelevantOutcomes,
  validateOutcomeFeedback,
  type OutcomeFeedback,
  type RankedOutcome,
} from './adaptive-relevance.js';
import { readJsonFile, writeJsonAtomic } from './storage.js';
import { ContextStore } from './store.js';

export {
  OutcomeFeedbackValidationError,
  type OutcomeFeedback,
  type OutcomeFeedbackRating,
  type OutcomeRelevance,
  type RankedOutcome,
} from './adaptive-relevance.js';

export type ExecutionRole = 'orchestrator' | 'researcher' | 'builder' | 'reviewer';
export type TaskKind = 'research' | 'build' | 'review' | 'strategy' | 'general';
export type ExecutionStatus = 'planned' | 'running' | 'passed' | 'failed';

export interface AdaptiveTask { id: string; objective: string; capability: string; kind?: TaskKind; risk?: 'low' | 'medium' | 'high'; context?: Record<string, unknown>; }
export interface ExecutionRoute { primary: ExecutionRole; reviewers: ExecutionRole[]; rationale: string[]; }
export interface ValidationResult { passed: boolean; checks: { name: string; passed: boolean; evidence?: string }[]; }
export interface OutcomeRecord { id: string; taskId: string; objective: string; capability: string; route: ExecutionRoute; orchestration?: OrchestrationPlan; status: 'passed' | 'failed'; evidence: string[]; lesson: string; tags: string[]; createdAt: string; feedback?: OutcomeFeedback; }
export interface OutcomeStore {
  save(record: OutcomeRecord): Promise<void>;
  findRelevant(task: AdaptiveTask, now?: Date): Promise<RankedOutcome[]>;
  recordFeedback(outcomeId: string, input: unknown, now?: Date): Promise<OutcomeRecord>;
}
export type LifecycleEvent = 'session:start' | 'task:pre' | 'task:post' | 'validation:pre' | 'validation:post' | 'session:end';
export interface LifecycleHookContext { task?: AdaptiveTask; route?: ExecutionRoute; orchestration?: OrchestrationPlan; outcome?: OutcomeRecord; validation?: ValidationResult; }
export type LifecycleHook = (event: LifecycleEvent, context: LifecycleHookContext) => Promise<void> | void;

export class LifecycleHooks {
  private readonly hooks: LifecycleHook[] = [];
  register(hook: LifecycleHook): void { this.hooks.push(hook); }
  async emit(event: LifecycleEvent, context: LifecycleHookContext = {}): Promise<void> { for (const hook of this.hooks) await hook(event, context); }
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

function learnedOrchestrationMode(task: AdaptiveTask, prior: OutcomeRecord[]): { mode: OrchestrationMode; signals: string[] } {
  if (task.risk === 'high' || task.kind === 'strategy' || task.kind === 'review') return { mode: 'auto', signals: ['Safety policy keeps high-risk/strategy/review routing authoritative.'] };
  const routed = prior.filter(item => item.orchestration);
  const directPassed = routed.filter(item => item.orchestration?.route === 'direct' && item.status === 'passed').length;
  const directFailed = routed.filter(item => item.orchestration?.route === 'direct' && item.status === 'failed').length;
  const councilPassed = routed.filter(item => item.orchestration?.route === 'council' && item.status === 'passed').length;
  if (directFailed >= 2) return { mode: 'council', signals: [`Escalated after ${directFailed} relevant direct failures.`] };
  if (directPassed >= 2 && directFailed === 0) return { mode: 'direct', signals: [`Reused direct route after ${directPassed} relevant validated outcomes.`] };
  if (councilPassed >= 2 && directPassed === 0) return { mode: 'council', signals: [`Reused council route after ${councilPassed} relevant validated outcomes.`] };
  return { mode: 'auto', signals: ['Insufficient outcome evidence to override default orchestration policy.'] };
}

function textArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []; }
function optionalSpec(value: unknown): SpecContract | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const spec = value as Partial<SpecContract>;
  if (typeof spec.objective !== 'string' || !Array.isArray(spec.requirements)) return undefined;
  return spec as SpecContract;
}
function requirementEvidence(value: unknown): RequirementEvidence[] {
  return Array.isArray(value) ? value.filter((item): item is RequirementEvidence => Boolean(item && typeof item === 'object' && typeof (item as RequirementEvidence).requirementId === 'string' && Array.isArray((item as RequirementEvidence).evidence))) : [];
}

export class InMemoryOutcomeStore implements OutcomeStore {
  private readonly records: OutcomeRecord[] = [];
  async save(record: OutcomeRecord): Promise<void> { this.records.unshift(record); }
  async findRelevant(task: AdaptiveTask, now = new Date()): Promise<RankedOutcome[]> { return rankRelevantOutcomes(this.records, task, now); }
  async recordFeedback(outcomeId: string, input: unknown, now = new Date()): Promise<OutcomeRecord> {
    const feedback = validateOutcomeFeedback(input, now);
    const index = this.records.findIndex(record => record.id === outcomeId);
    if (index < 0) throw new OutcomeNotFoundError();
    const updated = { ...this.records[index], feedback };
    this.records[index] = updated;
    return updated;
  }
}

export class OutcomeNotFoundError extends Error {
  constructor() { super('Outcome not found.'); this.name = 'OutcomeNotFoundError'; }
}

type StoredOutcomeState = { schemaVersion: 1 | 2; records: OutcomeRecord[]; updatedAt: string };
type OutcomeState = { schemaVersion: 2; records: OutcomeRecord[]; updatedAt: string };
export class JsonOutcomeStore implements OutcomeStore {
  private readonly eventStore: ContextStore;

  constructor(
    private readonly file = runtimePath('adaptive-outcomes.json'),
    dependencies: { eventStore?: ContextStore } = {},
  ) {
    this.eventStore = dependencies.eventStore ?? new ContextStore();
  }

  private async load(): Promise<OutcomeState> {
    const state = await readJsonFile<StoredOutcomeState>(this.file, () => ({ schemaVersion: 1, records: [], updatedAt: new Date(0).toISOString() }));
    return {
      schemaVersion: 2,
      records: Array.isArray(state.records) ? state.records.slice(0, 500) : [],
      updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date(0).toISOString(),
    };
  }

  async save(record: OutcomeRecord): Promise<void> {
    const state = await this.load();
    const records = [record, ...state.records.filter(item => item.id !== record.id)].slice(0, 500);
    await writeJsonAtomic(this.file, { schemaVersion: 2, records, updatedAt: new Date().toISOString() } satisfies OutcomeState);
  }

  async findRelevant(task: AdaptiveTask, now = new Date()): Promise<RankedOutcome[]> {
    return rankRelevantOutcomes((await this.load()).records, task, now);
  }

  async recordFeedback(outcomeId: string, input: unknown, now = new Date()): Promise<OutcomeRecord> {
    const feedback = validateOutcomeFeedback(input, now);
    const state = await this.load();
    const index = state.records.findIndex(record => record.id === outcomeId);
    if (index < 0) throw new OutcomeNotFoundError();
    const updated = { ...state.records[index], feedback };
    const records = [...state.records].slice(0, 500);
    records[index] = updated;
    await writeJsonAtomic(this.file, { schemaVersion: 2, records, updatedAt: now.toISOString() } satisfies OutcomeState);
    await this.eventStore.event('adaptive.outcome.feedback.updated', 'system', outcomeId, { rating: feedback.rating });
    return updated;
  }
}

export interface ExecuteResult { task: AdaptiveTask; route: ExecutionRoute; orchestration: OrchestrationPlan; priorOutcomes: OutcomeRecord[]; validation: ValidationResult; outcome: OutcomeRecord; }

export class AdaptiveExecutionEngine {
  constructor(private readonly store: OutcomeStore = new JsonOutcomeStore(), private readonly hooks: LifecycleHooks = new LifecycleHooks(), private readonly router: TaskRouter = new TaskRouter(), private readonly planner: IntelligenceOrchestrationPlanner = new IntelligenceOrchestrationPlanner()) {}

  async execute(task: AdaptiveTask, runner: (task: AdaptiveTask, route: ExecutionRoute, prior: OutcomeRecord[], orchestration: OrchestrationPlan) => Promise<{ evidence?: string[]; lesson?: string }>, validator: (task: AdaptiveTask, evidence: string[]) => Promise<ValidationResult>): Promise<ExecuteResult> {
    await this.hooks.emit('session:start', { task }); await this.hooks.emit('task:pre', { task });
    const route = this.router.route(task);
    const priorOutcomes = await this.store.findRelevant(task);
    const learned = learnedOrchestrationMode(task, priorOutcomes);
    const missionContext = buildMissionContextPacket({
      objective: task.objective,
      constraints: textArray(task.context?.constraints),
      decisions: textArray(task.context?.decisions),
      relevantFiles: textArray(task.context?.relevantFiles),
      remainingTasks: textArray(task.context?.remainingTasks),
      knownFailures: textArray(task.context?.knownFailures),
      evidence: priorOutcomes.flatMap(item => item.evidence).slice(0, 12),
    });
    const orchestration = this.planner.plan({ objective: task.objective, capability: task.kind === 'strategy' ? 'strategy' : task.capability, risk: task.risk, mode: learned.mode, context: { ...task.context, missionContext, executionRole: route.primary, reviewers: route.reviewers, priorOutcomeCount: priorOutcomes.length, learningSignals: learned.signals } });
    orchestration.rationale.push(...learned.signals);
    const execution = await runner(task, route, priorOutcomes, orchestration); const evidence = execution.evidence ?? [];
    await this.hooks.emit('validation:pre', { task, route, orchestration }); let validation = await validator(task, evidence);
    const spec = optionalSpec(task.context?.specContract);
    if (spec) {
      const convergence = evaluateSpecConvergence(spec, requirementEvidence(task.context?.requirementEvidence), textArray(task.context?.implementationTags));
      validation = { passed: validation.passed && convergence.pass, checks: [...validation.checks, { name: 'spec-convergence', passed: convergence.pass, evidence: `score=${convergence.score}; orphan=${convergence.orphanRequirements.join('|') || 'none'}; missing=${convergence.missingEvidence.join('|') || 'none'}; unscoped=${convergence.unscopedImplementation.join('|') || 'none'}` }] };
    }
    await this.hooks.emit('validation:post', { task, route, orchestration, validation });
    const status = validation.passed ? 'passed' : 'failed';
    const outcome: OutcomeRecord = { id: `outcome-${task.id}-${Date.now()}`, taskId: task.id, objective: task.objective, capability: task.capability, route, orchestration, status, evidence, lesson: execution.lesson ?? (validation.passed ? 'Execution validated successfully.' : 'Execution failed reviewer validation.'), tags: [task.capability, task.kind ?? 'inferred', status, `orchestration:${orchestration.route}`], createdAt: new Date().toISOString() };
    await this.store.save(outcome); await this.hooks.emit('task:post', { task, route, orchestration, outcome, validation }); await this.hooks.emit('session:end', { task, route, orchestration, outcome, validation });
    if (!validation.passed) { const failed = validation.checks.filter(check => !check.passed).map(check => check.name).join(', '); throw new Error(`Reviewer gate rejected task ${task.id}${failed ? `: ${failed}` : ''}`); }
    return { task, route, orchestration, priorOutcomes, validation, outcome };
  }
}
