import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handleCareerIntelligence } from '../src/career-intelligence-api.js';
import { MuninService } from '../src/service.js';
import { ContextStore } from '../src/store.js';
import { CareerInboxStore } from '../src/career-inbox.js';
import type { AddressInfo } from 'node:net';
import { safeCareerLink } from '../src/career-job-links.js';

test('career workspace and email import preserve one canonical process, source and link',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'munin-career-command-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=root;
 const {handleApi}=await import('../src/api.js');
 const server=createServer((req,res)=>void (req.url?.startsWith('/api/career-intelligence')?handleCareerIntelligence(req,res):handleApi(req,res)));
 try {
  const service=new MuninService(new ContextStore(root));
  await service.addJob('Other Bank','Product Manager','payments');
  await new CareerInboxStore(root).save({syncedAt:'2026-10-08T10:00:00Z',messages:[{id:'alert-1',provider:'gmail',providerMessageId:'1',subject:'Product Manager at Example Bank',snippet:'Apply https://example.com/jobs/123?utm_source=email payments fintech product strategy',receivedAt:'2026-10-08T10:00:00Z',category:'job_alert',confidence:.95,handled:true,detectedCompany:'Example Bank',detectedRole:'Product Manager',suggestedStatus:'applied'}]});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const before=await fetch(`${base}/api/career-intelligence/workspace`).then(r=>r.json());
  assert.equal(before.processes.length,1);assert.equal(before.raven.recommendations[0].duplicateJobId,undefined);assert.equal(before.syncedAt,'2026-10-08T10:00:00Z');
  const imported=await fetch(`${base}/api/career-inbox/alert-1/create-job`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({company:'Example Bank',role:'Product Manager'})});
  assert.equal(imported.status,201);const {job}=await imported.json();assert.equal(job.link,'https://example.com/jobs/123');assert.equal(job.status,'discovered');
  const saved=await fetch(`${base}/api/career-intelligence/workspace`).then(r=>r.json());assert.equal(saved.processes.find((p:any)=>p.job.id===job.id).job.status,'discovered','Legacy alert suggestions must not mark an application sent');
  const again=await fetch(`${base}/api/career-inbox/alert-1/create-job`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(again.status,400);
  const updated=await fetch(`${base}/api/jobs/${job.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'interview',nextAction:'Prepare implementation case'})});assert.equal(updated.status,200);
  const after=await fetch(`${base}/api/career-intelligence/workspace`).then(r=>r.json());assert.equal(after.processes.length,2);assert.equal(after.brief.counts.interviews,1);assert.equal(after.raven.recommendations[0].decision,'ALREADY_APPLIED');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(root,{recursive:true,force:true});}
});
test('career links reject executable URLs, credentials and local hosts',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com/jobs/1','https://localhost/jobs/1','https://127.0.0.1/jobs/1'])assert.equal(safeCareerLink(url),undefined);
});

test('digest vacancies import independently, survive resync and reuse the same canonical URL',async()=>{
 const {expandCareerAlert}=await import('../src/career-alert-extraction.js');
 const root=await mkdtemp(path.join(tmpdir(),'munin-career-digest-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=root;
 const {handleApi}=await import(new URL('../src/api.js?digest-test',import.meta.url).href);const server=createServer((req,res)=>void (req.url?.startsWith('/api/career-intelligence')?handleCareerIntelligence(req,res):handleApi(req,res)));
 const original={id:'digest',provider:'gmail' as const,providerMessageId:'digest-provider',subject:'New jobs',snippet:'Job alert',receivedAt:'2026-10-08T10:00:00Z',category:'job_alert' as const,confidence:.95,handled:true};
 const body='<a href="https://www.linkedin.com/jobs/view/123/">Payments Manager at Bank A</a><a href="https://www.linkedin.com/jobs/view/456/">Payments Manager at Bank B</a>';
 try{
  const store=new CareerInboxStore(root);const expanded=expandCareerAlert(original,body,true);await store.upsert(expanded);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(id:string)=>fetch(`${base}/api/career-inbox/${id}/create-job`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal((await post(original.id)).status,400);
  const a=await post(expanded[1].id),b=await post(expanded[2].id);assert.equal(a.status,201);assert.equal(b.status,201);
  const first=await a.json(),second=await b.json();assert.notEqual(first.job.id,second.job.id);
  await store.upsert(expandCareerAlert({...original,id:'different-random-id'},body,true));assert.equal((await post(expanded[1].id)).status,400);
  const repeat=expandCareerAlert({...original,id:'repeat',providerMessageId:'another-digest'},body,true);await store.upsert(repeat);
  const reused=await post(repeat[1].id);assert.equal(reused.status,200);assert.equal((await reused.json()).job.id,first.job.id);
  const workspace=await fetch(`${base}/api/career-intelligence/workspace`).then(r=>r.json());assert.equal(workspace.processes.length,2);assert.equal(workspace.alertHealth.vacancies,4);assert.equal(workspace.alertHealth.incomplete,0);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(root,{recursive:true,force:true})}
});
