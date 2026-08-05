import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ExecutionEngine } from '../src/runtime.js';

test('runtime decomposes a build objective into dependent agent tasks', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-runtime-'));
  try {
    const engine = new ExecutionEngine(dir);
    const plan = await engine.createPlan('Build code for a context API');
    assert.equal(plan.status, 'READY');
    assert.equal(plan.tasks.length, 3);
    assert.equal(plan.tasks[0].owner, 'planner');
    assert.equal(plan.tasks[1].owner, 'git');
    assert.deepEqual(plan.tasks[1].dependencies, [plan.tasks[0].id]);
    assert.equal(plan.tasks[2].owner, 'reviewer');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime executes tasks in dependency order and records telemetry', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-runtime-'));
  try {
    const engine = new ExecutionEngine(dir);
    const plan = await engine.createPlan('Create a white paper about AI governance');
    const executed = await engine.run(plan.id);
    assert.equal(executed.status, 'DONE');
    assert.ok(executed.tasks.every(task => task.status === 'DONE'));
    assert.ok(executed.tasks.every(task => task.startedAt && task.finishedAt && task.result));
    const telemetry = await engine.telemetry();
    assert.equal(telemetry.plans, 1);
    assert.equal(telemetry.tasks, 3);
    assert.equal(telemetry.done, 3);
    assert.equal(telemetry.failed, 0);
    assert.equal(telemetry.byAgent.research, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime rejects empty objectives and unknown plans', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-runtime-'));
  try {
    const engine = new ExecutionEngine(dir);
    await assert.rejects(() => engine.createPlan('   '), /Objective is required/);
    await assert.rejects(() => engine.run('missing'), /Execution plan not found/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
