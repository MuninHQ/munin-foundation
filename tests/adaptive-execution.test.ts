import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AdaptiveExecutionEngine, InMemoryOutcomeStore, JsonOutcomeStore, LifecycleHooks, TaskRouter, type AdaptiveTask, type LifecycleEvent, type OutcomeRecord } from '../src/adaptive-execution.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationInput } from '../src/intelligence-orchestration.js';
import type { MissionContextPacket } from '../src/mission-context-packet.js';

const rankingNow = new Date('2026-09-02T00:00:00.000Z');

class FixedNowOutcomeStore extends InMemoryOutcomeStore {
  override async findRelevant(task: AdaptiveTask): ReturnType<InMemoryOutcomeStore['findRelevant']> {
    return super.findRelevant(task, rankingNow);
  }
}

class CapturingPlanner extends IntelligenceOrchestrationPlanner {
  context?: Record<string, unknown>;
  override plan(input: OrchestrationInput) {
    this.context = input.context;
    return super.plan(input);
  }
}

function rankedRoutingOutcome(id: string, createdAt: string, status: 'passed' | 'failed', feedback?: OutcomeRecord['feedback'], overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id,
    taskId: `task-${id}`,
    objective: 'Fix flaky provider integration',
    capability: 'provider',
    route: { primary: 'builder', reviewers: ['reviewer'], rationale: [] },
    orchestration: {
      id: `orchestration-${id}`,
      objective: 'Fix flaky provider integration',
      capability: 'provider',
      route: 'direct',
      risk: 'medium',
      providerPreference: ['ollama-local', 'deterministic-local'],
      localOnly: true,
      maxCostPerCall: 0,
      rationale: [],
      createdAt,
    },
    status,
    evidence: [`evidence:${id}`],
    lesson: 'Provider integration lesson.',
    tags: ['provider'],
    createdAt,
    feedback,
    ...overrides,
  };
}

test('build work routes to builder and reviewer', () => {
  const route = new TaskRouter().route({ id: '1', objective: 'Build adaptive execution', capability: 'execute', kind: 'build' });
  assert.equal(route.primary, 'builder'); assert.deepEqual(route.reviewers, ['reviewer']);
});

test('adaptive roles and provider orchestration stay separate but coordinated', async () => {
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore());
  let observedProviderRoute = '';
  const result = await engine.execute(
    { id: 'bridge-1', objective: 'Build provider bridge', capability: 'execute', kind: 'build', risk: 'medium' },
    async (_task, route, _prior, orchestration) => { assert.equal(route.primary, 'builder'); observedProviderRoute = orchestration.route; return { evidence: [`provider-route:${orchestration.route}`] }; },
    async () => ({ passed: true, checks: [{ name: 'bridge', passed: true }] }),
  );
  assert.equal(observedProviderRoute, 'direct'); assert.equal(result.orchestration.localOnly, true); assert.equal(result.orchestration.maxCostPerCall, 0); assert.equal(result.outcome.orchestration?.route, 'direct');
});

test('repeated relevant direct failures escalate a later medium-risk task to council', async () => {
  const store = new InMemoryOutcomeStore(); const engine = new AdaptiveExecutionEngine(store);
  for (const id of ['learn-fail-1', 'learn-fail-2']) {
    await assert.rejects(() => engine.execute(
      { id, objective: 'Build flaky provider integration', capability: 'provider', kind: 'build', risk: 'medium' },
      async (_task, _route, _prior, orchestration) => ({ evidence: [`route:${orchestration.route}`] }),
      async () => ({ passed: false, checks: [{ name: 'provider-test', passed: false }] }),
    ));
  }
  const learned = await engine.execute(
    { id: 'learn-next', objective: 'Fix flaky provider integration', capability: 'provider', kind: 'build', risk: 'medium' },
    async (_task, route, prior, orchestration) => { assert.equal(route.primary, 'builder'); assert.ok(prior.length >= 2); return { evidence: [`route:${orchestration.route}`] }; },
    async () => ({ passed: true, checks: [{ name: 'provider-test', passed: true }] }),
  );
  assert.equal(learned.orchestration.route, 'council');
  assert.ok(learned.orchestration.rationale.some(item => item.includes('Escalated after 2 relevant direct failures')));
  assert.equal(learned.orchestration.maxCostPerCall, 0);
});

