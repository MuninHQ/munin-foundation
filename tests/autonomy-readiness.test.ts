import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectAutonomyReadiness } from '../src/autonomy-readiness.js';

test('readiness blocks only when required git repository boundary is missing',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-doctor-no-git-'));
 try{
  const report=await inspectAutonomyReadiness(root,{browser:async()=>({available:false}),semantic:async()=>({available:false}),skills:async()=>0});
  assert.equal(report.state,'blocked');
  assert.ok(report.blockers.some(item=>item.includes('git-repository')));
 }finally{await rm(root,{recursive:true,force:true})}
});

test('optional browser and semantic tools degrade but do not block native autonomous engineering',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-doctor-degraded-'));
 try{
  await mkdir(path.join(root,'.git'));
  const report=await inspectAutonomyReadiness(root,{browser:async()=>({available:false,detail:'missing'}),semantic:async()=>({available:false,detail:'missing'}),skills:async()=>3});
  assert.equal(report.state,'degraded');
  assert.deepEqual(report.blockers,[]);
  assert.ok(report.nextActions.some(item=>item.includes('Playwright CLI')));
  assert.ok(report.nextActions.some(item=>item.includes('Serena')));
 }finally{await rm(root,{recursive:true,force:true})}
});

test('readiness is ready when repository and optional tooling are available and seam is opted in',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'munin-doctor-ready-'));
 const previous=process.env.MUNIN_RUNTIME_CAPABILITIES;
 try{
  await mkdir(path.join(root,'.git'));process.env.MUNIN_RUNTIME_CAPABILITIES='1';
  const report=await inspectAutonomyReadiness(root,{browser:async()=>({available:true}),semantic:async()=>({available:true}),skills:async()=>3});
  assert.equal(report.state,'ready');
  assert.deepEqual(report.blockers,[]);
 }finally{previous===undefined?delete process.env.MUNIN_RUNTIME_CAPABILITIES:process.env.MUNIN_RUNTIME_CAPABILITIES=previous;await rm(root,{recursive:true,force:true})}
});
