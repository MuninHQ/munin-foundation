export type Priority = 'P0' | 'P1' | 'P2';
export type Status = 'planned' | 'active' | 'blocked' | 'done' | 'paused';

export interface Project {
  id: string;
  name: string;
  priority: Priority;
  status: Status;
  currentOutcome: string;
  nextAction?: string;
  blockers: string[];
  updatedAt: string;
}

export interface Decision {
  id: string;
  title: string;
  status: 'required' | 'accepted' | 'rejected';
  projectId?: string;
  rationale?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Action {
  id: string;
  title: string;
  projectId?: string;
  priority: Priority;
  status: Status;
  dueAt?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MuninEvent {
  id: string;
  type: string;
  entityType: 'project' | 'decision' | 'action' | 'system';
  entityId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface MuninState {
  projects: Project[];
  decisions: Decision[];
  actions: Action[];
}
