import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config.js';
import { MemoryLedger, type MemoryLedgerKind } from './memory-ledger.js';
import { writeJsonAtomic } from './storage.js';
import { randomUUID } from 'node:crypto';
import type { MuninEvent, MuninState } from './types.js';

const emptyState: MuninState = { projects: [], decisions: [], actions: [], jobs: [], research: [], goals: [], relations: [] };

function ledgerKind(type:string):MemoryLedgerKind|undefined {
 if(type.startsWith('decision.'))return 'decision';
 if(type.startsWith('action.'))return 'action';
 if(type.startsWith('project.')||type.startsWith('goal.')||type.startsWith('job.')||type.startsWith('research.'))return 'observation';
 return undefined;
}
function textValue(payload:Record<string,unknown>,...keys:string[]):string|undefined { for(const key of keys){const value=payload[key];if(typeof value==='string'&&value.trim())return value.trim();}return undefined; }
function eventSummary(type:string,entityId:string,payload:Record<string,unknown>):string {
 const label=textValue(payload,'title','name','role','question','outcome','status','reason');
 const company=textValue(payload,'company');
 return [type,label,company].filter(Boolean).join(' — ')||`${type} — ${entityId}`;
}
function eventProjectId(entityType:MuninEvent['entityType'],entityId:string,payload:Record<string,unknown>):string|undefined {
 const projectId=textValue(payload,'projectId');
 if(projectId)return projectId;
 if(entityType==='project')return entityId;
 if(entityType==='job')return 'career';
 return undefined;
}

export class ContextStore {
  constructor(private readonly root = dataDir()) {}
  private statePath(): string { return path.join(this.root, 'state.json'); }
  private eventsPath(): string { return path.join(this.root, 'events.jsonl'); }
  async ensure(): Promise<void> { await mkdir(this.root, { recursive: true }); try { await readFile(this.statePath(), 'utf8'); } catch { await writeJsonAtomic(this.statePath(), emptyState); } }
  async load(): Promise<MuninState> {
    await this.ensure(); const state = JSON.parse(await readFile(this.statePath(), 'utf8')) as Partial<MuninState>;
    return { projects: state.projects ?? [], decisions: state.decisions ?? [], actions: state.actions ?? [], jobs: state.jobs ?? [], research: state.research ?? [], goals: state.goals ?? [], relations: state.relations ?? [] };
  }
  async save(state: MuninState): Promise<void> { await this.ensure(); await writeJsonAtomic(this.statePath(), state); }
  async event(type: string, entityType: MuninEvent['entityType'], entityId: string, payload: Record<string, unknown> = {}): Promise<MuninEvent> {
    await this.ensure(); const event: MuninEvent = { id: randomUUID(), type, entityType, entityId, timestamp: new Date().toISOString(), payload }; await appendFile(this.eventsPath(), JSON.stringify(event) + '\n', 'utf8');
    const kind=ledgerKind(type);if(kind){const projectId=eventProjectId(entityType,entityId,payload);await new MemoryLedger(this.root).append({kind,scope:projectId?'project':'local',source:`event:${type}`,summary:eventSummary(type,entityId,payload),projectId,entityId,occurredAt:event.timestamp,payload:{eventId:event.id,eventType:type,entityType,...payload}});}
    return event;
  }
  async events(): Promise<MuninEvent[]> { await this.ensure(); try { const raw = await readFile(this.eventsPath(), 'utf8'); return raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as MuninEvent); } catch { return []; } }
}
