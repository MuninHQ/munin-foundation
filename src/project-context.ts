import { ProjectMemoryStore } from './project-memory.js';

export async function answerFromProjectMemory(query:string):Promise<string|undefined>{
  const store=new ProjectMemoryStore();
  const records=await store.search(query,8);
  if(!records.length)return undefined;
  const lines=records.map(record=>{
    const issues=record.relatedIssues.length?` [${record.relatedIssues.join(', ')}]`:'';
    return `- ${record.kind}: ${record.title}${issues} — ${record.content} (source: ${record.source}; ${record.confidence}; ${record.observedAt})`;
  });
  return `Memória do projeto Munin:\n${lines.join('\n')}`;
}
