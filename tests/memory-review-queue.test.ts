import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContinuityMemoryStore } from '../src/continuity-memory.js';
import { MemoryReviewQueue } from '../src/memory-review-queue.js';

const record={kind:'career' as const,subject:'Possible role',content:'This may become relevant to the job search.',tags:['chatgpt-export','relevance:review'],source:'chatgpt-export:test',confidence:'confirmed' as const,observedAt:'2026-08-15'};

test('review queue deduplicates, approves into memory and drops explicitly',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-review-'));const memory=new ContinuityMemoryStore(path.join(dir,'memory.json'));const queue=new MemoryReviewQueue(path.join(dir,'review.json'),memory);
 assert.deepEqual(await queue.add([record,record],'conversations.json'),{added:1,total:1});const [item]=await queue.list();assert.ok(item.id);assert.equal(item.sourceFile,'conversations.json');
 const approved=await queue.approve(item.id);assert.equal(approved.result.added,1);assert.equal((await queue.list()).length,0);assert.equal((await memory.search('Possible role')).length,1);
 await queue.add([{...record,subject:'Casual maybe'}]);const [second]=await queue.list();assert.equal((await queue.drop(second.id)).remaining,0);await rm(dir,{recursive:true,force:true});
});