test('weighted top-five evidence excludes stale or harmful failures from learned routing and mission context', async () => {
  const store = new FixedNowOutcomeStore();
  const feedbackReason = 'Operator-only routing detail';
  await store.save(rankedRoutingOutcome('failure-old', '2026-06-04T00:00:00.000Z', 'failed'));
  await store.save(rankedRoutingOutcome('failure-harmful', rankingNow.toISOString(), 'failed', { rating: 'harmful', reason: feedbackReason, createdAt: rankingNow.toISOString() }));
  for (const id of ['success-5', 'success-4', 'success-3', 'success-2', 'success-1']) {
    await store.save(rankedRoutingOutcome(id, rankingNow.toISOString(), 'passed', { rating: 'helpful', reason: feedbackReason, createdAt: rankingNow.toISOString() }));
  }
  const planner = new CapturingPlanner();
  const engine = new AdaptiveExecutionEngine(store, new LifecycleHooks(), new TaskRouter(), planner);

  const learned = await engine.execute(
    { id: 'weighted-next', objective: 'Fix flaky provider integration', capability: 'provider', kind: 'build', risk: 'medium' },
    async (_task, _route, prior, orchestration) => {
      assert.deepEqual(prior.map(item => item.id), ['success-1', 'success-2', 'success-3', 'success-4', 'success-5']);
      assert.deepEqual(prior[0].relevance, { lexicalScore: 5, ageDays: 0, timeWeight: 1, feedbackMultiplier: 1.25, weightedScore: 6.25 });
      assert.deepEqual(prior[0].feedback, { rating: 'helpful', createdAt: rankingNow.toISOString() });
      assert.ok(prior.every(item => !('reason' in (item.feedback ?? {}))));
      assert.equal(orchestration.route, 'direct');
      return { evidence: [`route:${orchestration.route}`] };
    },
    async () => ({ passed: true, checks: [{ name: 'provider-test', passed: true }] }),
  );

  assert.equal(learned.orchestration.route, 'direct');
  assert.deepEqual(learned.priorOutcomes[0].relevance, { lexicalScore: 5, ageDays: 0, timeWeight: 1, feedbackMultiplier: 1.25, weightedScore: 6.25 });
  assert.deepEqual(learned.priorOutcomes[0].feedback, { rating: 'helpful', createdAt: rankingNow.toISOString() });
  assert.ok(learned.priorOutcomes.every(item => !('reason' in (item.feedback ?? {}))));
  assert.ok(learned.orchestration.rationale.includes('Weighted relevance prioritized current operator-trusted evidence.'));
  assert.ok(learned.orchestration.rationale.every(item => !item.includes(feedbackReason)));
  const missionContext = planner.context?.missionContext as MissionContextPacket;
  assert.deepEqual(missionContext.evidence, ['evidence:success-1', 'evidence:success-2', 'evidence:success-3', 'evidence:success-4', 'evidence:success-5']);
  assert.ok(!missionContext.evidence.includes('evidence:failure-old'));
  assert.ok(!missionContext.evidence.includes('evidence:failure-harmful'));
  assert.ok(!JSON.stringify(planner.context).includes(feedbackReason));
});

