import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addLinkedInPost } from '../src/linkedin-content.js';
import { linkedinAuthorityLearning, recordLinkedInPerformance } from '../src/linkedin-authority-learning.js';

test('learning loop values conversations and opportunities above vanity metrics',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'munin-authority-learning-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({title:'Stablecoins e infraestrutura financeira',body:'Stablecoins pressionam liquidação, governança e interoperabilidade a evoluir.',status:'published',themes:['Stablecoins','Infraestrutura Financeira']});
    await recordLinkedInPerformance({postId:post.id,impressions:1000,reactions:20,comments:4,reposts:2,relevantConversations:3,inboundOpportunities:1,followersGained:12});
    const learning=await linkedinAuthorityLearning();
    assert.equal(learning.observedPosts,1);
    assert.equal(learning.inboundOpportunities,1);
    assert.equal(learning.relevantConversations,3);
    assert.ok(learning.posts[0].authorityScore>=50);
    assert.ok(learning.posts[0].thesisIds.includes('THESIS-003'));
  }finally{if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});

test('performance observation is upserted per post',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'munin-authority-learning-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({title:'IA e execução',body:'Modelos comoditizam; integração e execução criam vantagem em produto.',status:'published',themes:['IA','Produto']});
    await recordLinkedInPerformance({postId:post.id,impressions:100,reactions:2});
    await recordLinkedInPerformance({postId:post.id,impressions:500,reactions:25,relevantConversations:2});
    const learning=await linkedinAuthorityLearning();
    assert.equal(learning.observedPosts,1);
    assert.equal(learning.posts[0].observation.impressions,500);
    assert.equal(learning.posts[0].observation.relevantConversations,2);
  }finally{if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});

test('invalid negative metrics are rejected',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'munin-authority-learning-'));const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({title:'Produto regulado',body:'Inovação precisa sobreviver à produção.',status:'published'});
    await assert.rejects(()=>recordLinkedInPerformance({postId:post.id,impressions:-1}),/non-negative/);
  }finally{if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});
