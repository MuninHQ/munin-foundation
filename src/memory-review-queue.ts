import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MemoryInput } from './continuity-memory.js';
import { ContinuityMemoryStore } from './continuity-memory.js';

export type MemoryReviewItem={id:string;record:MemoryInput;createdAt:string;sourceFile?:string};
const DEFAULT_FILE=path.resolve('data/runtime/chatgpt-memory-review.json');
const idFor=(record:MemoryInput)=>createHash('sha256').update(`${record.kind}\n${record.subject}\n${record.content}\n${record.source}`).digest('hex').slice(0,24);

export class MemoryReviewQueue{
 constructor(private readonly file=DEFAULT_FILE,private readonly memory=new ContinuityMemoryStore()){}
 private async load():Promise<MemoryReviewItem[]>{try{return JSON.parse(await fs.readFile(this.file,'utf8')) as MemoryReviewItem[]}catch(e:any){if(e?.code==='ENOENT')return [];throw e}}
 private async save(items:MemoryReviewItem[]){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(items,null,2)+'\n','utf8')}
 async list(){return this.load()}
 async add(records:MemoryInput[],sourceFile?:string){const items=await this.load();const known=new Set(items.map(item=>item.id));let added=0;for(const record of records){const id=idFor(record);if(known.has(id))continue;items.push({id,record,createdAt:new Date().toISOString(),sourceFile});known.add(id);added++}await this.save(items);return {added,total:items.length}}
 async approve(id:string){const items=await this.load();const item=items.find(entry=>entry.id===id);if(!item)throw new Error('Review item not found.');await this.memory.backup();const result=await this.memory.import([{...item.record,tags:[...new Set([...item.record.tags,'review:approved'])]}]);await this.save(items.filter(entry=>entry.id!==id));return {item,result}}
 async drop(id:string){const items=await this.load();const item=items.find(entry=>entry.id===id);if(!item)throw new Error('Review item not found.');await this.save(items.filter(entry=>entry.id!==id));return {dropped:id,remaining:items.length-1}}
}
