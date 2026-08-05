import { randomUUID } from 'node:crypto';
import { ContextStore } from './store.js';
import { generateSitrep } from './sitrep.js';
import type {
  Action,
  ContextRelation,
  Decision,
  EntityType,
  JobOpportunity,
  JobStatus,
  Priority,
  Project,
  RelatedContext,
  RelationType,
  Status,
} from './types.js';

const careerSignals = [
  'payments', 'open finance', 'open banking', 'artificial intelligence', 'ai',
  'blockchain', 'digital assets', 'product', 'leadership', 'financial infrastructure', 'fintech',
];

function scoreOpportunity(text: string): { fitScore: number; matchedSignals: string[] } {
  const normalized = text.toLowerCase();
  const matchedSignals = careerSignals.filter(signal => normalized.includes(signal));
  return { fitScore: Math.min(100, 50 + matchedSignals.length * 5), matchedSignals };
}

export class MuninService {
  constructor(private readonly store = new ContextStore()) {}

  async sitrep(): Promise<string> { return generateSitrep(await this.store.load(), await this.store.events()); }
  async inspect(): Promise<string> { return JSON.stringify(await this.store.load(), null, 2); }
  async exportContext(): Promise<string> {
    return JSON.stringify({ exportedAt: new Date().toISOString(), state: await this.store.load(), events: await this.store.events() }, null, 2);
  }

  async listProjects(): Promise<Project[]> { return (await this.store.load()).projects; }

  async addProject(name: string, priority: Priority = 'P1'): Promise<Project> {
    const state = await this.store.load();
    const project: Project = { id: `prj-${randomUUID().slice(0, 8)}`, name, priority, status: 'planned', currentOutcome: 'Project created', blockers: [], updatedAt: new Date().toISOString() };
    state.projects.push(project);
    await this.store.save(state);
    await this.store.event('project.created', 'project', project.id, { name, priority });
    return project;
  }

