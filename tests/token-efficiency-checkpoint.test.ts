import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compactWorkflowContext } from '../src/token-efficiency-compaction.js';
import { TokenEfficiencyCheckpointStore } from '../src/token-efficiency-checkpoint.js';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';

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

test('disabled checkpoint store performs no write', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-checkpoint-disabled-'));
  try {
    const compact = compactWorkflowContext({ objective: 'ship', status: 'active', decisions: [], errors: [], artifacts: [], blockers: [], nextSteps: [], verification: [], commentary: [] });
    const store = new TokenEfficiencyCheckpointStore(path.join(dir, 'checkpoints'), loadTokenEfficiencyConfig({}));
    await assert.rejects(() => store.write({ runId: 'r', sessionId: 's', sourceRevision: 'x', compact }), /disabled/i);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkpoint bounds and redacts auxiliary strings', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'munin-token-checkpoint-bounds-'));
  try {
    const compact = compactWorkflowContext({ objective: 'ship', status: 'active', decisions: [], errors: [], artifacts: [], blockers: [], nextSteps: [], verification: [], commentary: [] });
    const result = await new TokenEfficiencyCheckpointStore(path.join(dir, 'checkpoints')).write({ runId: 'password=synthetic-secret', sessionId: 's'.repeat(5000), sourceRevision: 'x', repository: 'r'.repeat(5000), compact });
    const serialized = JSON.stringify(result.checkpoint);
    assert.doesNotMatch(serialized, /synthetic-secret/);
    assert.equal(result.checkpoint.sessionId.length, 256);
    assert.equal(result.checkpoint.repository?.length, 512);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
