import { loadAssistantMemory } from './assistant-memory.js';
import { ContextStore } from './store.js';
import { isLocalProviderUrl, loadLlmSettings, type LlmProviderType } from './llm-settings.js';

export type LlmProviderStatus={enabled:boolean;provider:LlmProviderType|'disabled';model?:string;baseUrl?:string;source?:'settings'|'environment'};
type Normalized={command?:string;reply?:string;confidence?:number};
type ProviderConfig={provider:LlmProviderType;baseUrl:string;apiKey:string;model:string;source:'settings'|'environment'};

function usable(provider:LlmProviderType,baseUrl:string,apiKey:string,model:string){return Boolean(baseUrl&&model&&(apiKey||provider==='openai-compatible'&&isLocalProviderUrl(baseUrl)));}
async function providerConfig():Promise<ProviderConfig|undefined>{
  const settings=await loadLlmSettings();
  if(settings.enabled&&usable(settings.provider,settings.baseUrl,settings.apiKey,settings.model))return {provider:settings.provider,baseUrl:settings.baseUrl,apiKey:settings.apiKey,model:settings.model,source:'settings'};
  const baseUrl=process.env.MUNIN_LLM_BASE_URL?.trim()??'';
  const apiKey=process.env.MUNIN_LLM_API_KEY?.trim()??'';
  const model=process.env.MUNIN_LLM_MODEL?.trim()??'';
  if(usable('openai-compatible',baseUrl,apiKey,model))return {provider:'openai-compatible',baseUrl,apiKey,model,source:'environment'};
  return undefined;
}

export async function llmProviderStatus():Promise<LlmProviderStatus>{
  const config=await providerConfig();
  if(!config)return {enabled:false,provider:'disabled'};
  return {enabled:true,provider:config.provider,model:config.model,baseUrl:config.baseUrl,source:config.source};
}

function safeBase(url:string){return url.replace(/\/$/,'');}
function parseJson(text:string):Normalized|undefined{try{const cleaned=text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();const parsed=JSON.parse(cleaned);if(!parsed||typeof parsed!=='object')return undefined;return parsed as Normalized}catch{return undefined}}
function extractOpenAi(payload:any):string|undefined{return payload?.choices?.[0]?.message?.content??payload?.output_text;}
function extractAnthropic(payload:any):string|undefined{return Array.isArray(payload?.content)?payload.content.find((x:any)=>x?.type==='text')?.text:undefined;}

async function callProvider(config:ProviderConfig,messages:{role:string;content:string}[],maxTokens=1200){
  if(config.provider==='anthropic'){
    const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n');
    const conversational=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'assistant':'user',content:x.content}));
    const response=await fetch(`${safeBase(config.baseUrl)}/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':config.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:config.model,max_tokens:maxTokens,temperature:0,system,messages:conversational})});
    if(!response.ok)throw new Error(`Anthropic respondeu ${response.status}`);
    const payload=await response.json(); return {payload,content:extractAnthropic(payload)};
  }
  const headers:Record<string,string>={'content-type':'application/json'}; if(config.apiKey)headers.authorization=`Bearer ${config.apiKey}`;
  const response=await fetch(`${safeBase(config.baseUrl)}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model:config.model,temperature:0,max_tokens:maxTokens,messages})});
  if(!response.ok)throw new Error(`LLM provider respondeu ${response.status}`);
  const payload=await response.json(); return {payload,content:extractOpenAi(payload)};
}

export async function completeWithLlm(system:string,user:string,maxTokens=4000):Promise<string>{
  const config=await providerConfig(); if(!config)throw new Error('Nenhum provider LLM ativo. Configure Ollama/local ou outro provider.');
  const result=await callProvider(config,[{role:'system',content:system},{role:'user',content:user}],maxTokens);
  if(!result.content)throw new Error('Provider respondeu sem conteúdo.');
  return result.content;
}

export async function testLlmProvider():Promise<{ok:true;provider:string;model:string;source:string;message:string}>{
  const config=await providerConfig();
  if(!config)throw new Error('Nenhum provider LLM ativo.');
  const result=await callProvider(config,[{role:'system',content:'Responda somente com OK.'},{role:'user',content:'Teste de conexão do Munin.'}],100);
  if(!result.content)throw new Error('Provider respondeu sem conteúdo.');
  return {ok:true,provider:config.provider,model:config.model,source:config.source,message:result.content.trim().slice(0,120)};
}

export async function normalizeWithLlm(userCommand:string):Promise<Normalized|undefined>{
  const config=await providerConfig(); if(!config)return undefined;
  const memory=await loadAssistantMemory(); const state=await new ContextStore().load();
  const context={lastEntity:memory.lastEntity,recentTurns:memory.turns.slice(-8),jobs:state.jobs.slice(-20).map(x=>({id:x.id,company:x.company,role:x.role,status:x.status,nextAction:x.nextAction})),projects:state.projects.slice(-20).map(x=>({id:x.id,name:x.name,status:x.status,priority:x.priority})),research:state.research.slice(-15).map(x=>({id:x.id,question:x.question,status:x.status}))};
  const system='Você é o interpretador do Munin. Converta pedidos livres em UM comando seguro suportado pelo executor local. Nunca invente IDs nem execute ações. Responda SOMENTE JSON. Formato: {"command":"...","confidence":0.0} ou, se for apenas conversa sem ação possível, {"reply":"...","confidence":0.0}. Comandos aceitos incluem: gerar SITREP; prioridades de hoje; buscar <termo>; mais detalhes; criar ação: <texto> P0|P1|P2; criar projeto: <nome> P0|P1|P2; registrar vaga <cargo> na <empresa>; criar pesquisa: <pergunta>; criar follow-up P0|P1|P2; marcar como entrevista|aplicada|oferta|rejeitada|fechada. Preserve a intenção do usuário e use o contexto fornecido.';
  const result=await callProvider(config,[{role:'system',content:system},{role:'user',content:`Contexto Munin:\n${JSON.stringify(context)}\n\nPedido:\n${userCommand}`}],800);
  if(!result.content)return undefined; return parseJson(result.content);
}
