import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApprovalQueue, type ApprovalRecord } from './sentinel.js';
import type { ApprovalEffect, ApprovalEffectType } from './action-constitution.js';
export interface ApprovalExecutionReceipt { id:string; approvalId:string; effect:ApprovalEffect; idempotencyKey:string; status:'applying'|'applied'|'failed'|'reconcile_required'; createdAt:string; updatedAt:string; adapterId?:string; result?:unknown; error?:string; }
export interface ApprovalEffectAdapter { id:string; type:ApprovalEffectType; apply(effect:ApprovalEffect,context:{approval:ApprovalRecord;idempotencyKey:string}):Promise<unknown>; }

function effectKey(approvalId:string,effect:ApprovalEffect):string{return createHash('sha256').update(JSON.stringify([approvalId,effect.type,effect.resourceId,effect.payload??{}])).digest('hex');}
function safeError(error:unknown):string{return (error instanceof Error?error.message:String(error)).replace(/(?:bearer|token|secret|password|api.?key)\s*[:=]?\s*\S+/gi,'[redacted]').slice(0,500);}

export class ApprovalExecutor {
 private readonly adapters=new Map<ApprovalEffectType,ApprovalEffectAdapter>();
 constructor(private readonly approvals=new ApprovalQueue(),private readonly root=path.resolve('data/runtime/approval-execution')){}
 register(adapter:ApprovalEffectAdapter){if(this.adapters.has(adapter.type))throw new Error(`Approval executor already registered: ${adapter.type}`);this.adapters.set(adapter.type,adapter);return this;}
 private file(){return path.join(this.root,'receipts.json');}
 private lockDir(){return path.join(this.root,'.lock');}
 private async withLock<T>(fn:()=>Promise<T>):Promise<T>{await mkdir(this.root,{recursive:true});const deadline=Date.now()+2000;while(true){try{await mkdir(this.lockDir());break}catch{if(Date.now()>=deadline)throw new Error('Timed out acquiring approval execution lock');await new Promise(r=>setTimeout(r,10));}}try{return await fn()}finally{await rm(this.lockDir(),{recursive:true,force:true});}}
 private async load():Promise<ApprovalExecutionReceipt[]>{try{const parsed=JSON.parse(await readFile(this.file(),'utf8'));return Array.isArray(parsed)?parsed:[]}catch{return[];}}
 private async save(items:ApprovalExecutionReceipt[]){await mkdir(this.root,{recursive:true});await writeFile(this.file(),JSON.stringify(items,null,2)+'\n','utf8');}
 async list():Promise<ApprovalExecutionReceipt[]>{return this.load();}
 async execute(approvalId:string):Promise<ApprovalExecutionReceipt>{
  const approval=await this.approvals.get(approvalId);
  if(!approval)throw new Error(`Approval ${approvalId} not found.`);
  if(approval.status!=='approved'||approval.resolvedBy!=='human')throw new Error('Human approval is required before execution.');
  const effect=approval.decision.request.effect;
  if(!effect)throw new Error('Approval has no typed execution effect.');
  const adapter=this.adapters.get(effect.type);
  if(!adapter)throw new Error(`No executor registered for ${effect.type}.`);
  const idempotencyKey=effectKey(approval.id,effect);
  const claim=await this.withLock(async()=>{const items=await this.load();const existing=items.find(x=>x.idempotencyKey===idempotencyKey);if(existing)return {receipt:existing,created:false};const now=new Date().toISOString();const receipt:ApprovalExecutionReceipt={id:`approval-exec-${randomUUID().slice(0,8)}`,approvalId:approval.id,effect,idempotencyKey,status:'applying',createdAt:now,updatedAt:now,adapterId:adapter.id};items.push(receipt);await this.save(items);return {receipt,created:true};});
  if(!claim.created){if(claim.receipt.status==='applying')return this.settle(claim.receipt.id,{status:'reconcile_required',error:'Execution already claimed; outcome must be reconciled before retry.'});return claim.receipt;}
  try{return this.settle(claim.receipt.id,{status:'applied',result:await adapter.apply(effect,{approval,idempotencyKey})});}catch(error){return this.settle(claim.receipt.id,{status:'failed',error:safeError(error)});}
 }
 private async settle(id:string,patch:Pick<ApprovalExecutionReceipt,'status'> & Partial<Pick<ApprovalExecutionReceipt,'result'|'error'>>):Promise<ApprovalExecutionReceipt>{return this.withLock(async()=>{const items=await this.load();const receipt=items.find(x=>x.id===id);if(!receipt)throw new Error(`Approval execution receipt not found: ${id}`);receipt.status=patch.status;receipt.updatedAt=new Date().toISOString();if('result'in patch)receipt.result=patch.result;if(patch.error)receipt.error=patch.error;await this.save(items);return {...receipt,effect:{...receipt.effect,payload:receipt.effect.payload?{...receipt.effect.payload}:undefined}};});}
}

export function createUnavailableApprovalAdapter(type:ApprovalEffectType):ApprovalEffectAdapter{return{id:`unavailable:${type}`,type,async apply(){throw new Error(`${type} transport is not configured; approval remains recorded but no external action was executed.`);}};}
