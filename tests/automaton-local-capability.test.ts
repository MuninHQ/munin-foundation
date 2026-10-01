import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';
import { registerAutomatonLocalCapability } from '../src/automaton-local-capability.js';

function restore(name:string,value:string|undefined){
  if(value===undefined) delete process.env[name];
  else process.env[name]=value;
}

test('automaton local capability is health-only until explicit submit opt-in', async () => {
  const oldUrl=process.env.MUNIN_AUTOMATON_URL;
  const oldEnabled=process.env.MUNIN_AUTOMATON_ENABLED;
  const oldSubmit=process.env.MUNIN_AUTOMATON_SUBMIT;
  const received:string[]=[];
  const server=http.createServer(async(req,res)=>{
    const parts:Buffer[]=[];
    for await(const chunk of req)parts.push(Buffer.from(chunk));
    const body=Buffer.concat(parts).toString('utf8');
    if(req.url==='/api/state'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({runtime:{running:true}}));return;}
    if(req.url==='/api/tasks'&&req.method==='POST'){received.push(body);res.writeHead(201,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,id:'task-1'}));return;}
    if(req.url==='/api/tasks/cancel'&&req.method==='POST'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,goalId:'goal-1',status:'cancelled',cancelledTasks:1}));return;}
    if(req.url==='/api/wake'&&req.method==='POST'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
    res.writeHead(404);res.end();
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  if(!address||typeof address==='string')throw new Error('mock server did not bind');

  process.env.MUNIN_AUTOMATON_URL=`http://127.0.0.1:${address.port}`;
  delete process.env.MUNIN_AUTOMATON_ENABLED;
  delete process.env.MUNIN_AUTOMATON_SUBMIT;
  const registry=new RuntimeCapabilityRegistry();
  registerAutomatonLocalCapability(registry);

  try{
    const health=await registry.execute<any,any>('execution.automaton-local',{action:'health'});
    assert.equal(health.output.ready,true);
    assert.equal(health.output.policy.localOnly,true);
    assert.equal(health.output.policy.paidDependencyRequired,false);
    const missing=await registry.execute<any,any>('execution.automaton-local',{action:'status',taskId:'missing'});
    assert.equal(missing.output.ready,false);
    assert.equal(missing.output.status,'unknown');
    await assert.rejects(registry.execute('execution.automaton-local',{action:'submit',objective:'safe task'}),/integration is disabled/);
    process.env.MUNIN_AUTOMATON_ENABLED='1';
    await assert.rejects(registry.execute('execution.automaton-local',{action:'submit',objective:'safe task'}),/submission is disabled/);
    process.env.MUNIN_AUTOMATON_SUBMIT='1';
    const queued=await registry.execute<any,any>('execution.automaton-local',{action:'submit',objective:'safe task'});
    assert.equal(queued.output.taskId,'task-1');
    assert.match(received[0]??'',/\[MUNIN:/);
    assert.match(received[0]??'',/safe task/);
    const cancelled=await registry.execute<any,any>('execution.automaton-local',{action:'cancel',taskId:'task-1'});
    assert.equal(cancelled.output.ready,true);
    assert.equal(cancelled.output.status,'cancelled');
    assert.equal(cancelled.output.goalId,'goal-1');
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    restore('MUNIN_AUTOMATON_URL',oldUrl);
    restore('MUNIN_AUTOMATON_ENABLED',oldEnabled);
    restore('MUNIN_AUTOMATON_SUBMIT',oldSubmit);
  }
});

test('automaton URL rejects non-loopback endpoints', async () => {
  const oldUrl=process.env.MUNIN_AUTOMATON_URL;
  process.env.MUNIN_AUTOMATON_URL='https://example.com';
  const registry=new RuntimeCapabilityRegistry();
  registerAutomatonLocalCapability(registry);
  try{
    await assert.rejects(registry.execute('execution.automaton-local',{action:'health'}),/loopback HTTP URL/);
  } finally { restore('MUNIN_AUTOMATON_URL',oldUrl); }
});
