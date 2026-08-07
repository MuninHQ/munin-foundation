import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { JobOpportunity, JobStatus } from './types.js';

export type EmailProvider = 'gmail' | 'outlook' | 'capture';
export type CareerEmailCategory = 'application_confirmation' | 'interview_invite' | 'recruiter_reply' | 'information_request' | 'rejection' | 'offer' | 'assessment' | 'job_alert' | 'other';

export interface CareerEmail {
  id: string;
  provider: EmailProvider;
  providerMessageId: string;
  threadId?: string;
  fromName?: string;
  fromEmail?: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: CareerEmailCategory;
  confidence: number;
  detectedCompany?: string;
  detectedRole?: string;
  suggestedStatus?: JobStatus;
  suggestedAction?: string;
  linkedJobId?: string;
  handled: boolean;
}

export interface InboxState { messages: CareerEmail[]; syncedAt?: string; }

const patterns: Array<[CareerEmailCategory, RegExp, JobStatus | undefined, string]> = [
  ['offer', /\b(offer|proposta|compensation package)\b/i, 'offer', 'Review offer and compensation'],
  ['rejection', /\b(unfortunately|not moving forward|não seguiremos|não avançaremos|rejeiç|regret to inform)\b/i, 'rejected', 'Review rejection before closing opportunity'],
  ['interview_invite', /\b(interview|entrevista|schedule a call|agendar.*conversa|availability|disponibilidade)\b/i, 'interview', 'Confirm interview details and prepare war room'],
  ['assessment', /\b(assessment|case study|take-home|teste|desafio)\b/i, 'interview', 'Complete assessment before deadline'],
  ['application_confirmation', /\b(application received|application submitted|candidatura recebida|inscrição confirmada|thank you for applying)\b/i, 'applied', 'Confirm application in pipeline'],
  ['information_request', /\b(send us|provide|additional information|mais informações|salary expectation|pretensão salarial)\b/i, undefined, 'Prepare requested information'],
  ['recruiter_reply', /\b(recruiter|talent acquisition|recrutador|recrutamento|hiring team)\b/i, undefined, 'Review recruiter message'],
  ['job_alert', /\b(job alert|vagas para você|new jobs|oportunidades recomendadas)\b/i, undefined, 'Review job alert'],
];

function normalize(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export function classifyCareerEmail(input: Pick<CareerEmail, 'subject' | 'snippet' | 'fromEmail'>, jobs: JobOpportunity[]): Omit<CareerEmail, 'id' | 'provider' | 'providerMessageId' | 'threadId' | 'fromName' | 'receivedAt' | 'handled'> {
  const text = `${input.subject}\n${input.snippet}\n${input.fromEmail ?? ''}`;
  const match = patterns.find(([, pattern]) => pattern.test(text));
  const category = match?.[0] ?? 'other';
  const confidence = match ? 0.86 : 0.35;
  const normalized = normalize(text);
  const ranked = jobs.map(job => {
    const company = normalize(job.company); const role = normalize(job.role);
    let score = 0;
    if (company && normalized.includes(company)) score += 3;
    for (const token of role.split(/\s+/).filter(token => token.length > 3)) if (normalized.includes(token)) score += 1;
    return { job, score };
  }).sort((a,b) => b.score - a.score);
  const linked = ranked[0]?.score >= 3 ? ranked[0].job : undefined;
  return {
    subject: input.subject,
    snippet: input.snippet,
    fromEmail: input.fromEmail,
    category,
    confidence: linked ? Math.min(0.99, confidence + 0.08) : confidence,
    detectedCompany: linked?.company,
    detectedRole: linked?.role,
    suggestedStatus: match?.[2],
    suggestedAction: match?.[3],
    linkedJobId: linked?.id,
  };
}

export class CareerInboxStore {
  constructor(private readonly root = process.env.MUNIN_DATA_DIR ?? path.resolve('data/runtime')) {}
  private file(): string { return path.join(this.root, 'career-inbox.json'); }
  async load(): Promise<InboxState> { await mkdir(this.root,{recursive:true}); try { return JSON.parse(await readFile(this.file(),'utf8')) as InboxState; } catch { return { messages: [] }; } }
  async save(state: InboxState): Promise<void> { await mkdir(this.root,{recursive:true}); await writeFile(this.file(),JSON.stringify(state,null,2)+'\n','utf8'); }
  async upsert(messages: CareerEmail[]): Promise<{ added:number; duplicates:number }> {
    const state = await this.load(); const keys = new Set(state.messages.map(m => `${m.provider}:${m.providerMessageId}`)); let added=0; let duplicates=0;
    for (const message of messages) { const key=`${message.provider}:${message.providerMessageId}`; if(keys.has(key)){duplicates++;continue;} state.messages.push(message); keys.add(key); added++; }
    state.messages.sort((a,b)=>new Date(b.receivedAt).getTime()-new Date(a.receivedAt).getTime()); state.syncedAt=new Date().toISOString(); await this.save(state); return {added,duplicates};
  }
}
