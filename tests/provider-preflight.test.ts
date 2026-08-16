import test from 'node:test';
import assert from 'node:assert/strict';
import { preflightOllama } from '../src/provider-preflight.js';

test('preflight selects an installed Ollama model',async()=>{
 const result=await preflightOllama({fetchImpl:(async()=>new Response(JSON.stringify({models:[{name:'gemma3:4b'}]}),{status:200})) as typeof fetch});
 assert.equal(result.ready,true);assert.equal(result.model,'gemma3:4b');assert.equal(result.state,'ready');
});

test('preflight starts a sleeping installed Ollama service',async()=>{
 let calls=0;let started=false;
 const fetchImpl=(async()=>{calls++;if(calls===1)throw new Error('offline');return new Response(JSON.stringify({models:[{name:'qwen3:8b'}]}),{status:200})}) as typeof fetch;
 const result=await preflightOllama({fetchImpl,findExecutable:async()=>'/usr/bin/ollama',startServer:()=>{started=true},sleep:async()=>{}});
 assert.equal(started,true);assert.equal(result.ready,true);assert.equal(result.state,'started');
});

test('preflight explains when Ollama is not installed',async()=>{
 const result=await preflightOllama({fetchImpl:(async()=>{throw new Error('offline')}) as typeof fetch,findExecutable:async()=>undefined});
 assert.equal(result.ready,false);assert.equal(result.state,'not-installed');assert.match(result.message,/executável não foi encontrado/);
});
