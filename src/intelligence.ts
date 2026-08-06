import type { EntityType, MuninEvent, MuninState } from './types.js';

export interface TimelineItem { id: string; entityType: EntityType | 'system'; entityId: string; title: string; kind: string; timestamp: string; }
export interface KnowledgeNode { id: string; type: EntityType; label: string; }
export interface KnowledgeEdge { source: string; target: string; type: string; inferred: boolean; }
export interface KnowledgeGraph { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; }
export interface ContextMatch { entityType: EntityType; entityId: string; label: string; score: number; reasons: string[]; }
export interface DailyBrief { generatedAt: string; headline: string; priorities: string[]; alerts: string[]; insights: string[]; }
export type InsightKind = 'career' | 'project' | 'research' | 'focus';
export interface InsightRecommendation { id: string; kind: InsightKind; severity: 'info' | 'attention' | 'critical'; title: string; rationale: string; suggestedAction: string; entityType?: EntityType; entityId?: string; score: number; }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const daysSince = (value: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000));

function entityLabel(state: MuninState, type: EntityType, id: string): string {
  if (type === 'project') return state.projects.find(x => x.id === id)?.name ?? id;
  if (type === 'action') return state.actions.find(x => x.id === id)?.title ?? id;
  if (type === 'job') { const job = state.jobs.find(x => x.id === id); return job ? `${job.company} — ${job.role}` : id; }
  if (type === 'research') return state.research.find(x => x.id === id)?.question ?? id;
  return state.decisions.find(x => x.id === id)?.title ?? id;
}

