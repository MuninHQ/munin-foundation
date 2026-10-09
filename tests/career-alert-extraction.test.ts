import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractAlertVacancies, expandCareerAlert, careerAlertHealth } from '../src/career-alert-extraction.js';
import { CareerInboxStore, type CareerEmail } from '../src/career-inbox.js';
import { extractJobDiscoveries } from '../src/job-discovery.js';
import { gmailAlertBody, fetchGmail, fetchOutlook } from '../src/email-providers.js';

const alert:CareerEmail={id:'parent',provider:'gmail',providerMessageId:'gmail:mail-1',fromEmail:'jobalerts-noreply@linkedin.com',subject:'New jobs for payments',snippet:'Job alert',receivedAt:'2026-10-08T10:00:00Z',category:'job_alert',confidence:.95,handled:true};
const html='<div><a href="https://www.linkedin.com/jobs/view/product-manager-123?trk=email">Payments Manager at Bank A</a></div><div><a href="https://www.linkedin.com/jobs/view/456/?trackingId=abc">Open Finance Lead at Bank B</a></div><a href="https://www.linkedin.com/jobs/view/123/">Apply now</a><a href="https://www.linkedin.com/jobs/search?keywords=payments">See all jobs</a>';
test('HTML digest becomes distinct canonical jobs, excluding navigation and repeated apply buttons',()=>{
 const result=extractAlertVacancies(html,true);assert.equal(result.incomplete,false);assert.equal(result.vacancies.length,2);
 assert.deepEqual(result.vacancies[0],{link:'https://www.linkedin.com/jobs/view/123/',role:'Payments Manager',company:'Bank A'});
});
test('plaintext supports one job per block and explicit company labels',()=>{
 const result=extractAlertVacancies('Payments Manager at Bank A\nhttps://www.linkedin.com/jobs/view/123/\n\nOpen Finance Lead\nhttps://www.linkedin.com/jobs/view/456/\nEmpresa: Bank B');
 assert.equal(result.vacancies.length,2);assert.equal(result.vacancies[1].company,'Bank B');assert.equal(result.incomplete,false);
});
test('unsafe URLs and script content never become opportunities',()=>{
 assert.equal(extractAlertVacancies('<script><a href="https://www.linkedin.com/jobs/view/1/">Fake at Bank</a></script><a href="javascript:alert(1)">Apply</a><a href="https://user:pass@example.com/jobs/2">Fake</a>',true).vacancies.length,0);
});
test('unknown company remains unknown and body truncation is visible',()=>{
 const result=extractAlertVacancies('<a href="https://www.linkedin.com/jobs/view/1/">Payments Manager</a><p>São Paulo</p>',true);
 assert.equal(result.vacancies[0].company,undefined);assert.equal(result.incomplete,true);
 assert.equal(extractAlertVacancies(html+' '.repeat(500000),true).incomplete,true);
});
test('entity decoding handles URL parameters and accented title text',()=>{
 const result=extractAlertVacancies('<a href="https://example.com/jobs/1?x=a&amp;y=b">Gest&#227;o at Banco &amp; Cia</a>',true);
 assert.equal(result.vacancies[0].role,'Gestão');assert.equal(result.vacancies[0].company,'Banco & Cia');assert.equal(result.vacancies[0].link,'https://example.com/jobs/1?x=a&y=b');
});
test('children are stable, independent and keep original email provenance',()=>{
 const first=expandCareerAlert(alert,html,true),second=expandCareerAlert({...alert,id:'new-uuid'},html,true);
 assert.equal(first.length,3);assert.deepEqual(first.slice(1).map(m=>m.id),second.slice(1).map(m=>m.id));
 assert.ok(first.slice(1).every(m=>m.sourceEmailId===alert.providerMessageId&&!m.suggestedStatus&&!m.linkedJobId));
 assert.equal(extractJobDiscoveries(first,[]).length,2);assert.deepEqual(careerAlertHealth(first),{emails:1,vacancies:2,incomplete:0});
});
test('unparsed aggregate is flagged without becoming a fabricated vacancy',()=>{
 const expanded=expandCareerAlert(alert,'No readable job links');assert.equal(expanded.length,1);
 assert.equal(extractJobDiscoveries(expanded,[]).length,0);assert.equal(careerAlertHealth(expanded).incomplete,1);
});
test('resync preserves imported child identity and manual association',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'munin-alert-'));try{
  const store=new CareerInboxStore(root);const first=expandCareerAlert(alert,html,true);await store.upsert(first);
  const state=await store.load();state.messages.find(m=>m.sourceEmailId)!.linkedJobId='job-1';await store.save(state);
  const result=await store.upsert(expandCareerAlert({...alert,id:'changed'},html,true));assert.equal(result.added,0);assert.equal(result.duplicates,3);
  const saved=await store.load();assert.equal(saved.messages.find(m=>m.sourceEmailId&&m.linkedJobId)?.linkedJobId,'job-1');
 }finally{await rm(root,{recursive:true,force:true})}
});
test('MIME reader prefers nested HTML over duplicate plain alternatives',()=>{
 const result=gmailAlertBody({parts:[{mimeType:'text/plain',body:{data:Buffer.from('Plain alternative').toString('base64url')}},{parts:[{mimeType:'text/html',body:{data:Buffer.from(html).toString('base64url')}}]}]});
 assert.equal(result.html,true);assert.equal(result.text,html);
});
test('Gmail fetch expands full alerts while keeping normal emails metadata-only',async()=>{
 const previousFetch=globalThis.fetch;const previousDir=process.env.MUNIN_DATA_DIR;const root=await mkdtemp(path.join(tmpdir(),'munin-gmail-alert-'));process.env.MUNIN_DATA_DIR=root;const calls:string[]=[];
 globalThis.fetch=(async(input)=>{const url=String(input);calls.push(url);if(!url.includes('/messages/'))return Response.json({messages:[{id:'mail-1'},{id:'mail-2'}]});
 if(url.includes('format=full'))return Response.json({payload:{mimeType:'text/html',body:{data:Buffer.from(html).toString('base64url')}}});
 return Response.json({id:url.includes('mail-1')?'mail-1':'mail-2',internalDate:'1791453600000',snippet:'Job alert',payload:{headers:[{name:'Subject',value:url.includes('mail-1')?'New jobs':'Your application received'},{name:'From',value:url.includes('mail-1')?'jobalerts-noreply@linkedin.com':'recruiter@example.com'}]}});
 }) as typeof fetch;
 try{const messages=await fetchGmail('fake-test-token');assert.equal(messages.length,4);assert.equal(messages.filter(m=>m.sourceEmailId).length,2);assert.equal(calls.filter(url=>url.includes('format=full')).length,1);assert.equal(messages.find(m=>m.providerMessageId==='gmail:mail-2')?.category,'application_confirmation');}
 finally{globalThis.fetch=previousFetch;if(previousDir===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previousDir;await rm(root,{recursive:true,force:true})}
});
test('Outlook reads the full alert body and flags unavailable bodies without dropping the email',async()=>{
 const previousFetch=globalThis.fetch;const previousDir=process.env.MUNIN_DATA_DIR;const root=await mkdtemp(path.join(tmpdir(),'munin-outlook-alert-'));process.env.MUNIN_DATA_DIR=root;let fail=false;
 globalThis.fetch=(async(input)=>String(input).includes('/messages/')?(fail?new Response('',{status:503}):Response.json({body:{contentType:'HTML',content:html}})):Response.json({value:[{id:'graph-1',subject:'New jobs',bodyPreview:'Job alert',from:{emailAddress:{address:'jobalerts-noreply@linkedin.com'}}}]})) as typeof fetch;
 try{const messages=await fetchOutlook('fake-test-token');assert.equal(messages.filter(m=>m.sourceEmailId).length,2);fail=true;const fallback=await fetchOutlook('fake-test-token');assert.equal(fallback.length,1);assert.equal(fallback[0].alertExtraction?.incomplete,true);}
 finally{globalThis.fetch=previousFetch;if(previousDir===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previousDir;await rm(root,{recursive:true,force:true})}
});

test('LinkedIn company anchor supplies identity without guessing a nearby location',()=>{
 const result=extractAlertVacancies('<a href="https://www.linkedin.com/jobs/view/123/">Payments Manager</a><a href="https://www.linkedin.com/company/bank-a/">Bank A</a><p>São Paulo</p>',true);
 assert.equal(result.vacancies[0].company,'Bank A');assert.equal(result.incomplete,false);
});
test('successful alert extraction is reused locally on subsequent Gmail syncs',async()=>{
 const previousFetch=globalThis.fetch;const previousDir=process.env.MUNIN_DATA_DIR;const root=await mkdtemp(path.join(tmpdir(),'munin-gmail-cache-'));process.env.MUNIN_DATA_DIR=root;let fullReads=0;
 globalThis.fetch=(async(input)=>{const url=String(input);if(!url.includes('/messages/'))return Response.json({messages:[{id:'mail-1'}]});if(url.includes('format=full')){fullReads++;return Response.json({payload:{mimeType:'text/html',body:{data:Buffer.from(html).toString('base64url')}}});}return Response.json({id:'mail-1',snippet:'Job alert',payload:{headers:[{name:'Subject',value:'New jobs'},{name:'From',value:'jobalerts-noreply@linkedin.com'}]}});}) as typeof fetch;
 try{const store=new CareerInboxStore(root);await store.upsert(await fetchGmail('fake'));await store.upsert(await fetchGmail('fake'));assert.equal(fullReads,1);assert.equal((await store.load()).messages.length,3);}
 finally{globalThis.fetch=previousFetch;if(previousDir===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previousDir;await rm(root,{recursive:true,force:true})}
});
