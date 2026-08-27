import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeGuardedSandbox, resolveExecutionSandbox, resolveNativeInvocation } from '../src/execution-sandbox.js';

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

test('Windows npm shims are resolved through node without enabling a command shell', () => {
  const npmCli = '/fake/node_modules/npm/bin/npm-cli.js';
  const invocation = resolveNativeInvocation('npm.cmd', ['test', '--', '--watch=false'], {
    platform: 'win32',
    execPath: '/fake/node.exe',
    npmExecPath: npmCli,
    exists: candidate => candidate === npmCli,
  });
  assert.deepEqual(invocation, { command: '/fake/node.exe', args: [npmCli, 'test', '--', '--watch=false'] });
  assert.throws(() => resolveNativeInvocation('npx.cmd', ['vite'], {
    platform: 'win32',
    execPath: '/fake/node.exe',
    npmExecPath: npmCli,
    exists: () => false,
  }), /cannot resolve npx\.cmd safely on Windows/i);
});
