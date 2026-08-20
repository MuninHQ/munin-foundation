import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Host Bridge worker supports bounded once mode and continuous local loop', async () => {
  const source=await readFile(new URL('../../src/host-worker-cli.ts',import.meta.url),'utf8');
  assert.match(source,/--once/);
  assert.match(source,/runUntilEmpty/);
  assert.match(source,/Math\.max\(1000, Math\.min\(60000/);
  assert.doesNotMatch(source,/execFile|spawn\(|shell\s*:/);
});

test('Windows startup installer launches only npm host worker from repo', async () => {
  const install=await readFile(new URL('../../scripts/install-host-worker-startup.ps1',import.meta.url),'utf8');
  assert.match(install,/npm run host:worker/);
  assert.match(install,/WorkingDirectory = \$repo/);
  assert.doesNotMatch(install,/Invoke-Expression|DownloadString|Start-BitsTransfer/);
});

test('package exposes install and reversible remove commands', async () => {
  const pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
  assert.ok(pkg.scripts['host:worker']);
  assert.ok(pkg.scripts['host:worker:once']);
  assert.ok(pkg.scripts['host:worker:startup:install']);
  assert.ok(pkg.scripts['host:worker:startup:remove']);
});
