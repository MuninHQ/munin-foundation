import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { autonomyGuard, prioritizeGoals } from '../src/autonomous-goals.js';
import { AutonomousGoalRunner, type GoalRuntime } from '../src/autonomous-runner.js';
import { InMemoryOutcomeStore } from '../src/adaptive-execution.js';
import { ContextStore } from '../src/store.js';
import { MuninService } from '../src/service.js';
import type { ExecutionPlan } from '../src/runtime.js';
import type { MuninState } from '../src/types.js';

function emptyState(): MuninState { return { projects: [], decisions: [], actions: [], jobs: [], research: [], goals: [], relations: [] }; }

class SuccessfulRuntime implements GoalRuntime {
  protected plans = new Map<string, ExecutionPlan>();
  async createPlan(objective: string): Promise<ExecutionPlan> {
    const plan: ExecutionPlan = { id: `obj-${this.plans.size + 1}`, objective, status: 'READY', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tasks: [{ id: `tsk-${this.plans.size + 1}`, objectiveId: `obj-${this.plans.size + 1}`, title: 'Execute locally', capability: 'write', owner: 'writer', status: 'READY', priority: 0, dependencies: [], expectedOutput: 'Local result' }] };
    this.plans.set(plan.id, plan); return plan;
  }
  async run(planId: string): Promise<ExecutionPlan> { const plan = this.plans.get(planId)!; plan.status = 'DONE'; plan.updatedAt = new Date().toISOString(); plan.tasks[0].status = 'DONE'; plan.tasks[0].result = 'Validated local autonomous result'; return plan; }
}

class FailingRuntime extends SuccessfulRuntime {
  async run(planId: string): Promise<ExecutionPlan> { const plan = this.plans.get(planId)!; plan.status = 'FAILED'; plan.updatedAt = new Date().toISOString(); plan.tasks[0].status = 'FAILED'; plan.tasks[0].error = 'local runtime failure'; return plan; }
}

test('prioritizer prefers P0 and guard blocks external effects', () => {
  const state = emptyState(); const now = new Date().toISOString();
  state.goals.push({ id: 'g1', title: 'P1 work', priority: 'P1', owner: 'munin', status: 'active', successCriteria: ['done'], progress: 10, evidence: [], learnings: [], createdAt: now, updatedAt: now });
  state.goals.push({ id: 'g2', title: 'P0 work', priority: 'P0', owner: 'munin', status: 'planned', successCriteria: ['done'], progress: 0, evidence: [], learnings: [], createdAt: now, updatedAt: now });
  assert.equal(prioritizeGoals(state)[0].goal.id, 'g2');
  assert.equal(autonomyGuard('Build and test local adapter').allowed, true);
  assert.equal(autonomyGuard('Send email to recruiter').allowed, false);
});

test('runner plans missing local action, executes it, validates it and completes goal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-auto-goal-')); const previous = process.env.MUNIN_DATA_DIR; process.env.MUNIN_DATA_DIR = root;
  try {
    const store = new ContextStore(root); const service = new MuninService(store); const goal = await service.addGoal('Build autonomous loop', ['Build and validate local loop'], 'P1', 'munin');
    const runner = new AutonomousGoalRunner(store, new SuccessfulRuntime(), new InMemoryOutcomeStore()); const result = await runner.run(5);
    assert.equal(result.status, 'completed'); assert.ok(result.cycles.some(cycle => cycle.decision.disposition === 'plan')); assert.ok(result.cycles.some(cycle => cycle.executedActionId));
    const current = (await service.listGoals()).find(item => item.id === goal.id)!; assert.equal(current.status, 'achieved'); assert.equal(current.progress, 100); assert.equal(current.evidence.length, 1); assert.equal(current.learnings.length, 1);
    const sitrep = await service.sitrep(); assert.match(sitrep, /Autonomous goal loop:/); assert.match(sitrep, /executed/);
  } finally { if (previous === undefined) delete process.env.MUNIN_DATA_DIR; else process.env.MUNIN_DATA_DIR = previous; await rm(root, { recursive: true, force: true }); }
});

test('runner stops only when a selected action needs user control', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-auto-block-'));
  try {
    const store = new ContextStore(root); const service = new MuninService(store); const goal = await service.addGoal('Recruiter outreach', ['Message sent'], 'P0', 'munin'); await service.decomposeGoal(goal.id, ['Send email to recruiter']);
    const result = await new AutonomousGoalRunner(store, new SuccessfulRuntime(), new InMemoryOutcomeStore()).run(3);
    assert.equal(result.status, 'needs_user'); assert.equal(result.cycles.at(-1)?.decision.action?.title, 'Send email to recruiter'); const state = await store.load(); assert.equal(state.actions[0].status, 'planned');
    const sitrep = await service.sitrep(); assert.match(sitrep, /needs user/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('repeated local runtime failures are persisted and trigger replanning instead of blind retry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-auto-replan-')); const outcomes = new InMemoryOutcomeStore();
  try {
    const store = new ContextStore(root); const service = new MuninService(store); const goal = await service.addGoal('Stabilize local build', ['Build and validate implementation'], 'P1', 'munin'); await service.decomposeGoal(goal.id, ['Build local implementation']);
    assert.equal((await new AutonomousGoalRunner(store, new FailingRuntime(), outcomes).run(1)).status, 'failed');
    assert.equal((await new AutonomousGoalRunner(store, new FailingRuntime(), outcomes).run(1)).status, 'failed');
    const third = await new AutonomousGoalRunner(store, new FailingRuntime(), outcomes).run(1);
    assert.equal(third.status, 'cycle_limit'); assert.equal(third.cycles[0].decision.disposition, 'plan'); assert.equal(third.cycles[0].decision.repeatedFailures, 2);
    const state = await store.load(); const old = state.actions.find(action => action.title === 'Build local implementation')!; const replanning = state.actions.find(action => action.title.startsWith('Review and replan goal'))!;
    assert.equal(old.status, 'blocked'); assert.equal(replanning.status, 'planned');
  } finally { await rm(root, { recursive: true, force: true }); }
});