  async updateProject(projectId: string, status: Status, nextAction?: string): Promise<Project> {
    const state = await this.store.load();
    const project = state.projects.find(item => item.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    project.status = status;
    project.nextAction = nextAction ?? project.nextAction;
    project.updatedAt = new Date().toISOString();
    await this.store.save(state);
    await this.store.event('project.updated', 'project', project.id, { status, nextAction });
    return project;
  }

  async addDecision(title: string, projectId?: string): Promise<Decision> {
    const state = await this.store.load();
    const decision: Decision = { id: `dec-${randomUUID().slice(0, 8)}`, title, projectId, status: 'required', createdAt: new Date().toISOString() };
    state.decisions.push(decision);
    await this.store.save(state);
    await this.store.event('decision.created', 'decision', decision.id, { title, projectId });
    return decision;
  }

  async resolveDecision(decisionId: string, status: 'accepted' | 'rejected', rationale?: string): Promise<Decision> {
    const state = await this.store.load();
    const decision = state.decisions.find(item => item.id === decisionId);
    if (!decision) throw new Error(`Decision not found: ${decisionId}`);
    decision.status = status;
    decision.rationale = rationale;
    decision.resolvedAt = new Date().toISOString();
    await this.store.save(state);
    await this.store.event('decision.resolved', 'decision', decision.id, { status, rationale });
    return decision;
  }

  async addAction(title: string, priority: Priority = 'P1', projectId?: string): Promise<Action> {
    const state = await this.store.load();
    const now = new Date().toISOString();
    const action: Action = { id: `act-${randomUUID().slice(0, 8)}`, title, priority, projectId, status: 'planned', createdAt: now, updatedAt: now };
    state.actions.push(action);
    await this.store.save(state);
    await this.store.event('action.created', 'action', action.id, { title, priority, projectId });
    return action;
  }

  async execute(actionId: string, outcome: string): Promise<Action> {
    const state = await this.store.load();
    const action = state.actions.find(item => item.id === actionId);
    if (!action) throw new Error(`Action not found: ${actionId}`);
    action.status = 'done';
    action.outcome = outcome;
    action.updatedAt = new Date().toISOString();
    const project = action.projectId ? state.projects.find(item => item.id === action.projectId) : undefined;
    if (project) { project.currentOutcome = outcome; project.updatedAt = action.updatedAt; }
    await this.store.save(state);
    await this.store.event('action.executed', 'action', action.id, { outcome, projectId: action.projectId });
    return action;
  }

  async addJob(company: string, role: string, description = ''): Promise<JobOpportunity> {
    const state = await this.store.load();
    const now = new Date().toISOString();
    const score = scoreOpportunity(`${company} ${role} ${description}`);
    const job: JobOpportunity = { id: `job-${randomUUID().slice(0, 8)}`, company, role, status: 'discovered', fitScore: score.fitScore, matchedSignals: score.matchedSignals, nextAction: score.fitScore >= 80 ? 'Investigate and tailor application' : 'Review fit before applying', createdAt: now, updatedAt: now };
    state.jobs.push(job);
    await this.store.save(state);
    await this.store.event('job.created', 'job', job.id, { company, role, fitScore: job.fitScore });
    return job;
  }

  async listJobs(): Promise<JobOpportunity[]> { return (await this.store.load()).jobs.sort((a, b) => b.fitScore - a.fitScore); }

  async updateJob(jobId: string, status: JobStatus, nextAction?: string): Promise<JobOpportunity> {
    const state = await this.store.load();
    const job = state.jobs.find(item => item.id === jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = status;
    job.nextAction = nextAction ?? job.nextAction;
    job.updatedAt = new Date().toISOString();
    if (status === 'applied' && !job.appliedAt) {
      job.appliedAt = job.updatedAt;
      const followUp = new Date(); followUp.setDate(followUp.getDate() + 7); job.followUpAt = followUp.toISOString();
    }
    await this.store.save(state);
    await this.store.event('job.updated', 'job', job.id, { status, nextAction, followUpAt: job.followUpAt });
    return job;
  }

  private entityExists(state: Awaited<ReturnType<ContextStore['load']>>, type: EntityType, id: string): boolean {
    const collection = type === 'project' ? state.projects : type === 'decision' ? state.decisions : type === 'action' ? state.actions : state.jobs;
    return collection.some(item => item.id === id);
  }

  async addRelation(sourceType: EntityType, sourceId: string, type: RelationType, targetType: EntityType, targetId: string): Promise<ContextRelation> {
    const state = await this.store.load();
    if (!this.entityExists(state, sourceType, sourceId)) throw new Error(`Source not found: ${sourceType}/${sourceId}`);
    if (!this.entityExists(state, targetType, targetId)) throw new Error(`Target not found: ${targetType}/${targetId}`);
    const duplicate = state.relations.find(r => r.sourceId === sourceId && r.type === type && r.targetId === targetId);
    if (duplicate) return duplicate;
    const relation: ContextRelation = { id: `rel-${randomUUID().slice(0, 8)}`, sourceType, sourceId, type, targetType, targetId, createdAt: new Date().toISOString() };
    state.relations.push(relation);
    await this.store.save(state);
    await this.store.event('relation.created', 'relation', relation.id, relation);
    return relation;
  }

  async relatedContext(entityId: string): Promise<RelatedContext> {
    const relations = (await this.store.load()).relations;
    return { entityId, incoming: relations.filter(r => r.targetId === entityId), outgoing: relations.filter(r => r.sourceId === entityId) };
  }

  async careerSitrep(): Promise<string> {
    const jobs = await this.listJobs();
    const now = Date.now();
    const followUps = jobs.filter(job => job.followUpAt && new Date(job.followUpAt).getTime() <= now && !['offer', 'rejected', 'closed'].includes(job.status));
    return ['CAREER SITREP', '', `Pipeline: ${jobs.length}`, `Applied: ${jobs.filter(job => job.status === 'applied').length}`, `Interviews: ${jobs.filter(job => job.status === 'interview').length}`, `Follow-ups due: ${followUps.length}`, '', 'Top opportunities:', ...jobs.slice(0, 5).map(job => `- ${job.company} — ${job.role} (${job.fitScore}%) — ${job.nextAction ?? 'No next action'}`)].join('\n');
  }
}
