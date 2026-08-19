import assert from 'node:assert/strict';
import test from 'node:test';

import { controlPlaneTasksFromControlRoom } from '../src/control-plane-control-room-adapter.js';

test('derives canonical tasks from backlog priority sections', () => {
  const tasks = controlPlaneTasksFromControlRoom({
    currentState: '',
    sessionLog: '',
    missing: [],
    backlog: [
      '# Backlog',
      '## P0 — Execution',
      '- [ ] **Control Plane v1** — integrate task state with SITREP.',
      '- [x] Existing foundation.',
      '## P2 — Later',
      '- [ ] Hardening item.',
    ].join('\n'),
  });

  assert.equal(tasks.length, 3);
  assert.equal(tasks[0]?.priority, 'P0');
  assert.equal(tasks[0]?.status, 'queued');
  assert.equal(tasks[1]?.status, 'done');
  assert.equal(tasks[1]?.evidence.length, 1);
  assert.equal(tasks[2]?.priority, 'P2');
});

test('marks explicit human-boundary backlog work as blocked', () => {
  const [task] = controlPlaneTasksFromControlRoom({
    currentState: '',
    sessionLog: '',
    missing: [],
    backlog: '## P0 — Acceptance\n- [ ] Human boundary: approve OAuth grant.',
  });

  assert.equal(task?.status, 'blocked');
  assert.equal(task?.blocker?.requiresHuman, true);
});

test('creates stable unique ids when titles repeat', () => {
  const tasks = controlPlaneTasksFromControlRoom({
    currentState: '',
    sessionLog: '',
    missing: [],
    backlog: '## P1 — One\n- [ ] Same item.\n- [ ] Same item.',
  });

  assert.notEqual(tasks[0]?.id, tasks[1]?.id);
  assert.ok(tasks[1]?.id.endsWith('-2'));
});
