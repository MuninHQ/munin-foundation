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

function normalized(value:string){return value.toLocaleLowerCase().replace(/\s+/g,' ').trim();}

export function reviewChatGptRecordForProject(record:MemoryInput):ChatGptPromotionDecision{
  const reasons:string[]=[];
  const text=normalized(`${record.subject}\n${record.content}\n${record.tags.join(' ')}`);
  const explicitTag=record.tags.some(tag=>normalized(tag)==='munin');
  const marker=PROJECT_MARKERS.find(term=>text.includes(term));
  if(explicitTag)reasons.push('explicit-munin-tag');
  if(marker)reasons.push(`project-marker:${marker}`);
  if(EXCLUDED_PERSONAL_KINDS.has(record.kind)&&!explicitTag&&!marker)reasons.push('personal-kind-without-project-context');
  const accepted=(explicitTag||Boolean(marker))&&!reasons.includes('personal-kind-without-project-context');
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
