import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runtimePath } from './config.js';

export type ManusTaskKind='research'|'analysis'|'content-draft'|'repository-diagnostics';
export type ManusTaskStatus='queued'|'running'|'waiting'|'completed'|'failed';
export interface ManusOperationalTask{id:string;kind:ManusTaskKind;title:string;prompt:string;status:ManusTaskStatus;remoteTaskId?:string;taskUrl?:string;result?:string;waitingDescription?:string;error?:string;declaredCreditBudget:number;creditUsage?:number;createdAt:string;updatedAt:string;}
export interface ManusBridgeStatus{enabled:boolean;provider:'manus-v2';profile:string;dailyCreditBudget:number;maxTasksPerDay:number;submittedToday:number;declaredCreditsToday:number;reason?:string;}

const ALLOWED=new Set<ManusTaskKind>(['research','analysis','content-draft','repository-diagnostics']);
const apiBase=()=>String(process.env.MANUS_API_BASE_URL??'https://api.manus.ai').replace(/\/+$/,'');
const apiKey=()=>process.env.MANUS_API_KEY?.trim();
const profile=()=>process.env.MANUS_AGENT_PROFILE?.trim()||'manus-1.6-lite';
const dailyBudget=()=>Math.max(50,Math.min(20000,Number(process.env.MANUS_DAILY_CREDIT_BUDGET??600)||600));
const maxTasks=()=>Math.max(1,Math.min(20,Number(process.env.MANUS_MAX_TASKS_PER_DAY??5)||5));
const file=()=>runtimePath('manus-operational-tasks.json');
const today=(value:string)=>value.slice(0,10)===new Date().toISOString().slice(0,10);
const text=(value:unknown)=>typeof value==='string'?value.trim():'';

export class ManusTaskStore{
 async list():Promise<ManusOperationalTask[]>{try{const parsed=JSON.parse(await readFile(file(),'utf8')) as {tasks?:ManusOperationalTask[]};return Array.isArray(parsed.tasks)?parsed.tasks:[]}catch{return[]}}
 async save(tasks:ManusOperationalTask[]):Promise<void>{await mkdir(dirname(file()),{recursive:true});const tmp=`${file()}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify({version:1,tasks:tasks.slice(-300)},null,2)+'\n','utf8');await rename(tmp,file())}
 async upsert(task:ManusOperationalTask):Promise<ManusOperationalTask>{const tasks=await this.list();const index=tasks.findIndex(item=>item.id===task.id);if(index>=0)tasks[index]=task;else tasks.push(task);await this.save(tasks);return task}
}

async function manusRequest(path:string,options:RequestInit={}):Promise<any>{const key=apiKey();if(!key)throw new Error('MANUS_API_KEY is not configured');const response=await fetch(`${apiBase()}${path}`,{...options,headers:{'content-type':'application/json','x-manus-api-key':key,...options.headers},signal:AbortSignal.timeout(30000)});const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok===false)throw new Error(text(payload?.error?.message)||`Manus API returned HTTP ${response.status}`);return payload}
export async function manusBridgeStatus(store=new ManusTaskStore()):Promise<ManusBridgeStatus>{const tasks=(await store.list()).filter(item=>today(item.createdAt));const declared=tasks.reduce((sum,item)=>sum+item.declaredCreditBudget,0);return{enabled:Boolean(apiKey()),provider:'manus-v2',profile:profile(),dailyCreditBudget:dailyBudget(),maxTasksPerDay:maxTasks(),submittedToday:tasks.length,declaredCreditsToday:declared,...(!apiKey()?{reason:'MANUS_API_KEY is not configured'}:{})}}

export async function submitManusTask(input:{kind:ManusTaskKind;title:string;prompt:string;declaredCreditBudget?:number},store=new ManusTaskStore()):Promise<ManusOperationalTask>{
 if(!ALLOWED.has(input.kind))throw new Error('Manus task kind is not allowlisted');const title=text(input.title).slice(0,160),promptText=text(input.prompt).slice(0,12000);if(!title||!promptText)throw new Error('Manus task title and prompt are required');
 const status=await manusBridgeStatus(store),budget=Math.max(10,Math.min(1000,Number(input.declaredCreditBudget??150)||150));if(!status.enabled)throw new Error(status.reason);if(status.submittedToday>=status.maxTasksPerDay)throw new Error('Manus daily task limit reached');if(status.declaredCreditsToday+budget>status.dailyCreditBudget)throw new Error('Manus daily declared credit budget reached');
 const now=new Date().toISOString(),id=`manus-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;let task:ManusOperationalTask={id,kind:input.kind,title,prompt:promptText,status:'queued',declaredCreditBudget:budget,createdAt:now,updatedAt:now};await store.upsert(task);
 try{const payload=await manusRequest('/v2/task.create',{method:'POST',body:JSON.stringify({message:{content:`[MUNIN GOVERNED TASK]\nKind: ${input.kind}\nBudget intent: ${budget} credits maximum.\nDo not send messages, publish, purchase, delete, or perform irreversible actions. Return evidence and a concise result.\n\n${promptText}`},agent_profile:profile()})});const remote=payload?.task??payload?.data??payload;const remoteTaskId=text(remote?.task_id)||text(payload?.task_id);if(!remoteTaskId)throw new Error('Manus API response did not include task_id');task={...task,status:'running',remoteTaskId,taskUrl:text(remote?.task_url)||undefined,updatedAt:new Date().toISOString()};return await store.upsert(task)}catch(error){task={...task,status:'failed',error:error instanceof Error?error.message:String(error),updatedAt:new Date().toISOString()};await store.upsert(task);throw error}
}

function messageResult(messages:any[]):Pick<ManusOperationalTask,'status'|'result'|'waitingDescription'|'error'|'creditUsage'>{let status:ManusTaskStatus='running',result='',waitingDescription='',error='';let creditUsage:number|undefined;for(const event of messages){const update=event?.status_update??event?.data?.status_update;if(update?.agent_status==='stopped')status='completed';else if(update?.agent_status==='waiting'){status='waiting';waitingDescription=text(update?.status_detail?.waiting_description)}else if(update?.agent_status==='error'){status='failed';error=text(update?.status_detail?.message)||'Manus task failed'}const content=event?.assistant_message?.content??event?.message?.content;if(typeof content==='string'&&content.trim())result=content.trim();const usage=event?.task?.credit_usage??event?.credit_usage;if(Number.isFinite(usage))creditUsage=Number(usage)}return{status,result:result||undefined,waitingDescription:waitingDescription||undefined,error:error||undefined,creditUsage}}
export async function refreshManusTasks(store=new ManusTaskStore()):Promise<ManusOperationalTask[]>{const tasks=await store.list();if(!apiKey())return tasks;for(let index=0;index<tasks.length;index++){const task=tasks[index];if(!task.remoteTaskId||!['running','waiting'].includes(task.status))continue;try{const payload=await manusRequest(`/v2/task.listMessages?task_id=${encodeURIComponent(task.remoteTaskId)}&order=asc&limit=100`);const messages=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.messages)?payload.messages:[];tasks[index]={...task,...messageResult(messages),updatedAt:new Date().toISOString()}}catch(error){tasks[index]={...task,error:error instanceof Error?error.message:String(error),updatedAt:new Date().toISOString()}}}await store.save(tasks);return tasks}
