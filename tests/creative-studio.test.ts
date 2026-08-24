import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addLinkedInPost } from '../src/linkedin-content.js';
import { approveForPublication, publisherQueue, schedulePublication } from '../src/linkedin-publisher.js';
import { buildClaudeCreativePrompt } from '../src/creative-studio/claude-code-adapter.js';
import { buildChatGptComparisonPrompt, creativeBriefFromPost, nextScheduledCreativeBrief } from '../src/creative-studio/dual-agent-review.js';

test('Creative Studio builds a brand-safe brief without mutating scheduled publication state', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'munin-creative-'));
  const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({
      title:'Governança proporcional de IA',
      body:'Governança de IA deveria começar pela consequência da decisão.',
      status:'draft',
      themes:['IA','Produto'],
      visualConcept:'mecanismo de controle em camadas',
      imagePrompt:'A premium layered mechanical control object on graphite background.',
    });
    await approveForPublication(post.id);
    const scheduledFor=new Date(Date.now()+86_400_000).toISOString();
    await schedulePublication(post.id,{scheduledFor,confirmation:'LINKEDIN_SCHEDULED_MANUALLY'});

    const before=(await publisherQueue()).find(item=>item.postId===post.id);
    const brief=await creativeBriefFromPost(post.id);
    const selected=await nextScheduledCreativeBrief();
    const after=(await publisherQueue()).find(item=>item.postId===post.id);

    assert.equal(selected.id,brief.id);
    assert.equal(before?.status,'scheduled');
    assert.equal(after?.status,'scheduled');
    assert.equal(after?.scheduledFor,scheduledFor);
    assert.match(brief.constraints.join(' '),/AJ logo/i);
    assert.match(brief.constraints.join(' '),/watermark/i);
    assert.match(brief.constraints.join(' '),/must not publish/i);
  } finally {
    if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;
    await rm(dir,{recursive:true,force:true});
  }
});

test('dual-agent prompts preserve final human publication boundary and visual constraints',()=>{
  const brief={
    id:'creative_li_test',title:'AI governance',postBody:'Body',objective:'Create hero image',audience:['executives'],themes:['IA'],
    visualConcept:'layered control mechanism',imagePrompt:'premium image',
    constraints:['No AJ logo, monogram, signature, watermark, or text.'],evaluationCriteria:['clarity'],createdAt:new Date().toISOString(),
  };
  const claudePrompt=buildClaudeCreativePrompt(brief);
  assert.match(claudePrompt,/Do not publish, schedule, or modify external systems/);
  assert.match(claudePrompt,/No AJ logo/);
  const comparison=buildChatGptComparisonPrompt(brief,{agent:'claude-code',status:'ok',output:'Use fewer layers.',durationMs:10},'Use a central object.');
  assert.match(comparison,/Do not change the LinkedIn post body or publication schedule/);
  assert.match(comparison,/Use fewer layers/);
  assert.match(comparison,/FINAL_IMAGE_PROMPT/);
});
