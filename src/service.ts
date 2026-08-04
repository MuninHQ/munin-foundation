import { randomUUID } from 'node:crypto';
import { ContextStore } from './store.js';
import { generateSitrep } from './sitrep.js';
import type { Action, Decision, Priority, Project, Status } from './types.js';

export class MuninService {
  constructor(private readonly store = new ContextStore()) {}

  async sitrep(): Promise<string> {
    return generateSitrep(await this.store.load(), await this.store.events());
  }

  async inspect(): Promise<string> {
    return JSON.stringify(await this.store.load(), null, 2);
  }

  async exportContext(): Promise<string> {
    const state = await this.store.load();
    const events = await this.store.events();
    return JSON.stringify({ exportedAt: new Date().toISOString(), state, events }, null, 2);
  }

  async listProjects(): Promise<Project[]> {
    return (await this.store.load()).projects;
  }

  async addProject(name: string, priority: Priority = 'P1'): Promise<Project> {
    const state = await this.store.load();
    const now = new Date().toISOString();
    const project: Project = {
      id: `prj-${randomUUID().slice(0, 8)}`,
      name,
      priority,
      status: 'planned',
      currentOutcome: 'Project created',
      blockers: [],
      updatedAt: now,
    };
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
    const decision: Decision = {
      id: `dec-${randomUUID().slice(0, 8)}`,
      title,
      projectId,
      status: 'required',
      createdAt: new Date().toISOString(),
    };
    state.decisions.push(decision);
    await this.store.save(state);
    await this.store.event('decision.created', 'decision', decision.id, { title, projectId });
    return decision;
  }

  async resolveDecision(
    decisionId: string,
    status: 'accepted' | 'rejected',
    rationale?: string,
  ): Promise<Decision> {
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
    const action: Action = {
      id: `act-${randomUUID().slice(0, 8)}`,
      title,
      priority,
      projectId,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
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
    const project = action.projectId
      ? state.projects.find(item => item.id === action.projectId)
      : undefined;
    if (project) {
      project.currentOutcome = outcome;
      project.updatedAt = action.updatedAt;
    }
    await this.store.save(state);
    await this.store.event('action.executed', 'action', action.id, {
      outcome,
      projectId: action.projectId,
    });
    return action;
  }
}
