import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ActionAuditLog, classifyActionIntent, evaluateAction } from '../src/action-constitution.js';

test('allows bounded local and read actions',()=>{
 assert.equal(evaluateAction({class:'read',tool:'read-file',target:'src/app.ts'}).decision,'allow');
 assert.equal(evaluateAction({class:'local-write',tool:'write-file',target:'src/app.ts'}).decision,'allow');
 assert.equal(evaluateAction({class:'git-write',tool:'git commit'}).decision,'allow');
 assert.equal(evaluateAction({class:'network-read',tool:'http get',target:'https://example.com'}).decision,'allow');
});

test('classifies only genuinely consequential engineering intents',()=>{
 assert.equal(classifyActionIntent('remove unused React component'),'local-write');
 assert.equal(classifyActionIntent('delete repository and recreate it'),'destructive');
 assert.equal(classifyActionIntent('publish to LinkedIn after build'),'external-write');
});

test('escalates consequential external/destructive actions',()=>{
 assert.equal(evaluateAction({class:'external-write',tool:'send-email'}).decision,'needs_user');
 assert.equal(evaluateAction({class:'destructive',tool:'delete repo'}).decision,'needs_user');
});

test('blocks secret exfiltration and protected paths',()=>{
 assert.equal(evaluateAction({class:'external-write',tool:'post',payloadPreview:'Authorization: Bearer abcdefghijklmnop'}).decision,'deny');
 assert.equal(evaluateAction({class:'local-write',tool:'write-file',target:'.env'}).decision,'deny');
 assert.equal(evaluateAction({class:'local-write',tool:'write-file',target:'data/runtime/private.json'}).decision,'deny');
});

test('writes and replays append-only audit records',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-policy-'));const file=path.join(dir,'audit.jsonl');const audit=new ActionAuditLog(file);const allowed=evaluateAction({class:'read',tool:'read-file',target:'README.md'});const gated=evaluateAction({class:'external-write',tool:'publish to LinkedIn'});await audit.append(allowed);await audit.append(gated);const lines=(await readFile(file,'utf8')).trim().split('\n');assert.equal(lines.length,2);assert.equal(JSON.parse(lines[0]).decision,'allow');const replay=await audit.replay({decision:'needs_user'});assert.equal(replay.length,1);assert.equal(replay[0].request.class,'external-write');assert.deepEqual(await new ActionAuditLog(path.join(dir,'missing.jsonl')).replay(),[]);await rm(dir,{recursive:true,force:true});
});
