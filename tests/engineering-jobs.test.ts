import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EngineeringJobManager } from '../src/engineering-jobs.js';

test('engineering job starts asynchronously and preserves final fail-closed result',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-job-'));const manager=new EngineeringJobManager(dir);const started=manager.start('test objective');assert.equal(started.status,'queued');
 let job=manager.get(started.id);for(let attempt=0;attempt<50&&job&&(job.status==='queued'||job.status==='running');attempt++){await new Promise(resolve=>setTimeout(resolve,10));job=manager.get(started.id)}
 assert.ok(job);assert.equal(job?.status,'needs_user');assert.equal(job?.result?.status,'needs_user');assert.ok(job?.completedAt);const persisted=JSON.parse(await readFile(path.join(dir,'data/runtime/engineering-jobs.json'),'utf8'));assert.equal(persisted[0].id,started.id);await rm(dir,{recursive:true,force:true});
});

test('runtime restart preserves job history and fail-closes interrupted side effects',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-restart-'));const file=path.join(dir,'data/runtime/engineering-jobs.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify([{id:'job-1',objective:'continue backlog',verificationUrl:'http://127.0.0.1:5173/',status:'running',createdAt:'2026-08-15T20:00:00.000Z',startedAt:'2026-08-15T20:00:01.000Z'}]),'utf8');
 const manager=new EngineeringJobManager(dir);const recovered=manager.get('job-1');assert.equal(recovered?.status,'needs_user');assert.equal(recovered?.result?.status,'needs_user');assert.equal(recovered?.verificationUrl,'http://127.0.0.1:5173/');assert.match(recovered?.result?.message??'',/runtime reiniciou/i);await rm(dir,{recursive:true,force:true});
});

test('Action Constitution stops consequential engineering intent before execution',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-policy-'));const manager=new EngineeringJobManager(dir);const job=manager.start('publish to LinkedIn after build');assert.equal(job.status,'needs_user');assert.equal(job.result?.status,'needs_user');assert.match(job.result?.message??'',/aprovação explícita/i);for(let attempt=0;attempt<30;attempt++){try{const audit=await readFile(path.join(dir,'data/runtime/action-audit.jsonl'),'utf8');assert.match(audit,/external-write-escalation/);break}catch{await new Promise(resolve=>setTimeout(resolve,10))}}await rm(dir,{recursive:true,force:true});
});

test('engineering jobs validate and persist optional read-only browser target',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-verify-'));const manager=new EngineeringJobManager(dir);const job=manager.start('publish to LinkedIn after build','http://127.0.0.1:5173/dashboard');assert.equal(job.status,'needs_user');assert.equal(job.verificationUrl,'http://127.0.0.1:5173/dashboard');const persisted=JSON.parse(await readFile(path.join(dir,'data/runtime/engineering-jobs.json'),'utf8'));assert.equal(persisted[0].verificationUrl,'http://127.0.0.1:5173/dashboard');assert.throws(()=>manager.start('build feature','file:///etc/passwd'),/only http\/https/);await rm(dir,{recursive:true,force:true});
});
