import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MemoryLedger } from '../src/memory-ledger.js';
import { ContextStore } from '../src/store.js';

test('durable decision and action events are mirrored into the memory ledger', async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-store-ledger-'));const store=new ContextStore(root);
 await store.event('decision.created','decision','dec-1',{title:'Use isolated core branch',projectId:'munin'});
 await store.event('action.executed','action','act-1',{outcome:'Core validated',projectId:'munin'});
 const ledger=new MemoryLedger(root);const decisions=await ledger.list({kind:'decision',projectId:'munin'});const actions=await ledger.list({kind:'action',projectId:'munin'});
 assert.equal(decisions.length,1);assert.match(decisions[0]?.summary??'',/Use isolated core branch/);
 assert.equal(actions.length,1);assert.match(actions[0]?.summary??'',/Core validated/);
});

test('career state events are automatically scoped to the career project',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-store-ledger-'));const store=new ContextStore(root);
 await store.event('job.updated','job','job-1',{status:'interview'});
 const entries=await new MemoryLedger(root).list({projectId:'career'});
 assert.equal(entries.length,1);assert.equal(entries[0]?.entityId,'job-1');
});

test('unrelated system events remain out of the durable memory ledger',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-store-ledger-'));const store=new ContextStore(root);
 await store.event('runtime.heartbeat','system','runtime-1',{status:'ok'});
 assert.equal((await new MemoryLedger(root).list()).length,0);
});
