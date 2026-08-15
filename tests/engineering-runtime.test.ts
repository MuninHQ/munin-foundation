import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EngineeringAgentRuntime } from '../src/engineering-runtime.js';
import { isLocalProviderUrl } from '../src/llm-settings.js';

test('recognizes keyless local provider URLs',()=>{
 assert.equal(isLocalProviderUrl('http://127.0.0.1:11434/v1'),true);
 assert.equal(isLocalProviderUrl('http://localhost:11434/v1'),true);
 assert.equal(isLocalProviderUrl('https://api.example.com/v1'),false);
});

test('engineering runtime fails closed outside a git repository',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-engineering-test-'));
 try{const result=await new EngineeringAgentRuntime(dir).execute('do something');assert.equal(result.status,'needs_user');assert.match(result.message,/Git/i)}finally{await rm(dir,{recursive:true,force:true})}
});
