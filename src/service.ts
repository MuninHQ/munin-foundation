import { randomUUID } from 'node:crypto';
import { ContextStore } from './store.js';
import { generateSitrep } from './sitrep.js';
import { AdaptiveExecutionEngine, JsonOutcomeStore, type ValidationResult } from './adaptive-execution.js';
import type { Action, CareerQueueItem, ContextRelation, Decision, EntityType, JobOpportunity, JobStatus, Priority, Project, RelatedContext, RelationType, ResearchEvidence, ResearchRecord, ResearchSynthesis, Status } from './types.js';

const careerSignals = ['payments', 'open finance', 'open banking', 'artificial intelligence', 'ai', 'blockchain', 'digital assets', 'product', 'leadership', 'financial infrastructure', 'fintech'];
const terminalJobStatuses: JobStatus[] = ['offer', 'rejected', 'closed'];

function scoreOpportunity(text: string): { fitScore: number; matchedSignals: string[] } {
  const normalized = text.toLowerCase();
  const matchedSignals = careerSignals.filter(signal => normalized.includes(signal));
  return { fitScore: Math.min(100, 50 + matchedSignals.length * 5), matchedSignals };
}

function careerPriority(job: JobOpportunity, now = new Date()): CareerQueueItem {
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(job.updatedAt).getTime()) / 86_400_000));
  const followUpDue = Boolean(job.followUpAt && new Date(job.followUpAt).getTime() <= now.getTime() && !terminalJobStatuses.includes(job.status));
  const rationale: string[] = [`fit ${job.fitScore}%`];
  let priorityScore = job.fitScore;
  if (job.status === 'interview') { priorityScore += 30; rationale.push('interview active'); }
  else if (job.status === 'applied') { priorityScore += 15; rationale.push('application active'); }
  else if (job.status === 'offer') { priorityScore += 40; rationale.push('offer received'); }
  if (followUpDue) { priorityScore += 25; rationale.push('follow-up due'); }
  if (ageDays >= 7 && !terminalJobStatuses.includes(job.status)) { priorityScore += 10; rationale.push(`${ageDays} days without update`); }
  if (terminalJobStatuses.includes(job.status)) { priorityScore -= 100; rationale.push('terminal status'); }
  return { job, priorityScore, ageDays, followUpDue, rationale };
}

export class MuninService {
  constructor(private readonly store = new ContextStore()) {}
  async sitrep(since?: Date): Promise<string> { return generateSitrep(await this.store.load(), await this.store.events(), since); }
  async inspect(): Promise<string> { return JSON.stringify(await this.store.load(), null, 2); }
  async exportContext(): Promise<string> { return JSON.stringify({ exportedAt: new Date().toISOString(), state: await this.store.load(), events: await this.store.events() }, null, 2); }
  async listProjects(): Promise<Project[]> { return (await this.store.load()).projects; }

  async addProject(name: string, priority: Priority = 'P1'): Promise<Project> {
    const state = await this.store.load(); const project: Project = { id: `prj-${randomUUID().slice(0, 8)}`, name, priority, status: 'planned', currentOutcome: 'Project created', blockers: [], updatedAt: new Date().toISOString() };
    state.projects.push(project); await this.store.save(state); await this.store.event('project.created', 'project', project.id, { name, priority }); return project;
  }
  async updateProject(projectId: string, status: Status, nextAction?: string): Promise<Project> {
    const state = await this.store.load(); const project = state.projects.find(item => item.id === projectId); if (!project) throw new Error(`Project not found: ${projectId}`);
    project.status = status; project.nextAction = nextAction ?? project.nextAction; project.updatedAt = new Date().toISOString(); await this.store.save(state); await this.store.event('project.updated', 'project', project.id, { status, nextAction }); return project;
  }
  async addDecision(title: string, projectId?: string): Promise<Decision> {
    const state = await this.store.load(); const decision: Decision = { id: `dec-${randomUUID().slice(0, 8)}`, title, projectId, status: 'required', createdAt: new Date().toISOString() };
    state.decisions.push(decision); await this.store.save(state); await this.store.event('decision.created', 'decision', decision.id, { title, projectId }); return decision;
  }
  async resolveDecision(decisionId: string, status: 'accepted' | 'rejected', rationale?: string): Promise<Decision> {
    const state = await this.store.load(); const decision = state.decisions.find(item => item.id === decisionId); if (!decision) throw new Error(`Decision not found: ${decisionId}`);
    decision.status = status; decision.rationale = rationale; decision.resolvedAt = new Date().toISOString(); await this.store.save(state); await this.store.event('decision.resolved', 'decision', decision.id, { status, rationale }); return decision;
  }
  async addAction(title: string, priority: Priority = 'P1', projectId?: string): Promise<Action> {
    const state = await this.store.load(); const now = new Date().toISOString(); const action: Action = { id: `act-${randomUUID().slice(0, 8)}`, title, priority, projectId, status: 'planned', createdAt: now, updatedAt: now };
    state.actions.push(action); await this.store.save(state); await this.store.event('action.created', 'action', action.id, { title, priority, projectId }); return action;
  }
  async execute(actionId: string, outcome: string): Promise<Action> {
    const state = await this.store.load(); const action = state.actions.find(item => item.id === actionId); if (!action) throw new Error(`Action not found: ${actionId}`);
    const engine = new AdaptiveExecutionEngine(new JsonOutcomeStore());
    const result = await engine.execute(
      { id: action.id, objective: action.title, capability: action.projectId ? `project:${action.projectId}` : 'action', kind: 'build', risk: action.priority === 'P0' ? 'high' : 'medium', context: { projectId: action.projectId, proposedOutcome: outcome } },
      async (_task, route, prior) => ({
        evidence: [
          `action:${action.id}`,
          `outcome:${outcome.trim()}`,
          `route:${route.primary}${route.reviewers.length ? `+${route.reviewers.join('+')}` : ''}`,
          `prior-outcomes:${prior.length}`,
        ],
        lesson: `Action ${action.id} completed with reviewer-gated outcome: ${outcome.trim()}`,
      }),
      async (_task, evidence): Promise<ValidationResult> => {
        const checks = [
          { name: 'outcome-present', passed: outcome.trim().length > 0, evidence: outcome.trim() || 'empty outcome' },
          { name: 'execution-evidence', passed: evidence.length >= 3, evidence: `${evidence.length} evidence records` },
        ];
        return { passed: checks.every(check => check.passed), checks };
      },
    );
    action.status = 'done'; action.outcome = outcome.trim(); action.updatedAt = new Date().toISOString(); const project = action.projectId ? state.projects.find(item => item.id === action.projectId) : undefined;
    if (project) { project.currentOutcome = action.outcome; project.updatedAt = action.updatedAt; } await this.store.save(state); await this.store.event('action.executed', 'action', action.id, { outcome: action.outcome, projectId: action.projectId, adaptiveOutcomeId: result.outcome.id, route: result.route, validation: result.validation, priorOutcomes: result.priorOutcomes.length }); return action;
  }

