import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEngineeringRepoContext } from '../src/llm-provider.js';

test('formats source-anchored repository intelligence as advisory engineering context',()=>{
 const text=formatEngineeringRepoContext({
  query:'change engineering runtime',
  files:['src/engineering-runtime.ts','tests/engineering-runtime.test.ts'],
  symbols:['EngineeringAgentRuntime'],
  tests:['tests/engineering-runtime.test.ts'],
  evidence:[{source:'rag-rat',path:'src/engineering-runtime.ts',symbol:'EngineeringAgentRuntime',rationale:'primary runtime entry point',confidence:0.94}],
  coverage:'indexed',
 });
 assert.match(text,/advisory/i);
 assert.match(text,/engineering-runtime\.ts/);
 assert.match(text,/EngineeringAgentRuntime/);
 assert.match(text,/primary runtime entry point/);
 assert.match(text,/0\.94/);
});

test('bounds repository intelligence context to keep planning prompts controlled',()=>{
 const many=Array.from({length:80},(_,i)=>`src/file-${i}.ts`);
 const text=formatEngineeringRepoContext({query:'x',files:many,symbols:many,tests:many,evidence:Array.from({length:20},()=>({source:'native' as const,rationale:'hint'})),coverage:'partial'});
 assert.match(text,/src\/file-29\.ts/);
 assert.doesNotMatch(text,/src\/file-30\.ts/);
 const hints=text.match(/"rationale": "hint"/g)??[];
 assert.equal(hints.length,8);
});
