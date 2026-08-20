import test from 'node:test';
import assert from 'node:assert/strict';
import { preflightOllama } from '../src/provider-preflight.js';

async function withOllamaEnv(values:{enabled?:string;selfHeal?:string},run:()=>Promise<void>){
 const previousEnabled=process.env.MUNIN_OLLAMA_ENABLED;
 const previousSelfHeal=process.env.MUNIN_OLLAMA_SELF_HEAL;
 if(values.enabled===undefined)delete process.env.MUNIN_OLLAMA_ENABLED;else process.env.MUNIN_OLLAMA_ENABLED=values.enabled;
 if(values.selfHeal===undefined)delete process.env.MUNIN_OLLAMA_SELF_HEAL;else process.env.MUNIN_OLLAMA_SELF_HEAL=values.selfHeal;
 try{await run()}finally{
  if(previousEnabled===undefined)delete process.env.MUNIN_OLLAMA_ENABLED;else process.env.MUNIN_OLLAMA_ENABLED=previousEnabled;
  if(previousSelfHeal===undefined)delete process.env.MUNIN_OLLAMA_SELF_HEAL;else process.env.MUNIN_OLLAMA_SELF_HEAL=previousSelfHeal;
 }
}

test('preflight does not probe or start Ollama by default',async()=>{
 await withOllamaEnv({},async()=>{
  let probed=false;let started=false;
  const result=await preflightOllama({fetchImpl:(async()=>{probed=true;throw new Error('should not probe')}) as typeof fetch,startServer:()=>{started=true}});
  assert.equal(result.ready,false);assert.equal(result.state,'disabled');assert.equal(probed,false);assert.equal(started,false);assert.match(result.message,/desativado/);
 });
});

test('preflight selects an installed Ollama model after explicit opt-in',async()=>{
 await withOllamaEnv({enabled:'1'},async()=>{
  const result=await preflightOllama({fetchImpl:(async()=>new Response(JSON.stringify({models:[{name:'gemma3:4b'}]}),{status:200})) as typeof fetch});
  assert.equal(result.ready,true);assert.equal(result.model,'gemma3:4b');assert.equal(result.state,'ready');
 });
});

test('preflight does not self-heal unless separately enabled',async()=>{
 await withOllamaEnv({enabled:'1'},async()=>{
  let started=false;
  const result=await preflightOllama({fetchImpl:(async()=>{throw new Error('offline')}) as typeof fetch,findExecutable:async()=>'/usr/bin/ollama',startServer:()=>{started=true}});
  assert.equal(started,false);assert.equal(result.ready,false);assert.equal(result.state,'unreachable');assert.match(result.message,/automática permanece desativada/);
 });
});

test('preflight can start Ollama only after explicit provider and self-heal opt-in',async()=>{
 await withOllamaEnv({enabled:'1',selfHeal:'1'},async()=>{
  let calls=0;let started=false;
  const fetchImpl=(async()=>{calls++;if(calls===1)throw new Error('offline');return new Response(JSON.stringify({models:[{name:'qwen3:8b'}]}),{status:200})}) as typeof fetch;
  const result=await preflightOllama({fetchImpl,findExecutable:async()=>'/usr/bin/ollama',startServer:()=>{started=true},sleep:async()=>{}});
  assert.equal(started,true);assert.equal(result.ready,true);assert.equal(result.state,'started');
 });
});
