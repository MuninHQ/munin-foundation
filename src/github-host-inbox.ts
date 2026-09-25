import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { JsonHostJobQueue } from './json-host-job-queue.js';
import { validateHostJob, type HostJob, type HostJobType } from './host-bridge-protocol.js';

const execFileAsync=promisify(execFile);
const REMOTE='origin';
const INBOX_BRANCH='munin-host-inbox';
const REMOTE_REF=`refs/remotes/${REMOTE}/${INBOX_BRANCH}`;
const INBOX_FILE='host-intent.json';
const ALLOWED:ReadonlySet<HostJobType>=new Set(['runtime-health','git-fast-forward','deploy-main','restart-munin','run-acceptance','tailscale-health','creative-review','build-all']);
const MAX_INTENT_AGE_MS=15*60*1000;

export interface GitHubHostIntent{
 version:1;
 id:string;
 type:HostJobType;
 createdAt:string;
 expiresAt:string;
 repo:'MuninHQ/munin-foundation';
 branch:'main';
 objective?:string;
 dryRun?:boolean;
}
interface ReplayFile{version:1;processed:Array<{id:string;processedAt:string}>}
export interface GitHubHostInboxResult{status:'enqueued'|'empty'|'expired'|'replayed'|'invalid'|'unavailable';summary:string;jobId?:string}

function validId(value:string):boolean{return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value)}
export function parseGitHubHostIntent(value:unknown,now=Date.now()):GitHubHostIntent{
 if(!value||typeof value!=='object')throw new Error('Host inbox intent must be an object.');
 const input=value as Record<string,unknown>;
 if(input.version!==1)throw new Error('Unsupported Host inbox intent version.');
 if(typeof input.id!=='string'||!validId(input.id))throw new Error('Invalid Host inbox intent id.');
 if(typeof input.type!=='string'||!ALLOWED.has(input.type as HostJobType))throw new Error('Host inbox intent type is not allowlisted.');
 if(input.repo!=='MuninHQ/munin-foundation'||input.branch!=='main')throw new Error('Host inbox target is restricted to Munin main.');
 if(typeof input.createdAt!=='string'||typeof input.expiresAt!=='string')throw new Error('Host inbox intent requires timestamps.');
 const type=input.type as HostJobType;
 const objective=typeof input.objective==='string'?input.objective.trim():undefined;
 if(type==='build-all'&&!objective)throw new Error('BUILD ALL Host inbox intent requires objective.');
 if(objective&&objective.length>2000)throw new Error('BUILD ALL Host inbox objective exceeds 2000 characters.');
 const created=Date.parse(input.createdAt),expires=Date.parse(input.expiresAt);
 if(!Number.isFinite(created)||!Number.isFinite(expires)||expires<=created)throw new Error('Invalid Host inbox intent timestamps.');
 if(expires-created>MAX_INTENT_AGE_MS)throw new Error('Host inbox intent lifetime exceeds 15 minutes.');
 if(created>now+60_000)throw new Error('Host inbox intent is dated in the future.');
 return{version:1,id:input.id,type,createdAt:input.createdAt,expiresAt:input.expiresAt,repo:'MuninHQ/munin-foundation',branch:'main',objective,dryRun:input.dryRun===true};
}

async function fixedGit(cwd:string,args:string[],timeoutMs:number):Promise<string>{
 const result=await execFileAsync('git',args,{cwd,timeout:timeoutMs,windowsHide:true,maxBuffer:512*1024,shell:false,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 return String(result.stdout??'').trim();
}

export class GitHubHostInbox{
 private readonly cwd:string;private readonly replayPath:string;private readonly timeoutMs:number;
 constructor(private readonly queue:JsonHostJobQueue,options:{cwd?:string;replayPath?:string;timeoutMs?:number}={}){
  this.cwd=resolve(options.cwd??process.cwd());this.replayPath=resolve(options.replayPath??resolve(this.cwd,'data/runtime/github-host-inbox-processed.json'));this.timeoutMs=Math.max(1000,Math.min(15000,options.timeoutMs??7000));
 }
 private async replayFile():Promise<ReplayFile>{try{const parsed=JSON.parse(await readFile(this.replayPath,'utf8')) as ReplayFile;return parsed.version===1&&Array.isArray(parsed.processed)?parsed:{version:1,processed:[]}}catch(error:any){if(error?.code==='ENOENT')return{version:1,processed:[]};throw error}}
 private async seen(id:string):Promise<boolean>{return(await this.replayFile()).processed.some(item=>item.id===id)}
 private async mark(id:string):Promise<void>{const file=await this.replayFile();file.processed=[...file.processed.filter(item=>item.id!==id),{id,processedAt:new Date().toISOString()}].slice(-500);await mkdir(dirname(this.replayPath),{recursive:true});const tmp=`${this.replayPath}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(file,null,2)+'\n','utf8');await rename(tmp,this.replayPath)}
 async poll(now=Date.now()):Promise<GitHubHostInboxResult>{
  try{await fixedGit(this.cwd,['fetch',REMOTE,`refs/heads/${INBOX_BRANCH}:${REMOTE_REF}`],this.timeoutMs)}catch(error){return{status:'unavailable',summary:`GitHub Host Inbox fetch unavailable: ${error instanceof Error?error.message:String(error)}`}}
  let raw:string;try{raw=await fixedGit(this.cwd,['show',`${REMOTE_REF}:${INBOX_FILE}`],this.timeoutMs)}catch{return{status:'empty',summary:'GitHub Host Inbox has no readable intent.'}}
  let parsed:unknown;try{parsed=JSON.parse(raw)}catch{return{status:'invalid',summary:'GitHub Host Inbox intent is not valid JSON.'}}
  let intent:GitHubHostIntent;try{intent=parseGitHubHostIntent(parsed,now)}catch(error){return{status:'invalid',summary:error instanceof Error?error.message:String(error)}}
  if(Date.parse(intent.expiresAt)<=now){await this.mark(intent.id);return{status:'expired',summary:`Host intent ${intent.id} expired before processing.`}}
  if(await this.seen(intent.id))return{status:'replayed',summary:`Host intent ${intent.id} already processed.`}
  const repoTarget=intent.type==='git-fast-forward'||intent.type==='deploy-main'||intent.type==='build-all';
  const job:HostJob={id:`github-${intent.id}`,type:intent.type,repo:repoTarget?intent.repo:undefined,branch:repoTarget?intent.branch:undefined,objective:intent.objective,dryRun:intent.dryRun,createdAt:intent.createdAt};
  const gate=validateHostJob(job);if(gate.status!=='approved'){await this.mark(intent.id);return{status:'invalid',summary:gate.summary}}
  await this.queue.enqueue(job);await this.mark(intent.id);return{status:'enqueued',summary:`Host intent ${intent.id} enqueued as ${job.id}.`,jobId:job.id};
 }
}

export const githubHostInboxContract=Object.freeze({remote:REMOTE,branch:INBOX_BRANCH,file:INBOX_FILE,maxIntentAgeMs:MAX_INTENT_AGE_MS,allowedTypes:[...ALLOWED]});
