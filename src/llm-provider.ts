import { loadAssistantMemory } from './assistant-memory.js';
import { ContextStore } from './store.js';

export type LlmProviderStatus={enabled:boolean;provider:'openai-compatible'|'disabled';model?:string;baseUrl?:string};
type Normalized={command?:string;reply?:string;confidence?:number};

export function llmProviderStatus():LlmProviderStatus{
  const baseUrl=process.env.MUNIN_LLM_BASE_URL?.trim();
  const apiKey=process.env.MUNIN_LLM_API_KEY?.trim();
  const model=process.env.MUNIN_LLM_MODEL?.trim();
  if(!baseUrl||!apiKey||!model)return {enabled:false,provider:'disabled'};
  return {enabled:true,provider:'openai-compatible',model,baseUrl};
}

function safeBase(url:string){return url.replace(/\/$/,'');}
function extractContent(payload:any):string|undefined{return payload?.choices?.[0]?.message?.content??payload?.output_text;}
function parseJson(text:string):Normalized|undefined{try{const cleaned=text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();const parsed=JSON.parse(cleaned);if(!parsed||typeof parsed!=='object')return undefined;return parsed as Normalized}catch{return undefined}}

export async function normalizeWithLlm(userCommand:string):Promise<Normalized|undefined>{
  const status=llmProviderStatus(); if(!status.enabled||!status.baseUrl||!status.model)return undefined;
  const memory=await loadAssistantMemory(); const state=await new ContextStore().load();
  const context={lastEntity:memory.lastEntity,recentTurns:memory.turns.slice(-8),jobs:state.jobs.slice(-20).map(x=>({id:x.id,company:x.company,role:x.role,status:x.status,nextAction:x.nextAction})),projects:state.projects.slice(-20).map(x=>({id:x.id,name:x.name,status:x.status,priority:x.priority})),research:state.research.slice(-15).map(x=>({id:x.id,question:x.question,status:x.status}))};
  const system='Você é o interpretador do Munin. Converta pedidos livres em UM comando seguro suportado pelo executor local. Nunca invente IDs nem execute ações. Responda SOMENTE JSON. Formato: {"command":"...","confidence":0.0} ou, se for apenas conversa sem ação possível, {"reply":"...","confidence":0.0}. Comandos aceitos incluem: gerar SITREP; prioridades de hoje; buscar <termo>; mais detalhes; criar ação: <texto> P0|P1|P2; criar projeto: <nome> P0|P1|P2; registrar vaga <cargo> na <empresa>; criar pesquisa: <pergunta>; criar follow-up P0|P1|P2; marcar como entrevista|aplicada|oferta|rejeitada|fechada. Preserve a intenção do usuário e use o contexto fornecido.';
  const response=await fetch(`${safeBase(status.baseUrl)}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env.MUNIN_LLM_API_KEY}`},body:JSON.stringify({model:status.model,temperature:0,messages:[{role:'system',content:system},{role:'user',content:`Contexto Munin:\n${JSON.stringify(context)}\n\nPedido:\n${userCommand}`}]})});
  if(!response.ok)throw new Error(`LLM provider respondeu ${response.status}`);
  const payload=await response.json(); const content=extractContent(payload); if(!content)return undefined; return parseJson(content);
}
