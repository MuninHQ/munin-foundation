import type { ControlPlaneDecision } from './control-plane-decisions.js';
import type { ControlPlaneTask } from './control-plane-state.js';

const priorityWeight = { P0: 400, P1: 300, P2: 200, P3: 100 } as const;
const statusWeight = {
  blocked: 90,
  verifying: 70,
  testing: 60,
  building: 50,
  planning: 40,
  queued: 30,
  done: 0,
} as const;

export interface ControlPlaneSitrepProjection {
  overallStatus: 'nominal' | 'attention' | 'blocked';
  completed: ControlPlaneTask[];
  active: ControlPlaneTask[];
  blocked: ControlPlaneTask[];
  decisions: ControlPlaneDecision[];
  next: ControlPlaneTask[];
  text: string;
}

function taskScore(task: ControlPlaneTask): number {
  return priorityWeight[task.priority] + statusWeight[task.status];
}

export function projectControlPlaneSitrep(
  tasks: readonly ControlPlaneTask[],
  decisions: readonly ControlPlaneDecision[],
  limit = 7,
): ControlPlaneSitrepProjection {
  const blocked = tasks.filter((task) => task.status === 'blocked');
  const completed = tasks
    .filter((task) => task.status === 'done')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const active = tasks
    .filter((task) => task.status !== 'done' && task.status !== 'blocked')
    .sort((a, b) => taskScore(b) - taskScore(a) || b.updatedAt.localeCompare(a.updatedAt));
  const next = [...blocked, ...active]
    .sort((a, b) => taskScore(b) - taskScore(a) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.max(1, limit));
  const currentDecisions = decisions.filter((decision) => !decision.supersededBy);
  const humanBlockers = blocked.filter((task) => task.blocker?.requiresHuman);
  const overallStatus = humanBlockers.length ? 'blocked' : blocked.length ? 'attention' : 'nominal';

  const text = [
    'Control Plane:',
    `- Status: ${overallStatus}`,
    `- Tasks: ${tasks.length} total — ${active.length} active — ${blocked.length} blocked — ${completed.length} done`,
    `- Active decisions: ${currentDecisions.length}`,
    '',
    'Control Plane blockers:',
    ...(blocked.length
      ? blocked.map((task) => `- [${task.priority}] ${task.id}: ${task.blocker?.reason ?? 'blocked'}${task.blocker?.requiresHuman ? ' — human action required' : ''}`)
      : ['- Nenhum bloqueio do Control Plane.']),
    '',
    'Control Plane next:',
    ...(next.length
      ? next.map((task) => `- [${task.priority}] ${task.id}: ${task.title} — ${task.status} — evidence ${task.evidence.length}`)
      : ['- Nenhuma tarefa pendente.']),
  ].join('\n');

  return { overallStatus, completed, active, blocked, decisions: currentDecisions, next, text };
}

export function appendControlPlaneSitrep(baseSitrep: string, projection: ControlPlaneSitrepProjection): string {
  return `${baseSitrep.trimEnd()}\n\n${projection.text}`;
}
