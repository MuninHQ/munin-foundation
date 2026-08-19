import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addControlPlaneEvidence,
  canTransitionTask,
  createControlPlaneTask,
  transitionControlPlaneTask,
} from '../src/control-plane-state.js';

function task() {
  return createControlPlaneTask({
    id: 'cp-1',
    title: 'Implement Control Plane state',
    priority: 'P0',
    owner: 'engineering',
    source: 'github:issue:227',
    dependencies: [],
    acceptanceCriteria: ['Lifecycle transitions are enforced.'],
  });
}

test('creates tasks queued by default', () => {
  const created = task();
  assert.equal(created.status, 'queued');
  assert.equal(created.evidence.length, 0);
});

test('allows the canonical forward lifecycle', () => {
  let current = task();
  for (const status of ['planning', 'building', 'testing', 'verifying'] as const) {
    current = transitionControlPlaneTask(current, status);
  }

  current = transitionControlPlaneTask(current, 'done', {
    evidence: { kind: 'test', value: 'control-plane-state.test.ts passed', at: new Date().toISOString() },
  });

  assert.equal(current.status, 'done');
  assert.equal(current.evidence.length, 1);
});

test('rejects invalid lifecycle jumps', () => {
  assert.equal(canTransitionTask('queued', 'done'), false);
  assert.throws(() => transitionControlPlaneTask(task(), 'done'), /Invalid control-plane transition/);
});

test('requires blocker metadata and supports resuming work', () => {
  const planning = transitionControlPlaneTask(task(), 'planning');
  assert.throws(() => transitionControlPlaneTask(planning, 'blocked'), /blocker is required/i);

  const blocked = transitionControlPlaneTask(planning, 'blocked', {
    blocker: {
      reason: 'External credential required',
      requiresHuman: true,
      requestedAction: 'Provide credential',
    },
  });

  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.blocker?.requiresHuman, true);

  const resumed = transitionControlPlaneTask(blocked, 'planning');
  assert.equal(resumed.status, 'planning');
  assert.equal(resumed.blocker, undefined);
});

test('requires evidence before completion', () => {
  let current = task();
  current = transitionControlPlaneTask(current, 'planning');
  current = transitionControlPlaneTask(current, 'building');
  current = transitionControlPlaneTask(current, 'testing');
  current = transitionControlPlaneTask(current, 'verifying');

  assert.throws(() => transitionControlPlaneTask(current, 'done'), /Evidence is required/);

  current = addControlPlaneEvidence(current, {
    kind: 'commit',
    value: 'abc123',
    at: new Date().toISOString(),
  });
  current = transitionControlPlaneTask(current, 'done');
  assert.equal(current.status, 'done');
});
