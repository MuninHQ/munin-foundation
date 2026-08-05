import type { Action, MuninEvent, MuninState } from './types.js';

const priorityWeight = { P0: 300, P1: 200, P2: 100 } as const;

function actionScore(action: Action, state: MuninState): number {
  let score = priorityWeight[action.priority];
  if (action.status === 'active') score += 40;
  if (action.dueAt) {
    const hours = (new Date(action.dueAt).getTime() - Date.now()) / 3_600_000;
    if (hours <= 0) score += 80;
    else if (hours <= 24) score += 50;
    else if (hours <= 72) score += 25;
  }
  if (state.relations.some(r => r.type === 'blocks' && r.targetId === action.id)) score += 70;
  if (state.relations.some(r => r.type === 'depends_on' && r.sourceId === action.id)) score += 20;
  return score;
}

export function generateSitrep(state: MuninState, events: MuninEvent[], since?: Date): string {
  const recent = since ? events.filter(event => new Date(event.timestamp) > since) : events.slice(-10);
  const active = state.projects.filter(p => p.status === 'active' || p.status === 'blocked')
    .sort((a, b) => a.priority.localeCompare(b.priority));
  const graphBlockers = state.relations.filter(r => r.type === 'blocks');
  const blockers = [
    ...active.flatMap(p => p.blockers.map(blocker => `${p.name}: ${blocker}`)),
    ...graphBlockers.map(r => `${r.sourceType}/${r.sourceId} blocks ${r.targetType}/${r.targetId}`),
  ];
  const required = state.decisions.filter(d => d.status === 'required');
  const next = state.actions.filter(a => a.status === 'planned' || a.status === 'active')
    .map(action => ({ action, score: actionScore(action, state) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  const lines = [
    `SITREP — ${new Date().toISOString().slice(0, 10)}`,
    since ? `Janela: mudanças desde ${since.toISOString()}` : 'Janela: últimas 10 mudanças',
    '',
    'Mudanças:',
    ...(recent.length ? recent.map(e => `- ${e.timestamp} — ${e.type}: ${e.entityType}/${e.entityId}`) : ['- Nenhuma mudança registrada.']),
    '',
    'Prioridades:',
    ...(active.length ? active.map(p => `- [${p.priority}] ${p.name} — ${p.currentOutcome}`) : ['- Nenhum projeto ativo.']),
    '',
    'Bloqueios:',
    ...(blockers.length ? blockers.map(v => `- ${v}`) : ['- Nenhum bloqueio registrado.']),
    '',
    'Decisões necessárias:',
    ...(required.length ? required.map(d => `- ${d.id}: ${d.title}`) : ['- Nenhuma decisão pendente.']),
    '',
    'Próximas ações priorizadas:',
    ...(next.length ? next.map(({ action, score }) => `- [score ${score}] [${action.priority}] ${action.id}: ${action.title}`) : ['- Nenhuma ação pendente.']),
  ];
  return lines.join('\n');
}
