import { randomUUID } from 'node:crypto';
import { EngineeringAgentRuntime, type EngineeringResult } from './engineering-runtime.js';

export type EngineeringJobStatus='queued'|'running'|'completed'|'needs_user'|'failed';
export type EngineeringJob={id:string;objective:string;status:EngineeringJobStatus;createdAt:string;startedAt?:string;completedAt?:string;result?:EngineeringResult;error?:string};

const jobs=new Map<string,EngineeringJob>();
const MAX_JOBS=30;

function prune(){if(jobs.size<=MAX_JOBS)return;const ordered=[...jobs.values()].filter(job=>job.status!=='running'&&job.status!=='queued').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));for(const job of ordered.slice(0,Math.max(0,jobs.size-MAX_JOBS)))jobs.delete(job.id)}

export class EngineeringJobManager{
 constructor(private readonly repo=process.cwd()){}
 start(objective:string){const id=randomUUID();const job:EngineeringJob={id,objective,status:'queued',createdAt:new Date().toISOString()};jobs.set(id,job);prune();queueMicrotask(()=>void this.run(id));return {...job}}
 get(id:string){const job=jobs.get(id);return job?{...job}:undefined}
 list(){return [...jobs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(job=>({...job}))}
 private async run(id:string){const job=jobs.get(id);if(!job)return;job.status='running';job.startedAt=new Date().toISOString();try{const result=await new EngineeringAgentRuntime(this.repo).execute(job.objective);job.result=result;job.status=result.status;job.completedAt=new Date().toISOString()}catch(error){job.status='failed';job.error=error instanceof Error?error.message:String(error);job.completedAt=new Date().toISOString()}}
}
