import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { MuninAgentExecutors } from '../src/agent-orchestrator.js';
import { MuninControlRoomOrchestrator } from '../src/control-room-orchestrator.js';
import { ControlPlaneRuntimeStore } from '../src/control-plane-runtime-store.js';

async function rootFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-plane-runtime-'));
  await mkdir(path.join(root, 'ops'), { recursive: true });
  await writeFile(path.join(root, 'ops/CURRENT_STATE.md'), '# Current\n', 'utf8');
  await writeFile(path.join(root, 'ops/BACKLOG.md'), '## P0 — Test\n\n- [ ] **Tracked work** — run it.\n', 'utf8');
  await writeFile(path.join(root, 'ops/SESSION_LOG.md'), '# Sessions\n', 'utf8');
  return root;
}

const factory = (): MuninAgentExecutors => ({
  'product-state-manager': async () => ({ status: 'completed', summary: 'planned', evidence: ['plan:ok'] }),
  engineer: async () => ({ status: 'completed', summary: 'built', evidence: ['commit:abc'] }),
  'qa-verifier': async () => ({ status: 'completed', summary: 'verified', evidence: ['test:ok'] }),
  'memory-curator': async () => ({ status: 'completed', summary: 'remembered' }),
  operator: async () => ({ status: 'completed', summary: 'healthy' }),
});

test('feature-flagged Control Room execution writes a completed runtime task', async () => {
  const root = await rootFixture();
  const result = await new MuninControlRoomOrchestrator(root, factory, true).execute({ objective: 'build tracked feature' });
  assert.equal(result.status, 'done');

  const tasks = await new ControlPlaneRuntimeStore(root).list();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.status, 'done');
  assert.equal(tasks[0]?.owner, 'munin-orchestrator');
  assert.equal(tasks[0]?.evidence.some((item) => item.value === 'commit:abc'), true);
  assert.equal(tasks[0]?.evidence.some((item) => item.value === 'test:ok'), true);
});

test('tracking remains off when the feature flag is disabled', async () => {
  const root = await rootFixture();
  const result = await new MuninControlRoomOrchestrator(root, factory, false).execute({ objective: 'build untracked feature' });
  assert.equal(result.status, 'done');
  assert.deepEqual(await new ControlPlaneRuntimeStore(root).list(), []);
});
