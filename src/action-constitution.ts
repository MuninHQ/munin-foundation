import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ActionClass='read'|'local-write'|'git-write'|'network-read'|'external-write'|'destructive';
export type PolicyDecision='allow'|'deny'|'needs_user';
export type ActionRequest={class:ActionClass;tool:string;target?:string;payloadPreview?:string;reason?:string};
export type PolicyResult={decision:PolicyDecision;rule:string;request:ActionRequest};

const secretPattern=/(?:api[_-]?key|secret|password|passwd|token|authorization|bearer|private[_-]?key)\s*[:=]\s*[^\s]{6,}/i;
const protectedPathPattern=/(^|\/)(?:\.git|node_modules|data\/runtime)(\/|$)|(^|\/)\.env(?:\.|$)/i;
const destructiveToolPattern=/(?:rm|del|remove|delete|drop|destroy|format|reset --hard|clean -fd)/i;

export function evaluateAction(request:ActionRequest):PolicyResult{
 const text=`${request.tool} ${request.target??''} ${request.payloadPreview??''}`;
 if(secretPattern.test(text))return {decision:'deny',rule:'secret-exfiltration-block',request};
 if(request.target&&protectedPathPattern.test(request.target.replace(/\\/g,'/')))return {decision:'deny',rule:'protected-path-block',request};
 if(request.class==='destructive'||destructiveToolPattern.test(request.tool))return {decision:'needs_user',rule:'destructive-action-escalation',request};
 if(request.class==='external-write')return {decision:'needs_user',rule:'external-write-escalation',request};
 if(['read','local-write','git-write','network-read'].includes(request.class))return {decision:'allow',rule:`allow-${request.class}`,request};
 return {decision:'deny',rule:'default-deny',request};
}

export function requireAllowed(request:ActionRequest){const result=evaluateAction(request);if(result.decision!=='allow')throw new Error(`Munin policy ${result.decision}: ${result.rule}`);return result}

export class ActionAuditLog{
 constructor(private readonly file=path.resolve('data/runtime/action-audit.jsonl')){}
 async append(result:PolicyResult){await mkdir(path.dirname(this.file),{recursive:true});const record={id:randomUUID(),at:new Date().toISOString(),...result};await appendFile(this.file,JSON.stringify(record)+'\n','utf8');return record}
}