  async addJob(company: string, role: string, description = ''): Promise<JobOpportunity> {
    const state = await this.store.load(); const now = new Date().toISOString(); const score = scoreOpportunity(`${company} ${role} ${description}`);
    const job: JobOpportunity = { id: `job-${randomUUID().slice(0, 8)}`, company, role, status: 'discovered', fitScore: score.fitScore, matchedSignals: score.matchedSignals, nextAction: score.fitScore >= 80 ? 'Investigate and tailor application' : 'Review fit before applying', createdAt: now, updatedAt: now };
    state.jobs.push(job); await this.store.save(state); await this.store.event('job.created', 'job', job.id, { company, role, fitScore: job.fitScore }); return job;
  }
  async listJobs(): Promise<JobOpportunity[]> { return (await this.store.load()).jobs.sort((a, b) => b.fitScore - a.fitScore); }
  async updateJob(jobId: string, status: JobStatus, nextAction?: string): Promise<JobOpportunity> {
    const state = await this.store.load(); const job = state.jobs.find(item => item.id === jobId); if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = status; job.nextAction = nextAction ?? job.nextAction; job.updatedAt = new Date().toISOString(); if (status === 'applied' && !job.appliedAt) { job.appliedAt = job.updatedAt; const followUp = new Date(); followUp.setDate(followUp.getDate() + 7); job.followUpAt = followUp.toISOString(); }
    await this.store.save(state); await this.store.event('job.updated', 'job', job.id, { status, nextAction, followUpAt: job.followUpAt }); return job;
  }
  async touchJob(jobId: string, note = 'Contact recorded'): Promise<JobOpportunity> {
    const state = await this.store.load(); const job = state.jobs.find(item => item.id === jobId); if (!job) throw new Error(`Job not found: ${jobId}`);
    const now = new Date(); job.lastContactAt = now.toISOString(); job.updatedAt = job.lastContactAt; const followUp = new Date(now); followUp.setDate(followUp.getDate() + 7); job.followUpAt = followUp.toISOString(); job.notes = job.notes ? `${job.notes}\n${note}` : note;
    await this.store.save(state); await this.store.event('job.contact_recorded', 'job', job.id, { note, followUpAt: job.followUpAt }); return job;
  }
  async closeJob(jobId: string, status: 'rejected' | 'closed', reason: string): Promise<JobOpportunity> {
    const state = await this.store.load(); const job = state.jobs.find(item => item.id === jobId); if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = status; job.closedReason = reason; job.nextAction = undefined; job.followUpAt = undefined; job.updatedAt = new Date().toISOString(); await this.store.save(state); await this.store.event('job.closed', 'job', job.id, { status, reason }); return job;
  }
  async careerQueue(now = new Date()): Promise<CareerQueueItem[]> { return (await this.store.load()).jobs.map(job => careerPriority(job, now)).sort((a, b) => b.priorityScore - a.priorityScore); }

