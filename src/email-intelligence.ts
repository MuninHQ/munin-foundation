import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runtimePath } from './config.js';
import { CareerInboxStore, type CareerEmail } from './career-inbox.js';
import { scoreEmailInterest } from './email-interest.js';

export interface EmailIntelligenceSnapshot {
  generatedAt: string;
  syncedAt?: string;
  total: number;
  unreadActionable: number;
  careerActionable: number;
  generalActionable: number;
  reviewRequired: number;
  interestingReads: number;
  reference: number;
  noise: number;
  topActions: Array<{ id:string; subject:string; from?:string; receivedAt:string; attention:string; reason?:string; linkedJobId?:string; linkedActionId?:string }>;
  topReads: Array<{ id:string; subject:string; from?:string; receivedAt:string; score:number; reasons:string[] }>;
}

function actionable(message: CareerEmail): boolean {
  return !message.handled && message.needsAction === true;
}

export function summarizeEmailIntelligence(messages: CareerEmail[], syncedAt?: string, now = new Date()): EmailIntelligenceSnapshot {
  const open = messages.filter(message => !message.handled);
  const priority = (message: CareerEmail): number => message.attention === 'career' ? 0 : message.attention === 'general_action' ? 1 : message.attention === 'reference' ? 2 : 3;
  const topActions = open.filter(message => message.needsAction || message.attention === 'career')
    .sort((a,b) => priority(a)-priority(b) || Date.parse(b.receivedAt)-Date.parse(a.receivedAt))
    .slice(0,20)
    .map(message => ({
      id: message.id,
      subject: message.subject,
      from: message.fromName || message.fromEmail,
      receivedAt: message.receivedAt,
      attention: message.attention ?? 'reference',
      reason: message.actionReason ?? message.suggestedAction,
      linkedJobId: message.linkedJobId,
      linkedActionId: message.linkedActionId,
    }));
  const topReads=open
    .filter(message=>message.attention==='reference'&&!message.needsAction)
    .map(message=>({message,interest:scoreEmailInterest(message)}))
    .filter(item=>item.interest.score>=3)
    .sort((a,b)=>b.interest.score-a.interest.score||Date.parse(b.message.receivedAt)-Date.parse(a.message.receivedAt))
    .slice(0,12)
    .map(({message,interest})=>({id:message.id,subject:message.subject,from:message.fromName||message.fromEmail,receivedAt:message.receivedAt,score:interest.score,reasons:interest.reasons}));
  return {
    generatedAt: now.toISOString(), syncedAt, total: messages.length,
    unreadActionable: open.filter(actionable).length,
    careerActionable: open.filter(m => m.attention === 'career' && m.needsAction).length,
    generalActionable: open.filter(m => m.attention === 'general_action' && m.needsAction).length,
    reviewRequired: open.filter(m => m.needsAction && !m.linkedActionId && m.attention === 'general_action').length,
    interestingReads: topReads.length,
    reference: open.filter(m => m.attention === 'reference').length,
    noise: messages.filter(m => m.attention === 'noise').length,
    topActions,
    topReads,
  };
}

export class EmailIntelligenceStore {
  constructor(private readonly path = runtimePath('email-intelligence.json')) {}
  async write(snapshot: EmailIntelligenceSnapshot): Promise<void> { await mkdir(dirname(this.path), { recursive:true }); const tmp=`${this.path}.tmp`; await writeFile(tmp, JSON.stringify(snapshot,null,2)+'\n','utf8'); await rename(tmp,this.path); }
  async read(): Promise<EmailIntelligenceSnapshot | undefined> { try { return JSON.parse(await readFile(this.path,'utf8')) as EmailIntelligenceSnapshot; } catch (error:any) { if (error?.code === 'ENOENT') return undefined; throw error; } }
}

export async function refreshEmailIntelligence(root?: string): Promise<EmailIntelligenceSnapshot> {
  const inbox = await new CareerInboxStore(root).load();
  const snapshot = summarizeEmailIntelligence(inbox.messages, inbox.syncedAt);
  await new EmailIntelligenceStore().write(snapshot);
  return snapshot;
}
