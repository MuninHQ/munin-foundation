import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BuildAllWaveRuntime,
  type BuildAllPlan,
} from '../src/build-all-wave-runtime.js';

function plan(objective: string): BuildAllPlan {
  return {
    objective,
    completionCriteria: ['all tasks complete', 'independent verification passes'],
    tasks: [
      { id: 'api', objective: 'update api', files: ['src/api.ts'] },
      { id: 'ui', objective: 'update ui', files: ['apps/web/App.tsx'] },
      { id: 'tests', objective: 'add tests', files: ['tests/api.test.ts'], dependsOn: ['api'] },
    ],
  };
}

test('runs safe parallel waves and completes only with independent evidence', async () => {
  const started: string[] = [];
  let firstWaveStarts = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });

  const runtime = new BuildAllWaveRuntime(
    async objective => plan(objective),
    async current => {
      started.push(current.id);
      if (current.id === 'api' || current.id === 'ui') {
        firstWaveStarts += 1;
        if (firstWaveStarts === 2) release();
        await barrier;
      }
      return {
        taskId: current.id,
        status: 'completed',
        summary: `${current.id} done`,
        touchedFiles: current.files,
        evidence: [`${current.id}:ok`],
      };
    },
    async ({ execution }) => ({
      status: 'PASS',
      summary: 'verified',
      evidence: execution.results.map(result => `${result.taskId}:verified`),
    }),
  );

  const result = await runtime.run('ship feature');
  assert.equal(result.status, 'DONE');
  assert.deepEqual(started.slice(0, 2).sort(), ['api', 'ui']);
  assert.equal(started[2], 'tests');
  assert.deepEqual(result.wavePlan?.waves, [
    { index: 1, taskIds: ['api', 'ui'] },
    { index: 2, taskIds: ['tests'] },
  ]);
});

test('fails closed when verification passes without evidence', async () => {
  const runtime = new BuildAllWaveRuntime(
    async objective => ({
      objective,
      completionCriteria: ['verified'],
      tasks: [{ id: 'one', objective: 'one', files: ['src/one.ts'] }],
    }),
    async current => ({
      taskId: current.id,
      status: 'completed',
      summary: 'done',
      touchedFiles: current.files,
    }),
    async () => ({ status: 'PASS', summary: 'trust me', evidence: [] }),
  );

  const result = await runtime.run('do one thing');
  assert.equal(result.status, 'FAILED');
  assert.match(result.blocker ?? '', /requires independent verification evidence/i);
});

test('does not invoke verifier when task execution fails', async () => {
  let verified = false;
  const runtime = new BuildAllWaveRuntime(
    async objective => ({
      objective,
      completionCriteria: ['complete'],
      tasks: [
        { id: 'bad', objective: 'bad', files: ['src/bad.ts'] },
        { id: 'later', objective: 'later', files: ['src/later.ts'], dependsOn: ['bad'] },
      ],
    }),
    async current => ({
      taskId: current.id,
      status: current.id === 'bad' ? 'failed' : 'completed',
      summary: current.id === 'bad' ? 'build failed' : 'done',
      touchedFiles: current.files,
    }),
    async () => {
      verified = true;
      return { status: 'PASS', summary: 'verified', evidence: ['ok'] };
    },
  );

  const result = await runtime.run('broken build');
  assert.equal(result.status, 'FAILED');
  assert.equal(verified, false);
  assert.deepEqual(result.taskResults.map(item => item.taskId), ['bad']);
});

test('fails before execution when plan objective or completion contract is invalid', async () => {
  let ran = false;
  const runtime = new BuildAllWaveRuntime(
    async () => ({ objective: 'different', completionCriteria: [], tasks: [] }),
    async current => {
      ran = true;
      return { taskId: current.id, status: 'completed', summary: 'done' };
    },
    async () => ({ status: 'PASS', summary: 'verified', evidence: ['ok'] }),
  );

  const result = await runtime.run('requested');
  assert.equal(result.status, 'FAILED');
  assert.equal(ran, false);
  assert.match(result.blocker ?? '', /planning failed/i);
});

test('preserves serial fallback for tasks with unknown file scope', async () => {
  const order: string[] = [];
  const runtime = new BuildAllWaveRuntime(
    async objective => ({
      objective,
      completionCriteria: ['complete'],
      tasks: [
        { id: 'unknown', objective: 'inspect unknown scope', files: [] },
        { id: 'known', objective: 'known edit', files: ['src/known.ts'] },
      ],
    }),
    async current => {
      order.push(current.id);
      return { taskId: current.id, status: 'completed', summary: 'done', touchedFiles: current.files };
    },
    async () => ({ status: 'PASS', summary: 'verified', evidence: ['verification:ok'] }),
  );

  const result = await runtime.run('mixed scope');
  assert.equal(result.status, 'DONE');
  assert.deepEqual(order, ['unknown', 'known']);
  assert.deepEqual(result.wavePlan?.serialFallbackTaskIds, ['unknown']);
});
