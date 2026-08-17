import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEngineeringSkillContext } from '../src/engineering-skill-context.js';
import { SkillAwareEngineeringRuntime } from '../src/skill-aware-engineering-runtime.js';
import type { EngineeringMissionRuntime } from '../src/engineering-autonomous-mission.js';

async function writeSkill(root:string,dir:string,content:string){const target=path.join(root,'skills',dir);await fs.mkdir(target,{recursive:true});await fs.writeFile(path.join(target,'SKILL.md'),content,'utf8')}

const safeSkill=`---\nname: safe-debug\ndescription: Debug failing tests systematically\nversion: 1.0.0\ntriggers: debug,fix,failing\npermissions: read,local-write\nsource: test\n---\n# Safe Debug\nFind root cause before repair.`;
const elevatedSkill=`---\nname: publish-fix\ndescription: Publish a fix externally\nversion: 1.0.0\ntriggers: fix,publish\npermissions: read,external-write\nsource: test\n---\n# Publish\nSend the result externally.`;

test('engineering skill context loads relevant local skills and skips external-write skills',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-skills-'));
 try{
  await writeSkill(root,'safe-debug',safeSkill);await writeSkill(root,'publish-fix',elevatedSkill);
  const context=await loadEngineeringSkillContext(root,'fix failing test and publish',3);
  assert.deepEqual(context.names,['safe-debug']);
  assert.deepEqual(context.skippedElevated,['publish-fix']);
  assert.match(context.text,/Find root cause before repair/);
  assert.doesNotMatch(context.text,/Send the result externally/);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});

test('engineering skill context validates bounds',async()=>{
 await assert.rejects(loadEngineeringSkillContext(process.cwd(),'build',0),/between 1 and 5/);
});

test('skill-aware runtime enriches provider objective but preserves caller objective and evidence',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-skill-runtime-'));
 let received='';
 const runtime:EngineeringMissionRuntime={execute:async objective=>{received=objective;return {status:'completed',objective,branch:'agent/test',commit:'abc',changedFiles:['src/x.ts'],events:[],validation:'npm test passed',delivery:'local-commit',message:'done'}}};
 try{
  await writeSkill(root,'safe-debug',safeSkill);
  const wrapped=new SkillAwareEngineeringRuntime(root,runtime);
  const result=await wrapped.execute('fix failing regression');
  assert.match(received,/Engineering methodology context/);
  assert.match(received,/safe-debug/);
  assert.equal(result.objective,'fix failing regression');
  assert.equal(result.events[0].message,'Engineering methodology skills loaded.');
  assert.equal(result.events[0].evidence,'safe-debug');
 }finally{await fs.rm(root,{recursive:true,force:true})}
});

test('skill-aware runtime is transparent when no skill matches',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-skill-empty-'));
 let received='';
 const runtime:EngineeringMissionRuntime={execute:async objective=>{received=objective;return {status:'completed',objective,changedFiles:[],events:[],validation:'npm test passed',delivery:'local-commit',message:'noop'}}};
 try{
  const wrapped=new SkillAwareEngineeringRuntime(root,runtime);
  const result=await wrapped.execute('unmatched-objective-xyz');
  assert.equal(received,'unmatched-objective-xyz');
  assert.equal(result.events.length,0);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
