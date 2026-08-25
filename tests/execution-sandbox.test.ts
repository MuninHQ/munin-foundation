import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeGuardedSandbox, resolveExecutionSandbox } from '../src/execution-sandbox.js';

test('guarded sandbox executes allowlisted binaries and strips secret environment values', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'munin-sandbox-'));
  try {
    const sandbox = new NativeGuardedSandbox();
    const result = await sandbox.run({
      command: process.execPath,
      args: ['-e', "process.stdout.write(String(process.env.MUNIN_TEST_TOKEN || 'redacted'))"],
      cwd,
      env: { ...process.env, MUNIN_TEST_TOKEN: 'must-not-leak' },
    });
    assert.equal(result.stdout, 'redacted');
    assert.equal(result.strength, 'guarded');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('guarded sandbox rejects arbitrary executables while preserving literal arguments', async () => {
  const sandbox = new NativeGuardedSandbox();
  await assert.rejects(() => sandbox.run({ command: 'curl', args: ['https://example.com'], cwd: process.cwd() }), /blocked executable/i);
  const result = await sandbox.run({ command: process.execPath, args: ['-e', 'process.stdout.write("a;b")'], cwd: process.cwd() });
  assert.equal(result.stdout, 'a;b');
});

test('default sandbox policy remains guarded unless hard isolation is explicitly requested', async () => {
  const original = process.env.MUNIN_EXECUTION_SANDBOX;
  try {
    delete process.env.MUNIN_EXECUTION_SANDBOX;
    const sandbox = await resolveExecutionSandbox({ policy: 'guarded' });
    assert.equal(sandbox.status.strength, 'guarded');
  } finally {
    if (original === undefined) delete process.env.MUNIN_EXECUTION_SANDBOX;
    else process.env.MUNIN_EXECUTION_SANDBOX = original;
  }
});
