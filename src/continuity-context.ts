import { ContinuityMemoryStore, type MemoryRecord } from './continuity-memory.js';

export type ContinuityContextPackage={query:string;generatedAt:string;memories:MemoryRecord[];text:string};

function line(record:MemoryRecord){const provenance=[record.source,record.confidence,record.freshness].filter(Boolean).join(' · ');return `- [${record.kind}] ${record.subject}: ${record.content} (${provenance})`;}

export async function buildContinuityContext(query:string,limit=8,store=new ContinuityMemoryStore()):Promise<ContinuityContextPackage>{
  const memories=await store.context(query,limit);
  return {query,generatedAt:new Date().toISOString(),memories,text:memories.length?memories.map(line).join('\n'):'Nenhuma memória de continuidade relevante encontrada.'};
}

export async function answerFromContinuity(query:string,store=new ContinuityMemoryStore()):Promise<string|undefined>{
  const context=await buildContinuityContext(query,8,store);
  if(!context.memories.length)return undefined;
  return `Memória de continuidade para “${query}”:\n${context.text}`;
}
