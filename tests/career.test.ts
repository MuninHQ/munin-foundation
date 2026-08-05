import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/store.js';
import { MuninService } from '../src/service.js';

test('career queue prioritizes due follow-up and active interview', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-career-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const applied = await service.addJob('Bank A', 'Product Manager', 'payments open finance product');
    const interview = await service.addJob('Bank B', 'Head of Product', 'payments ai leadership fintech');
    await service.updateJob(applied.id, 'applied');
    await service.updateJob(interview.id, 'interview');
    const state = JSON.parse(await service.inspect());
    state.jobs.find((job: { id: string }) => job.id === applied.id).followUpAt = '2020-01-01T00:00:00.000Z';
    await new ContextStore(dir).save(state);
    const queue = await service.careerQueue(new Date('2026-08-05T12:00:00.000Z'));
    assert.equal(queue[0].job.id, applied.id);
    assert.equal(queue[0].followUpDue, true);
    assert.match(queue[0].rationale.join(' '), /follow-up due/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('touch and close operations update lifecycle safely', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-career-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const job = await service.addJob('Bank C', 'Director of Product', 'digital assets product leadership');
    const touched = await service.touchJob(job.id, 'Message sent to recruiter');
    assert.ok(touched.lastContactAt);
    assert.ok(touched.followUpAt);
    const closed = await service.closeJob(job.id, 'closed', 'Role no longer accepting applications');
    assert.equal(closed.status, 'closed');
    assert.equal(closed.followUpAt, undefined);
    assert.equal(closed.closedReason, 'Role no longer accepting applications');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
