import { useEffect, useMemo, useState } from 'react';

type Section = 'Command Center' | 'Projects' | 'Career' | 'Research' | 'Runtime';
type Workspace = { state: { projects: any[]; actions: any[]; jobs: any[]; research: any[] }; events: any[]; careerQueue: any[] };
const nav: Section[] = ['Command Center', 'Projects', 'Career', 'Research', 'Runtime'];

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export function App() {
  const [section, setSection] = useState<Section>('Command Center');
  const [workspace, setWorkspace] = useState<Workspace>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [palette, setPalette] = useState(false);

  const load = async () => { try { setWorkspace(await request('/api/workspace')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(v => !v); }
      if (event.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const state = workspace?.state ?? { projects: [], actions: [], jobs: [], research: [] };
  const matches = useMemo(() => {
    const all = [...state.projects.map(x => x.name), ...state.jobs.map(x => `${x.company} — ${x.role}`), ...state.research.map(x => x.question)];
    return query.trim() ? all.filter(x => x.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  }, [query, state]);

  async function create(kind: 'project' | 'job' | 'research' | 'action') {
    try {
      if (kind === 'project') { const name = prompt('Nome do projeto'); if (name) await request('/api/projects', { method: 'POST', body: JSON.stringify({ name, priority: 'P1' }) }); }
      if (kind === 'job') { const company = prompt('Empresa'); const role = prompt('Posição'); if (company && role) await request('/api/jobs', { method: 'POST', body: JSON.stringify({ company, role }) }); }
      if (kind === 'research') { const question = prompt('Pergunta de pesquisa'); if (question) await request('/api/research', { method: 'POST', body: JSON.stringify({ question }) }); }
      if (kind === 'action') { const title = prompt('Ação'); if (title) await request('/api/actions', { method: 'POST', body: JSON.stringify({ title, priority: 'P1' }) }); }
      await load(); setPalette(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">ᛗ</span><div><strong>MUNIN</strong><small>Live Workspace</small></div></div><nav>{nav.map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</nav><div className="sidebar-foot"><span className="status-dot" /> {error ? 'API desconectada' : 'Dados ao vivo'}</div></aside>
    <main><header><div><p className="eyebrow">WORKSPACE LOCAL</p><h1>{section}</h1></div><div className="tools"><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar no Munin" />{matches.length > 0 && <div className="search-results">{matches.map(item => <button key={item}>{item}</button>)}</div>}</div><button className="command" onClick={() => setPalette(true)}>⌘ Comandos <kbd>Ctrl K</kbd></button></div></header>
      {error && <div className="content"><article className="panel"><strong>Não foi possível conectar à API local.</strong><p>{error}</p><p>Execute <code>npm run api</code> em outro terminal.</p></article></div>}
      {!error && section === 'Command Center' && <Dashboard workspace={workspace} onNavigate={setSection} />}
      {!error && section === 'Projects' && <TablePage title="Projetos" subtitle="Estado real persistido" onCreate={() => create('project')} headers={['Projeto','Prioridade','Status','Próxima ação']} rows={state.projects.map(p => [p.name,p.priority,p.status,p.nextAction ?? '—'])} />}
      {!error && section === 'Career' && <TablePage title="Career OS" subtitle="Pipeline real de oportunidades" onCreate={() => create('job')} headers={['Empresa','Posição','Estágio','Próxima ação']} rows={state.jobs.map(j => [j.company,j.role,j.status,j.nextAction ?? '—'])} />}
      {!error && section === 'Research' && <TablePage title="Research Engine" subtitle="Pesquisas e sínteses reais" onCreate={() => create('research')} headers={['Pesquisa','Evidências','Estado']} rows={state.research.map(r => [r.question,String(r.evidence?.length ?? 0),r.status])} />}
      {!error && section === 'Runtime' && <Runtime workspace={workspace} />}
    </main>
    {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="palette" onMouseDown={e => e.stopPropagation()}><input autoFocus placeholder="O que você quer fazer?" /><div className="palette-list"><button onClick={() => create('project')}><span>1</span>Criar novo projeto</button><button onClick={() => create('job')}><span>2</span>Registrar oportunidade</button><button onClick={() => create('research')}><span>3</span>Abrir pesquisa</button><button onClick={() => create('action')}><span>4</span>Adicionar ação</button></div></div></div>}
  </div>;
}

function Dashboard({ workspace, onNavigate }: { workspace?: Workspace; onNavigate: (s: Section) => void }) {
  const s = workspace?.state; const due = workspace?.careerQueue.filter(x => x.followUpDue).length ?? 0;
  const cards = [['Ações abertas', String(s?.actions.filter(x => x.status !== 'done').length ?? 0)], ['Follow-ups', String(due)], ['Projetos ativos', String(s?.projects.filter(x => x.status !== 'done').length ?? 0)], ['Pesquisas abertas', String(s?.research.filter(x => x.status === 'open').length ?? 0)]];
  return <div className="content"><section className="hero"><div><p className="eyebrow">VISÃO EXECUTIVA</p><h2>Boa noite, André.</h2><p>Este painel agora reflete o estado persistido do Munin.</p></div><div className="hero-orbit"><span>AJ</span></div></section><section className="metrics">{cards.map(([label,value]) => <article key={label}><small>{label}</small><strong>{value}</strong><p>Dados ao vivo</p></article>)}</section><section className="grid"><article className="panel focus"><div className="panel-head"><div><p className="eyebrow">AGORA</p><h3>Próximas ações</h3></div></div>{(s?.actions.filter(x => x.status !== 'done').slice(0,4) ?? []).map(a => <div className="task" key={a.id}><span className="priority p0">{a.priority}</span><div><strong>{a.title}</strong><small>{a.projectId ?? 'Ação independente'}</small></div><span>→</span></div>)}</article><article className="panel"><div className="panel-head"><div><p className="eyebrow">DOMÍNIOS</p><h3>Workspace</h3></div></div>{(['Projects','Career','Research','Runtime'] as Section[]).map(item => <button className="domain" key={item} onClick={() => onNavigate(item)}><span className="domain-icon">◈</span><div><strong>{item}</strong><small>Abrir visão operacional</small></div><span>↗</span></button>)}</article><article className="panel activity"><div className="panel-head"><div><p className="eyebrow">MEMÓRIA</p><h3>Atividade recente</h3></div></div>{(workspace?.events.slice(0,6) ?? []).map((event:any) => <div className="event" key={event.id ?? `${event.type}-${event.at}`}><time>{new Date(event.at ?? event.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><span /><p>{event.type}</p></div>)}</article></section></div>;
}

function TablePage({ title, subtitle, rows, headers, onCreate }: { title:string; subtitle:string; rows:string[][]; headers:string[]; onCreate:()=>void }) { return <div className="content"><section className="page-title"><div><p className="eyebrow">LIVE WORKSPACE</p><h2>{title}</h2><p>{subtitle}</p></div><button className="primary" onClick={onCreate}>+ Novo registro</button></section><article className="panel table-panel"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{j===2?<span className="badge">{cell}</span>:cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>Nenhum registro ainda.</td></tr>}</tbody></table></article></div>; }
function Runtime({ workspace }: { workspace?: Workspace }) { return <div className="content"><section className="page-title"><div><p className="eyebrow">INFRAESTRUTURA</p><h2>Runtime</h2><p>Estado local e integridade operacional.</p></div><span className="health">● HEALTHY</span></section><section className="metrics">{[['Projetos',workspace?.state.projects.length ?? 0],['Ações',workspace?.state.actions.length ?? 0],['Vagas',workspace?.state.jobs.length ?? 0],['Pesquisas',workspace?.state.research.length ?? 0]].map(([l,v]) => <article key={l}><small>{l}</small><strong>{v}</strong><p>Persistidos</p></article>)}</section></div>; }
