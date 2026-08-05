import { useEffect, useMemo, useState } from 'react';

type Section = 'Command Center' | 'Projects' | 'Career' | 'Research' | 'Runtime';
type Workspace = { state: { projects: any[]; actions: any[]; jobs: any[]; research: any[] }; events: any[]; careerQueue: any[] };
type Editor = { kind: string; item?: any } | null;
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
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [palette, setPalette] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [sitrep, setSitrep] = useState('');

  const load = async () => { try { setWorkspace(await request('/api/workspace')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(v => !v); }
      if (event.key === 'Escape') { setPalette(false); setEditor(null); setSitrep(''); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const state = workspace?.state ?? { projects: [], actions: [], jobs: [], research: [] };
  const matches = useMemo(() => {
    const all = [...state.projects.map(x => x.name), ...state.jobs.map(x => `${x.company} — ${x.role}`), ...state.research.map(x => x.question)];
    return query.trim() ? all.filter(x => x.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  }, [query, state]);

  async function mutate(path: string, method: string, payload: Record<string, unknown>, success: string) {
    try { await request(path, { method, body: JSON.stringify(payload) }); await load(); setEditor(null); setPalette(false); setNotice(success); setTimeout(() => setNotice(''), 2500); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function generateSitrep() { try { const data = await request('/api/sitrep'); setSitrep(data.report); setPalette(false); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } }

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">ᛗ</span><div><strong>MUNIN</strong><small>Interactive Workspace</small></div></div><nav>{nav.map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</nav><div className="sidebar-foot"><span className="status-dot" /> {error ? 'API desconectada' : 'Dados ao vivo'}</div></aside>
    <main><header><div><p className="eyebrow">WORKSPACE LOCAL</p><h1>{section}</h1></div><div className="tools"><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar no Munin" />{matches.length > 0 && <div className="search-results">{matches.map(item => <button key={item}>{item}</button>)}</div>}</div><button className="command" onClick={() => setPalette(true)}>⌘ Comandos <kbd>Ctrl K</kbd></button></div></header>
      {notice && <div className="toast">{notice}</div>}
      {error && <div className="content"><article className="panel"><strong>Não foi possível concluir a operação.</strong><p>{error}</p><button className="secondary" onClick={() => setError('')}>Fechar</button></article></div>}
      {!error && section === 'Command Center' && <Dashboard workspace={workspace} onNavigate={setSection} onComplete={a => setEditor({ kind: 'complete-action', item: a })} />}
      {!error && section === 'Projects' && <EntityPage title="Projetos" subtitle="Prioridade, estado e próximos movimentos" onCreate={() => setEditor({kind:'project'})}><table><thead><tr><th>Projeto</th><th>Prioridade</th><th>Status</th><th>Próxima ação</th><th /></tr></thead><tbody>{state.projects.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.priority}</td><td><span className="badge">{p.status}</span></td><td>{p.nextAction ?? '—'}</td><td><button className="row-action" onClick={() => setEditor({kind:'edit-project',item:p})}>Editar</button></td></tr>)}</tbody></table></EntityPage>}
      {!error && section === 'Career' && <EntityPage title="Career OS" subtitle="Pipeline, follow-ups e contatos" onCreate={() => setEditor({kind:'job'})}><table><thead><tr><th>Empresa</th><th>Posição</th><th>Estágio</th><th>Próxima ação</th><th /></tr></thead><tbody>{state.jobs.map(j => <tr key={j.id}><td>{j.company}</td><td>{j.role}</td><td><span className="badge">{j.status}</span></td><td>{j.nextAction ?? '—'}</td><td className="actions"><button className="row-action" onClick={() => setEditor({kind:'edit-job',item:j})}>Editar</button><button className="row-action" onClick={() => setEditor({kind:'touch-job',item:j})}>Contato</button></td></tr>)}</tbody></table></EntityPage>}
      {!error && section === 'Research' && <EntityPage title="Research Engine" subtitle="Evidências e sínteses versionadas" onCreate={() => setEditor({kind:'research'})}><table><thead><tr><th>Pesquisa</th><th>Evidências</th><th>Status</th><th /></tr></thead><tbody>{state.research.map(r => <tr key={r.id}><td>{r.question}</td><td>{r.evidence?.length ?? 0}</td><td><span className="badge">{r.status}</span></td><td className="actions"><button className="row-action" onClick={() => setEditor({kind:'evidence',item:r})}>+ Fonte</button><button className="row-action" onClick={() => setEditor({kind:'synthesis',item:r})}>Síntese</button></td></tr>)}</tbody></table></EntityPage>}
      {!error && section === 'Runtime' && <Runtime workspace={workspace} />}
    </main>
    {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="palette" onMouseDown={e => e.stopPropagation()}><input autoFocus placeholder="O que você quer fazer?" /><div className="palette-list"><button onClick={() => {setPalette(false);setEditor({kind:'project'});}}><span>1</span>Criar novo projeto</button><button onClick={() => {setPalette(false);setEditor({kind:'job'});}}><span>2</span>Registrar oportunidade</button><button onClick={() => {setPalette(false);setEditor({kind:'research'});}}><span>3</span>Abrir pesquisa</button><button onClick={() => {setPalette(false);setEditor({kind:'action'});}}><span>4</span>Adicionar ação</button><button onClick={() => void generateSitrep()}><span>5</span>Gerar SITREP</button></div></div></div>}
    {editor && <EditorModal editor={editor} projects={state.projects} onClose={() => setEditor(null)} onSubmit={mutate} />}
    {sitrep && <div className="overlay" onMouseDown={() => setSitrep('')}><article className="report-modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h3>SITREP</h3><button onClick={() => setSitrep('')}>×</button></div><pre>{sitrep}</pre></article></div>}
  </div>;
}

function EditorModal({ editor, projects, onClose, onSubmit }: { editor: NonNullable<Editor>; projects:any[]; onClose:()=>void; onSubmit:(path:string,method:string,payload:Record<string,unknown>,success:string)=>Promise<void> }) {
  const [form, setForm] = useState<Record<string,string>>({ priority:'P1', status: editor.item?.status ?? 'planned', sourceType:'secondary', nextAction:editor.item?.nextAction ?? '' });
  const set = (key:string,value:string) => setForm(v => ({...v,[key]:value}));
  const config:any = {
    project:{title:'Novo projeto',fields:[['name','Nome','text'],['priority','Prioridade','priority']],submit:()=>onSubmit('/api/projects','POST',form,'Projeto criado')},
    job:{title:'Nova oportunidade',fields:[['company','Empresa','text'],['role','Posição','text'],['description','Descrição','textarea']],submit:()=>onSubmit('/api/jobs','POST',form,'Oportunidade criada')},
    research:{title:'Nova pesquisa',fields:[['question','Pergunta','textarea'],['projectId','Projeto relacionado','project']],submit:()=>onSubmit('/api/research','POST',form,'Pesquisa criada')},
    action:{title:'Nova ação',fields:[['title','Título','text'],['priority','Prioridade','priority'],['projectId','Projeto relacionado','project']],submit:()=>onSubmit('/api/actions','POST',form,'Ação criada')},
    'edit-project':{title:`Editar ${editor.item.name}`,fields:[['status','Status','projectStatus'],['nextAction','Próxima ação','text']],submit:()=>onSubmit(`/api/projects/${editor.item.id}`,'PATCH',form,'Projeto atualizado')},
    'edit-job':{title:`Atualizar ${editor.item.company}`,fields:[['status','Estágio','jobStatus'],['nextAction','Próxima ação','text']],submit:()=>onSubmit(`/api/jobs/${editor.item.id}`,'PATCH',form,'Oportunidade atualizada')},
    'touch-job':{title:`Registrar contato — ${editor.item.company}`,fields:[['note','Nota do contato','textarea']],submit:()=>onSubmit(`/api/jobs/${editor.item.id}/touch`,'POST',form,'Contato registrado')},
    'complete-action':{title:`Concluir ação`,fields:[['outcome','Resultado','textarea']],submit:()=>onSubmit(`/api/actions/${editor.item.id}/complete`,'POST',form,'Ação concluída')},
    evidence:{title:`Adicionar evidência`,fields:[['title','Título','text'],['url','URL','text'],['sourceType','Tipo','sourceType'],['note','Nota','textarea']],submit:()=>onSubmit(`/api/research/${editor.item.id}/evidence`,'POST',form,'Evidência adicionada')},
    synthesis:{title:`Nova síntese`,fields:[['summary','Síntese','textarea']],submit:()=>onSubmit(`/api/research/${editor.item.id}/synthesize`,'POST',form,'Síntese criada')},
  }[editor.kind];
  return <div className="overlay" onMouseDown={onClose}><form className="editor-modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => {e.preventDefault();void config.submit();}}><div className="modal-head"><h3>{config.title}</h3><button type="button" onClick={onClose}>×</button></div>{config.fields.map(([key,label,type]:string[]) => <label key={key}><span>{label}</span>{type==='textarea'?<textarea required={['description','note','projectId'].indexOf(key)<0} value={form[key]??''} onChange={e=>set(key,e.target.value)} />:type==='project'?<select value={form[key]??''} onChange={e=>set(key,e.target.value)}><option value="">Nenhum</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<SelectOrInput type={type} value={form[key]??''} onChange={v=>set(key,v)} required />}</label>)}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Salvar</button></div></form></div>;
}
function SelectOrInput({type,value,onChange,required}:{type:string;value:string;onChange:(v:string)=>void;required?:boolean}) { const options:any={priority:['P0','P1','P2'],projectStatus:['planned','in_progress','blocked','done'],jobStatus:['discovered','applied','interview','offer','rejected','closed'],sourceType:['primary','secondary']}; return options[type]?<select value={value} onChange={e=>onChange(e.target.value)}>{options[type].map((x:string)=><option key={x}>{x}</option>)}</select>:<input required={required} value={value} onChange={e=>onChange(e.target.value)} />; }
function EntityPage({title,subtitle,onCreate,children}:{title:string;subtitle:string;onCreate:()=>void;children:React.ReactNode}) { return <div className="content"><section className="page-title"><div><p className="eyebrow">INTERACTIVE WORKSPACE</p><h2>{title}</h2><p>{subtitle}</p></div><button className="primary" onClick={onCreate}>+ Novo registro</button></section><article className="panel table-panel">{children}</article></div>; }
function Dashboard({ workspace, onNavigate, onComplete }: { workspace?:Workspace; onNavigate:(s:Section)=>void; onComplete:(a:any)=>void }) { const s=workspace?.state; const due=workspace?.careerQueue.filter(x=>x.followUpDue).length??0; const cards=[['Ações abertas',String(s?.actions.filter(x=>x.status!=='done').length??0)],['Follow-ups',String(due)],['Projetos ativos',String(s?.projects.filter(x=>x.status!=='done').length??0)],['Pesquisas abertas',String(s?.research.filter(x=>x.status==='open').length??0)]]; return <div className="content"><section className="hero"><div><p className="eyebrow">VISÃO EXECUTIVA</p><h2>Boa noite, André.</h2><p>Agora você pode operar o Munin diretamente por esta interface.</p></div><div className="hero-orbit"><span>AJ</span></div></section><section className="metrics">{cards.map(([l,v])=><article key={l}><small>{l}</small><strong>{v}</strong><p>Dados ao vivo</p></article>)}</section><section className="grid"><article className="panel focus"><div className="panel-head"><div><p className="eyebrow">AGORA</p><h3>Próximas ações</h3></div></div>{(s?.actions.filter(x=>x.status!=='done').slice(0,4)??[]).map(a=><button className="task clickable" key={a.id} onClick={()=>onComplete(a)}><span className="priority p0">{a.priority}</span><div><strong>{a.title}</strong><small>Clique para concluir</small></div><span>✓</span></button>)}</article><article className="panel"><div className="panel-head"><div><p className="eyebrow">DOMÍNIOS</p><h3>Workspace</h3></div></div>{(['Projects','Career','Research','Runtime'] as Section[]).map(item=><button className="domain" key={item} onClick={()=>onNavigate(item)}><span className="domain-icon">◈</span><div><strong>{item}</strong><small>Abrir visão operacional</small></div><span>↗</span></button>)}</article><article className="panel activity"><div className="panel-head"><div><p className="eyebrow">MEMÓRIA</p><h3>Atividade recente</h3></div></div>{(workspace?.events.slice(0,6)??[]).map((event:any)=><div className="event" key={event.id??`${event.type}-${event.at}`}><time>{new Date(event.at??event.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time><span/><p>{event.type}</p></div>)}</article></section></div>; }
function Runtime({workspace}:{workspace?:Workspace}) { return <div className="content"><section className="page-title"><div><p className="eyebrow">INFRAESTRUTURA</p><h2>Runtime</h2><p>Estado local e integridade operacional.</p></div><span className="health">● HEALTHY</span></section><section className="metrics">{[['Projetos',workspace?.state.projects.length??0],['Ações',workspace?.state.actions.length??0],['Vagas',workspace?.state.jobs.length??0],['Pesquisas',workspace?.state.research.length??0]].map(([l,v])=><article key={l}><small>{l}</small><strong>{v}</strong><p>Persistidos</p></article>)}</section></div>; }
