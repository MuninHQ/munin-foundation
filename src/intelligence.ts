import type { EntityType, MuninEvent, MuninState } from './types.js';

export interface TimelineItem { id: string; entityType: EntityType | 'system'; entityId: string; title: string; kind: string; timestamp: string; }
export interface KnowledgeNode { id: string; type: EntityType; label: string; }
export interface KnowledgeEdge { source: string; target: string; type: string; inferred: boolean; }
export interface KnowledgeGraph { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; }
export interface ContextMatch { entityType: EntityType; entityId: string; label: string; score: number; reasons: string[]; }
export interface DailyBrief { generatedAt: string; headline: string; priorities: string[]; alerts: string[]; insights: string[]; }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function entityLabel(state: MuninState, type: EntityType, id: string): string {
  if (type === 'project') return state.projects.find(x => x.id === id)?.name ?? id;
  if (type === 'action') return state.actions.find(x => x.id === id)?.title ?? id;
  if (type === 'job') { const job = state.jobs.find(x => x.id === id); return job ? `${job.company} — ${job.role}` : id; }
  if (type === 'research') return state.research.find(x => x.id === id)?.question ?? id;
  return state.decisions.find(x => x.id === id)?.title ?? id;
}

export function buildTimeline(state: MuninState, events: MuninEvent[], limit = 100): TimelineItem[] {
  return events.map(event => ({
    id: event.id,
    entityType: event.entityType === 'relation' ? 'system' : event.entityType,
    entityId: event.entityId,
    title: event.entityType === 'relation' || event.entityType === 'system' ? event.type : entityLabel(state, event.entityType, event.entityId),
    kind: event.type,
    timestamp: event.timestamp,
  })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
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
  const candidates = buildKnowledgeGraph(state).nodes;
  return candidates.map(node => {
    const label = normalize(node.label);
    const matched = terms.filter(term => label.includes(term));
    const exact = terms.length > 0 && matched.length === terms.length;
    const score = matched.length * 20 + (exact ? 40 : 0);
    return { entityType: node.type, entityId: node.id, label: node.label, score, reasons: matched.map(x => `matched: ${x}`) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 10);
}

export function generateDailyBrief(state: MuninState, now = new Date()): DailyBrief {
  const activeActions = state.actions.filter(x => x.status !== 'done');
  const dueFollowUps = state.jobs.filter(x => x.followUpAt && new Date(x.followUpAt) <= now && !['rejected', 'closed'].includes(x.status));
  const interviews = state.jobs.filter(x => x.status === 'interview');
  const staleProjects = state.projects.filter(x => x.status !== 'done' && now.getTime() - new Date(x.updatedAt).getTime() >= 3 * 86_400_000);
  const unsynthesized = state.research.filter(x => x.status === 'open' && x.evidence.length > 0);
  const priorities = [
    ...dueFollowUps.map(x => `Follow-up: ${x.company} — ${x.role}`),
    ...interviews.map(x => `Entrevista ativa: ${x.company} — ${x.role}`),
    ...activeActions.sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 5).map(x => `${x.priority}: ${x.title}`),
  ].slice(0, 7);
  const alerts = [
    ...staleProjects.map(x => `Projeto sem atualização há 3+ dias: ${x.name}`),
    ...unsynthesized.map(x => `Pesquisa com evidências aguardando síntese: ${x.question}`),
  ];
  const insights = [
    state.jobs.length ? `${state.jobs.length} oportunidades no pipeline; ${interviews.length} em entrevista.` : 'Pipeline profissional ainda vazio.',
    state.research.length ? `${state.research.filter(x => x.status === 'synthesized').length} de ${state.research.length} pesquisas sintetizadas.` : 'Nenhuma pesquisa registrada.',
    activeActions.length ? `${activeActions.length} ações abertas; ${activeActions.filter(x => x.priority === 'P0').length} são P0.` : 'Nenhuma ação aberta.',
  ];
  return { generatedAt: now.toISOString(), headline: priorities.length ? `${priorities.length} movimentos merecem atenção hoje.` : 'Nenhuma urgência operacional identificada.', priorities, alerts, insights };
}
