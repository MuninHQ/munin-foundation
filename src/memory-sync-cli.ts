import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ContinuityMemoryStore } from './continuity-memory.js';
import { parseChatGptExport } from './chatgpt-export.js';
import { filterRelevantMemories } from './memory-relevance.js';
import { MemoryReviewQueue } from './memory-review-queue.js';

const inbox=path.resolve(process.env.MUNIN_CHATGPT_EXPORT_INBOX??'data/import/chatgpt');
const checkpoint=path.resolve('data/runtime/chatgpt-memory-sync.json');
type State={files:Record<string,{sha256:string;processedAt:string}>};
async function state():Promise<State>{try{return JSON.parse(await fs.readFile(checkpoint,'utf8')) as State}catch(e:any){if(e?.code==='ENOENT')return {files:{}};throw e}}
async function jsonFiles(root:string){try{return (await fs.readdir(root,{withFileTypes:true})).filter(x=>x.isFile()&&/^conversations(?:-\d+)?\.json$/i.test(x.name)).map(x=>path.join(root,x.name))}catch(e:any){if(e?.code==='ENOENT')return [];throw e}}
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');

async function main(){await fs.mkdir(inbox,{recursive:true});const current=await state();const store=new ContinuityMemoryStore();const reviewQueue=new MemoryReviewQueue();let processed=0,skipped=0,kept=0,dropped=0,review=0;
 for(const file of await jsonFiles(inbox)){const raw=await fs.readFile(file);const sha256=hash(raw);const key=path.basename(file);if(current.files[key]?.sha256===sha256){skipped++;continue}const parsed=parseChatGptExport(JSON.parse(raw.toString('utf8')));const filtered=filterRelevantMemories(parsed);if(filtered.kept.length){await store.backup();const result=await store.import(filtered.kept);kept+=result.added+result.updated}if(filtered.review.length){const queued=await reviewQueue.add(filtered.review,key);review+=queued.added}dropped+=filtered.dropped;current.files[key]={sha256,processedAt:new Date().toISOString()};processed++;}
 await fs.mkdir(path.dirname(checkpoint),{recursive:true});await fs.writeFile(checkpoint,JSON.stringify(current,null,2)+'\n');console.log(JSON.stringify({inbox,processed,skipped,kept,review,dropped},null,2));}
main().catch(error=>{console.error(error);process.exitCode=1});
