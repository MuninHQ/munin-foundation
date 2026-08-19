import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ControlPlaneDecisionStore } from '../src/control-plane-decision-store.js';
import { createControlPlaneDecision } from '../src/control-plane-decisions.js';
import { MemoryLedger } from '../src/memory-ledger.js';
import { ProjectMemoryStore } from '../src/project-memory.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-plane-decision-'));
  const projectMemory = new ProjectMemoryStore(path.join(root, 'project-memory.json'));
  const ledger = new MemoryLedger(root);
  return { store: new ControlPlaneDecisionStore(projectMemory, ledger), projectMemory, ledger };
}

function decision(id: string, text: string, supersedes?: string) {
  return createControlPlaneDecision({
    id,
    decision: text,
    context: 'Control Plane v1',
    rationale: 'Keep one canonical durable decision path.',
    alternativesConsidered: ['Separate control-plane database'],
    affectedRefs: ['github:issue:227'],
    source: 'github:issue:227',
    supersedes,
    decidedAt: supersedes ? '2026-08-19T00:02:00.000Z' : '2026-08-19T00:01:00.000Z',
  });
}

test('persists a control-plane decision to project memory and append-only ledger', async () => {
  const { store, projectMemory, ledger } = await fixture();
  const result = await store.persist(decision('dec-1', 'GitHub remains product source of truth.'));

  assert.equal(result.created, true);
  const current = await projectMemory.currentState();
  assert.equal(current.length, 1);
  assert.equal(current[0]?.id, 'dec-1');
  assert.equal(current[0]?.kind, 'decision');

  const entries = await ledger.list({ kind: 'decision', entityId: 'dec-1' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.summary, 'GitHub remains product source of truth.');
});

test('new decision supersedes prior project-memory record without deleting ledger history', async () => {
  const { store, projectMemory, ledger } = await fixture();
  await store.persist(decision('dec-1', 'Work owns orchestration.'));
  const result = await store.persist(decision('dec-2', 'Munin owns orchestration after migration.', 'dec-1'));

  assert.equal(result.superseded, 0);
  const current = await projectMemory.currentState();
  assert.equal(current.some((record) => record.id === 'dec-2'), true);

  const history = await ledger.list({ kind: 'decision' });
  assert.equal(history.length, 2);
  assert.deepEqual(new Set(history.map((entry) => entry.entityId)), new Set(['dec-1', 'dec-2']));
});
