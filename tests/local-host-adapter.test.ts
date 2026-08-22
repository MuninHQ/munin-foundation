import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalHostAdapter } from '../src/local-host-adapter.js';

test('local adapter source forbids arbitrary shell execution and pins commands', async () => {
  const source = await readFile(new URL('../../src/local-host-adapter.ts', import.meta.url), 'utf8');
  assert.match(source, /shell: false/);
  assert.match(source, /\['fetch', 'origin', 'main'\]/);
  assert.match(source, /\['merge', '--ff-only', 'origin\/main'\]/);
  assert.match(source, /async deployMain\(\)/);
  assert.match(source, /process\.execPath/);
  assert.match(source, /npm_execpath/);
  assert.doesNotMatch(source, /npm\.cmd/);
  assert.match(source, /cleanGeneratedArtifacts/);
  assert.match(source, /\['restore', '--worktree', '--', 'dist-web'\]/);
  assert.match(source, /\['clean', '-fd', '--', 'dist-web'\]/);
  assert.match(source, /\[\.\.\.npm\.args, 'test'\]/);
  assert.match(source, /data\/runtime\/mobile-web/);
  assert.match(source, /'run', 'build:web', '--', '--outDir'/);
  assert.match(source, /hud-mobile\.html/);
  assert.match(source, /HUD mobile publication check failed/);
  assert.match(source, /\['status', '--json'\]/);
  assert.doesNotMatch(source, /exec\(|spawn\(|Invoke-Expression|cmd\.exe|powershell -Command/);
});

test('restart remains fail-closed without a healthy workspace supervisor', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'munin-host-adapter-'));
  try {
    const adapter = new LocalHostAdapter({ cwd: process.cwd(), supervisorStatePath: join(dir, 'missing-supervisor.json'), restartRequestPath: join(dir, 'restart.json') });
    await assert.rejects(() => adapter.restartMunin(), /supervisor is unavailable/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
