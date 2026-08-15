import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContinuityMemoryStore } from '../src/continuity-memory.js';

test('imports, deduplicates and retrieves continuity memory',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-memory-')); const store=new ContinuityMemoryStore(path.join(dir,'memory.json'));
 const item={kind:'career' as const,subject:'Open Finance',content:'Led Open Finance working groups across regulatory and technical fronts.',tags:['career','finance'],source:'chatgpt-memory-import',confidence:'confirmed' as const,observedAt:'2026-08-15',lastConfirmedAt:'2026-08-15',freshness:'current' as const};
 assert.deepEqual(await store.import([item]),{added:1,updated:0,superseded:0,total:1});
 assert.deepEqual(await store.import([item]),{added:0,updated:1,superseded:0,total:1});
 const found=await store.search('Open Finance'); assert.equal(found.length,1); assert.equal(found[0].subject,'Open Finance');
 assert.equal((await store.stats()).byKind.career,1); await rm(dir,{recursive:true,force:true});
});

test('newer confirmed memory supersedes an older record and backups remain local',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-memory-')); const store=new ContinuityMemoryStore(path.join(dir,'memory.json'));
 await store.import([{kind:'preference',subject:'Work style',content:'Ask before every step.',tags:['workflow'],source:'historic',confidence:'inferred',observedAt:'2025-01-01'}]);
 const result=await store.import([{kind:'preference',subject:'Work style',content:'Continue autonomously until a real blocker.',tags:['workflow','autonomy'],source:'chatgpt-memory-import',confidence:'confirmed',observedAt:'2026-08-15',lastConfirmedAt:'2026-08-15'}]);
 assert.equal(result.superseded,1);const active=await store.search('Work style');assert.equal(active.length,1);assert.match(active[0].content,/autonomously/);
 const stats=await store.stats();assert.equal(stats.freshness.stale,1);const backup=await store.backup(path.join(dir,'backups'));const saved=JSON.parse(await readFile(backup.path,'utf8'));assert.equal(saved.length,2);await rm(dir,{recursive:true,force:true});
});
