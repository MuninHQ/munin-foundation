import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type MemoryKind='identity'|'career'|'goal'|'project'|'preference'|'decision'|'evidence'|'event'|'learning';
export type MemoryConfidence='confirmed'|'inferred';
export type MemoryRecord={id:string;kind:MemoryKind;subject:string;content:string;tags:string[];source:string;confidence:MemoryConfidence;observedAt:string;lastConfirmedAt?:string;freshness?:'current'|'aging'|'stale';supersedes?:string[]};
export type MemoryInput=Omit<MemoryRecord,'id'> & {id?:string};

const DEFAULT_FILE=path.resolve('data/runtime/continuity-memory.json');
const norm=(v:string)=>v.trim().toLocaleLowerCase().replace(/\s+/g,' ');
const tokens=(v:string)=>new Set(norm(v).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2));

export class ContinuityMemoryStore {
  constructor(private readonly file=DEFAULT_FILE){}
  private async loadAll():Promise<MemoryRecord[]>{try{return JSON.parse(await fs.readFile(this.file,'utf8')) as MemoryRecord[]}catch(e:any){if(e?.code==='ENOENT')return [];throw e}}
  private async saveAll(records:MemoryRecord[]){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(records,null,2)+'\n','utf8')}
  async import(inputs:MemoryInput[]){const records=await this.loadAll();let added=0,updated=0;
    for(const input of inputs){const existing=records.find(r=>r.kind===input.kind&&norm(r.subject)===norm(input.subject)&&norm(r.content)===norm(input.content));
      if(existing){Object.assign(existing,{...input,id:existing.id});updated++;continue}
      records.push({...input,id:input.id??randomUUID()});added++;
    }
    await this.saveAll(records);return {added,updated,total:records.length};
  }
  async search(query:string,limit=12){const all=await this.loadAll();const q=tokens(query);return all.map(record=>{const hay=tokens(`${record.kind} ${record.subject} ${record.content} ${record.tags.join(' ')}`);let score=0;for(const t of q)if(hay.has(t))score+=1; if(norm(record.subject).includes(norm(query)))score+=4;if(record.confidence==='confirmed')score+=0.25;if(record.freshness==='current')score+=0.25;return {record,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.record)}
  async stats(){const records=await this.loadAll();const byKind=Object.fromEntries((['identity','career','goal','project','preference','decision','evidence','event','learning'] as MemoryKind[]).map(k=>[k,records.filter(r=>r.kind===k).length]));return {total:records.length,byKind}}
  async context(query:string,limit=8){return this.search(query,limit)}
}
