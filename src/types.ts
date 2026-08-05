export type Priority = 'P0' | 'P1' | 'P2';
export type Status = 'planned' | 'active' | 'blocked' | 'done' | 'paused';
export type JobStatus = 'discovered' | 'investigating' | 'applied' | 'interview' | 'offer' | 'rejected' | 'closed';
export type EntityType = 'project' | 'decision' | 'action' | 'job';
export type RelationType = 'relates_to' | 'blocks' | 'depends_on' | 'supports' | 'generated_by';

export interface Project { id: string; name: string; priority: Priority; status: Status; currentOutcome: string; nextAction?: string; blockers: string[]; updatedAt: string; }
export interface Decision { id: string; title: string; status: 'required' | 'accepted' | 'rejected'; projectId?: string; rationale?: string; createdAt: string; resolvedAt?: string; }
export interface Action { id: string; title: string; projectId?: string; priority: Priority; status: Status; dueAt?: string; outcome?: string; createdAt: string; updatedAt: string; }

export interface JobOpportunity {
  id: string;
  company: string;
  role: string;
  source?: string;
  link?: string;
  status: JobStatus;
  fitScore: number;
  matchedSignals: string[];
  salaryRange?: string;
  currency?: string;
  recruiter?: string;
  hiringManager?: string;
  nextAction?: string;
  followUpAt?: string;
  appliedAt?: string;
  lastContactAt?: string;
  closedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareerQueueItem {
  job: JobOpportunity;
  priorityScore: number;
  ageDays: number;
  followUpDue: boolean;
  rationale: string[];
}

export interface ContextRelation extends Record<string, unknown> { id: string; sourceType: EntityType; sourceId: string; type: RelationType; targetType: EntityType; targetId: string; createdAt: string; }
export interface RelatedContext { entityId: string; incoming: ContextRelation[]; outgoing: ContextRelation[]; }
export interface MuninEvent { id: string; type: string; entityType: EntityType | 'relation' | 'system'; entityId: string; timestamp: string; payload: Record<string, unknown>; }
export interface MuninState { projects: Project[]; decisions: Decision[]; actions: Action[]; jobs: JobOpportunity[]; relations: ContextRelation[]; }
