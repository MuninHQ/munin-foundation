import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('authenticated mobile host action leaves queued and reaches a terminal result', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'munin-mobile-host-e2e-'));
  const port = 18000 + Math.floor(Math.random() * 1000);
  const token = 'mobile-host-e2e-token';
  const server = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], {
    cwd,
    env: { ...process.env, MUNIN_API_PORT: String(port), MUNIN_MOBILE_TOKEN: token },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      await sleep(100);
    }
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const createdResponse = await fetch(`${base}/api/mobile/host/jobs`, { method: 'POST', headers, body: JSON.stringify({ type: 'runtime-health' }) });
    assert.equal(createdResponse.status, 202);
    const created = await createdResponse.json() as { job: { id: string }; status: string };
    assert.equal(created.status, 'queued');

    let current: { status: string; result?: { summary?: string } } | undefined;
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await fetch(`${base}/api/mobile/host/jobs`, { headers });
      assert.equal(response.status, 200);
      const payload = await response.json() as { jobs: Array<{ job: { id: string }; status: string; result?: { summary?: string } }> };
      current = payload.jobs.find(item => item.job.id === created.job.id);
      if (current && !['queued', 'running'].includes(current.status)) break;
      await sleep(100);
    }
    assert.ok(current);
    assert.ok(['completed', 'failed', 'blocked'].includes(current.status));
    assert.ok(current.result?.summary);
  } finally {
    server.kill('SIGTERM');
    await rm(cwd, { recursive: true, force: true });
  }
});
