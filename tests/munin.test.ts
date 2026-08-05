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
    const service = new MuninService(new ContextStore(dir));
    const action = await service.addAction('Ship vertical slice', 'P1');
    await service.execute(action.id, 'Vertical slice shipped');
    const state = JSON.parse(await service.inspect());
    assert.equal(state.actions[0].status, 'done');
    assert.equal(state.actions[0].outcome, 'Vertical slice shipped');
    assert.match(await service.sitrep(), /action\.executed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('decision creation is visible in SITREP', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const decision = await service.addDecision('Accept Munin v0.1 scope');
    const report = await service.sitrep();
    assert.match(report, new RegExp(decision.id));
    assert.match(report, /Accept Munin v0\.1 scope/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('career workflow scores, updates and reports opportunities', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const job = await service.addJob('Example Bank', 'Head of Product', 'Payments Open Finance AI leadership fintech');
    assert.ok(job.fitScore >= 80);
    await service.updateJob(job.id, 'applied', 'Send follow-up');
    const jobs = await service.listJobs();
    assert.equal(jobs[0].status, 'applied');
    assert.ok(jobs[0].followUpAt);
    assert.match(await service.careerSitrep(), /Applied: 1/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('context relations connect and retrieve related entities', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const project = await service.addProject('Context Engine');
    const decision = await service.addDecision('Adopt typed relations', project.id);
    const relation = await service.addRelation('decision', decision.id, 'supports', 'project', project.id);
    const context = await service.relatedContext(project.id);
    assert.equal(relation.type, 'supports');
    assert.equal(context.incoming.length, 1);
    assert.equal(context.incoming[0].sourceId, decision.id);
    const state = JSON.parse(await service.inspect());
    assert.equal(state.relations.length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('context relation rejects missing endpoints', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    await assert.rejects(() => service.addRelation('project', 'missing', 'blocks', 'action', 'missing'), /Source not found/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('incremental SITREP filters old events', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    await service.addProject('Old project');
    const boundary = new Date(Date.now() + 1000);
    const report = await service.sitrep(boundary);
    assert.match(report, /Nenhuma mudança registrada/);
    assert.match(report, /Janela: mudanças desde/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('SITREP ranks blocked action above same-priority action', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-'));
  try {
    const service = new MuninService(new ContextStore(dir));
    const blocker = await service.addDecision('Approve dependency');
    const normal = await service.addAction('Normal action', 'P1');
    const blocked = await service.addAction('Blocked action', 'P1');
    await service.addRelation('decision', blocker.id, 'blocks', 'action', blocked.id);
    const report = await service.sitrep();
    assert.ok(report.indexOf(blocked.id) < report.indexOf(normal.id));
    assert.match(report, new RegExp(`decision/${blocker.id} blocks action/${blocked.id}`));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
