import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runtimePath } from '../src/config.js';
import { writeJsonAtomic } from '../src/storage.js';
import { addLinkedInPost, loadLinkedInContent, type LinkedInPost } from '../src/linkedin-content.js';
import { approveForPublication, publicationPackage, publisherQueue, schedulePublication, markManuallyPublished } from '../src/linkedin-publisher.js';

test('OpenDots review binding rejects changed drafts and legacy approvals at every publication boundary', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-review-binding-'));
  const previous = process.env.MUNIN_DATA_DIR;
  process.env.MUNIN_DATA_DIR = dir;
  try {
    const post = await addLinkedInPost({ title: 'Reviewed title', body: 'Reviewed body', status: 'draft', themes: ['IA'], visualConcept: 'Concept', imagePrompt: 'Prompt' });
    const edit = async (patch: Partial<LinkedInPost>) => {
      const content = await loadLinkedInContent();
      Object.assign(content.posts.find(item => item.id === post.id)!, patch);
      await writeJsonAtomic(runtimePath('linkedin-content.json'), content);
    };
    const schedule = () => schedulePublication(post.id, { scheduledFor: new Date(Date.now() + 86_400_000).toISOString(), confirmation: 'LINKEDIN_SCHEDULED_MANUALLY' });
    const publish = () => markManuallyPublished(post.id, { url: 'https://www.linkedin.com/posts/review', confirmation: 'I_PUBLISHED_THIS_MANUALLY' });

    for (const patch of [{ title: 'Changed title' }, { body: 'Changed body' }, { themes: ['Produto'] }, { visualConcept: 'Changed concept' }, { imagePrompt: 'Changed prompt' }, { visualReferenceId: 'new-reference' }]) {
      await approveForPublication(post.id);
      await edit(patch);
      await assert.rejects(() => publicationPackage(post.id), /changed|review/i);
      await assert.rejects(schedule, /changed|review/i);
      await assert.rejects(publish, /changed|review/i);
      assert.equal((await publisherQueue()).find(item => item.postId === post.id)?.status, 'draft');
    }

    await approveForPublication(post.id);
    await edit({ notes: 'Internal note', updatedAt: new Date().toISOString() });
    assert.equal((await publicationPackage(post.id)).body, 'Changed body');
    await schedule();
    await edit({ body: 'Changed after scheduling' });
    await assert.rejects(() => publicationPackage(post.id), /changed|review/i);
    await assert.rejects(publish, /changed|review/i);
    const queue = (await publisherQueue()).find(item => item.postId === post.id)!;
    assert.equal(queue.status, 'draft');
    assert.equal(queue.scheduledFor, undefined);

    await approveForPublication(post.id);
    const state = JSON.parse(await readFile(runtimePath('linkedin-publisher.json'), 'utf8'));
    delete state.records.find((item: { postId: string }) => item.postId === post.id).approvalContentHash;
    await writeJsonAtomic(runtimePath('linkedin-publisher.json'), state);
    await assert.rejects(() => publicationPackage(post.id), /review/i);
    await assert.rejects(schedule, /review/i);
    await assert.rejects(publish, /review/i);
    await approveForPublication(post.id);
    assert.equal((await publicationPackage(post.id)).body, 'Changed after scheduling');
    await publish();
    assert.equal((await publisherQueue()).find(item => item.postId === post.id)?.status, 'published');
  } finally {
    if (previous === undefined) delete process.env.MUNIN_DATA_DIR;
    else process.env.MUNIN_DATA_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
