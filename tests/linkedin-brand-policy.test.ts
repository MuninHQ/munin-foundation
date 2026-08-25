import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPostDraft, loadLinkedInContent, suggestLinkedInTopics, updateVisualProfile } from '../src/linkedin-content.js';

test('LinkedIn Studio cannot reintroduce AJ monogram through persisted visual profile',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-linkedin-brand-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
 try{
  await updateVisualProfile({logoTreatment:'quando usar marca pessoal, preferir monograma AJ sutil'});
  const state=await loadLinkedInContent();
  assert.match(state.visualProfile.logoTreatment,/sem logo AJ/i);
  const draft=await createPostDraft({title:'Stablecoins e infraestrutura',angle:'Infraestrutura de liquidação e interoperabilidade',themes:['Stablecoins']});
  assert.match(draft.imagePrompt??'',/No AJ logo, no AJ monogram/i);
  assert.doesNotMatch(draft.imagePrompt??'',/preferir monograma AJ sutil/i);
 } finally {if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});

test('briefing follow-on themes remain available to the editorial engine',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'munin-linkedin-ideas-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
 try{
  const titles=(await suggestLinkedInTopics()).map(item=>item.title);
  assert.ok(titles.includes('Agentes autônomos não precisam apenas de inteligência. Precisam de contenção.'));
  assert.ok(titles.includes('A infraestrutura tokenizada começa onde termina o PowerPoint: na liquidação.'));
 } finally {if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});
