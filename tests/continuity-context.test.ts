import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContinuityMemoryStore } from '../src/continuity-memory.js';
import { buildContinuityContext, answerFromContinuity } from '../src/continuity-context.js';

test('builds a provenance-aware context package',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-context-')); const store=new ContinuityMemoryStore(path.join(dir,'memory.json'));
 await store.import([{kind:'project',subject:'Munin',content:'Personal continuity infrastructure with autonomous goal loop.',tags:['munin','project'],source:'chatgpt-memory-import',confidence:'confirmed',observedAt:'2026-08-15',freshness:'current'}]);
 const context=await buildContinuityContext('Munin project',8,store); assert.equal(context.memories.length,1); assert.match(context.text,/chatgpt-memory-import/);
 assert.match((await answerFromContinuity('Munin',store))??'',/Personal continuity/); await rm(dir,{recursive:true,force:true});
});
