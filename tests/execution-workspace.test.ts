import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { GitWorktreeExecutionWorkspace } from '../src/execution-workspace.js';

const execFileAsync = promisify(execFile);

test('git worktree workspace isolates mutations from canonical checkout', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'munin-workspace-test-repo-'));
  try {
    await execFileAsync('git', ['init'], { cwd: repo });
    await execFileAsync('git', ['config', 'user.email', 'test@munin.local'], { cwd: repo });
    await execFileAsync('git', ['config', 'user.name', 'Munin Test'], { cwd: repo });
    await execFileAsync(process.execPath, ['-e', "require('fs').writeFileSync('baseline.txt','base')"], { cwd: repo });
    await execFileAsync('git', ['add', 'baseline.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'baseline'], { cwd: repo });

    const workspace = await GitWorktreeExecutionWorkspace.create({ repositoryPath: repo });
    try {
      await workspace.run({ command: process.execPath, args: ['-e', "require('fs').writeFileSync('baseline.txt','changed')"] });
      assert.equal(await readFile(join(repo, 'baseline.txt'), 'utf8'), 'base');
      assert.match(await workspace.diff(), /changed/);
    } finally {
      await workspace.dispose();
    }
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
