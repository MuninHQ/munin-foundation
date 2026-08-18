import { ContinuityMemoryStore, type MemoryInput } from './continuity-memory.js';
import { MemoryLedger } from './memory-ledger.js';

export type ChatGptPromotionDecision={record:MemoryInput;accepted:boolean;reasons:string[]};
export type ChatGptPromotionReport={reviewed:number;accepted:number;rejected:number;continuity:{added:number;updated:number;superseded:number;total:number};ledgerAdded:number;decisions:ChatGptPromotionDecision[]};

export interface ChatGptPromotionDependencies {
  continuity?: ContinuityMemoryStore;
  ledger?: MemoryLedger;
  projectId?: string;
}

const PROJECT_MARKERS=[
  'munin','control room','orchestrator','autonomous execution','memory ledger','career mobile intake','career inbox','career intelligence','lovable','muninhq','munin-foundation','aip','andre intelligence platform',
];
const EXCLUDED_PERSONAL_KINDS=new Set(['identity','preference']);
const SENSITIVE_PATTERNS:[label:string,pattern:RegExp][]=[
  ['private-key',/-----begin (?:rsa |ec |openssh )?private key-----/i],
  ['api-key',/\b(?:api[_ -]?key|access[_ -]?key|secret[_ -]?key)\b\s*[:=]\s*\S{8,}/i],
  ['bearer-token',/\bbearer\s+[a-z0-9._~+\/-]{12,}={0,2}\b/i],
  ['provider-token',/\b(?:sk-[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9]{20,})\b/i],
  ['password',/\b(?:password|senha)\b\s*[:=]\s*\S{4,}/i],
  ['otp',/\b(?:otp|2fa|verification code|código de verificação|codigo de verificacao)\b\s*[:=]?\s*\d{4,10}\b/i],
];

function normalized(value:string){return value.toLocaleLowerCase().replace(/\s+/g,' ').trim();}
export function sensitiveHistoricalContent(value:string){return SENSITIVE_PATTERNS.filter(([,pattern])=>pattern.test(value)).map(([label])=>label);}

export function reviewChatGptRecordForProject(record:MemoryInput):ChatGptPromotionDecision{
  const reasons:string[]=[];
  const rawText=`${record.subject}\n${record.content}\n${record.tags.join(' ')}`;
  const text=normalized(rawText);
  const explicitTag=record.tags.some(tag=>normalized(tag)==='munin');
  const marker=PROJECT_MARKERS.find(term=>text.includes(term));
  const sensitive=sensitiveHistoricalContent(rawText);
  if(explicitTag)reasons.push('explicit-munin-tag');
  if(marker)reasons.push(`project-marker:${marker}`);
  if(sensitive.length)reasons.push(...sensitive.map(label=>`sensitive-content:${label}`));
  if(EXCLUDED_PERSONAL_KINDS.has(record.kind)&&!explicitTag&&!marker)reasons.push('personal-kind-without-project-context');
  const accepted=(explicitTag||Boolean(marker))&&!reasons.some(reason=>reason.startsWith('sensitive-content:'))&&!reasons.includes('personal-kind-without-project-context');
  if(!accepted&&reasons.length===0)reasons.push('no-project-relevance-signal');
  return {record,accepted,reasons};
}

function ledgerKind(record:MemoryInput){return record.kind==='decision'?'decision' as const:'conversation' as const;}

export async function promoteChatGptProjectMemory(records:MemoryInput[],dependencies:ChatGptPromotionDependencies={}):Promise<ChatGptPromotionReport>{
  const continuity=dependencies.continuity??new ContinuityMemoryStore();
  const ledger=dependencies.ledger??new MemoryLedger();
  const projectId=dependencies.projectId??'munin';
  const decisions=records.map(reviewChatGptRecordForProject);
  const accepted=decisions.filter(item=>item.accepted).map(item=>item.record);
  const continuityResult=await continuity.import(accepted);
  let ledgerAdded=0;
  for(const record of accepted){
    const result=await ledger.append({
      kind:ledgerKind(record),
      scope:'project',
      source:record.source,
      summary:record.subject,
      projectId,
      occurredAt:record.observedAt,
      payload:{
        memoryKind:record.kind,
        content:record.content,
        tags:record.tags,
        confidence:record.confidence,
        lastConfirmedAt:record.lastConfirmedAt,
        provenance:'chatgpt-export-reviewed',
      },
    });
    if(result.added)ledgerAdded++;
  }
  return {reviewed:records.length,accepted:accepted.length,rejected:records.length-accepted.length,continuity:continuityResult,ledgerAdded,decisions};
}
