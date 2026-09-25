import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseAwareEngineeringAgentAdapter, type EngineeringRuntimeFactory } from '../src/base-aware-engineering-adapter.js';
import type { EngineeringResult } from '../src/engineering-runtime.js';

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd });
  return String(result.stdout ?? '').trim();
}

async function initRepo(): Promise<string> {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'munin-base-aware-test-'));
  await git(repo, 'init', '-b', 'main');
  await git(repo, 'config', 'user.email', 'munin@test.local');
  await git(repo, 'config', 'user.name', 'Munin Test');
  await writeFile(path.join(repo, 'base.txt'), 'base\n');
  await git(repo, 'add', '.');
  await git(repo, 'commit', '-m', 'base');
  return repo;
}

function fakeRuntimeFactory(expectedBase: string, file = 'task.txt'): EngineeringRuntimeFactory {
  return repo => ({
    async execute(objective: string): Promise<EngineeringResult> {
      const actualBase = await git(repo, 'rev-parse', 'main');
      assert.equal(actualBase, expectedBase);
      await git(repo, 'config', 'user.email', 'worker@test.local');
      await git(repo, 'config', 'user.name', 'Worker');
      await writeFile(path.join(repo, file), `${objective}\n`);
      await git(repo, 'add', file);
      await git(repo, 'commit', '-m', `worker: ${objective}`);
      const commit = await git(repo, 'rev-parse', 'HEAD');
      return {
        status: 'completed',
        objective,
        branch: 'agent/fake',
        commit,
        changedFiles: [file],
        events: [{ phase: 'commit', message: 'fake commit', at: new Date().toISOString(), evidence: commit }],
        validation: 'npm test passed',
        delivery: 'local-commit',
        message: 'fake runtime completed',
      };
    },
  });
}

test('pins the isolated engineering sandbox main branch to the requested base ref', async () => {
  const repo = await initRepo();
  try {
    await writeFile(path.join(repo, 'base.txt'), 'new base\n');
    await git(repo, 'commit', '-am', 'new base');
    const requestedBase = await git(repo, 'rev-parse', 'HEAD');

    const adapter = new BaseAwareEngineeringAgentAdapter(repo, fakeRuntimeFactory(requestedBase));
    const result = await adapter.execute({ id: 'worker', objective: 'build worker task', files: ['task.txt'] }, requestedBase);

    assert.equal(result.status, 'completed');
    assert.ok(result.commit);
    assert.deepEqual(result.changedFiles, ['task.txt']);
    assert.equal(await git(repo, 'cat-file', '-t', result.commit!), 'commit');
    assert.ok(result.evidence?.some(item => item === `base:${requestedBase}`));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test('imports the worker commit into the source repository without moving main', async () => {
  const repo = await initRepo();
  try {
    const mainBefore = await git(repo, 'rev-parse', 'main');
    const adapter = new BaseAwareEngineeringAgentAdapter(repo, fakeRuntimeFactory(mainBefore, 'isolated.txt'));
    const result = await adapter.execute({ id: 'isolated', objective: 'isolated change', files: ['isolated.txt'] }, 'main');

    assert.equal(result.status, 'completed');
    assert.ok(result.commit);
    assert.equal(await git(repo, 'rev-parse', 'main'), mainBefore);
    assert.equal(await git(repo, 'cat-file', '-t', result.commit!), 'commit');
    const commitFiles = await git(repo, 'show', '--pretty=', '--name-only', result.commit!);
    assert.match(commitFiles, /isolated\.txt/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test('fails closed when the requested wave base does not exist', async () => {
  const repo = await initRepo();
  try {
    let factoryCalled = false;
    const adapter = new BaseAwareEngineeringAgentAdapter(repo, () => {
      factoryCalled = true;
      throw new Error('should not be called');
    });
    const result = await adapter.execute({ id: 'bad-base', objective: 'x', files: ['x.ts'] }, 'missing-base-ref');
    assert.equal(result.status, 'failed');
    assert.match(result.summary, /base ref unavailable/i);
    assert.equal(factoryCalled, false);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
