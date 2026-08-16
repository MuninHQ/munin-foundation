import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type DurableEffectStatus='pending'|'completed'|'uncertain';
export type DurableEffectRecord={id:string;key:string;kind:string;status:DurableEffectStatus;createdAt:string;updatedAt:string;evidence?:string;attempts:number};
export type BeginEffectResult={decision:'execute'|'already_completed'|'needs_reconciliation';record:DurableEffectRecord};

function stableKey(kind:string,identity:string){return createHash('sha256').update(`${kind}\n${identity}`).digest('hex')}

export class DurableEffectLedger{
 private readonly records=new Map<string,DurableEffectRecord>();
 constructor(private readonly file=path.resolve('data/runtime/durable-effects.json')){this.load()}
 begin(kind:string,identity:string):BeginEffectResult{
  const key=stableKey(kind,identity);const existing=this.records.get(key);
  if(existing?.status==='completed')return {decision:'already_completed',record:{...existing}};
  if(existing?.status==='pending'||existing?.status==='uncertain')return {decision:'needs_reconciliation',record:{...existing}};
  const now=new Date().toISOString();const record:DurableEffectRecord={id:randomUUID(),key,kind,status:'pending',createdAt:now,updatedAt:now,attempts:1};this.records.set(key,record);this.persist();return {decision:'execute',record:{...record}}
 }
 retryAfterReconciliation(kind:string,identity:string){const key=stableKey(kind,identity);const record=this.records.get(key);if(!record)throw new Error('Durable effect not found.');record.status='pending';record.attempts++;record.updatedAt=new Date().toISOString();this.persist();return {...record}}
 complete(kind:string,identity:string,evidence?:string){const key=stableKey(kind,identity);const record=this.records.get(key);if(!record)throw new Error('Durable effect not found.');record.status='completed';record.evidence=evidence;record.updatedAt=new Date().toISOString();this.persist();return {...record}}
 uncertain(kind:string,identity:string,evidence?:string){const key=stableKey(kind,identity);const record=this.records.get(key);if(!record)throw new Error('Durable effect not found.');record.status='uncertain';record.evidence=evidence;record.updatedAt=new Date().toISOString();this.persist();return {...record}}
 get(kind:string,identity:string){const record=this.records.get(stableKey(kind,identity));return record?{...record}:undefined}
 list(){return [...this.records.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(x=>({...x}))}
 private load(){if(!existsSync(this.file))return;try{const parsed=JSON.parse(readFileSync(this.file,'utf8')) as DurableEffectRecord[];for(const record of parsed)this.records.set(record.key,record)}catch{/* a damaged ledger must fail closed through missing checkpoint rather than crash startup */}}
 private persist(){mkdirSync(path.dirname(this.file),{recursive:true});const temp=`${this.file}.tmp`;writeFileSync(temp,JSON.stringify(this.list(),null,2)+'\n','utf8');renameSync(temp,this.file)}
}
