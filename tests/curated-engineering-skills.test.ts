import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { SkillRegistry } from '../src/skills.js';

test('curated external engineering skills are pinned and discoverable',async()=>{
 const registry=new SkillRegistry(path.resolve('skills'));
 const skills=await registry.discover();
 for(const name of ['source-driven-development','security-hardening']){
  const skill=skills.find(item=>item.name===name);
  assert.ok(skill, name);
  assert.match(skill.source,/@[a-f0-9]{40}-inspired-munin-adaptation$/);
  assert.equal(skill.permissions.includes('external-write'),false);
 }
 assert.ok((await registry.match('review this upstream github repository and integrate it safely')).some(item=>item.name==='source-driven-development'));
 assert.ok((await registry.match('security hardening for prompt injection and credential access')).some(item=>item.name==='security-hardening'));
});
