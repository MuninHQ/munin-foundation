import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GitWaveReconciler } from '../src/git-wave-reconciler.js';

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd });
  return String(result.stdout ?? '').trim();
}

async function initRepo(): Promise<string> {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'munin-wave-git-test-'));
  await git(repo, 'init', '-b', 'main');
  await git(repo, 'config', 'user.email', 'munin@test.local');
  await git(repo, 'config', 'user.name', 'Munin Test');
  await writeFile(path.join(repo, 'base.txt'), 'base\n');
  await git(repo, 'add', '.');
  await git(repo, 'commit', '-m', 'base');
  return repo;
}

async function makeCommit(repo: string, branch: string, file: string, content: string): Promise<string> {
  await git(repo, 'switch', '-c', branch, 'main');
  await writeFile(path.join(repo, file), content);
  await git(repo, 'add', file);
  await git(repo, 'commit', '-m', branch);
  const sha = await git(repo, 'rev-parse', 'HEAD');
  await git(repo, 'switch', 'main');
  return sha;
}

test('serially reconciles independent task commits into an integration head', async () => {
  const repo = await initRepo();
  const reconciler = new GitWaveReconciler(repo);
  let session;
  try {
    const api = await makeCommit(repo, 'task-api', 'api.txt', 'api\n');
    const ui = await makeCommit(repo, 'task-ui', 'ui.txt', 'ui\n');
    session = await reconciler.start('parallel delivery');

    const result = await reconciler.reconcile(session, [
      { taskId: 'api', commit: api, summary: 'api done' },
      { taskId: 'ui', commit: ui, summary: 'ui done' },
    ]);

    assert.equal(result.status, 'completed');
    assert.equal(result.applied.length, 2);
    assert.ok(result.head);
    assert.equal(await readFile(path.join(session.worktree, 'api.txt'), 'utf8'), 'api\n');
    assert.equal(await readFile(path.join(session.worktree, 'ui.txt'), 'utf8'), 'ui\n');
  } finally {
    if (session) await reconciler.dispose(session);
    await rm(repo, { recursive: true, force: true });
  }
});

test('rolls the whole wave back when serial reconciliation hits a conflict', async () => {
  const repo = await initRepo();
  const reconciler = new GitWaveReconciler(repo);
  let session;
  try {
    await writeFile(path.join(repo, 'shared.txt'), 'base\n');
    await git(repo, 'add', 'shared.txt');
    await git(repo, 'commit', '-m', 'add shared');

    await git(repo, 'switch', '-c', 'task-a', 'main');
    await writeFile(path.join(repo, 'shared.txt'), 'A\n');
    await git(repo, 'commit', '-am', 'task a');
    const a = await git(repo, 'rev-parse', 'HEAD');
    await git(repo, 'switch', 'main');

    await git(repo, 'switch', '-c', 'task-b', 'main');
    await writeFile(path.join(repo, 'shared.txt'), 'B\n');
    await git(repo, 'commit', '-am', 'task b');
    const b = await git(repo, 'rev-parse', 'HEAD');
    await git(repo, 'switch', 'main');

    session = await reconciler.start('conflicting wave');
    const before = await git(session.worktree, 'rev-parse', 'HEAD');
    const result = await reconciler.reconcile(session, [
      { taskId: 'a', commit: a, summary: 'a' },
      { taskId: 'b', commit: b, summary: 'b' },
    ]);

    assert.equal(result.status, 'failed');
    assert.match(result.blocker ?? '', /conflict/i);
    assert.equal(await git(session.worktree, 'rev-parse', 'HEAD'), before);
    assert.equal(await readFile(path.join(session.worktree, 'shared.txt'), 'utf8'), 'base\n');
  } finally {
    if (session) await reconciler.dispose(session);
    await rm(repo, { recursive: true, force: true });
  }
});

test('records no-change tasks without creating synthetic commits', async () => {
  const repo = await initRepo();
  const reconciler = new GitWaveReconciler(repo);
  let session;
  try {
    session = await reconciler.start('no change task');
    const before = await git(session.worktree, 'rev-parse', 'HEAD');
    const result = await reconciler.reconcile(session, [
      { taskId: 'docs-check', summary: 'nothing required' },
    ]);

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.noChangeTaskIds, ['docs-check']);
    assert.equal(result.head, before);
  } finally {
    if (session) await reconciler.dispose(session);
    await rm(repo, { recursive: true, force: true });
  }
});
