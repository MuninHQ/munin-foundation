import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SkillRegistry } from '../src/skills.js';

async function writeSkill(root:string,dir:string,body:string){await fs.mkdir(path.join(root,dir),{recursive:true});await fs.writeFile(path.join(root,dir,'SKILL.md'),body,'utf8')}

test('discovers metadata without loading instructions and lazy-loads matching skill',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-skills-'));await writeSkill(root,'build',`---\nname: autonomous-build\ndescription: Execute engineering builds.\nversion: 1.0.0\ntriggers: build,corrigir\npermissions: read,local-write,git-write\nsource: local\n---\nDo the build safely.`);await writeSkill(root,'sitrep',`---\nname: sitrep\ndescription: Generate status reports.\nversion: 1.0.0\ntriggers: sitrep,status\npermissions: read\nsource: local\n---\nSummarize state.`);const registry=new SkillRegistry(root);const discovered=await registry.discover();assert.equal(discovered.length,2);assert.equal('instructions' in discovered[0],false);const matches=await registry.match('build e validar');assert.equal(matches[0].name,'autonomous-build');const loaded=await registry.load('autonomous-build');assert.match(loaded.instructions,/build safely/);assert.deepEqual(loaded.permissions,['read','local-write','git-write'])});

test('rejects undeclared permission classes and reports elevated skills',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'munin-skills-'));await writeSkill(root,'safe',`---\nname: safe\ndescription: Safe reader.\nversion: 1.0.0\ntriggers: safe\npermissions: read\nsource: local\n---\nRead.`);await writeSkill(root,'external',`---\nname: external\ndescription: External writer.\nversion: 1.0.0\ntriggers: publish\npermissions: read,external-write\nsource: local\n---\nPublish.`);const registry=new SkillRegistry(root);const security=await registry.securitySummary();assert.deepEqual(security.externalWrite,['external']);assert.deepEqual(security.localOnly,['safe']);await writeSkill(root,'bad',`---\nname: bad\ndescription: Invalid.\nversion: 1.0.0\ntriggers: bad\npermissions: root\nsource: local\n---\nNo.`);await assert.rejects(()=>registry.discover(),/invalid permission/)})
