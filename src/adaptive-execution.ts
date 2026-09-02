import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { runtimePath } from './config.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationMode, type OrchestrationPlan } from './intelligence-orchestration.js';
import { buildMissionContextPacket } from './mission-context-packet.js';
import { evaluateSpecConvergence, type RequirementEvidence, type SpecContract } from './spec-convergence.js';
import {
  OutcomeFeedbackValidationError,
  isOutcomeFeedback,
  rankRelevantOutcomes,
  validateOutcomeFeedback,
  type OutcomeFeedback,
  type RankedOutcome,
} from './adaptive-relevance.js';
import { writeJsonAtomic } from './storage.js';
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
  effectiveKind(task: AdaptiveTask): TaskKind { return task.kind ?? this.inferKind(task); }
  route(task: AdaptiveTask, kind = this.effectiveKind(task)): ExecutionRoute {
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

function learnedOrchestrationMode(task: AdaptiveTask, kind: TaskKind, prior: RankedOutcome[]): { mode: OrchestrationMode; signals: string[] } {
  if (task.risk === 'high' || kind === 'strategy' || kind === 'review') return { mode: 'auto', signals: ['Safety policy keeps high-risk/strategy/review routing authoritative.'] };
  const routed = prior.filter(item => item.orchestration);
  const directPassed = routed.filter(item => item.orchestration?.route === 'direct' && item.status === 'passed').length;
  const directFailed = routed.filter(item => item.orchestration?.route === 'direct' && item.status === 'failed').length;
  const councilPassed = routed.filter(item => item.orchestration?.route === 'council' && item.status === 'passed').length;
  if (directFailed >= 2) return { mode: 'council', signals: [`Escalated after ${directFailed} relevant direct failures.`] };
  if (directPassed >= 2 && directFailed === 0) return { mode: 'direct', signals: [`Reused direct route after ${directPassed} relevant validated outcomes.`] };
  if (councilPassed >= 2 && directPassed === 0) return { mode: 'council', signals: [`Reused council route after ${councilPassed} relevant validated outcomes.`] };
  return { mode: 'auto', signals: ['Insufficient outcome evidence to override default orchestration policy.'] };
}

function weightedRelevanceSignals(prior: RankedOutcome[]): string[] {
  const weightingAffectedEvidence = prior.some(item => item.relevance.timeWeight < 1 || item.relevance.feedbackMultiplier !== 1);
  return weightingAffectedEvidence ? ['Weighted relevance applied time decay or explicit feedback.'] : [];
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

export class OutcomeStateValidationError extends Error {
  constructor() { super('Invalid outcome state.'); this.name = 'OutcomeStateValidationError'; }
}

export class OutcomeFeedbackAuditBackpressureError extends Error {
  constructor() { super('Adaptive feedback audit queue is at capacity.'); this.name = 'OutcomeFeedbackAuditBackpressureError'; }
}

type PendingFeedbackAudit = { id: string; outcomeId: string; rating: OutcomeFeedback['rating'] };
type OutcomeState = { schemaVersion: 2; records: OutcomeRecord[]; updatedAt: string; pendingAudits: PendingFeedbackAudit[] };
const maxPendingFeedbackAudits = 100;

const outcomeMutationQueues = new Map<string, Promise<void>>();

function serializeOutcomeMutation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = outcomeMutationQueues.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const settled = result.then(() => undefined, () => undefined);
  outcomeMutationQueues.set(key, settled);
  return result.finally(() => {
    if (outcomeMutationQueues.get(key) === settled) outcomeMutationQueues.delete(key);
  });
}

function stateObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OutcomeStateValidationError();
  return value as Record<string, unknown>;
}

function stateString(value: unknown): string {
  if (typeof value !== 'string') throw new OutcomeStateValidationError();
  return value;
}

function stateTimestamp(value: unknown): string {
  const timestamp = stateString(value);
  if (!Number.isFinite(Date.parse(timestamp))) throw new OutcomeStateValidationError();
  return timestamp;
}

function stateStrings(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new OutcomeStateValidationError();
  return [...value];
}

function parseExecutionRoute(value: unknown): ExecutionRoute {
  const route = stateObject(value);
  if (route.primary !== 'orchestrator' && route.primary !== 'researcher' && route.primary !== 'builder' && route.primary !== 'reviewer') throw new OutcomeStateValidationError();
  const reviewers = stateStrings(route.reviewers);
  if (!reviewers.every(reviewer => reviewer === 'orchestrator' || reviewer === 'researcher' || reviewer === 'builder' || reviewer === 'reviewer')) throw new OutcomeStateValidationError();
  return { primary: route.primary, reviewers: reviewers as ExecutionRole[], rationale: stateStrings(route.rationale) };
}

