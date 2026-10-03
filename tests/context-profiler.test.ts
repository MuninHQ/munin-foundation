import assert from 'node:assert/strict';
import test from 'node:test';
import { formatContextProfile, profileContext } from '../src/context-profiler.js';

test('profiles context by component without returning raw text',()=>{
 const profile=profileContext([
  {name:'tool schemas',kind:'tools',chars:8000},
  {name:'history',kind:'history',text:'abcd'.repeat(500)},
  {name:'glossary',kind:'steering',chars:400},
 ]);
 assert.equal(profile.components[0].name,'tool schemas');
 assert.equal(profile.rawContentReturned,false);
 assert.equal('text' in profile.components[0],false);
 assert.ok(profile.estimatedTokens>0);
 assert.match(formatContextProfile(profile),/Raw content returned: NO/);
});

test('flags dominant tool schemas for context-diet review',()=>{
 const profile=profileContext([
  {name:'tools',kind:'tools',chars:9000},
  {name:'user',kind:'user',chars:1000},
 ]);
 assert.match(profile.recommendations.join('\n'),/Tool schemas/);
 assert.match(profile.recommendations.join('\n'),/inspect it first/);
});

test('rejects ambiguous or invalid component sizes',()=>{
 assert.throws(()=>profileContext([{name:'x',kind:'other',text:'a',chars:1}]),/text or chars/);
 assert.throws(()=>profileContext([{name:'x',kind:'other',chars:-1}]),/non-negative integer/);
});
