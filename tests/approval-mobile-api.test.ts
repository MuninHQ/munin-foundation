import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApprovalMobileHandler } from '../src/approval-mobile-api.js';
import { ApprovalQueue, evaluateSentinel } from '../src/sentinel.js';

const token = 'approval-mobile-test-token';

async function withApi(run:(request:(pathname:string,method?:string,body?:unknown,authorized?:boolean)=>Promise<{status:number;payload:any}>,queue:ApprovalQueue)=>Promise<void>){
  const dir=await mkdtemp(path.join(tmpdir(),'munin-approval-api-'));
  const queue=new ApprovalQueue(path.join(dir,'approvals.json'));
  const handler=createApprovalMobileHandler(queue);
  const server=createServer((request,response)=>void handler(request,response));
  const previous=process.env.MUNIN_MOBILE_TOKEN;
  process.env.MUNIN_MOBILE_TOKEN=token;
  try{
    await new Promise<void>((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address==='object');
    const request=(pathname:string,method='GET',body?:unknown,authorized=true)=>new Promise<{status:number;payload:any}>((resolve,reject)=>{
      const raw=body===undefined?undefined:JSON.stringify(body);
      const headers:Record<string,string>={};
      if(authorized)headers.authorization=`Bearer ${token}`;
      if(raw!==undefined){headers['content-type']='application/json';headers['content-length']=String(Buffer.byteLength(raw));}
      const outgoing=httpRequest({host:'127.0.0.1',port:address.port,path:pathname,method,headers},incoming=>{const chunks:Buffer[]=[];incoming.on('data',chunk=>chunks.push(Buffer.from(chunk)));incoming.once('end',()=>{const text=Buffer.concat(chunks).toString('utf8');resolve({status:incoming.statusCode??0,payload:text?JSON.parse(text):{}})});});
      outgoing.once('error',reject);if(raw!==undefined)outgoing.write(raw);outgoing.end();
    });
    await run(request,queue);
  }finally{
    if(previous===undefined)delete process.env.MUNIN_MOBILE_TOKEN;else process.env.MUNIN_MOBILE_TOKEN=previous;
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await rm(dir,{recursive:true,force:true});
  }
}

test('approval mobile API requires bearer auth',async()=>{
  await withApi(async(request)=>{
    const response=await request('/api/mobile/approvals','GET',undefined,false);
    assert.equal(response.status,401);
    assert.equal(response.payload.code,'MOBILE_AUTH_REQUIRED');
  });
});

test('approval mobile API lists and resolves pending approvals with human provenance',async()=>{
  await withApi(async(request,queue)=>{
    const decision=evaluateSentinel({class:'external-write',tool:'submit job application',target:'example.test/job'});
    assert.equal(decision.disposition,'needs_approval');
    const pending=await queue.enqueue(decision,'Prepared for explicit review');
    const listed=await request('/api/mobile/approvals');
    assert.equal(listed.status,200);
    assert.equal(listed.payload.items[0].id,pending.id);

    const approved=await request(`/api/mobile/approvals/${pending.id}/approve`,'POST',{note:'Approved from iPhone'});
    assert.equal(approved.status,200);
    assert.equal(approved.payload.status,'approved');
    assert.equal(approved.payload.resolvedBy,'human');
    assert.ok(approved.payload.resolvedAt);
    assert.equal(approved.payload.note,'Approved from iPhone');
  });
});

test('approval mobile API refuses replay of an already resolved decision',async()=>{
  await withApi(async(request,queue)=>{
    const decision=evaluateSentinel({class:'external-write',tool:'publish video',target:'channel'});
    const pending=await queue.enqueue(decision);
    assert.equal((await request(`/api/mobile/approvals/${pending.id}/reject`,'POST',{})).status,200);
    const replay=await request(`/api/mobile/approvals/${pending.id}/approve`,'POST',{});
    assert.equal(replay.status,400);
    assert.match(replay.payload.error,/already rejected/i);
  });
});
