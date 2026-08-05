import { useEffect, useMemo, useState } from 'react';

type Section = 'Command Center' | 'Projects' | 'Career' | 'Research' | 'Runtime';

const nav: Section[] = ['Command Center', 'Projects', 'Career', 'Research', 'Runtime'];
const cards = [
  { label: 'Ações prioritárias', value: '3', detail: '2 vencem hoje' },
  { label: 'Follow-ups', value: '2', detail: '1 crítico' },
  { label: 'Projetos ativos', value: '7', detail: '1 bloqueado' },
  { label: 'Pesquisas abertas', value: '4', detail: '2 sem síntese' },
];

const projects = [
  ['AIP / Munin', 'P0', 'Em andamento', 'Concluir Web Shell'],
  ['Reposicionamento executivo', 'P0', 'Em andamento', 'Publicar próximo artigo'],
  ['Radar de vagas', 'P1', 'Em andamento', 'Revisar oportunidades aderentes'],
];

const careers = [
  ['B3', 'Digital Assets', 'Entrevista', 'Preparar narrativa estratégica'],
  ['Mastercard', 'Open Finance', 'Follow-up', 'Contato com recrutadora'],
  ['Remote', 'Product', 'Aplicado', 'Aguardar retorno'],
];

const research = [
  ['Drex e infraestrutura financeira', '3 fontes', 'Síntese v2'],
  ['IA aplicada a serviços financeiros', '5 fontes', 'Em aberto'],
  ['Identidade digital', '2 fontes', 'Síntese v1'],
];

export function App() {
  const [section, setSection] = useState<Section>('Command Center');
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette(value => !value);
      }
      if (event.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const all = [...projects.map(row => row[0]), ...careers.map(row => `${row[0]} — ${row[1]}`), ...research.map(row => row[0])];
    return all.filter(item => item.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  }, [query]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">ᛗ</span><div><strong>MUNIN</strong><small>Intelligence Workspace</small></div></div>
        <nav>{nav.map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</nav>
        <div className="sidebar-foot"><span className="status-dot" /> Runtime operacional</div>
      </aside>

      <main>
        <header>
          <div><p className="eyebrow">Quarta-feira, 5 de agosto</p><h1>{section}</h1></div>
          <div className="tools">
            <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar no Munin" />{matches.length > 0 && <div className="search-results">{matches.map(item => <button key={item}>{item}</button>)}</div>}</div>
            <button className="command" onClick={() => setPalette(true)}>⌘ Comandos <kbd>Ctrl K</kbd></button>
          </div>
        </header>

        {section === 'Command Center' && <Dashboard onNavigate={setSection} />}
        {section === 'Projects' && <TablePage title="Projetos" subtitle="Prioridades, status e próximos movimentos" rows={projects} headers={['Projeto', 'Prioridade', 'Status', 'Próxima ação']} />}
        {section === 'Career' && <TablePage title="Career OS" subtitle="Pipeline de oportunidades e relacionamentos" rows={careers} headers={['Empresa', 'Posição', 'Estágio', 'Próxima ação']} />}
        {section === 'Research' && <TablePage title="Research Engine" subtitle="Perguntas, evidências e sínteses versionadas" rows={research} headers={['Pesquisa', 'Evidências', 'Estado']} />}
        {section === 'Runtime' && <Runtime />}
      </main>

      {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="palette" onMouseDown={e => e.stopPropagation()}><input autoFocus placeholder="O que você quer fazer?" /><div className="palette-list">{['Gerar SITREP', 'Criar novo projeto', 'Registrar oportunidade', 'Abrir pesquisa', 'Ver ações prioritárias'].map((item, index) => <button key={item}><span>{index + 1}</span>{item}</button>)}</div></div></div>}
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (section: Section) => void }) {
  return <div className="content">
    <section className="hero"><div><p className="eyebrow">VISÃO EXECUTIVA</p><h2>Boa noite, André.</h2><p>O sistema está estável. Há quatro movimentos que merecem sua atenção agora.</p></div><div className="hero-orbit"><span>AJ</span></div></section>
    <section className="metrics">{cards.map(card => <article key={card.label}><small>{card.label}</small><strong>{card.value}</strong><p>{card.detail}</p></article>)}</section>
    <section className="grid">
      <article className="panel focus"><div className="panel-head"><div><p className="eyebrow">AGORA</p><h3>Prioridades</h3></div><button>Ver todas</button></div>{['Preparar conversa com B3', 'Validar primeira versão visual do Munin', 'Publicar próximo conteúdo executivo'].map((item, i) => <div className="task" key={item}><span className={`priority p${i}`}>P{i === 2 ? 1 : 0}</span><div><strong>{item}</strong><small>{i === 0 ? 'Career OS' : i === 1 ? 'Munin' : 'LinkedIn'}</small></div><span>→</span></div>)}</article>
      <article className="panel"><div className="panel-head"><div><p className="eyebrow">DOMÍNIOS</p><h3>Workspace</h3></div></div>{(['Projects', 'Career', 'Research', 'Runtime'] as Section[]).map((item, i) => <button className="domain" key={item} onClick={() => onNavigate(item)}><span className="domain-icon">{['◈','◎','⌁','◇'][i]}</span><div><strong>{item}</strong><small>{['7 ativos · 1 bloqueado','3 oportunidades em foco','4 pesquisas abertas','Health estável'][i]}</small></div><span>↗</span></button>)}</article>
      <article className="panel activity"><div className="panel-head"><div><p className="eyebrow">MEMÓRIA</p><h3>Atividade recente</h3></div></div>{[['18:34','Alert exporters integrados'],['18:18','Outbox health atualizado'],['17:42','Web Shell priorizado'],['16:55','Research Engine sincronizado']].map(row => <div className="event" key={row[0]}><time>{row[0]}</time><span /><p>{row[1]}</p></div>)}</article>
    </section>
  </div>;
}

function TablePage({ title, subtitle, rows, headers }: { title: string; subtitle: string; rows: string[][]; headers: string[] }) {
  return <div className="content"><section className="page-title"><div><p className="eyebrow">WORKSPACE</p><h2>{title}</h2><p>{subtitle}</p></div><button className="primary">+ Novo registro</button></section><article className="panel table-panel"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === 2 ? <span className="badge">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></article></div>;
}

function Runtime() {
  return <div className="content"><section className="page-title"><div><p className="eyebrow">INFRAESTRUTURA</p><h2>Runtime</h2><p>Execução, filas, providers e integridade operacional.</p></div><span className="health">● HEALTHY</span></section><section className="metrics">{[['Planos','12'],['Tarefas concluídas','48'],['Outbox pendente','0'],['Dead letters','0']].map(([label,value]) => <article key={label}><small>{label}</small><strong>{value}</strong><p>Estado atual</p></article>)}</section><article className="panel runtime-flow"><h3>Execution Pipeline</h3><div><span>Objective</span><b>→</b><span>Planner</span><b>→</b><span>Policy</span><b>→</b><span>Provider</span><b>→</b><span>Review</span><b>→</b><span>Memory</span></div></article></div>;
}
