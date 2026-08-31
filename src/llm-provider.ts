import { loadAssistantMemory } from './assistant-memory.js';
import { ContextStore } from './store.js';
import { isLocalProviderUrl, loadLlmSettings, type LlmProviderType } from './llm-settings.js';
import { applyKnownModelChatProfile, finalModelContent, knownLlmProfile, knownModelCapabilities, normalizeReasoningMode, type KnownLlmProfile, type LlmReasoningMode } from './nemotron-profile.js';
import { RepoIntelligenceProvider, type RepoImpact } from './repo-intelligence.js';

export type LlmProviderStatus={enabled:boolean;provider:LlmProviderType|'ollama-local'|'disabled';model?:string;baseUrl?:string;source?:'settings'|'environment'|'explicit-opt-in';profile?:KnownLlmProfile;reasoningMode?:LlmReasoningMode;deployment?:'local'|'external';supportsVision?:boolean;inputModalities?:string[]};
export type LlmCompletionOptions={reasoningMode?:LlmReasoningMode};
type Normalized={command?:string;reply?:string;confidence?:number};
type ProviderConfig={provider:LlmProviderType;baseUrl:string;apiKey:string;model:string;reasoningMode:LlmReasoningMode;source:'settings'|'environment'};
type ProviderResult={payload:unknown;content?:string;provider:string;model:string;source:string};

function usable(provider:LlmProviderType,baseUrl:string,apiKey:string,model:string){return Boolean(baseUrl&&model&&(apiKey||provider==='openai-compatible'&&isLocalProviderUrl(baseUrl)));}
async function providerConfig():Promise<ProviderConfig|undefined>{
  const settings=await loadLlmSettings();
  if(settings.enabled&&usable(settings.provider,settings.baseUrl,settings.apiKey,settings.model))return {provider:settings.provider,baseUrl:settings.baseUrl,apiKey:settings.apiKey,model:settings.model,reasoningMode:settings.reasoningMode,source:'settings'};
  const baseUrl=process.env.MUNIN_LLM_BASE_URL?.trim()??'';
  const apiKey=process.env.MUNIN_LLM_API_KEY?.trim()??'';
  const model=process.env.MUNIN_LLM_MODEL?.trim()??'';
  const reasoningMode=normalizeReasoningMode(process.env.MUNIN_LLM_REASONING_MODE);
  if(usable('openai-compatible',baseUrl,apiKey,model))return {provider:'openai-compatible',baseUrl,apiKey,model,reasoningMode,source:'environment'};
  return undefined;
}
function ollamaDefaults(){return {baseUrl:(process.env.OLLAMA_BASE_URL?.trim()||'http://127.0.0.1:11434').replace(/\/$/,''),model:process.env.OLLAMA_MODEL?.trim()||'qwen3:8b'}}
function ollamaOptedIn(){return process.env.MUNIN_OLLAMA_ENABLED==='1'}
function externalIntelligenceRequired(){return new Error('External intelligence required: nenhum provider in-process está configurado. No modo ChatGPT-first, Munin não sonda nem inicia IA local automaticamente. Use o cockpit ChatGPT ou habilite explicitamente um provider opcional.');}

export async function llmProviderStatus():Promise<LlmProviderStatus>{
  const config=await providerConfig();
  if(config){const capabilities=knownModelCapabilities(config.model);return {enabled:true,provider:config.provider,model:config.model,baseUrl:config.baseUrl,source:config.source,profile:knownLlmProfile(config.model),reasoningMode:config.reasoningMode,deployment:isLocalProviderUrl(config.baseUrl)?'local':'external',...capabilities};}
  if(!ollamaOptedIn())return {enabled:false,provider:'disabled'};
  const ollama=ollamaDefaults();
  try{const response=await fetch(`${ollama.baseUrl}/api/tags`,{signal:AbortSignal.timeout(1500)});if(response.ok){const payload=await response.json() as {models?:Array<{name?:string}>};const names=(payload.models??[]).map(item=>item.name).filter(Boolean) as string[];const model=names.includes(ollama.model)?ollama.model:names[0];if(model)return {enabled:true,provider:'ollama-local',model,baseUrl:ollama.baseUrl,source:'explicit-opt-in'}}}catch{/* explicitly enabled Ollama not available */}
  return {enabled:false,provider:'disabled'};
}

