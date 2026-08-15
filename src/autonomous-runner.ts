import { randomUUID } from 'node:crypto';
import { JsonOutcomeStore, type OutcomeStore } from './adaptive-execution.js';
import { planAutonomousGoalCycle, prioritizeGoals, type AutonomousCycleRecord, type AutonomousLoopResult } from './autonomous-goals.js';
import { ExecutionEngine, type ExecutionPlan } from './runtime.js';
import { MuninService } from './service.js';
import { ContextStore } from './store.js';

export interface GoalRuntime {
  createPlan(objective: string): Promise<ExecutionPlan>;
  run(planId: string): Promise<ExecutionPlan>;
}

export class AutonomousGoalRunner {
  constructor(
    private readonly store = new ContextStore(),
    private readonly runtime: GoalRuntime = new ExecutionEngine(),
    private readonly outcomes: OutcomeStore = new JsonOutcomeStore(),
  ) {}

  async run(maxCycles = 5): Promise<AutonomousLoopResult> {
    if (!Number.isInteger(maxCycles) || maxCycles < 1 || maxCycles > 20) throw new Error('maxCycles must be an integer between 1 and 20.');
    const cycles: AutonomousCycleRecord[] = [];
    const service = new MuninService(this.store);

    for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
      const state = await this.store.load();
      const ranked = prioritizeGoals(state);
      if (!ranked.length) return { status: cycles.length ? 'completed' : 'idle', cycles };

      const selected = ranked[0].goal;
      const prior = await this.outcomes.findRelevant({ id: `goal-loop-${selected.id}`, objective: selected.title, capability: `goal:${selected.id}`, kind: 'strategy', risk: selected.priority === 'P0' ? 'high' : 'medium' });
      const decision = planAutonomousGoalCycle(state, prior);
      const record: AutonomousCycleRecord = { cycle, decision };
      cycles.push(record);

      if (decision.disposition === 'idle') return { status: cycles.length > 1 ? 'completed' : 'idle', cycles };
      if (decision.disposition === 'needs_user') {
        await this.store.event('goal.autonomy_blocked', 'goal', decision.goal!.id, { actionId: decision.action?.id, reason: decision.guard?.reason, score: decision.score });
        return { status: 'needs_user', cycles };
      }
      if (decision.disposition === 'plan') {
        const created = await service.decomposeGoal(decision.goal!.id, [decision.generatedActionTitle!]);
        await this.store.event('goal.autonomy_planned', 'goal', decision.goal!.id, { actionId: created[0].id, title: created[0].title, repeatedFailures: decision.repeatedFailures });
        continue;
      }

      const action = decision.action!;
      const plan = await this.runtime.createPlan(action.title);
      record.runtimePlanId = plan.id;
      const executed = await this.runtime.run(plan.id);
      record.runtimeStatus = executed.status;
      if (executed.status !== 'DONE') {
        const failures = executed.tasks.filter(task => task.status === 'FAILED').map(task => task.error ?? task.title);
        record.error = failures.join('; ') || `Runtime ended with ${executed.status}`;
        await this.store.event('goal.autonomy_runtime_failed', 'goal', decision.goal!.id, { actionId: action.id, runtimePlanId: plan.id, runtimeStatus: executed.status, failures });
        return { status: 'failed', cycles };
      }

      const results = executed.tasks.map(task => task.result).filter((value): value is string => Boolean(value));
      const summary = results.at(-1) ?? `Runtime plan ${plan.id} completed successfully.`;
      await service.execute(action.id, `Autonomous local execution completed: ${summary}`);
      record.executedActionId = action.id;
      await this.store.event('goal.autonomy_executed', 'goal', decision.goal!.id, { actionId: action.id, runtimePlanId: plan.id, runtimeStatus: executed.status, traceId: randomUUID() });
    }

    return { status: 'cycle_limit', cycles };
  }
}
