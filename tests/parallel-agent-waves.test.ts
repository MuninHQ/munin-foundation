import assert from 'node:assert/strict';
import test from 'node:test';
import {
  executeParallelAgentWaves,
  planParallelAgentWaves,
  type ParallelAgentTask,
} from '../src/parallel-agent-waves.js';

const task = (id: string, files: string[], dependsOn: string[] = []): ParallelAgentTask => ({
  id,
  objective: `Do ${id}`,
  files,
  dependsOn,
});

test('groups independent tasks with disjoint files into the same wave', () => {
  const plan = planParallelAgentWaves([
    task('api', ['src/api.ts']),
    task('ui', ['apps/web/App.tsx']),
    task('tests', ['tests/api.test.ts'], ['api']),
  ]);

  assert.deepEqual(plan.waves, [
    { index: 1, taskIds: ['api', 'ui'] },
    { index: 2, taskIds: ['tests'] },
  ]);
});

test('separates tasks that declare overlapping files', () => {
  const plan = planParallelAgentWaves([
    task('first', ['src/shared.ts']),
    task('second', ['./src/shared.ts']),
  ]);

  assert.deepEqual(plan.waves, [
    { index: 1, taskIds: ['first'] },
    { index: 2, taskIds: ['second'] },
  ]);
});

test('falls back to serial execution when file scope is unknown', () => {
  const plan = planParallelAgentWaves([
    task('unknown', []),
    task('safe', ['src/safe.ts']),
  ]);

  assert.deepEqual(plan.serialFallbackTaskIds, ['unknown']);
  assert.deepEqual(plan.waves, [
    { index: 1, taskIds: ['unknown'] },
    { index: 2, taskIds: ['safe'] },
  ]);
});

test('rejects unknown dependencies and dependency cycles', () => {
  assert.throws(
    () => planParallelAgentWaves([task('a', ['a.ts'], ['missing'])]),
    /unknown task missing/i,
  );

  assert.throws(
    () => planParallelAgentWaves([
      task('a', ['a.ts'], ['b']),
      task('b', ['b.ts'], ['a']),
    ]),
    /dependency cycle/i,
  );
});

test('executes each wave concurrently and waits before starting dependents', async () => {
  const plan = planParallelAgentWaves([
    task('a', ['a.ts']),
    task('b', ['b.ts']),
    task('c', ['c.ts'], ['a', 'b']),
  ]);
  const started: string[] = [];
  const finished: string[] = [];
  let releaseFirstWave!: () => void;
  const firstWaveBarrier = new Promise<void>(resolve => { releaseFirstWave = resolve; });
  let firstWaveStarts = 0;

  const execution = executeParallelAgentWaves(plan, async current => {
    started.push(current.id);
    if (current.id === 'a' || current.id === 'b') {
      firstWaveStarts += 1;
      if (firstWaveStarts === 2) releaseFirstWave();
      await firstWaveBarrier;
    }
    finished.push(current.id);
    return {
      taskId: current.id,
      status: 'completed',
      summary: 'done',
      touchedFiles: current.files,
    };
  });

  const result = await execution;
  assert.deepEqual(started.slice(0, 2).sort(), ['a', 'b']);
  assert.equal(started[2], 'c');
  assert.equal(finished.includes('a'), true);
  assert.equal(finished.includes('b'), true);
  assert.equal(result.status, 'completed');
  assert.equal(result.completedWaves, 2);
});

test('fails closed when a worker touches a file outside its declared Files scope', async () => {
  const plan = planParallelAgentWaves([
    task('worker', ['src/owned.ts']),
    task('later', ['src/later.ts'], ['worker']),
  ]);
  const calls: string[] = [];

  const result = await executeParallelAgentWaves(plan, async current => {
    calls.push(current.id);
    return {
      taskId: current.id,
      status: 'completed',
      summary: 'changed files',
      touchedFiles: current.id === 'worker' ? ['src/owned.ts', 'src/not-owned.ts'] : current.files,
    };
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.completedWaves, 0);
  assert.deepEqual(calls, ['worker']);
  assert.match(result.blocker ?? '', /undeclared files/i);
});

test('stops later waves when any task in the current wave is blocked', async () => {
  const plan = planParallelAgentWaves([
    task('a', ['a.ts']),
    task('b', ['b.ts']),
    task('c', ['c.ts'], ['a']),
  ]);
  const calls: string[] = [];

  const result = await executeParallelAgentWaves(plan, async current => {
    calls.push(current.id);
    if (current.id === 'b') return { taskId: current.id, status: 'blocked', summary: 'needs permission' };
    return { taskId: current.id, status: 'completed', summary: 'done', touchedFiles: current.files };
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.completedWaves, 0);
  assert.equal(calls.includes('c'), false);
});
