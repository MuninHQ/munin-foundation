import { randomUUID } from 'node:crypto';
import { ContextStore } from './store.js';
import { generateSitrep } from './sitrep.js';
import type { Action, Decision, Priority, Project } from './types.js';

export class MuninService {
  constructor(private readonly store = new ContextStore()) {}

  async sitrep(): Promise<string> { return generateSitrep(await this.store.load(), await this.store.events()); }
  async inspect(): Promise<string> { return JSON.stringify(await this.store.load(), null, 2); }
  async listProjects(): Promise<Project[]> { return (await this.store.load()).projects; }

  async addDecision(title: string, projectId?: string): Promise<Decision> {
    const state = await this.store.load();
    const decision: Decision = { id: `dec-${randomUUID().slice(0, 8)}`, title, projectId, status: 'required', createdAt: new Date().toISOString() };
    state.decisions.push(decision); await this.store.save(state); await this.store.event('decision.created', 'decision', decision.id, { title, projectId });
    return decision;
  }

  async addAction(title: string, priority: Priority = 'P1', projectId?: string): Promise<Action> {
    const state = await this.store.load(); const now = new Date().toISOString();
    const action: Action = { id: `act-${randomUUID().slice(0, 8)}`, title, priority, projectId, status: 'planned', createdAt: now, updatedAt: now };
    state.actions.push(action); await this.store.save(state); await this.store.event('action.created', 'action', action.id, { title, priority, projectId });
    return action;
  }

  async execute(actionId: string, outcome: string): Promise<Action> {
    const state = await this.store.load(); const action = state.actions.find(item => item.id === actionId);
    if (!action) throw new Error(`Action not found: ${actionId}`);
    action.status = 'done'; action.outcome = outcome; action.updatedAt = new Date().toISOString();
    const project = action.projectId ? state.projects.find(item => item.id === action.projectId) : undefined;
    if (project) { project.currentOutcome = outcome; project.updatedAt = action.updatedAt; }
    await this.store.save(state); await this.store.event('action.executed', 'action', action.id, { outcome, projectId: action.projectId });
    return action;
  }
}
