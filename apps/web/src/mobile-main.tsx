import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './mobile.css';

type Goal = { id:string; title:string; priority:'P0'|'P1'|'P2'; status:string; progress:number; nextAction?:string };
type Action = { id:string; title:string; priority:'P0'|'P1'|'P2'; status:string; goalId?:string };
type HomePayload = { generatedAt:string; goals:Goal[]; pendingActions:Action[]; decisions:{id:string;title:string}[] };

type ApiState = { token:string; connected:boolean; error?:string };

function apiToken(): string { return localStorage.getItem('munin-mobile-token') ?? ''; }
async function mobileFetch<T>(path:string, init:RequestInit = {}):Promise<T>{
  const token=apiToken();
  const headers=new Headers(init.headers);
  headers.set('Authorization',`Bearer ${token}`);
  if(init.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const response=await fetch(path,{...init,headers});
  const payload=await response.json().catch(()=>({error:`HTTP ${response.status}`}));
  if(!response.ok) throw new Error(payload.error??`HTTP ${response.status}`);
  return payload as T;
}

function App(){
  const [auth,setAuth]=useState<ApiState>({token:apiToken(),connected:false});
  const [home,setHome]=useState<HomePayload|null>(null);
  const [sitrep,setSitrep]=useState('');
  const [command,setCommand]=useState('sitrep');
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(false);
  const topGoal=useMemo(()=>home?.goals[0], [home]);

  async function refresh(){
    if(!apiToken()){setAuth(current=>({...current,connected:false,error:'Informe o token do Munin Mobile.'}));return;}
    try{const payload=await mobileFetch<HomePayload>('/api/mobile/home');setHome(payload);setAuth(current=>({...current,connected:true,error:undefined}));}
    catch(error){setAuth(current=>({...current,connected:false,error:error instanceof Error?error.message:String(error)}));}
  }
  useEffect(()=>{void refresh();if('serviceWorker'in navigator)void navigator.serviceWorker.register('/munin-sw.js');},[]);

  async function saveToken(){localStorage.setItem('munin-mobile-token',auth.token.trim());await refresh();}
  async function loadSitrep(){setBusy(true);try{const result=await mobileFetch<{report:string}>('/api/mobile/sitrep');setSitrep(result.report);}catch(error){setSitrep(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function sendCommand(){if(!command.trim())return;setBusy(true);try{const result=await mobileFetch<unknown>('/api/mobile/assistant',{method:'POST',body:JSON.stringify({command})});setAnswer(typeof result==='string'?result:JSON.stringify(result,null,2));}catch(error){setAnswer(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function runLoop(){setBusy(true);try{const result=await mobileFetch<unknown>('/api/mobile/goal-loop',{method:'POST',body:JSON.stringify({maxCycles:5})});setAnswer(JSON.stringify(result,null,2));await refresh();}catch(error){setAnswer(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}

  if(!auth.connected){return <main className="shell auth-shell"><section className="hero-card"><span className="eyebrow">MUNIN MOBILE</span><h1>Seu command center no iPhone.</h1><p>Conecte ao runtime do seu PC usando o token local do Mobile Gateway.</p><label>Token<input type="password" value={auth.token} onChange={event=>setAuth({...auth,token:event.target.value})} placeholder="MUNIN_MOBILE_TOKEN" /></label><button onClick={()=>void saveToken()}>Conectar</button>{auth.error&&<p className="error">{auth.error}</p>}</section></main>}

  return <main className="shell">
    <header><div><span className="eyebrow">MUNIN</span><h1>Command Center</h1></div><button className="ghost" onClick={()=>void refresh()}>Atualizar</button></header>
    <section className="status-card"><div><span className="status-dot"/>Online</div><small>{home?new Date(home.generatedAt).toLocaleString('pt-BR'):''}</small></section>
    <section className="hero-card"><span className="eyebrow">PRIORIDADE AGORA</span><h2>{topGoal?.title??'Nenhum goal ativo'}</h2>{topGoal&&<><div className="progress"><span style={{width:`${topGoal.progress}%`}}/></div><p>{topGoal.progress}% · {topGoal.priority} · {topGoal.status}</p>{topGoal.nextAction&&<strong>Próxima: {topGoal.nextAction}</strong>}</>}</section>
    <section className="quick-grid"><button onClick={()=>void loadSitrep()}>📊 SITREP</button><button onClick={()=>void runLoop()}>⚡ Continuar sozinho</button><button onClick={()=>setCommand('qual a prioridade agora?')}>🎯 Prioridade</button><button onClick={()=>setCommand('o que depende de mim?')}>🚧 Depende de mim</button></section>
    <section className="panel"><h3>Conversar com Munin</h3><textarea value={command} onChange={event=>setCommand(event.target.value)} rows={3}/><button disabled={busy} onClick={()=>void sendCommand()}>{busy?'Executando…':'Enviar'}</button>{answer&&<pre>{answer}</pre>}</section>
    {sitrep&&<section className="panel"><div className="panel-title"><h3>SITREP</h3><button className="ghost" onClick={()=>setSitrep('')}>Fechar</button></div><pre>{sitrep}</pre></section>}
    <section className="panel"><h3>Goals</h3>{home?.goals.length?home.goals.map(goal=><article className="row" key={goal.id}><div><strong>{goal.title}</strong><small>{goal.priority} · {goal.status}</small></div><span>{goal.progress}%</span></article>):<p>Nenhum goal ativo.</p>}</section>
    <section className="panel"><h3>Pendências</h3>{home?.pendingActions.length?home.pendingActions.slice(0,6).map(action=><article className="row" key={action.id}><div><strong>{action.title}</strong><small>{action.priority} · {action.status}</small></div></article>):<p>Nenhuma ação pendente.</p>}</section>
    <footer>Munin Mobile · local-first · zero-cost runtime</footer>
  </main>;
}

createRoot(document.getElementById('mobile-root')!).render(<React.StrictMode><App/></React.StrictMode>);
