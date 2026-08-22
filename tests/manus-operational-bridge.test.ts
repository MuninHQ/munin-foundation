import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ManusTaskStore, manusBridgeStatus, refreshManusTasks, submitManusTask } from '../src/manus-operational-bridge.js';

async function isolated(run:(store:ManusTaskStore)=>Promise<void>){const root=await mkdtemp(join(tmpdir(),'munin-manus-'));const oldDir=process.env.MUNIN_DATA_DIR,oldKey=process.env.MANUS_API_KEY,oldFetch=globalThis.fetch;process.env.MUNIN_DATA_DIR=root;try{await run(new ManusTaskStore())}finally{if(oldDir===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=oldDir;if(oldKey===undefined)delete process.env.MANUS_API_KEY;else process.env.MANUS_API_KEY=oldKey;globalThis.fetch=oldFetch;await rm(root,{recursive:true,force:true})}}

test('Manus bridge stays disabled without a local API key',()=>isolated(async store=>{delete process.env.MANUS_API_KEY;const status=await manusBridgeStatus(store);assert.equal(status.enabled,false);assert.match(status.reason??'',/MANUS_API_KEY/)}));

test('submits only allowlisted bounded tasks and persists remote id',()=>isolated(async store=>{process.env.MANUS_API_KEY='test-key';let request:any;globalThis.fetch=async(input:any,init:any)=>{request={url:String(input),init};return new Response(JSON.stringify({ok:true,data:{task_id:'task-123',task_url:'https://manus.im/app/task-123'}}),{status:200,headers:{'content-type':'application/json'}})};const task=await submitManusTask({kind:'research',title:'Regulatory scan',prompt:'Read official sources only.',declaredCreditBudget:120},store);assert.equal(task.status,'running');assert.equal(task.remoteTaskId,'task-123');assert.equal(request.url,'https://api.manus.ai/v2/task.create');assert.equal(request.init.headers['x-manus-api-key'],'test-key');assert.doesNotMatch(JSON.stringify(await store.list()),/test-key/)}));

test('imports completed Manus result for Action Inbox consumption',()=>isolated(async store=>{process.env.MANUS_API_KEY='test-key';const now=new Date().toISOString();await store.upsert({id:'local-1',kind:'analysis',title:'Analyze',prompt:'Analyze',status:'running',remoteTaskId:'task-1',declaredCreditBudget:50,createdAt:now,updatedAt:now});globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:[{status_update:{agent_status:'stopped'}},{assistant_message:{content:'Evidence-backed result'},credit_usage:23}]}),{status:200,headers:{'content-type':'application/json'}});const tasks=await refreshManusTasks(store);assert.equal(tasks[0].status,'completed');assert.equal(tasks[0].result,'Evidence-backed result');assert.equal(tasks[0].creditUsage,23)}));
