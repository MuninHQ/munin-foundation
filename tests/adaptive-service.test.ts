import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/store.js';
import { MuninService } from '../src/service.js';

test('service execute passes through adaptive reviewer gate and persists learning', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-service-'));
  const previous = process.env.MUNIN_DATA_DIR;
  process.env.MUNIN_DATA_DIR = root;
  try {
    const store = new ContextStore(root);
    const service = new MuninService(store);
    const action = await service.addAction('Build adaptive service integration', 'P0');
    const executed = await service.execute(action.id, 'Adaptive execution integrated and validated');

    assert.equal(executed.status, 'done');
    assert.equal(executed.outcome, 'Adaptive execution integrated and validated');

    const events = await store.events();
    const event = events.find(item => item.type === 'action.executed' && item.entityId === action.id);
    assert.ok(event);
    assert.equal((event.payload.route as { primary: string }).primary, 'builder');
    assert.equal((event.payload.validation as { passed: boolean }).passed, true);
    assert.equal(typeof event.payload.adaptiveOutcomeId, 'string');

    const outcomes = JSON.parse(await readFile(path.join(root, 'adaptive-execution', 'outcomes.json'), 'utf8')) as { taskId: string; status: string }[];
    assert.ok(outcomes.some(item => item.taskId === action.id && item.status === 'passed'));
  } finally {
    if (previous === undefined) delete process.env.MUNIN_DATA_DIR; else process.env.MUNIN_DATA_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});