export function buildTimeline(state: MuninState, events: MuninEvent[], limit = 100): TimelineItem[] {
  return events.map(event => ({ id: event.id, entityType: event.entityType === 'relation' ? 'system' : event.entityType, entityId: event.entityId, title: event.entityType === 'relation' || event.entityType === 'system' ? event.type : entityLabel(state, event.entityType, event.entityId), kind: event.type, timestamp: event.timestamp })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

export function buildKnowledgeGraph(state: MuninState): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [
    ...state.projects.map(x => ({ id: x.id, type: 'project' as const, label: x.name })),
    ...state.actions.map(x => ({ id: x.id, type: 'action' as const, label: x.title })),
    ...state.jobs.map(x => ({ id: x.id, type: 'job' as const, label: `${x.company} — ${x.role}` })),
    ...state.research.map(x => ({ id: x.id, type: 'research' as const, label: x.question })),
    ...state.decisions.map(x => ({ id: x.id, type: 'decision' as const, label: x.title })),
  ];
  const edges: KnowledgeEdge[] = state.relations.map(x => ({ source: x.sourceId, target: x.targetId, type: x.type, inferred: false }));
  for (const action of state.actions) if (action.projectId) edges.push({ source: action.id, target: action.projectId, type: 'belongs_to', inferred: true });
  for (const research of state.research) if (research.projectId && !edges.some(x => x.source === research.id && x.target === research.projectId)) edges.push({ source: research.id, target: research.projectId, type: 'supports', inferred: true });
  return { nodes, edges };
}

export function resolveContext(state: MuninState, query: string): ContextMatch[] {
  const terms = normalize(query).split(/\s+/).filter(x => x.length > 2);
  return buildKnowledgeGraph(state).nodes.map(node => {
    const label = normalize(node.label); const matched = terms.filter(term => label.includes(term)); const exact = terms.length > 0 && matched.length === terms.length; const score = matched.length * 20 + (exact ? 40 : 0);
    return { entityType: node.type, entityId: node.id, label: node.label, score, reasons: matched.map(x => `matched: ${x}`) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 10);
}

export function generateInsights(state: MuninState, now = new Date()): InsightRecommendation[] {
  const insights: InsightRecommendation[] = [];
  for (const job of state.jobs) {
    const terminal = ['rejected', 'closed'].includes(job.status);
    if (!terminal && job.followUpAt && new Date(job.followUpAt) <= now) insights.push({ id: `followup-${job.id}`, kind: 'career', severity: job.status === 'interview' ? 'critical' : 'attention', title: `Follow-up pendente com ${job.company}`, rationale: `${job.role} está em ${job.status} e o follow-up venceu.`, suggestedAction: job.nextAction ?? 'Registrar contato e reagendar follow-up.', entityType: 'job', entityId: job.id, score: job.status === 'interview' ? 100 : 85 });
    if (!terminal && job.fitScore >= 85 && job.status === 'discovered') insights.push({ id: `high-fit-${job.id}`, kind: 'career', severity: 'attention', title: `Oportunidade de alta aderência ainda não avançou`, rationale: `${job.company} — ${job.role} tem fit de ${job.fitScore}%.`, suggestedAction: 'Investigar a vaga e preparar candidatura direcionada.', entityType: 'job', entityId: job.id, score: 80 + Math.floor(job.fitScore / 10) });
  }
  for (const project of state.projects) {
    const age = daysSince(project.updatedAt, now);
    if (project.status !== 'done' && age >= 5) insights.push({ id: `stale-${project.id}`, kind: 'project', severity: age >= 14 ? 'critical' : 'attention', title: `Projeto parado: ${project.name}`, rationale: `Sem atualização há ${age} dias.`, suggestedAction: project.nextAction ?? 'Definir a próxima ação concreta.', entityType: 'project', entityId: project.id, score: Math.min(100, 55 + age * 3) });
    if (project.status === 'blocked') insights.push({ id: `blocked-${project.id}`, kind: 'project', severity: 'critical', title: `Projeto bloqueado: ${project.name}`, rationale: project.blockers.length ? project.blockers.join('; ') : 'O projeto está marcado como bloqueado sem causa registrada.', suggestedAction: 'Registrar o bloqueio principal e uma ação de desbloqueio.', entityType: 'project', entityId: project.id, score: 95 });
  }
  for (const research of state.research) {
    if (research.status === 'open' && research.evidence.length >= 2) insights.push({ id: `synthesis-${research.id}`, kind: 'research', severity: 'attention', title: 'Pesquisa pronta para síntese', rationale: `${research.question} já possui ${research.evidence.length} evidências.`, suggestedAction: 'Produzir uma síntese e avaliar reutilização em post ou whitepaper.', entityType: 'research', entityId: research.id, score: Math.min(90, 60 + research.evidence.length * 5) });
    if (research.status === 'synthesized' && research.syntheses.length > 0) insights.push({ id: `reuse-${research.id}`, kind: 'research', severity: 'info', title: 'Conhecimento pronto para reutilização', rationale: `${research.question} possui síntese v${research.syntheses.at(-1)?.version}.`, suggestedAction: 'Transformar a síntese em conteúdo, decisão ou ação vinculada.', entityType: 'research', entityId: research.id, score: 55 });
  }
  const openP0 = state.actions.filter(x => x.status !== 'done' && x.priority === 'P0');
  if (openP0.length >= 3) insights.push({ id: 'focus-p0-overload', kind: 'focus', severity: 'critical', title: 'Excesso de prioridades críticas', rationale: `${openP0.length} ações P0 estão abertas simultaneamente.`, suggestedAction: 'Escolher no máximo duas prioridades P0 para hoje e rebaixar ou pausar as demais.', score: 98 });
  return insights.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function generateDailyBrief(state: MuninState, now = new Date()): DailyBrief {
  const activeActions = state.actions.filter(x => x.status !== 'done');
  const dueFollowUps = state.jobs.filter(x => x.followUpAt && new Date(x.followUpAt) <= now && !['rejected', 'closed'].includes(x.status));
  const interviews = state.jobs.filter(x => x.status === 'interview');
  const staleProjects = state.projects.filter(x => x.status !== 'done' && now.getTime() - new Date(x.updatedAt).getTime() >= 3 * 86_400_000);
  const unsynthesized = state.research.filter(x => x.status === 'open' && x.evidence.length > 0);
  const priorities = [...dueFollowUps.map(x => `Follow-up: ${x.company} — ${x.role}`), ...interviews.map(x => `Entrevista ativa: ${x.company} — ${x.role}`), ...activeActions.sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 5).map(x => `${x.priority}: ${x.title}`)].slice(0, 7);
  const alerts = [...staleProjects.map(x => `Projeto sem atualização há 3+ dias: ${x.name}`), ...unsynthesized.map(x => `Pesquisa com evidências aguardando síntese: ${x.question}`)];
  const topInsights = generateInsights(state, now).slice(0, 3).map(x => `${x.title}: ${x.suggestedAction}`);
  const insights = [state.jobs.length ? `${state.jobs.length} oportunidades no pipeline; ${interviews.length} em entrevista.` : 'Pipeline profissional ainda vazio.', state.research.length ? `${state.research.filter(x => x.status === 'synthesized').length} de ${state.research.length} pesquisas sintetizadas.` : 'Nenhuma pesquisa registrada.', activeActions.length ? `${activeActions.length} ações abertas; ${activeActions.filter(x => x.priority === 'P0').length} são P0.` : 'Nenhuma ação aberta.', ...topInsights];
  return { generatedAt: now.toISOString(), headline: priorities.length ? `${priorities.length} movimentos merecem atenção hoje.` : 'Nenhuma urgência operacional identificada.', priorities, alerts, insights };
}
