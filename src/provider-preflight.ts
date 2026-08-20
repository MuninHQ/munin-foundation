import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
export type ProviderPreflight={ready:boolean;provider:'ollama-local';baseUrl:string;model?:string;models:string[];state:'disabled'|'ready'|'started'|'not-installed'|'unreachable'|'no-models';message:string};
type Deps={fetchImpl?:typeof fetch;findExecutable?:()=>Promise<string|undefined>;startServer?:(executable:string)=>void;sleep?:(ms:number)=>Promise<void>};
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const clean=(v:string)=>v.replace(/\/$/,'');

export function ollamaOptedIn():boolean{return process.env.MUNIN_OLLAMA_ENABLED==='1'}

async function defaultFindExecutable(){try{const file=process.platform==='win32'?'where.exe':'which';const result=await execFileAsync(file,['ollama'],{windowsHide:true,timeout:5000});return String(result.stdout??'').split(/\r?\n/).map(x=>x.trim()).find(Boolean)}catch{return undefined}}
function defaultStartServer(executable:string){const child=spawn(executable,['serve'],{detached:true,stdio:'ignore',windowsHide:true});child.unref()}
async function probe(baseUrl:string,fetchImpl:typeof fetch,timeoutMs=1600){try{const response=await fetchImpl(`${baseUrl}/api/tags`,{signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)return {reachable:false,models:[] as string[]};const payload=await response.json() as {models?:Array<{name?:string}>};return {reachable:true,models:(payload.models??[]).map(x=>x.name).filter((x):x is string=>Boolean(x))}}catch{return {reachable:false,models:[] as string[]}}}

export async function preflightOllama(deps:Deps={}):Promise<ProviderPreflight>{
 const baseUrl=clean(process.env.OLLAMA_BASE_URL?.trim()||'http://127.0.0.1:11434');
 if(!ollamaOptedIn())return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'disabled',message:'Ollama opcional está desativado. Munin não irá sondar, iniciar ou aguardar IA local no modo padrão.'};
 const fetchImpl=deps.fetchImpl??fetch;const findExecutable=deps.findExecutable??defaultFindExecutable;const startServer=deps.startServer??defaultStartServer;const sleep=deps.sleep??wait;const preferred=process.env.OLLAMA_MODEL?.trim()||'qwen3:8b';
 let current=await probe(baseUrl,fetchImpl);
 if(current.reachable){if(!current.models.length)return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'no-models',message:'Ollama está ativo, mas não há modelo instalado.'};const model=current.models.includes(preferred)?preferred:current.models[0];return {ready:true,provider:'ollama-local',baseUrl,model,models:current.models,state:'ready',message:`Ollama opcional pronto com ${model}.`}}
 if(process.env.MUNIN_OLLAMA_SELF_HEAL!=='1')return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'unreachable',message:'Ollama opcional não respondeu; inicialização automática permanece desativada.'};
 const executable=await findExecutable();if(!executable)return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'not-installed',message:'Ollama foi habilitado explicitamente, mas o executável não foi encontrado neste PC.'};
 try{startServer(executable)}catch{return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'unreachable',message:'Ollama foi habilitado, mas não foi possível iniciar o serviço local.'}}
 for(let attempt=0;attempt<10;attempt++){await sleep(attempt<2?500:900);current=await probe(baseUrl,fetchImpl,2200);if(current.reachable){if(!current.models.length)return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'no-models',message:'Ollama foi iniciado, mas ainda não há modelo instalado.'};const model=current.models.includes(preferred)?preferred:current.models[0];return {ready:true,provider:'ollama-local',baseUrl,model,models:current.models,state:'started',message:`Ollama opcional foi iniciado explicitamente e encontrou ${model}.`}}}
 return {ready:false,provider:'ollama-local',baseUrl,models:[],state:'unreachable',message:'Ollama foi habilitado, mas não respondeu após a tentativa explícita de inicialização.'};
}
