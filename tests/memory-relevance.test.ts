import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryRelevance } from '../src/memory-relevance.js';
const base={tags:['chatgpt-export'],source:'chatgpt-export:test',confidence:'confirmed' as const,observedAt:'2026-08-15'};
test('keeps durable career/project context',()=>{const r=memoryRelevance({...base,kind:'career' as const,subject:'B3 interview',content:'Minha prioridade é a vaga da B3 e quero preparar a próxima entrevista.'});assert.equal(r.decision,'keep')});
test('drops casual gaming chatter by default',()=>{const r=memoryRelevance({...base,kind:'event' as const,subject:'Night Crows',content:'Qual o melhor farm spot para gunner no Night Crows PvE?'});assert.equal(r.decision,'drop')});
test('durable preference can override a casual domain',()=>{const r=memoryRelevance({...base,kind:'preference' as const,subject:'Games in SITREP',content:'Daqui pra frente nunca inclua Night Crows no SITREP ou nos projetos.'});assert.notEqual(r.decision,'drop')});
