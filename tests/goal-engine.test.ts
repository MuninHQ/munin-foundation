import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/store.js';
import { MuninService } from '../src/service.js';

test('goal decomposes into actions and execution advances evidence-backed progress', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-goal-')); const previous = process.env.MUNIN_DATA_DIR; process.env.MUNIN_DATA_DIR = root;
  try { const service = new MuninService(new ContextStore(root)); const goal = await service.addGoal('Ship Goal Engine', ['Core model works', 'SITREP reports progress'], 'P1', 'munin'); const actions = await service.decomposeGoal(goal.id, ['Implement core', 'Integrate SITREP']); assert.equal(actions.length, 2); assert.ok(actions.every(action => action.goalId === goal.id)); await service.execute(actions[0].id, 'Core model implemented and tested'); let current = (await service.listGoals()).find(item => item.id === goal.id)!; assert.equal(current.progress, 50); assert.equal(current.evidence.length, 1); assert.equal(current.learnings.length, 1); assert.equal(current.nextAction, 'Integrate SITREP'); await service.execute(actions[1].id, 'SITREP integration implemented and tested'); current = (await service.listGoals()).find(item => item.id === goal.id)!; assert.equal(current.progress, 100); assert.equal(current.status, 'achieved'); assert.equal(current.evidence.length, 2); assert.equal(current.learnings.length, 2); const sitrep = await service.sitrep(); assert.match(sitrep, /Goal Engine/); } finally { if (previous === undefined) delete process.env.MUNIN_DATA_DIR; else process.env.MUNIN_DATA_DIR = previous; await rm(root, { recursive: true, force: true }); }
});

test('manual goal progress requires explicit confirmation and evidence summary', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-goal-confirm-')); const previous = process.env.MUNIN_DATA_DIR; process.env.MUNIN_DATA_DIR = root;
  try { const service = new MuninService(new ContextStore(root)); const goal = await service.addGoal('Confirmed progress', ['Evidence exists']); await assert.rejects(() => service.recordGoalProgress(goal.id, 25, 'Claimed progress'), /explicit manual confirmation/); const updated = await service.recordGoalProgress(goal.id, 25, 'Milestone explicitly confirmed', true); assert.equal(updated.progress, 25); assert.equal(updated.evidence[0]?.source, 'manual'); } finally { if (previous === undefined) delete process.env.MUNIN_DATA_DIR; else process.env.MUNIN_DATA_DIR = previous; await rm(root, { recursive: true, force: true }); }
});
