import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildRecoveryCheckpoint, recoverPlan, RuntimeRecovery } from '../src/recovery.js';
import type { ExecutionPlan } from '../src/runtime.js';

function samplePlan(): ExecutionPlan {
  return {
    id: 'obj-recovery',
    objective: 'Recover interrupted work',
    status: 'RUNNING',
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:01:00.000Z',
    tasks: [
      { id: 'done', objectiveId: 'obj-recovery', title: 'Done', capability: 'plan', owner: 'planner', status: 'DONE', priority: 0, dependencies: [], expectedOutput: 'Plan', result: 'kept' },
      { id: 'running', objectiveId: 'obj-recovery', title: 'Running', capability: 'write', owner: 'writer', status: 'RUNNING', priority: 1, dependencies: ['done'], expectedOutput: 'Draft', startedAt: '2026-08-05T10:01:00.000Z' },
      { id: 'failed', objectiveId: 'obj-recovery', title: 'Failed', capability: 'review', owner: 'reviewer', status: 'FAILED', priority: 2, dependencies: ['running'], expectedOutput: 'Review', error: 'bad output' },
    ],
  };
}

test('checkpoint separates completed and recoverable tasks', () => {
  const checkpoint = buildRecoveryCheckpoint(samplePlan(), '2026-08-05T11:00:00.000Z');
  assert.deepEqual(checkpoint.completedTaskIds, ['done']);
  assert.deepEqual(checkpoint.recoverableTaskIds, ['running', 'failed']);
});

test('recovery preserves completed work and does not retry failed work by default', () => {
  const recovered = recoverPlan(samplePlan(), false, '2026-08-05T11:00:00.000Z');
  assert.equal(recovered.tasks[0].status, 'DONE');
  assert.equal(recovered.tasks[0].result, 'kept');
  assert.equal(recovered.tasks[1].status, 'WAITING');
  assert.equal(recovered.tasks[1].startedAt, undefined);
  assert.equal(recovered.tasks[2].status, 'FAILED');
});

test('forced recovery requeues failed work without duplicating completed work', () => {
  const recovered = recoverPlan(samplePlan(), true);
  assert.equal(recovered.tasks[0].status, 'DONE');
  assert.equal(recovered.tasks[2].status, 'WAITING');
  assert.equal(recovered.tasks[2].error, undefined);
});

test('recovery service persists the recovered plan', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-recovery-'));
  await writeFile(path.join(root, 'executions.json'), JSON.stringify([samplePlan()]), 'utf8');
  const recovery = new RuntimeRecovery(root);
  const result = await recovery.recover('obj-recovery', true);
  const persisted = JSON.parse(await readFile(path.join(root, 'executions.json'), 'utf8')) as ExecutionPlan[];
  assert.equal(result.status, 'READY');
  assert.equal(persisted[0].tasks[0].status, 'DONE');
  assert.equal(persisted[0].tasks[2].status, 'WAITING');
});
