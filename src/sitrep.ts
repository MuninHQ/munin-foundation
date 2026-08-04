import type { MuninEvent, MuninState } from './types.js';

export function generateSitrep(state: MuninState, events: MuninEvent[], since?: Date): string {
  const recent = since ? events.filter(event => new Date(event.timestamp) > since) : events.slice(-10);
  const active = state.projects.filter(p => p.status === 'active' || p.status === 'blocked')
    .sort((a, b) => a.priority.localeCompare(b.priority));
  const blockers = active.flatMap(p => p.blockers.map(blocker => `${p.name}: ${blocker}`));
  const required = state.decisions.filter(d => d.status === 'required');
  const next = state.actions.filter(a => a.status === 'planned' || a.status === 'active')
    .sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 7);

  const lines = [
    `SITREP — ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Mudanças:',
    ...(recent.length ? recent.map(e => `- ${e.type}: ${e.entityType}/${e.entityId}`) : ['- Nenhuma mudança registrada.']),
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
    'Próximas ações:',
    ...(next.length ? next.map(a => `- [${a.priority}] ${a.id}: ${a.title}`) : ['- Nenhuma ação pendente.'])
  ];
  return lines.join('\n');
}
