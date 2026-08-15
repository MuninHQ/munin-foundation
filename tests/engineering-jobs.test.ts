import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EngineeringJobManager } from '../src/engineering-jobs.js';

test('engineering job starts asynchronously and preserves final fail-closed result',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-job-'));const manager=new EngineeringJobManager(dir);const started=manager.start('test objective');assert.equal(started.status,'queued');
 let job=manager.get(started.id);for(let attempt=0;attempt<50&&job&&(job.status==='queued'||job.status==='running');attempt++){await new Promise(resolve=>setTimeout(resolve,10));job=manager.get(started.id)}
 assert.ok(job);assert.equal(job?.status,'needs_user');assert.equal(job?.result?.status,'needs_user');assert.ok(job?.completedAt);await rm(dir,{recursive:true,force:true});
});
