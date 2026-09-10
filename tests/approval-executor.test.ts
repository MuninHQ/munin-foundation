import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ApprovalExecutor } from '../src/approval-executor.js';
import { ApprovalQueue, evaluateSentinel } from '../src/sentinel.js';

async function fixture(run:(ctx:{dir:string;queue:ApprovalQueue;executor:ApprovalExecutor})=>Promise<void>){
  const dir=await mkdtemp(path.join(tmpdir(),'munin-approval-exec-'));
  const queue=new ApprovalQueue(path.join(dir,'approvals.json'));
  const executor=new ApprovalExecutor(queue,path.join(dir,'execution'));
  try{await run({dir,queue,executor});}finally{await rm(dir,{recursive:true,force:true});}
}

function careerDecision(id='job-1'){
  return evaluateSentinel({class:'external-write',tool:'submit job application',target:`https://example.test/jobs/${id}`,effect:{type:'career.submit',resourceId:id,payload:{company:'Example',role:'Product Lead'}}});
}

test('typed approval executor requires explicit human approval',async()=>{
  await fixture(async({queue,executor})=>{
    const pending=await queue.enqueue(careerDecision());
    executor.register({id:'career-test',type:'career.submit',async apply(){return{ok:true};}});
    await assert.rejects(()=>executor.execute(pending.id),/Human approval is required/);
  });
});
test('typed approval executor applies exact effect once and reuses receipt',async()=>{
  await fixture(async({queue,executor})=>{
    let calls=0;
    executor.register({id:'career-test',type:'career.submit',async apply(effect){calls+=1;assert.equal(effect.resourceId,'job-1');return{submitted:true};}});
    const pending=await queue.enqueue(careerDecision());
    await queue.resolve(pending.id,'approved','Approved by human');
    const first=await executor.execute(pending.id);
    const second=await executor.execute(pending.id);
    assert.equal(first.status,'applied');
    assert.equal(second.id,first.id);
    assert.equal(calls,1);
  });
});

test('typed approval executor fails closed when transport is missing',async()=>{
  await fixture(async({queue,executor})=>{
    const pending=await queue.enqueue(careerDecision('job-2'));
    await queue.resolve(pending.id,'approved');
    await assert.rejects(()=>executor.execute(pending.id),/No executor registered for career\.submit/);
  });
});

test('typed approval executor never executes a rejected approval',async()=>{
  await fixture(async({queue,executor})=>{
    executor.register({id:'career-test',type:'career.submit',async apply(){throw new Error('must not run');}});
    const pending=await queue.enqueue(careerDecision('job-3'));
    await queue.resolve(pending.id,'rejected');
    await assert.rejects(()=>executor.execute(pending.id),/Human approval is required/);
  });
});