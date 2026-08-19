import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { MuninService } from '../src/service.js';
import { ContextStore } from '../src/store.js';

async function withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try { return await fn(); }
  finally { process.chdir(previous); }
}

test('service SITREP appends live Control Plane projection from canonical ops backlog', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-plane-service-'));
  await mkdir(path.join(root, 'ops'), { recursive: true });
  await writeFile(path.join(root, 'ops/CURRENT_STATE.md'), '# state\n', 'utf8');
  await writeFile(path.join(root, 'ops/SESSION_LOG.md'), '# log\n', 'utf8');
  await writeFile(path.join(root, 'ops/BACKLOG.md'), '## P0 — Control Plane\n\n- [ ] **Live SITREP integration** — expose canonical state.\n', 'utf8');

  await withCwd(root, async () => {
    const service = new MuninService(new ContextStore(path.join(root, 'data')));
    const report = await service.sitrep();
    assert.match(report, /Control Plane:/);
    assert.match(report, /Live SITREP integration/);
  });
});

test('service SITREP preserves legacy report if Control Plane projection cannot hydrate', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'munin-control-plane-fallback-'));
  await withCwd(root, async () => {
    const service = new MuninService(new ContextStore(path.join(root, 'data')));
    const report = await service.sitrep();
    assert.match(report, /^SITREP — /);
  });
});
