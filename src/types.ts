export type Priority = 'P0' | 'P1' | 'P2';
export type Status = 'planned' | 'active' | 'blocked' | 'done' | 'paused';
export type JobStatus = 'discovered' | 'investigating' | 'applied' | 'interview' | 'offer' | 'rejected' | 'closed';
export type ResearchStatus = 'open' | 'synthesized' | 'archived';
export type GoalStatus = 'planned' | 'active' | 'blocked' | 'achieved' | 'abandoned';
export type EntityType = 'project' | 'decision' | 'action' | 'job' | 'research' | 'goal';
export type RelationType = 'relates_to' | 'blocks' | 'depends_on' | 'supports' | 'generated_by' | 'advances';
export interface Project { id: string; name: string; priority: Priority; status: Status; currentOutcome: string; nextAction?: string; blockers: string[]; updatedAt: string; }
export interface Decision { id: string; title: string; status: 'required' | 'accepted' | 'rejected'; projectId?: string; rationale?: string; createdAt: string; resolvedAt?: string; }
export interface Action { id: string; title: string; projectId?: string; goalId?: string; priority: Priority; status: Status; dueAt?: string; outcome?: string; createdAt: string; updatedAt: string; }
export interface GoalEvidence { id: string; summary: string; source: 'execution' | 'manual'; actionId?: string; capturedAt: string; }
export interface GoalLearning { id: string; summary: string; actionId?: string; outcomeId?: string; createdAt: string; }
export interface Goal { id: string; title: string; priority: Priority; owner: string; status: GoalStatus; successCriteria: string[]; progress: number; nextAction?: string; evidence: GoalEvidence[]; learnings: GoalLearning[]; createdAt: string; updatedAt: string; }
export interface JobOpportunity { id: string; company: string; role: string; source?: string; link?: string; status: JobStatus; fitScore: number; matchedSignals: string[]; salaryRange?: string; currency?: string; recruiter?: string; hiringManager?: string; nextAction?: string; followUpAt?: string; appliedAt?: string; lastContactAt?: string; closedReason?: string; notes?: string; createdAt: string; updatedAt: string; }
export interface CareerQueueItem { job: JobOpportunity; priorityScore: number; ageDays: number; followUpDue: boolean; rationale: string[]; }
export interface ResearchEvidence { id: string; title: string; url: string; sourceType: 'primary' | 'secondary'; note?: string; capturedAt: string; }
export interface ResearchSynthesis { version: number; summary: string; createdAt: string; evidenceIds: string[]; }
export interface ResearchRecord { id: string; question: string; status: ResearchStatus; projectId?: string; evidence: ResearchEvidence[]; syntheses: ResearchSynthesis[]; createdAt: string; updatedAt: string; }
export interface ContextRelation extends Record<string, unknown> { id: string; sourceType: EntityType; sourceId: string; type: RelationType; targetType: EntityType; targetId: string; createdAt: string; }
export interface RelatedContext { entityId: string; incoming: ContextRelation[]; outgoing: ContextRelation[]; }
export interface MuninEvent { id: string; type: string; entityType: EntityType | 'relation' | 'system'; entityId: string; timestamp: string; payload: Record<string, unknown>; }
export interface MuninState { projects: Project[]; decisions: Decision[]; actions: Action[]; jobs: JobOpportunity[]; research: ResearchRecord[]; goals: Goal[]; relations: ContextRelation[]; }
