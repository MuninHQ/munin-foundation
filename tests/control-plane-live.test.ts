import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildLiveControlPlaneProjection } from '../src/control-plane-live.js';
import { ProjectMemoryStore } from '../src/project-memory.js';

async function rootFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-plane-live-'));
  await mkdir(path.join(root, 'ops'), { recursive: true });
  await writeFile(path.join(root, 'ops/CURRENT_STATE.md'), '# State\n', 'utf8');
  await writeFile(path.join(root, 'ops/SESSION_LOG.md'), '# Log\n', 'utf8');
  await writeFile(
    path.join(root, 'ops/BACKLOG.md'),
    '## P0 — Execution\n- [ ] **Control Plane v1** — integrate live SITREP.\n- [x] Existing foundation.\n',
    'utf8',
  );
  return root;
}

test('builds live projection from canonical backlog and current project decisions', async () => {
  const root = await rootFixture();
  const memory = new ProjectMemoryStore(path.join(root, 'data/runtime/project-memory.json'));
  await memory.capture({
    id: 'dec-live-1',
    kind: 'decision',
    title: 'GitHub remains product source of truth.',
    content: 'Control Plane architecture boundary.',
    project: 'munin',
    source: 'github:issue:227',
    observedAt: '2026-08-19T00:00:00.000Z',
    confidence: 'confirmed',
    tags: ['control-plane'],
    relatedIssues: ['github:issue:227'],
  });

  const projection = await buildLiveControlPlaneProjection(root);
  assert.equal(projection.active.length, 1);
  assert.equal(projection.completed.length, 1);
  assert.equal(projection.decisions.length, 1);
  assert.match(projection.text, /Control Plane v1/);
  assert.match(projection.text, /Active decisions: 1/);
});
