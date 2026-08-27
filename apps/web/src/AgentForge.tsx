import { useEffect, useMemo, useState } from 'react';
import './AgentForge.css';

type ForgeStatus='working'|'verifying'|'retrying'|'blocked'|'completed'|'failed';
type ForgeItem={id:string;runId:string;taskId?:string;agentId:string;capability?:string;phase?:string;status:ForgeStatus;startedAt:string;updatedAt:string;durationMs?:number;outcome?:string;evidenceCount:number;lastEvent:string};
type ForgePayload={generatedAt:string;active:number;items:ForgeItem[]};

const labels:Record<ForgeStatus,string>={working:'TRABALHANDO',verifying:'VERIFICANDO',retrying:'RETRY',blocked:'BLOQUEADO',completed:'CONCLUÍDO',failed:'FALHOU'};
const glyphs:Record<ForgeStatus,string>={working:'⚒',verifying:'◇',retrying:'↻',blocked:'!',completed:'✓',failed:'×'};

function age(startedAt:string,now:number){const elapsed=Math.max(0,now-Date.parse(startedAt));if(elapsed<60_000)return `${Math.floor(elapsed/1000)}s`;return `${Math.floor(elapsed/60_000)}m`;}

export function AgentForge(){
 const [payload,setPayload]=useState<ForgePayload>({generatedAt:'',active:0,items:[]});
 const [selected,setSelected]=useState<ForgeItem|null>(null);
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{let alive=true;const load=async()=>{try{const response=await fetch('/api/agent-forge');if(!response.ok)return;const data=await response.json() as ForgePayload;if(alive)setPayload(data);}catch{}};void load();const poll=window.setInterval(()=>void load(),2500);const clock=window.setInterval(()=>setNow(Date.now()),1000);return()=>{alive=false;clearInterval(poll);clearInterval(clock)}},[]);
 const items=payload.items;
 const blocked=useMemo(()=>items.filter(item=>item.status==='blocked').length,[items]);
 return <article className="agent-forge panel">
  <div className="panel-head forge-head"><div><p className="eyebrow">LIVE AUTONOMY</p><h3>Agent Forge</h3></div><div className="forge-summary"><span className={payload.active?'forge-live active':'forge-live'}><i />{payload.active} ativos</span>{blocked>0&&<span className="forge-blocked">{blocked} bloqueado{blocked>1?'s':''}</span>}</div></div>
  {items.length===0?<div className="forge-idle"><div className="raven idle" aria-hidden="true">◆</div><div><strong>Forge em espera</strong><p>Os corvos aparecem aqui quando agentes reais entrarem em execução.</p></div></div>:<div className="forge-floor">{items.map((item,index)=><button key={item.id} className={`forge-station ${item.status}`} onClick={()=>setSelected(item)} title="Abrir trace do agente"><div className="station-light"/><div className="raven-wrap" aria-hidden="true"><div className="raven-body"><span className="raven-head"/><span className="raven-wing left"/><span className="raven-wing right"/><span className="raven-tail"/></div><span className="work-glyph">{glyphs[item.status]}</span></div><div className="station-copy"><div><strong>{item.agentId}</strong><span>{age(item.startedAt,now)}</span></div><small>{item.capability??item.phase??item.lastEvent}</small><em>{labels[item.status]}</em></div><span className="station-index">{String(index+1).padStart(2,'0')}</span></button>)}</div>}
  <div className="forge-rail"><span>TELEMETRY BUS</span><i/><i/><i/><small>retenção visual 30s após conclusão</small></div>
  {selected&&<div className="forge-detail"><button className="forge-close" onClick={()=>setSelected(null)}>×</button><p className="eyebrow">AGENT TRACE</p><h4>{selected.agentId}</h4><dl><div><dt>Status</dt><dd>{labels[selected.status]}</dd></div><div><dt>Capability</dt><dd>{selected.capability??'—'}</dd></div><div><dt>Phase</dt><dd>{selected.phase??'—'}</dd></div><div><dt>Run</dt><dd>{selected.runId}</dd></div><div><dt>Evidence</dt><dd>{selected.evidenceCount}</dd></div><div><dt>Último evento</dt><dd>{selected.lastEvent}</dd></div></dl></div>}
 </article>;
}
