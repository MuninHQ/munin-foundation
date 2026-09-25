import type { MuninState } from './types.js';
import { planAutonomousGoalCycle, prioritizeGoals, type AutonomousGoalDecision } from './autonomous-goals.js';
import type { OutcomeRecord } from './adaptive-execution.js';

export interface GoalEngineSnapshot {
  generatedAt: string;
  activeGoals: number;
  topGoalId?: string;
  topGoalTitle?: string;
  decision: AutonomousGoalDecision;
  ranked: Array<{ id: string; title: string; score: number; rationale: string[] }>;
}

export function buildGoalEngineSnapshot(
  state: MuninState,
  outcomes: OutcomeRecord[] = [],
  now = new Date(),
): GoalEngineSnapshot {
  const rankedGoals = prioritizeGoals(state, now);
  const decision = planAutonomousGoalCycle(state, outcomes, now);
  const top = rankedGoals[0];
  return {
    generatedAt: now.toISOString(),
    activeGoals: rankedGoals.length,
    topGoalId: top?.goal.id,
    topGoalTitle: top?.goal.title,
    decision,
    ranked: rankedGoals.map(item => ({
      id: item.goal.id,
      title: item.goal.title,
      score: item.score,
      rationale: item.rationale,
    })),
  };
}
