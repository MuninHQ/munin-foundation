import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EngineeringAgentRuntime, type EngineeringResult } from './engineering-runtime.js';

export type EngineeringJobStatus='queued'|'running'|'completed'|'needs_user'|'failed';
export type EngineeringJob={id:string;objective:string;status:EngineeringJobStatus;createdAt:string;startedAt?:string;completedAt?:string;result?:EngineeringResult;error?:string};

const MAX_JOBS=30;
const interruptedResult=(job:EngineeringJob):EngineeringResult=>({status:'needs_user',objective:job.objective,changedFiles:[],events:[{phase:'needs_user',message:'Desktop runtime restarted while this build was executing.',at:new Date().toISOString()}],message:'O runtime reiniciou durante este build. O objetivo foi preservado, mas o Munin não repetirá efeitos externos automaticamente sem um checkpoint seguro.'});

export class EngineeringJobManager{
 private readonly jobs=new Map<string,EngineeringJob>();
 private readonly file:string;
 constructor(private readonly repo=process.cwd(),file?:string){this.file=file??path.join(repo,'data/runtime/engineering-jobs.json');this.load()}
 start(objective:string){const id=randomUUID();const job:EngineeringJob={id,objective,status:'queued',createdAt:new Date().toISOString()};this.jobs.set(id,job);this.prune();this.persist();queueMicrotask(()=>void this.run(id));return {...job}}
 get(id:string){const job=this.jobs.get(id);return job?{...job}:undefined}
 list(){return [...this.jobs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(job=>({...job}))}
 private load(){if(!existsSync(this.file))return;try{const parsed=JSON.parse(readFileSync(this.file,'utf8')) as EngineeringJob[];for(const raw of parsed){const job={...raw};if(job.status==='queued'||job.status==='running'){job.status='needs_user';job.completedAt=new Date().toISOString();job.result=interruptedResult(job)}this.jobs.set(job.id,job)}this.prune();this.persist()}catch{/* corrupted runtime state must not prevent Munin startup */}}
 private persist(){mkdirSync(path.dirname(this.file),{recursive:true});const temp=`${this.file}.tmp`;writeFileSync(temp,JSON.stringify(this.list(),null,2)+'\n','utf8');renameSync(temp,this.file)}
 private prune(){if(this.jobs.size<=MAX_JOBS)return;const ordered=[...this.jobs.values()].filter(job=>job.status!=='running'&&job.status!=='queued').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));for(const job of ordered.slice(0,Math.max(0,this.jobs.size-MAX_JOBS)))this.jobs.delete(job.id)}
 private async run(id:string){const job=this.jobs.get(id);if(!job)return;job.status='running';job.startedAt=new Date().toISOString();this.persist();try{const result=await new EngineeringAgentRuntime(this.repo).execute(job.objective);job.result=result;job.status=result.status;job.completedAt=new Date().toISOString()}catch(error){job.status='failed';job.error=error instanceof Error?error.message:String(error);job.completedAt=new Date().toISOString()}finally{this.persist()}}
}
