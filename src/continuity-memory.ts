import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type MemoryKind='identity'|'career'|'goal'|'project'|'preference'|'decision'|'evidence'|'event'|'learning';
export type MemoryConfidence='confirmed'|'inferred';
export type MemoryFreshness='current'|'aging'|'stale';
export type MemoryRecord={id:string;kind:MemoryKind;subject:string;content:string;tags:string[];source:string;confidence:MemoryConfidence;observedAt:string;lastConfirmedAt?:string;freshness?:MemoryFreshness;supersedes?:string[]};
export type MemoryInput=Omit<MemoryRecord,'id'> & {id?:string};

const DEFAULT_FILE=path.resolve('data/runtime/continuity-memory.json');
const norm=(v:string)=>v.trim().toLocaleLowerCase().replace(/\s+/g,' ');
const tokens=(v:string)=>new Set(norm(v).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2));
const timestamp=(record:Pick<MemoryRecord,'lastConfirmedAt'|'observedAt'>)=>Date.parse(record.lastConfirmedAt||record.observedAt)||0;
function calculatedFreshness(record:MemoryRecord,now=Date.now()):MemoryFreshness{if(record.freshness==='stale')return 'stale';const age=now-timestamp(record);if(!Number.isFinite(age)||age<0)return record.freshness??'current';const days=age/86_400_000;if(days>365)return 'stale';if(days>120)return 'aging';return record.freshness??'current'}
function validateInput(input:MemoryInput){if(!input.kind||!input.subject?.trim()||!input.content?.trim()||!input.source?.trim()||!input.observedAt)throw new Error('Memory records require kind, subject, content, source and observedAt.');if(!Array.isArray(input.tags))throw new Error('Memory tags must be an array.');}

export class ContinuityMemoryStore {
  constructor(private readonly file=DEFAULT_FILE){}
  private async loadAll():Promise<MemoryRecord[]>{try{return JSON.parse(await fs.readFile(this.file,'utf8')) as MemoryRecord[]}catch(e:any){if(e?.code==='ENOENT')return [];throw e}}
  private async saveAll(records:MemoryRecord[]){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(records,null,2)+'\n','utf8')}
  async import(inputs:MemoryInput[]){const records=await this.loadAll();let added=0,updated=0,superseded=0;
    for(const raw of inputs){validateInput(raw);const input={...raw,subject:raw.subject.trim(),content:raw.content.trim(),tags:[...new Set(raw.tags.map(tag=>tag.trim()).filter(Boolean))]};const exact=records.find(r=>r.kind===input.kind&&norm(r.subject)===norm(input.subject)&&norm(r.content)===norm(input.content));
      if(exact){Object.assign(exact,{...input,id:exact.id,freshness:input.freshness??calculatedFreshness({...exact,...input,id:exact.id})});updated++;continue}
      const sameSubject=records.filter(r=>r.kind===input.kind&&norm(r.subject)===norm(input.subject)&&calculatedFreshness(r)!=='stale');const newest=sameSubject.sort((a,b)=>timestamp(b)-timestamp(a))[0];
      const shouldSupersede=Boolean(newest&&timestamp(input)>timestamp(newest)&&(input.confidence==='confirmed'||newest.confidence==='inferred'));
      const next:MemoryRecord={...input,id:input.id??randomUUID(),freshness:input.freshness??'current',supersedes:[...new Set([...(input.supersedes??[]),...(shouldSupersede&&newest?[newest.id]:[])])]};
      if(shouldSupersede&&newest){newest.freshness='stale';superseded++}records.push(next);added++;
    }
    await this.saveAll(records);return {added,updated,superseded,total:records.length};
  }
  async search(query:string,limit=12,includeStale=false){const all=await this.loadAll();const q=tokens(query);return all.filter(record=>includeStale||calculatedFreshness(record)!=='stale').map(record=>{const hay=tokens(`${record.kind} ${record.subject} ${record.content} ${record.tags.join(' ')}`);let score=0;for(const t of q)if(hay.has(t))score+=1;if(norm(record.subject).includes(norm(query)))score+=4;if(record.confidence==='confirmed')score+=0.5;const freshness=calculatedFreshness(record);if(freshness==='current')score+=0.5;else if(freshness==='aging')score-=0.25;return {record:{...record,freshness},score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||timestamp(b.record)-timestamp(a.record)).slice(0,limit).map(x=>x.record)}
  async stats(){const records=await this.loadAll();const byKind=Object.fromEntries((['identity','career','goal','project','preference','decision','evidence','event','learning'] as MemoryKind[]).map(k=>[k,records.filter(r=>r.kind===k).length]));const freshness={current:0,aging:0,stale:0};for(const record of records)freshness[calculatedFreshness(record)]++;return {total:records.length,active:records.length-freshness.stale,byKind,freshness}}
  async context(query:string,limit=8){return this.search(query,limit)}
  async backup(directory=path.join(path.dirname(this.file),'backups')){const records=await this.loadAll();await fs.mkdir(directory,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');const target=path.join(directory,`continuity-memory-${stamp}.json`);await fs.writeFile(target,JSON.stringify(records,null,2)+'\n','utf8');return {path:target,records:records.length};}
}
