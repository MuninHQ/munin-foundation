import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EfficiencyBuildStateStore, historyReuse } from '../src/efficiency-build-state.js';

test('newer revision wins and consolidated history is referenced by digest', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-efficiency-state-'));
  const file = path.join(dir, 'state.json');
  try {
    const store = new EfficiencyBuildStateStore(file);
    const first = await store.save({ taskId: 'task-1', expectedRevision: 0, objective: 'build efficiency', status: 'running', decisions: ['manual web only'], relevantFiles: ['src/a.ts'], blockers: [], tests: [], nextAction: 'run tests', consolidatedHistory: 'accepted design and spec' });
    assert.equal(first.revision, 1);
    assert.equal(historyReuse(first, 'accepted design and spec').reused, true);
    await assert.rejects(() => store.save({ ...first, expectedRevision: 0, nextAction: 'overwrite', consolidatedHistory: 'accepted design and spec' }), /revision/i);
    assert.ok(JSON.stringify(first).length < 12_000);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
