import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendSessionEvent, hydrateControlRoomState, summarizeHydratedState } from '../src/control-room-state.js';

test('hydrates canonical Control Room state from ops files',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-state-'));
 try{
  await mkdir(path.join(root,'ops'));
  await writeFile(path.join(root,'ops','CURRENT_STATE.md'),'current');
  await writeFile(path.join(root,'ops','BACKLOG.md'),'backlog');
  await writeFile(path.join(root,'ops','SESSION_LOG.md'),'log');
  const state=await hydrateControlRoomState(root);
  assert.equal(state.currentState,'current');
  assert.equal(state.backlog,'backlog');
  assert.equal(state.sessionLog,'log');
  assert.deepEqual(state.missing,[]);
  assert.equal(summarizeHydratedState(state).ready,true);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('missing optional state is reported instead of crashing hydration',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-state-missing-'));
 try{
  const state=await hydrateControlRoomState(root);
  assert.equal(state.missing.length,3);
  assert.equal(summarizeHydratedState(state).ready,false);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('write-back appends a durable session event',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-state-log-'));
 try{
  await mkdir(path.join(root,'ops'));
  await writeFile(path.join(root,'ops','SESSION_LOG.md'),'# log\n');
  await appendSessionEvent({title:'state hydration verified',summary:'Hydration and write-back passed.',timestamp:new Date('2026-08-18T01:00:00.000Z')},root);
  const content=await readFile(path.join(root,'ops','SESSION_LOG.md'),'utf8');
  assert.match(content,/2026-08-18T01:00:00.000Z — state hydration verified/);
  assert.match(content,/Hydration and write-back passed\./);
 }finally{await rm(root,{recursive:true,force:true})}
});
