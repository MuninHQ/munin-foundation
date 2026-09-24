import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compactWorkflowContext } from '../src/token-efficiency-compaction.js';
import { TokenEfficiencyCheckpointStore } from '../src/token-efficiency-checkpoint.js';

test('checkpoint is idempotent for the same source revision and changes for a new revision', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-checkpoint-'));
  try {
    const compact = compactWorkflowContext({ objective: 'ship', status: 'active', decisions: [], errors: [], artifacts: [], blockers: [], nextSteps: ['continue'], verification: [], commentary: [] });
    const store = new TokenEfficiencyCheckpointStore(path.join(dir, 'checkpoints'));
    const first = await store.write({ runId: 'r1', sessionId: 's1', sourceRevision: 'abc', compact });
    const second = await store.write({ runId: 'r1', sessionId: 's1', sourceRevision: 'abc', compact });
    const third = await store.write({ runId: 'r1', sessionId: 's1', sourceRevision: 'def', compact });
    assert.equal(first.path, second.path);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.notEqual(first.path, third.path);
    assert.match(first.checkpoint.continuationPrompt, /handoff summary/i);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
