import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveNativeInvocation } from '../src/execution-sandbox.js';

test('BUILD ALL can execute the installed npm natively without a Windows shell', async () => {
  const invocation = resolveNativeInvocation(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']);
  const result = await promisify(execFile)(invocation.command, invocation.args, { windowsHide: true, shell: false, timeout: 20_000 });
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
  if (process.platform === 'win32') {
    assert.equal(invocation.command, process.execPath);
    assert.ok(invocation.args[0].endsWith('npm-cli.js'));
  }
});
