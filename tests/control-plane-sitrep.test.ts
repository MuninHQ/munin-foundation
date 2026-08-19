import assert from 'node:assert/strict';
import test from 'node:test';

import { appendControlPlaneSitrep, projectControlPlaneSitrep } from '../src/control-plane-sitrep.js';
import { createControlPlaneDecision } from '../src/control-plane-decisions.js';
import { createControlPlaneTask, transitionControlPlaneTask } from '../src/control-plane-state.js';

function task(id: string, priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1') {
  return createControlPlaneTask({
    id,
    title: `Task ${id}`,
    priority,
    owner: 'engineering',
    source: 'github:issue:227',
    dependencies: [],
    acceptanceCriteria: ['Done with evidence.'],
  });
}

function decision(id: string, supersededBy?: string) {
  return {
    ...createControlPlaneDecision({
      id,
      decision: `Decision ${id}`,
      context: 'Control Plane',
      rationale: 'Test projection.',
      alternativesConsidered: [],
      affectedRefs: ['github:issue:227'],
      source: 'github:issue:227',
    }),
    supersededBy,
  };
}

test('projects active blocked completed and current decisions', () => {
  const active = transitionControlPlaneTask(task('active', 'P1'), 'planning');
  const blocked = transitionControlPlaneTask(task('blocked', 'P0'), 'blocked', {
    blocker: { reason: '2FA required', requiresHuman: true, requestedAction: 'Approve login' },
  });
  let done = transitionControlPlaneTask(task('done', 'P2'), 'planning');
  done = transitionControlPlaneTask(done, 'building');
  done = transitionControlPlaneTask(done, 'testing');
  done = transitionControlPlaneTask(done, 'verifying');
  done = transitionControlPlaneTask(done, 'done', {
    evidence: { kind: 'test', value: 'passed', at: new Date().toISOString() },
  });

  const projection = projectControlPlaneSitrep(
    [active, blocked, done],
    [decision('old', 'new'), decision('new')],
  );

  assert.equal(projection.overallStatus, 'blocked');
  assert.deepEqual(projection.blocked.map((item) => item.id), ['blocked']);
  assert.deepEqual(projection.completed.map((item) => item.id), ['done']);
  assert.deepEqual(projection.decisions.map((item) => item.id), ['new']);
  assert.equal(projection.next[0]?.id, 'blocked');
  assert.match(projection.text, /human action required/);
});

test('recoverable blockers require attention but not human-blocked status', () => {
  const blocked = transitionControlPlaneTask(task('recoverable', 'P1'), 'blocked', {
    blocker: { reason: 'Retryable CI failure', requiresHuman: false },
  });
  assert.equal(projectControlPlaneSitrep([blocked], []).overallStatus, 'attention');
});

test('appends projection to canonical SITREP text without replacing it', () => {
  const projection = projectControlPlaneSitrep([task('queued')], []);
  const report = appendControlPlaneSitrep('SITREP — 2026-08-19\nPrioridades:\n- Existing', projection);
  assert.match(report, /^SITREP/);
  assert.match(report, /Prioridades:\n- Existing/);
  assert.match(report, /Control Plane:/);
});
