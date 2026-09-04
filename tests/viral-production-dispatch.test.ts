import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ViralProductionDispatcher } from '../src/viral-production-dispatch.js';
import type { ContentVideoInput, ContentVideoOutput } from '../src/content-video-capability.js';
import type { ViralProductionJob } from '../src/viral-engine.js';

const job: ViralProductionJob = {
  id: 'production_test', topicId: 'topic_test', status: 'queued', createdAt: '2026-09-04T00:00:00.000Z',
  handoff: {
    capability: 'media.content-video', action: 'plan', topic: 'Verified payments story', script: 'Approved script brief', aspectRatio: '16:9',
    providerPolicy: 'zero-cost-first', modelRouting: 'munin-provider-policy',
    assetPolicy: { pexelsOptional: true, licenseLedgerRequired: true, youtubeReuseAllowed: false },
  },
};

function output(input: ContentVideoInput): ContentVideoOutput {
  return {
    action: input.action, ready: input.action === 'generate', detail: input.action === 'generate' ? 'generated locally' : 'planned locally',
    policy: { enabled: input.action === 'generate', runnerConfigured: input.action === 'generate', automaticInstallAllowed: false, automaticPublishAllowed: false, paidDependencyRequired: false, humanApprovalRequired: true },
    request: { topic: input.topic }, result: input.action === 'generate' ? { outputPath: 'draft.mp4' } : undefined,
  };
}

test('dispatch plans automatically when the local runner is unavailable and reuses the receipt', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-dispatch-')); let calls = 0;
  try {
    const dispatcher = new ViralProductionDispatcher(path.join(dir, 'dispatch.json'), async input => { calls++; return output(input); }, () => ({ enabled: false, runnerConfigured: false }));
    const first = await dispatcher.dispatch(job);
    const second = await dispatcher.dispatch(job);
    assert.equal(first.action, 'plan');
    assert.equal(first.status, 'planned');
    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(calls, 1);
    assert.equal((await dispatcher.list()).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('dispatch generates a local draft when the reviewed runner is enabled', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-dispatch-')); let seen: ContentVideoInput | undefined;
  try {
    const dispatcher = new ViralProductionDispatcher(path.join(dir, 'dispatch.json'), async input => { seen = input; return output(input); }, () => ({ enabled: true, runnerConfigured: true }));
    const receipt = await dispatcher.dispatch(job);
    assert.equal(receipt.action, 'generate');
    assert.equal(receipt.status, 'generated');
    assert.deepEqual(receipt.result, { outputPath: 'draft.mp4' });
    assert.equal(seen?.topic, job.handoff.topic);
    assert.equal(seen?.script, job.handoff.script);
    assert.equal(seen?.aspectRatio, '16:9');
    assert.equal(seen?.provider, 'moneyprinterturbo');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