  async addResearch(question: string, projectId?: string): Promise<ResearchRecord> {
    const state = await this.store.load();
    if (projectId && !state.projects.some(project => project.id === projectId)) throw new Error(`Project not found: ${projectId}`);
    const now = new Date().toISOString();
    const research: ResearchRecord = { id: `res-${randomUUID().slice(0, 8)}`, question, projectId, status: 'open', evidence: [], syntheses: [], createdAt: now, updatedAt: now };
    state.research.push(research);
    await this.store.save(state);
    await this.store.event('research.created', 'research', research.id, { question, projectId });
    if (projectId) await this.addRelation('research', research.id, 'supports', 'project', projectId);
    return research;
  }
  async listResearch(): Promise<ResearchRecord[]> { return (await this.store.load()).research; }
  async addEvidence(researchId: string, title: string, url: string, sourceType: 'primary' | 'secondary', note?: string): Promise<ResearchEvidence> {
    try { new URL(url); } catch { throw new Error(`Invalid evidence URL: ${url}`); }
    const state = await this.store.load(); const research = state.research.find(item => item.id === researchId); if (!research) throw new Error(`Research not found: ${researchId}`);
    const evidence: ResearchEvidence = { id: `evd-${randomUUID().slice(0, 8)}`, title, url, sourceType, note, capturedAt: new Date().toISOString() };
    research.evidence.push(evidence); research.updatedAt = evidence.capturedAt; await this.store.save(state); await this.store.event('research.evidence_added', 'research', research.id, { evidenceId: evidence.id, title, url, sourceType }); return evidence;
  }
  async synthesizeResearch(researchId: string, summary: string, evidenceIds: string[] = []): Promise<ResearchSynthesis> {
    const state = await this.store.load(); const research = state.research.find(item => item.id === researchId); if (!research) throw new Error(`Research not found: ${researchId}`);
    const selected = evidenceIds.length ? evidenceIds : research.evidence.map(item => item.id); const missing = selected.filter(id => !research.evidence.some(item => item.id === id)); if (missing.length) throw new Error(`Evidence not found: ${missing.join(', ')}`);
    const synthesis: ResearchSynthesis = { version: research.syntheses.length + 1, summary, evidenceIds: selected, createdAt: new Date().toISOString() };
    research.syntheses.push(synthesis); research.status = 'synthesized'; research.updatedAt = synthesis.createdAt; await this.store.save(state); await this.store.event('research.synthesized', 'research', research.id, { version: synthesis.version, evidenceIds: selected }); return synthesis;
  }
  async researchReport(researchId: string): Promise<string> {
    const research = (await this.store.load()).research.find(item => item.id === researchId); if (!research) throw new Error(`Research not found: ${researchId}`);
    const latest = research.syntheses.at(-1);
    return [`RESEARCH — ${research.question}`, `Status: ${research.status}`, `Evidence: ${research.evidence.length}`, `Synthesis versions: ${research.syntheses.length}`, '', 'Sources:', ...research.evidence.map(item => `- [${item.sourceType}] ${item.title} — ${item.url}`), '', 'Latest synthesis:', latest ? `v${latest.version}: ${latest.summary}` : 'No synthesis yet.'].join('\n');
  }

  private entityExists(state: Awaited<ReturnType<ContextStore['load']>>, type: EntityType, id: string): boolean {
    const collection = type === 'project' ? state.projects : type === 'decision' ? state.decisions : type === 'action' ? state.actions : type === 'job' ? state.jobs : state.research;
    return collection.some(item => item.id === id);
  }
  async addRelation(sourceType: EntityType, sourceId: string, type: RelationType, targetType: EntityType, targetId: string): Promise<ContextRelation> {
    const state = await this.store.load(); if (!this.entityExists(state, sourceType, sourceId)) throw new Error(`Source not found: ${sourceType}/${sourceId}`); if (!this.entityExists(state, targetType, targetId)) throw new Error(`Target not found: ${targetType}/${targetId}`);
    const duplicate = state.relations.find(r => r.sourceId === sourceId && r.type === type && r.targetId === targetId); if (duplicate) return duplicate;
    const relation: ContextRelation = { id: `rel-${randomUUID().slice(0, 8)}`, sourceType, sourceId, type, targetType, targetId, createdAt: new Date().toISOString() }; state.relations.push(relation); await this.store.save(state); await this.store.event('relation.created', 'relation', relation.id, { ...relation }); return relation;
  }
  async relatedContext(entityId: string): Promise<RelatedContext> { const relations = (await this.store.load()).relations; return { entityId, incoming: relations.filter(r => r.targetId === entityId), outgoing: relations.filter(r => r.sourceId === entityId) }; }

  async careerSitrep(): Promise<string> {
    const queue = await this.careerQueue(); const jobs = queue.map(item => item.job); const followUps = queue.filter(item => item.followUpDue);
    return ['CAREER SITREP', '', `Pipeline: ${jobs.length}`, `Applied: ${jobs.filter(job => job.status === 'applied').length}`, `Interviews: ${jobs.filter(job => job.status === 'interview').length}`, `Offers: ${jobs.filter(job => job.status === 'offer').length}`, `Follow-ups due: ${followUps.length}`, '', 'Priority queue:', ...queue.slice(0, 7).map(item => `- [${item.priorityScore}] ${item.job.company} — ${item.job.role} — ${item.job.status} — ${item.job.nextAction ?? 'No next action'} (${item.rationale.join(', ')})`)].join('\n');
  }
}