test('high-risk strategy work invokes council while preserving orchestrator and reviewer roles', async () => {
  const store = new FixedNowOutcomeStore();
  const feedbackReason = 'Direct route was efficient';
  const highRiskMatch = { objective: 'Decide architecture', capability: 'architecture', tags: ['architecture'] };
  await store.save(rankedRoutingOutcome('helpful-direct-1', rankingNow.toISOString(), 'passed', { rating: 'helpful', reason: feedbackReason, createdAt: rankingNow.toISOString() }, highRiskMatch));
  await store.save(rankedRoutingOutcome('helpful-direct-2', rankingNow.toISOString(), 'passed', { rating: 'helpful', reason: feedbackReason, createdAt: rankingNow.toISOString() }, highRiskMatch));
  const result = await new AdaptiveExecutionEngine(store).execute(
    { id: 'bridge-2', objective: 'Decide architecture', capability: 'architecture', kind: 'strategy', risk: 'high' },
    async (_task, route, prior, orchestration) => { assert.equal(route.primary, 'orchestrator'); assert.deepEqual(route.reviewers, ['reviewer']); assert.ok(prior.every(item => !('reason' in (item.feedback ?? {})))); return { evidence: [`council:${orchestration.route}`] }; },
    async () => ({ passed: true, checks: [{ name: 'independent-review', passed: true }] }),
  );
  assert.deepEqual(result.priorOutcomes.map(item => item.id), ['helpful-direct-1', 'helpful-direct-2']);
  assert.ok(result.priorOutcomes.every(item => !('reason' in (item.feedback ?? {}))));
  assert.equal(result.orchestration.route, 'council'); assert.deepEqual(result.route.reviewers, ['reviewer']); assert.equal(result.orchestration.localOnly, true); assert.equal(result.orchestration.maxCostPerCall, 0); assert.deepEqual(result.orchestration.providerPreference, ['ollama-local', 'deterministic-local']);
  assert.ok(result.orchestration.rationale.some(item => item.includes('Safety policy')));
  assert.ok(result.orchestration.rationale.every(item => !item.includes(feedbackReason)));
});

test('reviewer gate rejects a false-success completion', async () => {
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore());
  await assert.rejects(() => engine.execute({ id: '2', objective: 'Implement feature', capability: 'execute', kind: 'build' }, async () => ({ evidence: ['code-written'] }), async () => ({ passed: false, checks: [{ name: 'tests', passed: false, evidence: '1 failing test' }] })), /Reviewer gate rejected task 2: tests/);
});

test('successful outcomes are persisted and reused by later similar work', async () => {
  const store = new InMemoryOutcomeStore(); const engine = new AdaptiveExecutionEngine(store);
  const first = await engine.execute({ id: '3', objective: 'Build Ollama provider adapter', capability: 'provider', kind: 'build' }, async () => ({ evidence: ['adapter-test-passed'], lesson: 'Prefer the local Ollama adapter.' }), async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] })); assert.equal(first.outcome.status, 'passed');
  let reused = 0;
  const second = await engine.execute({ id: '4', objective: 'Refactor Ollama provider', capability: 'provider', kind: 'build' }, async (_task, _route, prior) => { reused = prior.length; return { evidence: ['refactor-test-passed'] }; }, async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }));
  assert.ok(reused >= 1); assert.ok(second.priorOutcomes.some(outcome => outcome.taskId === '3'));
});

test('json outcome store survives a new store instance', async () => {
  const file = path.join(tmpdir(), `munin-adaptive-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  try {
    const firstEngine = new AdaptiveExecutionEngine(new JsonOutcomeStore(file)); await firstEngine.execute({ id: 'persist-1', objective: 'Build persistent provider lesson', capability: 'provider', kind: 'build' }, async () => ({ evidence: ['persistent-evidence'], lesson: 'Reuse persistent provider lesson.' }), async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }));
    const secondEngine = new AdaptiveExecutionEngine(new JsonOutcomeStore(file)); const result = await secondEngine.execute({ id: 'persist-2', objective: 'Refactor persistent provider', capability: 'provider', kind: 'build' }, async (_task, _route, prior) => ({ evidence: [`prior:${prior.length}`] }), async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] })); assert.ok(result.priorOutcomes.some(outcome => outcome.taskId === 'persist-1'));
  } finally { await rm(file, { force: true }); }
});

test('lifecycle hooks execute in deterministic order', async () => {
  const events: LifecycleEvent[] = []; const hooks = new LifecycleHooks(); hooks.register(event => { events.push(event); }); const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore(), hooks);
  await engine.execute({ id: '5', objective: 'Research routing patterns', capability: 'research', kind: 'research' }, async () => ({ evidence: ['source-a'] }), async () => ({ passed: true, checks: [{ name: 'evidence', passed: true }] }));
  assert.deepEqual(events, ['session:start', 'task:pre', 'validation:pre', 'validation:post', 'task:post', 'session:end']);
});