function parseOrchestration(value: unknown): OrchestrationPlan {
  const orchestration = stateObject(value);
  if (orchestration.route !== 'direct' && orchestration.route !== 'council') throw new OutcomeStateValidationError();
  if (orchestration.risk !== 'low' && orchestration.risk !== 'medium' && orchestration.risk !== 'high') throw new OutcomeStateValidationError();
  if (orchestration.localOnly !== true || orchestration.maxCostPerCall !== 0) throw new OutcomeStateValidationError();
  return {
    id: stateString(orchestration.id),
    objective: stateString(orchestration.objective),
    capability: stateString(orchestration.capability),
    route: orchestration.route,
    risk: orchestration.risk,
    providerPreference: stateStrings(orchestration.providerPreference),
    localOnly: true,
    maxCostPerCall: 0,
    rationale: stateStrings(orchestration.rationale),
    createdAt: stateTimestamp(orchestration.createdAt),
  };
}

function parseOutcomeRecord(value: unknown, schemaVersion: 1 | 2): OutcomeRecord {
  const record = stateObject(value);
  if (record.status !== 'passed' && record.status !== 'failed') throw new OutcomeStateValidationError();
  const orchestration = record.orchestration === undefined ? undefined : parseOrchestration(record.orchestration);
  let feedback: OutcomeFeedback | undefined;
  if (schemaVersion === 2 && record.feedback !== undefined) {
    if (!isOutcomeFeedback(record.feedback)) throw new OutcomeStateValidationError();
    feedback = { ...record.feedback };
  }
  return {
    id: stateString(record.id),
    taskId: stateString(record.taskId),
    objective: stateString(record.objective),
    capability: stateString(record.capability),
    route: parseExecutionRoute(record.route),
    ...(orchestration ? { orchestration } : {}),
    status: record.status,
    evidence: stateStrings(record.evidence),
    lesson: stateString(record.lesson),
    tags: stateStrings(record.tags),
    createdAt: stateString(record.createdAt),
    ...(feedback ? { feedback } : {}),
  };
}

function parseOutcomeState(value: unknown): OutcomeState {
  const state = stateObject(value);
  const schemaVersion = state.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) throw new OutcomeStateValidationError();
  if (!Array.isArray(state.records)) throw new OutcomeStateValidationError();
  const records = state.records.map(record => parseOutcomeRecord(record, schemaVersion));
  let pendingAudits: PendingFeedbackAudit[] = [];
  if (schemaVersion === 2 && state.pendingAudits !== undefined) {
    if (!Array.isArray(state.pendingAudits)) throw new OutcomeStateValidationError();
    if (state.pendingAudits.length > maxPendingFeedbackAudits) throw new OutcomeStateValidationError();
    pendingAudits = state.pendingAudits.map(value => {
      const audit = stateObject(value);
      if (audit.rating !== 'helpful' && audit.rating !== 'neutral' && audit.rating !== 'harmful') throw new OutcomeStateValidationError();
      return { id: stateString(audit.id), outcomeId: stateString(audit.outcomeId), rating: audit.rating };
    });
  }
  return { schemaVersion: 2, records: records.slice(0, 500), updatedAt: stateTimestamp(state.updatedAt), pendingAudits };
}

export class JsonOutcomeStore implements OutcomeStore {
  private readonly eventStore: ContextStore;
  private readonly mutationKey: string;

  constructor(
    private readonly file = runtimePath('adaptive-outcomes.json'),
    dependencies: { eventStore?: ContextStore } = {},
  ) {
    this.eventStore = dependencies.eventStore ?? new ContextStore();
    this.mutationKey = path.resolve(this.file).toLocaleLowerCase();
  }

