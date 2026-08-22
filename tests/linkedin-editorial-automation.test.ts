import test from 'node:test';
import assert from 'node:assert/strict';
import { decideEditorialAutomation } from '../src/linkedin-editorial-automation.js';

function suggestion(overrides:any={}):any{return {id:'s1',title:'Stablecoins e infraestrutura',themes:['Stablecoins'],novelty:88,adaptiveScore:91,editorialScore:90,brandEvaluation:{publish:true,score:92},...overrides};}
const signal={themes:['Stablecoins'],relevance:80};
test('selects a current high-quality suggestion',()=>{const result=decideEditorialAutomation({suggestions:[suggestion()],signals:[signal],posts:[],now:new Date('2026-08-22T12:00:00Z')});assert.equal(result.action,'compose');});
test('does not generate repeated or ungrounded posts',()=>{const repeated={id:'p1',title:'Stablecoins e infraestrutura',body:'',status:'published',themes:['Stablecoins'],createdAt:'2026-08-20T12:00:00Z',updatedAt:'2026-08-20T12:00:00Z'} as any;assert.equal(decideEditorialAutomation({suggestions:[suggestion()],signals:[signal],posts:[repeated],now:new Date('2026-08-22T12:00:00Z')}).action,'skip');assert.equal(decideEditorialAutomation({suggestions:[suggestion()],signals:[],posts:[],now:new Date('2026-08-22T12:00:00Z')}).action,'skip');});
test('respects pending and weekly limits',()=>{const draft={id:'p1',title:'Outro',body:'',status:'draft',themes:[],createdAt:'2026-08-21T12:00:00Z',updatedAt:'2026-08-21T12:00:00Z'} as any;assert.equal(decideEditorialAutomation({suggestions:[suggestion()],signals:[signal],posts:[draft,draft],now:new Date('2026-08-22T12:00:00Z')}).action,'skip');});
