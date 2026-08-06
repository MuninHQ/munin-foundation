import type { Dispatch, SetStateAction } from 'react';

type Section = 'Command Center' | 'Projects' | 'Career' | 'Research' | 'Runtime';
type Intelligence = {
  dailyBrief?: { headline: string; priorities: string[]; alerts: string[]; insights: string[] };
  insights?: Array<{ id: string; severity: string; title: string; reason: string; suggestedAction: string; score: number }>;
  timeline?: Array<{ id: string; title: string; kind: string; timestamp: string; entityType: string }>;
  graph?: { nodes: unknown[]; edges: unknown[] };
};
type Workspace = {
  state: { projects: any[]; actions: any[]; jobs: any[]; research: any[] };
  events: any[];
  careerQueue: any[];
  intelligence?: Intelligence;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function ExecutiveDashboard({ workspace, onNavigate, onComplete, onCreate, onSitrep }: {
  workspace?: Workspace;
  onNavigate: Dispatch<SetStateAction<Section>>;
  onComplete: (action: any) => void;
  onCreate: (kind: string) => void;
  onSitrep: () => void;
}) {
  const state = workspace?.state;
  const intelligence = workspace?.intelligence;
  const brief = intelligence?.dailyBrief;
  const openActions = state?.actions.filter(action => action.status !== 'done') ?? [];
  const followUps = workspace?.careerQueue.filter(item => item.followUpDue).length ?? 0;
  const interviews = state?.jobs.filter(job => job.status === 'interview').length ?? 0;
  const activeProjects = state?.projects.filter(project => project.status !== 'done').length ?? 0;
  const topInsights = intelligence?.insights?.slice(0, 3) ?? [];
  const timeline = intelligence?.timeline?.slice(0, 7) ?? [];
  const graph = intelligence?.graph;
  const metrics = [
    ['Ações abertas', openActions.length, openActions.filter(action => action.priority === 'P0').length ? 'prioridades críticas' : 'sob controle'],
    ['Follow-ups', followUps, followUps ? 'exigem contato' : 'nenhum vencido'],
    ['Entrevistas', interviews, interviews ? 'em andamento' : 'pipeline em construção'],
    ['Projetos ativos', activeProjects, `${graph?.edges.length ?? 0} conexões mapeadas`],
  ];

  return <div className="content executive-dashboard">
    <section className="executive-hero"><div><p className="eyebrow">DAILY COMMAND BRIEF</p><h2>{greeting()}, André.</h2><p>{brief?.headline ?? 'O Munin está pronto para organizar suas prioridades.'}</p></div><div className="brief-status"><span className="pulse" /><div><small>INTELLIGENCE</small><strong>ONLINE</strong></div></div></section>
    <section className="metrics executive-metrics">{metrics.map(([label, value, detail]) => <article key={String(label)}><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="executive-layout">
      <article className="panel today-panel"><div className="panel-head"><div><p className="eyebrow">FOCO DE HOJE</p><h3>Próximos movimentos</h3></div><span className="panel-count">{openActions.length}</span></div>{(brief?.priorities.length ? brief.priorities.slice(0, 5) : openActions.slice(0, 5).map(action => `${action.priority}: ${action.title}`)).map((priority, index) => { const action = openActions[index]; return <button className="focus-row" key={`${priority}-${index}`} onClick={() => action && onComplete(action)}><span className="focus-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{priority}</strong><small>{action ? 'Clique para concluir' : 'Prioridade recomendada pelo Munin'}</small></div><span className="focus-arrow">→</span></button>; })}{!openActions.length && !brief?.priorities.length && <p className="empty-state">Nenhuma prioridade urgente identificada.</p>}</article>
      <article className="panel insight-panel"><div className="panel-head"><div><p className="eyebrow">INTELLIGENCE</p><h3>Recomendações</h3></div><button className="text-link" onClick={() => { window.location.href = '/intelligence.html'; }}>Abrir central ↗</button></div>{topInsights.map(insight => <div className={`insight-card ${insight.severity}`} key={insight.id}><div className="insight-top"><span>{insight.severity}</span><small>{insight.score}</small></div><strong>{insight.title}</strong><p>{insight.reason}</p><em>{insight.suggestedAction}</em></div>)}{!topInsights.length && <div className="calm-state"><span>✓</span><div><strong>Nenhum alerta crítico</strong><p>O workspace está operacionalmente estável.</p></div></div>}</article>
      <article className="panel quick-panel"><div className="panel-head"><div><p className="eyebrow">EXECUTAR</p><h3>Ações rápidas</h3></div></div><div className="quick-grid"><button onClick={() => onCreate('project')}><span>＋</span>Projeto</button><button onClick={() => onCreate('job')}><span>◇</span>Vaga</button><button onClick={() => onCreate('research')}><span>⌕</span>Pesquisa</button><button onClick={() => onCreate('action')}><span>✓</span>Ação</button><button className="wide" onClick={onSitrep}><span>≡</span>Gerar SITREP</button></div></article>
      <article className="panel timeline-panel"><div className="panel-head"><div><p className="eyebrow">MEMÓRIA OPERACIONAL</p><h3>Atividade recente</h3></div></div>{(timeline.length ? timeline : workspace?.events.slice(0, 7) ?? []).map((event: any) => { const timestamp = event.timestamp ?? event.at; return <div className="timeline-row" key={event.id ?? `${event.type}-${timestamp}`}><time>{timestamp ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</time><span className="timeline-dot" /><div><strong>{event.title ?? event.type}</strong><small>{event.kind ?? event.entityType ?? 'workspace'}</small></div></div>; })}</article>
      <article className="panel domains-panel"><div className="panel-head"><div><p className="eyebrow">DOMÍNIOS</p><h3>Estado do sistema</h3></div></div>{([['Projects', activeProjects, 'projetos ativos'],['Career', state?.jobs.length ?? 0, 'oportunidades'],['Research', state?.research.length ?? 0, 'pesquisas'],['Runtime', graph?.nodes.length ?? 0, 'entidades conectadas']] as Array<[Section, number, string]>).map(([section, value, detail]) => <button className="domain-progress" key={section} onClick={() => onNavigate(section)}><div><strong>{section}</strong><small>{value} {detail}</small></div><span>↗</span></button>)}</article>
    </section>
  </div>;
}
