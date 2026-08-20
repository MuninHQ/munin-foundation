import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runtimePath } from './config.js';

export interface EmailWorkerHealth {
  updatedAt:string;
  lastSuccessAt?:string;
  lastFailureAt?:string;
  consecutiveFailures:number;
  lastSummary?:string;
  providers?:string[];
  needsConnection?:boolean;
}

export class EmailWorkerHealthStore {
  constructor(private readonly path=runtimePath('email-worker-health.json')){}
  async read():Promise<EmailWorkerHealth|undefined>{try{return JSON.parse(await readFile(this.path,'utf8')) as EmailWorkerHealth}catch(error:any){if(error?.code==='ENOENT')return undefined;throw error}}
  async write(health:EmailWorkerHealth):Promise<void>{await mkdir(dirname(this.path),{recursive:true});const tmp=`${this.path}.tmp`;await writeFile(tmp,JSON.stringify(health,null,2)+'\n','utf8');await rename(tmp,this.path)}
  async success(input:{providers?:string[];needsConnection?:boolean;summary?:string},at=new Date().toISOString()):Promise<EmailWorkerHealth>{const previous=await this.read();const health:EmailWorkerHealth={updatedAt:at,lastSuccessAt:at,lastFailureAt:previous?.lastFailureAt,consecutiveFailures:0,lastSummary:input.summary,providers:[...(input.providers??[])],needsConnection:input.needsConnection===true};await this.write(health);return health}
  async failure(summary:string,at=new Date().toISOString()):Promise<EmailWorkerHealth>{const previous=await this.read();const health:EmailWorkerHealth={updatedAt:at,lastSuccessAt:previous?.lastSuccessAt,lastFailureAt:at,consecutiveFailures:(previous?.consecutiveFailures??0)+1,lastSummary:summary,providers:previous?.providers,needsConnection:previous?.needsConnection};await this.write(health);return health}
}

export function emailWorkerHealthStatus(health:EmailWorkerHealth|undefined,now=Date.now()):'unknown'|'healthy'|'stale'|'degraded'|'needs_connection'{
  if(!health)return'unknown';
  if(health.needsConnection)return'needs_connection';
  if(health.consecutiveFailures>=2)return'degraded';
  const success=Date.parse(health.lastSuccessAt??'');
  if(!Number.isFinite(success)||now-success>60*60_000)return'stale';
  return'healthy';
}