  private async load(): Promise<OutcomeState> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 2, records: [], updatedAt: new Date(0).toISOString(), pendingAudits: [] };
      throw new OutcomeStateValidationError();
    }
    try {
      return parseOutcomeState(JSON.parse(raw) as unknown);
    } catch {
      throw new OutcomeStateValidationError();
    }
  }

  private async flushPendingAudits(state: OutcomeState): Promise<OutcomeState> {
    let current = state;
    while (current.pendingAudits.length) {
      const audit = current.pendingAudits[0];
      try {
        await this.eventStore.event('adaptive.outcome.feedback.updated', 'system', audit.outcomeId, { rating: audit.rating }, audit.id);
      } catch {
        break;
      }
      current = { ...current, pendingAudits: current.pendingAudits.slice(1) };
      await writeJsonAtomic(this.file, current);
    }
    return current;
  }

  async save(record: OutcomeRecord): Promise<void> {
    await serializeOutcomeMutation(this.mutationKey, async () => {
      const state = await this.flushPendingAudits(await this.load());
      const validated = parseOutcomeRecord(record, 2);
      const records = [validated, ...state.records.filter(item => item.id !== validated.id)].slice(0, 500);
      await writeJsonAtomic(this.file, { ...state, records, updatedAt: new Date().toISOString() } satisfies OutcomeState);
    });
  }

  async findRelevant(task: AdaptiveTask, now = new Date()): Promise<RankedOutcome[]> {
    return serializeOutcomeMutation(this.mutationKey, async () => {
      const state = await this.flushPendingAudits(await this.load());
      return rankRelevantOutcomes(state.records, task, now);
    });
  }

  async recordFeedback(outcomeId: string, input: unknown, now = new Date()): Promise<OutcomeRecord> {
    const feedback = validateOutcomeFeedback(input, now);
    return serializeOutcomeMutation(this.mutationKey, async () => {
      const state = await this.flushPendingAudits(await this.load());
      const index = state.records.findIndex(record => record.id === outcomeId);
      if (index < 0) throw new OutcomeNotFoundError();
      if (state.pendingAudits.length >= maxPendingFeedbackAudits) throw new OutcomeFeedbackAuditBackpressureError();
      const updated = { ...state.records[index], feedback };
      const records = [...state.records].slice(0, 500);
      records[index] = updated;
      const pendingAudits = [...state.pendingAudits, { id: randomUUID(), outcomeId, rating: feedback.rating }];
      const committed = { schemaVersion: 2, records, updatedAt: now.toISOString(), pendingAudits } satisfies OutcomeState;
      await writeJsonAtomic(this.file, committed);
      await this.flushPendingAudits(committed);
      return updated;
    });
  }
}

export type RedactedRankedOutcome = Omit<RankedOutcome, 'feedback'> & { feedback?: Omit<OutcomeFeedback, 'reason'> };
export interface ExecuteResult { task: AdaptiveTask; route: ExecutionRoute; orchestration: OrchestrationPlan; priorOutcomes: RedactedRankedOutcome[]; validation: ValidationResult; outcome: OutcomeRecord; }

function redactRankedOutcomes(records: RankedOutcome[]): RedactedRankedOutcome[] {
  return records.map(({ feedback, ...record }) => feedback
    ? { ...record, feedback: { rating: feedback.rating, createdAt: feedback.createdAt } }
    : record,
  );
}

export class AdaptiveExecutionEngine {
  constructor(private readonly store: OutcomeStore = new JsonOutcomeStore(), private readonly hooks: LifecycleHooks = new LifecycleHooks(), private readonly router: TaskRouter = new TaskRouter(), private readonly planner: IntelligenceOrchestrationPlanner = new IntelligenceOrchestrationPlanner()) {}

  async execute(task: AdaptiveTask, runner: (task: AdaptiveTask, route: ExecutionRoute, prior: RedactedRankedOutcome[], orchestration: OrchestrationPlan) => Promise<{ evidence?: string[]; lesson?: string }>, validator: (task: AdaptiveTask, evidence: string[]) => Promise<ValidationResult>): Promise<ExecuteResult> {
    await this.hooks.emit('session:start', { task }); await this.hooks.emit('task:pre', { task });
    const taskKind = this.router.effectiveKind(task);
    const route = this.router.route(task, taskKind);
    const priorOutcomes = redactRankedOutcomes((await this.store.findRelevant(task)).slice(0, 5));
    const learned = learnedOrchestrationMode(task, taskKind, priorOutcomes);
    const learningSignals = [...learned.signals, ...weightedRelevanceSignals(priorOutcomes)];
    const missionContext = buildMissionContextPacket({
      objective: task.objective,
      constraints: textArray(task.context?.constraints),
      decisions: textArray(task.context?.decisions),
      relevantFiles: textArray(task.context?.relevantFiles),
      remainingTasks: textArray(task.context?.remainingTasks),
      knownFailures: textArray(task.context?.knownFailures),
      evidence: priorOutcomes.flatMap(item => item.evidence).slice(0, 12),
    });
    const plannerCapability = taskKind === 'strategy' || taskKind === 'review' ? taskKind : task.capability;
    const orchestration = this.planner.plan({ objective: task.objective, capability: plannerCapability, risk: task.risk, mode: learned.mode, context: { ...task.context, missionContext, executionRole: route.primary, reviewers: route.reviewers, priorOutcomeCount: priorOutcomes.length, learningSignals } });
    orchestration.rationale.push(...learningSignals);
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
