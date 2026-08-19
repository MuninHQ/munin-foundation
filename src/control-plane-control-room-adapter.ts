import type { ControlRoomState } from './control-room-state.js';
import type { ControlPlanePriority, ControlPlaneTask, ControlPlaneTaskStatus } from './control-plane-state.js';

const priorityHeading = /^##\s+(P[0-3])\b/i;
const checklistItem = /^\s*-\s+\[([ xX])\]\s+(.*)$/;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'task';
}

function titleOf(raw: string): string {
  return raw
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .split(/\s+—\s+/)[0]!
    .trim();
}

function statusOf(done: boolean, raw: string): ControlPlaneTaskStatus {
  if (done) return 'done';
  if (/\b(blocked|bloquead[oa]|human boundary|human-only)\b/i.test(raw)) return 'blocked';
  return 'queued';
}

export function controlPlaneTasksFromControlRoom(state: ControlRoomState): ControlPlaneTask[] {
  const tasks: ControlPlaneTask[] = [];
  let priority: ControlPlanePriority | undefined;
  const seen = new Map<string, number>();

  for (const line of state.backlog.split(/\r?\n/)) {
    const heading = line.match(priorityHeading);
    if (heading) {
      priority = heading[1]!.toUpperCase() as ControlPlanePriority;
      continue;
    }

    const item = line.match(checklistItem);
    if (!item || !priority) continue;
    const raw = item[2]!.trim();
    const done = item[1]!.toLowerCase() === 'x';
    const title = titleOf(raw);
    const base = `ops-${priority.toLowerCase()}-${slug(title)}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    const id = occurrence === 1 ? base : `${base}-${occurrence}`;
    const status = statusOf(done, raw);
    const at = '1970-01-01T00:00:00.000Z';

    tasks.push({
      id,
      title,
      priority,
      status,
      owner: 'munin-orchestrator',
      source: 'ops/BACKLOG.md',
      dependencies: [],
      acceptanceCriteria: [raw],
      evidence: done ? [{ kind: 'note', value: 'Canonical backlog item is checked as complete.', at }] : [],
      blocker: status === 'blocked'
        ? { reason: raw, requiresHuman: true, requestedAction: raw, at }
        : undefined,
      createdAt: at,
      updatedAt: at,
    });
  }

  return tasks;
}
