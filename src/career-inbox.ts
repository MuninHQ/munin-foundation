import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './config.js';
import { writeJsonAtomic } from './storage.js';
import type { JobOpportunity, JobStatus } from './types.js';

export type EmailProvider = 'gmail' | 'outlook' | 'capture';
export type CareerEmailCategory = 'application_confirmation' | 'interview_invite' | 'recruiter_reply' | 'information_request' | 'rejection' | 'offer' | 'assessment' | 'job_alert' | 'other';
export type EmailAttention = 'career' | 'general_action' | 'reference' | 'noise';

export interface CareerEmail {
  id: string; provider: EmailProvider; providerMessageId: string; threadId?: string;
  fromName?: string; fromEmail?: string; subject: string; snippet: string; receivedAt: string;
  category: CareerEmailCategory; confidence: number; detectedCompany?: string; detectedRole?: string;
  suggestedStatus?: JobStatus; suggestedAction?: string; linkedJobId?: string; linkedActionId?: string; handled: boolean;
  attention?: EmailAttention; needsAction?: boolean; actionReason?: string;
}
export interface InboxState { messages: CareerEmail[]; syncedAt?: string; }

const patterns: Array<[CareerEmailCategory, RegExp, JobStatus | undefined, string]> = [
  ['offer', /\b(offer|job offer|employment offer|proposta|compensation package)\b/i, 'offer', 'Review offer and compensation'],
  ['rejection', /\b(unfortunately|not moving forward|not selected|não seguiremos|não avançaremos|rejeiç|regret to inform|decided not to proceed)\b/i, 'rejected', 'Review rejection before closing opportunity'],
  ['interview_invite', /\b(interview|entrevista|schedule (?:a )?call|agendar.*conversa|availability|disponibilidade|meeting with.*recruit|conversation with.*recruit)\b/i, 'interview', 'Confirm interview details and prepare war room'],
  ['assessment', /\b(assessment|case study|take-home|technical challenge|teste técnico|desafio|coding challenge)\b/i, 'interview', 'Complete assessment before deadline'],
  ['application_confirmation', /\b(application (?:received|submitted|confirmed)|application to .+ confirmed|your application|candidatura recebida|candidatura confirmada|inscrição confirmada|thank you for applying|thanks for applying|recebemos sua candidatura)\b/i, 'applied', 'Confirm application in pipeline'],
  ['information_request', /\b(additional information|salary expectation|pretensão salarial|documents required|documentação para (?:a )?(?:vaga|processo)|dados adicionais.*(?:vaga|processo))\b/i, undefined, 'Prepare requested information'],
  ['recruiter_reply', /\b(recruiter|talent acquisition|recrutador|recrutamento|hiring team|talent partner|people team)\b/i, undefined, 'Review recruiter message'],
  ['job_alert', /\b(job alert|vagas para você|new jobs|oportunidades recomendadas|jobs you may be interested in)\b/i, undefined, 'Review job alert'],
];
const noise = /github|workflow|pull request|verification code|security alert|identity check|wemade|night crows|password|sign[- ]?in|newsletter|promotion/i;
const generalActionPatterns: Array<[RegExp,string]> = [
  [/\b(action required|action needed|requires? your action|please respond|please reply|response required|reply requested)\b/i,'Explicit response requested'],
  [/\b(approval required|please approve|approve by|signature required|please sign|sign by)\b/i,'Approval or signature requested'],
  [/\b(payment due|invoice due|overdue|vencimento|vencido|pagamento pendente|fatura em aberto)\b/i,'Payment or billing action may be due'],
  [/\b(deadline|due date|by end of day|by eod|até hoje|prazo|data limite)\b/i,'Deadline detected'],
  [/\b(confirm(?:ation)? required|please confirm|confirme|confirmação necessária|rsvp)\b/i,'Confirmation requested'],
  [/\b(send us|send me|envie|encaminhe|provide the|forneça|precisamos de você|necessário enviar)\b/i,'Information or document requested'],
];
function normalize(value:string):string{return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function tokens(value:string):string[]{return normalize(value).split(/[^a-z0-9]+/).filter(t=>t.length>3&&!['para','with','from','your','vaga','position','application','entrevista','interview','analista','senior'].includes(t));}
function alertIdentity(subject:string,fromEmail?:string):{role?:string;company?:string;isAlert:boolean}{
  const from=normalize(fromEmail??'');
  const linkedinAlert=from.includes('jobalerts-noreply@linkedin.com')||from.includes('jobs-noreply@linkedin.com');
  const explicit=subject.match(/^(?:vaga de\s+)?(.+?)\s+na empresa\s+(.+?)(?:\s+-\s+contratando agora)?$/i);
  if(explicit)return{role:explicit[1].trim(),company:explicit[2].trim(),isAlert:true};
  const english=subject.match(/^(.+?)\s+at\s+(.+)$/i);
  if(linkedinAlert&&english)return{role:english[1].trim(),company:english[2].trim(),isAlert:true};
  return{isAlert:linkedinAlert};
}
function generalAction(text:string,category:CareerEmailCategory):{needsAction:boolean;actionReason?:string;attention:EmailAttention}{
  if(category!=='other')return{needsAction:!['rejection','application_confirmation','job_alert'].includes(category),attention:category==='job_alert'?'noise':'career'};
  if(noise.test(text))return{needsAction:false,attention:'noise'};
  const match=generalActionPatterns.find(([pattern])=>pattern.test(text));
  if(match)return{needsAction:true,actionReason:match[1],attention:'general_action'};
  return{needsAction:false,attention:'reference'};
}

export function classifyCareerEmail(input: Pick<CareerEmail,'subject'|'snippet'|'fromEmail'>, jobs:JobOpportunity[]): Omit<CareerEmail,'id'|'provider'|'providerMessageId'|'threadId'|'fromName'|'receivedAt'|'handled'> {
  const text=`${input.subject}\n${input.snippet}\n${input.fromEmail??''}`;
  const alert=alertIdentity(input.subject,input.fromEmail);
  const match=patterns.find(([,p])=>p.test(text));
  let category:CareerEmailCategory=alert.isAlert?'job_alert':match?.[0]??'other';
  if(category==='other'&&noise.test(text)) category='other';
  const normalized=normalize(text); const subjectTokens=tokens(input.subject);
  const ranked=jobs.map(job=>{const company=normalize(job.company);const roleTokens=tokens(job.role);let score=0;if(company&&normalized.includes(company))score+=6;const hits=roleTokens.filter(t=>subjectTokens.includes(t)||normalized.includes(t)).length;score+=hits*1.5;if(roleTokens.length>=2&&hits>=Math.min(2,roleTokens.length))score+=2;return{job,score,hits};}).sort((a,b)=>b.score-a.score);
  const best=ranked[0]; const linked=best&&(best.score>=5||(best.hits>=2&&best.score>=4))?best.job:undefined;
  const confidence=alert.isAlert?0.95:match?0.86:0.20;
  const attention=generalAction(text,category);
  return {subject:input.subject,snippet:input.snippet,fromEmail:input.fromEmail,category,confidence:linked?Math.min(.99,confidence+.05):confidence,detectedCompany:linked?.company??alert.company,detectedRole:linked?.role??alert.role,suggestedStatus:match?.[2],suggestedAction:category==='job_alert'?'Review job alert':match?.[3],linkedJobId:linked?.id,...attention};
}

export class CareerInboxStore {
  constructor(private readonly root=dataDir()){}
  private file():string{return path.join(this.root,'career-inbox.json');}
  async load():Promise<InboxState>{await mkdir(this.root,{recursive:true});try{return JSON.parse(await readFile(this.file(),'utf8')) as InboxState;}catch{return{messages:[]};}}
  async save(state:InboxState):Promise<void>{await writeJsonAtomic(this.file(),state);}
  async upsert(messages:CareerEmail[]):Promise<{added:number;duplicates:number}>{
    const state=await this.load(); const byKey=new Map(state.messages.map((m,i)=>[`${m.provider}:${m.providerMessageId}`,i])); let added=0,duplicates=0;
    for(const message of messages){const key=`${message.provider}:${message.providerMessageId}`;const idx=byKey.get(key);const isNoise=(message.category==='other'||message.category==='job_alert')&&!message.needsAction;if(idx!==undefined){const existing=state.messages[idx];state.messages[idx]={...message,id:existing.id,handled:existing.handled||isNoise,linkedActionId:existing.linkedActionId};duplicates++;continue;}state.messages.push({...message,handled:message.handled||isNoise});byKey.set(key,state.messages.length-1);added++;}
    const seen=new Set<string>();
    for(const m of [...state.messages].sort((a,b)=>new Date(b.receivedAt).getTime()-new Date(a.receivedAt).getTime())){if(m.handled)continue;const process=m.linkedJobId||m.threadId; if(!process)continue;const key=`${process}:${m.category}:${m.attention??''}`;if(seen.has(key))m.handled=true;else seen.add(key);}
    state.messages.sort((a,b)=>new Date(b.receivedAt).getTime()-new Date(a.receivedAt).getTime());state.syncedAt=new Date().toISOString();await this.save(state);return{added,duplicates};
  }
}
