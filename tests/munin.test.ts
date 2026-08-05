import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/store.js';
import { MuninService } from '../src/service.js';

test('execution updates state and appears in SITREP', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const store = new ContextStore(dir);
    const service = new MuninService(store);
    const action = await service.addAction('Ship vertical slice', 'P1');
    await service.execute(action.id, 'Vertical slice shipped');
    const state = JSON.parse(await service.inspect());
    assert.equal(state.actions[0].status, 'done');
    assert.equal(state.actions[0].outcome, 'Vertical slice shipped');
    assert.match(await service.sitrep(), /action\.executed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('decision creation is visible in SITREP', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const decision = await service.addDecision('Accept Munin v0.1 scope');
    const report = await service.sitrep();
    assert.match(report, new RegExp(decision.id));
    assert.match(report, /Accept Munin v0\.1 scope/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('career workflow scores, updates and reports opportunities', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const job = await service.addJob(
      'Example Bank',
      'Head of Product',
      'Payments Open Finance AI leadership fintech',
    );
    assert.ok(job.fitScore >= 80);
    await service.updateJob(job.id, 'applied', 'Send follow-up');
    const jobs = await service.listJobs();
    assert.equal(jobs[0].status, 'applied');
    assert.ok(jobs[0].followUpAt);
    const report = await service.careerSitrep();
    assert.match(report, /Example Bank/);
    assert.match(report, /Applied: 1/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