function safeBase(url:string){return url.replace(/\/$/,'');}
function parseJson(text:string):Normalized|undefined{try{const cleaned=text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();const parsed=JSON.parse(cleaned);if(!parsed||typeof parsed!=='object')return undefined;return parsed as Normalized}catch{return undefined}}
function extractOpenAi(payload:any):string|undefined{return payload?.choices?.[0]?.message?.content??payload?.output_text;}
function extractAnthropic(payload:any):string|undefined{return Array.isArray(payload?.content)?payload.content.find((x:any)=>x?.type==='text')?.text:undefined;}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
function transient(error:unknown){const text=error instanceof Error?error.message:String(error);return /fetch failed|network|timeout|timed out|ECONN|ENOTFOUND|EAI_AGAIN|429|502|503|504/i.test(text)}

async function callProvider(config:ProviderConfig,messages:{role:string;content:string}[],maxTokens=1200,options:LlmCompletionOptions={}):Promise<ProviderResult>{
  if(config.provider==='anthropic'){
    const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n');
    const conversational=messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'assistant':'user',content:x.content}));
    const response=await fetch(`${safeBase(config.baseUrl)}/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':config.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:config.model,max_tokens:maxTokens,temperature:0,system,messages:conversational}),signal:AbortSignal.timeout(Number(process.env.MUNIN_LLM_TIMEOUT_MS??180000))});
    if(!response.ok)throw new Error(`Anthropic respondeu ${response.status}`);
    const payload=await response.json();return {payload,content:extractAnthropic(payload),provider:config.provider,model:config.model,source:config.source};
  }
  const headers:Record<string,string>={'content-type':'application/json'};if(config.apiKey)headers.authorization=`Bearer ${config.apiKey}`;
  const body=applyKnownModelChatProfile({model:config.model,temperature:0,max_tokens:maxTokens,messages},options.reasoningMode??config.reasoningMode);
  const response=await fetch(`${safeBase(config.baseUrl)}/chat/completions`,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(Number(process.env.MUNIN_LLM_TIMEOUT_MS??180000))});
  if(!response.ok)throw new Error(`LLM provider respondeu ${response.status}`);
  const payload=await response.json();const raw=extractOpenAi(payload);return {payload,content:typeof raw==='string'?finalModelContent(raw,config.model):undefined,provider:config.provider,model:config.model,source:config.source};
}

async function callOllama(messages:{role:string;content:string}[],maxTokens=1200):Promise<ProviderResult>{
 const defaults=ollamaDefaults();
 let model=defaults.model;
 try{const tags=await fetch(`${defaults.baseUrl}/api/tags`,{signal:AbortSignal.timeout(2000)});if(tags.ok){const payload=await tags.json() as {models?:Array<{name?:string}>};const names=(payload.models??[]).map(item=>item.name).filter(Boolean) as string[];if(names.length&&!names.includes(model))model=names[0]}}catch{/* generate gives the actionable error below */}
 const prompt=messages.map(item=>`${item.role.toUpperCase()}:\n${item.content}`).join('\n\n')+'\n\nASSISTANT:\n';
 let response:Response;try{response=await fetch(`${defaults.baseUrl}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,options:{temperature:0,num_predict:Math.max(256,maxTokens)}}),signal:AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS??180000))})}catch(error){throw new Error(`Ollama local indisponível em ${defaults.baseUrl}: ${error instanceof Error?error.message:String(error)}`)}
 if(!response.ok)throw new Error(`Ollama local respondeu ${response.status}. Verifique se existe um modelo instalado.`);
 const payload=await response.json() as {response?:string;model?:string};return {payload,content:payload.response?.trim(),provider:'ollama-local',model:payload.model??model,source:'explicit-opt-in'};
}

async function callBestProvider(messages:{role:string;content:string}[],maxTokens:number,options:LlmCompletionOptions={}){
 const config=await providerConfig();
 if(!config){if(ollamaOptedIn())return callOllama(messages,maxTokens);throw externalIntelligenceRequired()}
 let primaryError:unknown;
 const retries=Math.max(0,Number(process.env.MUNIN_LLM_RETRIES??2));
 for(let attempt=0;attempt<=retries;attempt++){
  try{return await callProvider(config,messages,maxTokens,options)}catch(error){primaryError=error;if(attempt>=retries||!transient(error))break;await sleep(500*(2**attempt))}
 }
 if(!ollamaOptedIn())throw primaryError;
 try{return await callOllama(messages,maxTokens)}catch(localError){const primary=primaryError instanceof Error?primaryError.message:String(primaryError);const local=localError instanceof Error?localError.message:String(localError);throw new Error(`Provider principal indisponível após retries (${primary}); fallback Ollama explicitamente habilitado também indisponível (${local}).`)}
}

