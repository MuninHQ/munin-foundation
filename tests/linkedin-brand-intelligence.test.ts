import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLinkedInBrandSuggestion, personalBrandSnapshot, rankLinkedInBrandSuggestions, repetitionAgainstHistory } from '../src/linkedin-brand-intelligence.js';
import type { ContentSuggestion, LinkedInPost } from '../src/linkedin-content.js';

const suggestion=(overrides:Partial<ContentSuggestion>={}):ContentSuggestion=>({
  id:'stablecoins',
  title:'Stablecoins e infraestrutura financeira',
  angle:'O impacto sobre liquidação, interoperabilidade, governança e execução em produção',
  whyNow:'Novo sinal regulatório',
  novelty:90,
  themes:['Stablecoins','Infraestrutura Financeira','Digital Assets'],
  sourceSignals:['Banco Central: novo sinal'],
  imageConcept:'objeto abstrato',
  imagePrompt:'prompt',
  visualNovelty:90,
  visualWarnings:[],
  ...overrides,
});

const post=(title:string,body='infraestrutura financeira e liquidação'):LinkedInPost=>({
  id:title,
  title,
  body,
  status:'published',
  themes:['Stablecoins'],
  createdAt:'2026-08-01T00:00:00.000Z',
  updatedAt:'2026-08-01T00:00:00.000Z',
});

test('brand snapshot exposes the authority flywheel',()=>{
  const snapshot=personalBrandSnapshot();
  assert.equal(snapshot.theses.length,5);
  assert.equal(snapshot.authorityFlywheel.at(-1),'professional-opportunity');
});

test('evidence-backed owned-thesis suggestion clears brand gate',()=>{
  const result=evaluateLinkedInBrandSuggestion(suggestion(),[],true);
  assert.equal(result.publish,true);
  assert.ok(result.thesisIds.includes('THESIS-003'));
  assert.ok(result.finalScore>=70);
});

test('near duplicate receives high repetition risk and cannot autonomously publish',()=>{
  const history=[post('Stablecoins e infraestrutura financeira','O impacto sobre liquidação, interoperabilidade, governança e execução em produção')];
  const result=evaluateLinkedInBrandSuggestion(suggestion(),history,true);
  assert.equal(result.semanticRepetitionRisk,'high');
  assert.equal(result.publish,false);
  assert.equal(result.autonomousPublishAllowed,false);
});

test('ranking prefers brand-aligned differentiated content',()=>{
  const generic=suggestion({id:'generic',title:'Cinco tendências de liderança',angle:'O futuro chegou e você precisa saber',themes:['Liderança'],novelty:100,sourceSignals:[]});
  const ranked=rankLinkedInBrandSuggestions([generic,suggestion()],[],{stablecoins:true});
  assert.equal(ranked[0].id,'stablecoins');
});

test('repetition detector stays low for a materially different territory',()=>{
  const result=repetitionAgainstHistory({title:'IA e operating model',angle:'Como execução e integração criam vantagem'},[post('Stablecoins e infraestrutura financeira')]);
  assert.equal(result.semanticRepetitionRisk,'low');
});
