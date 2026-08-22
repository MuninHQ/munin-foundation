import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { redactHostOutput } from './host-bridge-protocol.js';
import type { QueuedHostJob } from './json-host-job-queue.js';

const execFileAsync=promisify(execFile);
const REMOTE='origin';
const OUTBOX_BRANCH='munin-host-outbox';
const REMOTE_REF=`refs/remotes/${REMOTE}/${OUTBOX_BRANCH}`;
const RECEIPT_FILE='host-result.json';

interface PublishedFile{version:1;ids:string[]}

async function git(cwd:string,args:string[],timeout=15000):Promise<string>{
 const result=await execFileAsync('git',args,{cwd,timeout,windowsHide:true,maxBuffer:1024*1024,shell:false,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 return String(result.stdout??'').trim();
}

export class GitHubHostOutbox{
 private readonly cwd:string;private readonly publishedPath:string;
 constructor(options:{cwd?:string;publishedPath?:string}={}){this.cwd=resolve(options.cwd??process.cwd());this.publishedPath=resolve(options.publishedPath??resolve(this.cwd,'data/runtime/github-host-outbox-published.json'))}
 private async state():Promise<PublishedFile>{try{const value=JSON.parse(await readFile(this.publishedPath,'utf8')) as PublishedFile;return value.version===1&&Array.isArray(value.ids)?value:{version:1,ids:[]}}catch(error:any){if(error?.code==='ENOENT')return{version:1,ids:[]};throw error}}
 private async mark(id:string):Promise<void>{const state=await this.state();state.ids=[...state.ids.filter(value=>value!==id),id].slice(-500);await mkdir(dirname(this.publishedPath),{recursive:true});await writeFile(this.publishedPath,JSON.stringify(state,null,2)+'\n','utf8')}
 async publishPending(jobs:QueuedHostJob[]):Promise<number>{const state=await this.state();let count=0;for(const item of jobs.filter(value=>value.job.id.startsWith('github-')&&['completed','blocked','failed'].includes(value.status)&&!state.ids.includes(value.job.id)).slice(-25)){await this.publish(item);await this.mark(item.job.id);state.ids.push(item.job.id);count++}return count}
 private async publish(item:QueuedHostJob):Promise<void>{
  await git(this.cwd,['fetch',REMOTE,`refs/heads/${OUTBOX_BRANCH}:${REMOTE_REF}`]);
  const worktree=await mkdtemp(resolve(tmpdir(),'munin-host-outbox-'));
  try{
   await git(this.cwd,['worktree','add','--detach',worktree,REMOTE_REF]);
   const receipt={version:1,jobId:item.job.id,type:item.job.type,status:item.status,finishedAt:item.finishedAt,result:item.result?{...item.result,summary:redactHostOutput(item.result.summary),evidence:item.result.evidence?.map(redactHostOutput)}:undefined};
   await writeFile(resolve(worktree,RECEIPT_FILE),JSON.stringify(receipt,null,2)+'\n','utf8');
   await git(worktree,['add','--',RECEIPT_FILE]);
   await git(worktree,['-c','user.name=Munin Host Worker','-c','user.email=host-worker@munin.local','commit','-m',`ops: receipt ${item.job.id}`]);
   await git(worktree,['push',REMOTE,`HEAD:refs/heads/${OUTBOX_BRANCH}`],30000);
  }finally{try{await git(this.cwd,['worktree','remove','--force',worktree])}catch{}await rm(worktree,{recursive:true,force:true,maxRetries:5,retryDelay:100})}
 }
}

export const githubHostOutboxContract=Object.freeze({remote:REMOTE,branch:OUTBOX_BRANCH,file:RECEIPT_FILE});