function engineeringObjective(user:string){return user.match(/Objective:\s*\n([^\n]+)/i)?.[1]?.trim()??''}
function isEngineeringPlanner(system:string){return system.includes("Munin's software engineering planner")}
export function formatEngineeringRepoContext(impact:RepoImpact){
 const evidence=impact.evidence.slice(0,8).map(item=>({source:item.source,path:item.path,symbol:item.symbol,rationale:item.rationale,confidence:item.confidence}));
 return `Repository intelligence (advisory; repository source files remain authoritative):\n${JSON.stringify({coverage:impact.coverage,files:impact.files.slice(0,30),symbols:impact.symbols.slice(0,30),tests:impact.tests.slice(0,30),evidence},null,2)}`;
}
async function engineeringAwareUser(system:string,user:string){
 if(!isEngineeringPlanner(system)||process.env.MUNIN_REPO_INTELLIGENCE==='0')return user;
 const objective=engineeringObjective(user);if(!objective)return user;
 try{const impact=await new RepoIntelligenceProvider(process.cwd()).impact(objective);return `${user}\n\n${formatEngineeringRepoContext(impact)}\n\nUse indexed evidence only as a relevance hint. Verify consequential conclusions against repository files before editing.`}catch{return user}
}

export async function completeWithLlm(system:string,user:string,maxTokens=4000,options:LlmCompletionOptions={}):Promise<string>{
  const enrichedUser=await engineeringAwareUser(system,user);
  const result=await callBestProvider([{role:'system',content:system},{role:'user',content:enrichedUser}],maxTokens,options);
  if(!result.content)throw new Error('Provider respondeu sem conteúdo.');
  return result.content;
}

export async function testLlmProvider():Promise<{ok:true;provider:string;model:string;source:string;message:string}>{
  const result=await callBestProvider([{role:'system',content:'Responda somente com OK.'},{role:'user',content:'Teste de conexão do Munin.'}],100,{reasoningMode:'off'});
  if(!result.content)throw new Error('Provider respondeu sem conteúdo.');
  return {ok:true,provider:result.provider,model:result.model,source:result.source,message:result.content.trim().slice(0,120)};
}

export async function normalizeWithLlm(userCommand:string):Promise<Normalized|undefined>{
  const memory=await loadAssistantMemory();const state=await new ContextStore().load();
  const context={lastEntity:memory.lastEntity,recentTurns:memory.turns.slice(-8),jobs:state.jobs.slice(-20).map(x=>({id:x.id,company:x.company,role:x.role,status:x.status,nextAction:x.nextAction})),projects:state.projects.slice(-20).map(x=>({id:x.id,name:x.name,status:x.status,priority:x.priority})),research:state.research.slice(-15).map(x=>({id:x.id,question:x.question,status:x.status}))};
  const system='Você é o interpretador do Munin. Converta pedidos livres em UM comando seguro suportado pelo executor local. Nunca invente IDs nem execute ações. Responda SOMENTE JSON. Formato: {"command":"...","confidence":0.0} ou, se for apenas conversa sem ação possível, {"reply":"...","confidence":0.0}. Comandos aceitos incluem: gerar SITREP; prioridades de hoje; buscar <termo>; mais detalhes; criar ação: <texto> P0|P1|P2; criar projeto: <nome> P0|P1|P2; registrar vaga <cargo> na <empresa>; criar pesquisa: <pergunta>; criar follow-up P0|P1|P2; marcar como entrevista|aplicada|oferta|rejeitada|fechada. Preserve a intenção do usuário e use o contexto fornecido.';
  try{const result=await callBestProvider([{role:'system',content:system},{role:'user',content:`Contexto Munin:\n${JSON.stringify(context)}\n\nPedido:\n${userCommand}`}],800,{reasoningMode:'off'});if(!result.content)return undefined;return parseJson(result.content)}catch{return undefined}
}
