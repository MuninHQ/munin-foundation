import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Action, JobOpportunity, JobStatus, MuninState, Priority, Project, Status } from './types.js';
import { ContextStore } from './store.js';

type Row = Record<string, unknown>;
export interface LovableSnapshot { exportedAt?: string; source?: string; tables: Record<string, Row[]>; }
export interface ImportReport { source: string; counts: Record<string, number>; create: Record<string, number>; duplicates: Record<string, number>; archived: Record<string, number>; warnings: string[]; }

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();
const iso = (value: unknown) => value ? new Date(String(value)).toISOString() : new Date().toISOString();
const priority = (value: unknown): Priority => ['p0','critical','high'].includes(lower(value)) ? 'P0' : ['p2','low'].includes(lower(value)) ? 'P2' : 'P1';
const projectStatus = (value: unknown): Status => ({ in_progress:'active', active:'active', blocked:'blocked', done:'done', completed:'done', paused:'paused' } as Record<string,Status>)[lower(value)] ?? 'planned';
const jobStatus = (value: unknown): JobStatus => ({ found:'discovered', prioritized:'investigating', preparing:'investigating', applying:'investigating', applied:'applied', screening:'interview', interview:'interview', final:'interview', offer:'offer', rejected:'rejected', closed:'closed' } as Record<string,JobStatus>)[lower(value)] ?? 'discovered';

function active(rows: Row[]): Row[] { return rows.filter(row => row.is_demo !== true && row.is_test !== true); }
function projectKey(row: Row): string { return lower(row.name); }
function jobKey(row: Row): string { return `${lower(row.company_name ?? row.company)}|${lower(row.title ?? row.role)}`; }

export function previewLovableImport(snapshot: LovableSnapshot, state: MuninState): ImportReport {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.tables) throw new Error('Invalid Lovable snapshot');
  const tables = snapshot.tables;
  const projects = active(tables.projects ?? []); const actions = active(tables.actions ?? []); const jobs = active(tables.jobs ?? []); const applications = active(tables.applications ?? []);
  const existingProjects = new Set(state.projects.map(item => lower(item.name)));
  const existingJobs = new Set(state.jobs.map(item => `${lower(item.company)}|${lower(item.role)}`));
  const duplicateProjects = projects.filter(row => existingProjects.has(projectKey(row))).length;
  const duplicateJobs = jobs.filter(row => existingJobs.has(jobKey(row))).length;
  const archivedNames = ['companies','contacts','interviews','follow_ups','documents','email_messages','email_classifications','email_job_links','activities'];
  const archived = Object.fromEntries(archivedNames.map(name => [name, active(tables[name] ?? []).length]));
  const warnings: string[] = [];
  if ((tables.email_messages ?? []).length > 0) warnings.push('Email bodies are preserved only in the local legacy archive and are not committed to Git.');
  if (applications.length > jobs.length) warnings.push('Some applications may not have a matching job and will remain in the legacy archive.');
  return { source: snapshot.source ?? 'lovable-career-os', counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, active(rows).length])), create: { projects: projects.length - duplicateProjects, actions: actions.length, jobs: jobs.length - duplicateJobs }, duplicates: { projects: duplicateProjects, jobs: duplicateJobs }, archived, warnings };
}

export async function commitLovableImport(snapshot: LovableSnapshot, store = new ContextStore()): Promise<ImportReport & { archivePath: string }> {
  const state = await store.load(); const report = previewLovableImport(snapshot, state); const now = new Date().toISOString();
  const projectIds = new Map<string,string>();
  for (const existing of state.projects) projectIds.set(lower(existing.name), existing.id);
  for (const row of active(snapshot.tables.projects ?? [])) {
    const key = projectKey(row); if (projectIds.has(key)) continue;
    const project: Project = { id:`lov-prj-${String(row.id ?? crypto.randomUUID()).slice(0,8)}`, name:String(row.name ?? 'Imported project'), priority:priority(row.priority), status:projectStatus(row.status), currentOutcome:String(row.current_outcome ?? 'Imported from Lovable'), nextAction: row.next_action ? String(row.next_action) : undefined, blockers:Array.isArray(row.blockers) ? row.blockers.map(String) : [], updatedAt:iso(row.updated_at ?? now) };
    state.projects.push(project); projectIds.set(key, project.id);
  }
  const existingJobs = new Set(state.jobs.map(item => `${lower(item.company)}|${lower(item.role)}`));
  for (const row of active(snapshot.tables.jobs ?? [])) {
    const key = jobKey(row); if (existingJobs.has(key)) continue;
    const salary = row.salary_min || row.salary_max ? `${row.salary_min ?? '?'}–${row.salary_max ?? '?'}` : undefined;
    const job: JobOpportunity = { id:`lov-job-${String(row.id ?? crypto.randomUUID()).slice(0,8)}`, company:String(row.company_name ?? row.company ?? 'Unknown'), role:String(row.title ?? row.role ?? 'Unknown'), source:row.source ? String(row.source) : undefined, link:row.url ? String(row.url) : undefined, status:jobStatus(row.status), fitScore:Number(row.fit_score ?? 50), matchedSignals:Array.isArray(row.matched_signals) ? row.matched_signals.map(String) : Array.isArray(row.strengths) ? row.strengths.map(String) : [], salaryRange:salary, currency:row.currency ? String(row.currency) : undefined, recruiter:row.recruiter ? String(row.recruiter) : undefined, hiringManager:row.hiring_manager ? String(row.hiring_manager) : undefined, nextAction:row.next_action ? String(row.next_action) : undefined, followUpAt:row.follow_up_at ? iso(row.follow_up_at) : undefined, appliedAt:row.applied_at ? iso(row.applied_at) : undefined, notes:[row.notes,row.description].filter(Boolean).map(String).join('\n\n') || undefined, createdAt:iso(row.created_at ?? row.captured_at ?? now), updatedAt:iso(row.updated_at ?? row.last_seen_at ?? now) };
    state.jobs.push(job); existingJobs.add(key);
  }
  for (const row of active(snapshot.tables.actions ?? [])) {
    const title = String(row.title ?? 'Imported action'); if (state.actions.some(item => lower(item.title) === lower(title))) continue;
    const action: Action = { id:`lov-act-${String(row.id ?? crypto.randomUUID()).slice(0,8)}`, title, projectId: row.project_id ? projectIds.get(lower((snapshot.tables.projects ?? []).find(p => p.id === row.project_id)?.name)) : undefined, priority:priority(row.priority), status:projectStatus(row.status), dueAt:row.due_at ? iso(row.due_at) : undefined, outcome:row.outcome ? String(row.outcome) : undefined, createdAt:iso(row.created_at ?? now), updatedAt:iso(row.updated_at ?? now) };
    state.actions.push(action);
  }
  await store.save(state); await store.event('import.lovable.completed','system','lovable-career-os',{ create:report.create, duplicates:report.duplicates, archived:report.archived });
  const root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime'); const archiveDir = path.join(root,'imports'); await mkdir(archiveDir,{recursive:true});
  const archivePath = path.join(archiveDir,`lovable-${Date.now()}.json`); await writeFile(archivePath,JSON.stringify(snapshot,null,2)+'\n','utf8');
  return { ...report, archivePath };
}
