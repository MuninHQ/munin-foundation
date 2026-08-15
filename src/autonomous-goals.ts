import type { Action, Goal, MuninState } from './types.js';
import type { OutcomeRecord } from './adaptive-execution.js';

const priorityWeight = { P0: 300, P1: 200, P2: 100 } as const;
const externalEffect = /\b(send|email|message|publish|post|apply|submit|pay|purchase|buy|delete|remove|deploy|release|transfer|invite|schedule)\b/i;
const localSafe = /\b(build|implement|refactor|fix|test|validate|review|research|analy[sz]e|document|draft|prepare|inspect|audit|compare|plan|design|model|summari[sz]e|advance)\b/i;

export type AutonomyDisposition = 'execute' | 'plan' | 'needs_user' | 'idle';
export interface GoalPriority { goal: Goal; score: number; rationale: string[]; }
export interface AutonomyGuard { allowed: boolean; reason: string; }
export interface AutonomousGoalDecision { disposition: AutonomyDisposition; goal?: Goal; action?: Action; generatedActionTitle?: string; score?: number; rationale: string[]; guard?: AutonomyGuard; repeatedFailures: number; }
export interface AutonomousCycleRecord { cycle: number; decision: AutonomousGoalDecision; runtimePlanId?: string; runtimeStatus?: string; executedActionId?: string; error?: string; }
export interface AutonomousLoopResult { status: 'completed' | 'needs_user' | 'idle' | 'failed' | 'cycle_limit'; cycles: AutonomousCycleRecord[]; }

export function prioritizeGoals(state: MuninState, now = new Date()): GoalPriority[] {
  return state.goals.filter(goal => ['planned', 'active', 'blocked'].includes(goal.status)).map(goal => {
    const rationale: string[] = [`priority ${goal.priority}`, `progress ${goal.progress}%`]; let score = priorityWeight[goal.priority];
    if (goal.status === 'active') { score += 40; rationale.push('active'); } if (goal.status === 'blocked') { score -= 80; rationale.push('blocked'); }
    if (goal.progress < 25) { score += 25; rationale.push('early-stage leverage'); } else if (goal.progress >= 75) { score += 35; rationale.push('close to completion'); }
    const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(goal.updatedAt).getTime()) / 86_400_000)); if (ageDays >= 7) { score += Math.min(30, ageDays); rationale.push(`${ageDays} days since update`); }
    const pending = state.actions.filter(action => action.goalId === goal.id && ['planned', 'active', 'blocked'].includes(action.status)); if (pending.length) { score += 20; rationale.push(`${pending.length} pending action(s)`); }
    return { goal, score, rationale };
  }).sort((a, b) => b.score - a.score || a.goal.createdAt.localeCompare(b.goal.createdAt));
}

export function autonomyGuard(actionTitle: string): AutonomyGuard {
  if (externalEffect.test(actionTitle)) return { allowed: false, reason: 'Action may create an external or irreversible side effect.' };
  if (localSafe.test(actionTitle)) return { allowed: true, reason: 'Action is classified as local, reversible knowledge/code work.' };
  return { allowed: false, reason: 'Action is not clearly local/reversible; explicit user control is required.' };
}

function relevantFailures(goal: Goal, outcomes: OutcomeRecord[]): number { return outcomes.filter(outcome => outcome.status === 'failed' && (outcome.capability === `goal:${goal.id}` || outcome.objective.toLowerCase().includes(goal.title.toLowerCase()))).length; }
function generateNextAction(goal: Goal, repeatedFailures: number): string { if (repeatedFailures >= 2) return `Review and replan goal ${goal.title} after repeated validation failures`; const criterion = goal.successCriteria[Math.min(goal.evidence.length, Math.max(0, goal.successCriteria.length - 1))]; return criterion ? `Advance goal ${goal.title}: ${criterion}` : `Review next milestone for goal ${goal.title}`; }

export function planAutonomousGoalCycle(state: MuninState, outcomes: OutcomeRecord[] = [], now = new Date()): AutonomousGoalDecision {
  const ranked = prioritizeGoals(state, now); if (!ranked.length) return { disposition: 'idle', rationale: ['No active/planned/blocked goals require work.'], repeatedFailures: 0 };
  const selected = ranked[0]; const failures = relevantFailures(selected.goal, outcomes); const actions = state.actions.filter(action => action.goalId === selected.goal.id && ['planned', 'active', 'blocked'].includes(action.status)).sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.createdAt.localeCompare(b.createdAt));
  if (!actions.length) { const generatedActionTitle = generateNextAction(selected.goal, failures); return { disposition: 'plan', goal: selected.goal, generatedActionTitle, score: selected.score, rationale: [...selected.rationale, failures >= 2 ? 'replanning required after repeated failures' : 'goal has no pending action'], repeatedFailures: failures }; }
  const action = actions[0]; const guard = autonomyGuard(action.title); return { disposition: guard.allowed ? 'execute' : 'needs_user', goal: selected.goal, action, score: selected.score, rationale: [...selected.rationale, `selected action ${action.id}`, guard.reason], guard, repeatedFailures: failures };
}
