export type ControlPlanePriority = 'P0' | 'P1' | 'P2' | 'P3';
export type ControlPlaneTaskStatus =
  | 'queued'
  | 'planning'
  | 'building'
  | 'testing'
  | 'verifying'
  | 'blocked'
  | 'done';

export interface ControlPlaneEvidence {
  kind: 'commit' | 'pull_request' | 'test' | 'artifact' | 'note' | 'url';
  value: string;
  at: string;
}

export interface ControlPlaneBlocker {
  reason: string;
  requiresHuman: boolean;
  requestedAction?: string;
  at: string;
}

export interface ControlPlaneTask {
  id: string;
  title: string;
  priority: ControlPlanePriority;
  status: ControlPlaneTaskStatus;
  owner: string;
  source: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  evidence: ControlPlaneEvidence[];
  blocker?: ControlPlaneBlocker;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Readonly<Record<ControlPlaneTaskStatus, readonly ControlPlaneTaskStatus[]>> = {
  queued: ['planning', 'blocked'],
  planning: ['building', 'blocked'],
  building: ['testing', 'blocked'],
  testing: ['verifying', 'building', 'blocked'],
  verifying: ['done', 'building', 'blocked'],
  blocked: ['planning', 'building', 'testing', 'verifying'],
  done: [],
};

function now(): string {
  return new Date().toISOString();
}

function nonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} is required.`);
}

export function createControlPlaneTask(
  input: Omit<ControlPlaneTask, 'status' | 'evidence' | 'blocker' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<ControlPlaneTask, 'status' | 'evidence'>>,
): ControlPlaneTask {
  nonEmpty(input.id, 'Task id');
  nonEmpty(input.title, 'Task title');
  nonEmpty(input.owner, 'Task owner');
  nonEmpty(input.source, 'Task source');
  if (input.acceptanceCriteria.length === 0) throw new Error('At least one acceptance criterion is required.');

  const at = now();
  return {
    ...input,
    dependencies: [...input.dependencies],
    acceptanceCriteria: [...input.acceptanceCriteria],
    status: input.status ?? 'queued',
    evidence: [...(input.evidence ?? [])],
    createdAt: at,
    updatedAt: at,
  };
}

export function canTransitionTask(
  from: ControlPlaneTaskStatus,
  to: ControlPlaneTaskStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionControlPlaneTask(
  task: ControlPlaneTask,
  to: ControlPlaneTaskStatus,
  options: { blocker?: Omit<ControlPlaneBlocker, 'at'>; evidence?: ControlPlaneEvidence } = {},
): ControlPlaneTask {
  if (!canTransitionTask(task.status, to)) {
    throw new Error(`Invalid control-plane transition: ${task.status} -> ${to}.`);
  }

  if (to === 'blocked' && !options.blocker) {
    throw new Error('A blocker is required when transitioning a task to blocked.');
  }

  if (to === 'done' && task.acceptanceCriteria.length > 0 && task.evidence.length === 0 && !options.evidence) {
    throw new Error('Evidence is required before a task can be marked done.');
  }

  const nextEvidence = options.evidence ? [...task.evidence, options.evidence] : [...task.evidence];
  const nextBlocker = to === 'blocked'
    ? { ...options.blocker!, at: now() }
    : undefined;

  return {
    ...task,
    status: to,
    evidence: nextEvidence,
    blocker: nextBlocker,
    updatedAt: now(),
  };
}

export function addControlPlaneEvidence(
  task: ControlPlaneTask,
  evidence: ControlPlaneEvidence,
): ControlPlaneTask {
  nonEmpty(evidence.value, 'Evidence value');
  return {
    ...task,
    evidence: [...task.evidence, evidence],
    updatedAt: now(),
  };
}
