import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  AdaptiveExecutionEngine,
  InMemoryOutcomeStore,
  JsonOutcomeStore,
  LifecycleHooks,
  TaskRouter,
  type LifecycleEvent,
} from '../src/adaptive-execution.js';

test('build work routes to builder and reviewer', () => {
  const route = new TaskRouter().route({ id: '1', objective: 'Build adaptive execution', capability: 'execute', kind: 'build' });
  assert.equal(route.primary, 'builder');
  assert.deepEqual(route.reviewers, ['reviewer']);
});

test('reviewer gate rejects a false-success completion', async () => {
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore());
  await assert.rejects(
    () => engine.execute(
      { id: '2', objective: 'Implement feature', capability: 'execute', kind: 'build' },
      async () => ({ evidence: ['code-written'] }),
      async () => ({ passed: false, checks: [{ name: 'tests', passed: false, evidence: '1 failing test' }] }),
    ),
    /Reviewer gate rejected task 2: tests/,
  );
});

test('successful outcomes are persisted and reused by later similar work', async () => {
  const store = new InMemoryOutcomeStore();
  const engine = new AdaptiveExecutionEngine(store);

  const first = await engine.execute(
    { id: '3', objective: 'Build Ollama provider adapter', capability: 'provider', kind: 'build' },
    async () => ({ evidence: ['adapter-test-passed'], lesson: 'Prefer the local Ollama adapter.' }),
    async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }),
  );
  assert.equal(first.outcome.status, 'passed');

  let reused = 0;
  const second = await engine.execute(
    { id: '4', objective: 'Refactor Ollama provider', capability: 'provider', kind: 'build' },
    async (_task, _route, prior) => {
      reused = prior.length;
      return { evidence: ['refactor-test-passed'] };
    },
    async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }),
  );

  assert.ok(reused >= 1);
  assert.ok(second.priorOutcomes.some(outcome => outcome.taskId === '3'));
});

test('json outcome store survives a new store instance', async () => {
  const file = path.join(tmpdir(), `munin-adaptive-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  try {
    const firstEngine = new AdaptiveExecutionEngine(new JsonOutcomeStore(file));
    await firstEngine.execute(
      { id: 'persist-1', objective: 'Build persistent provider lesson', capability: 'provider', kind: 'build' },
      async () => ({ evidence: ['persistent-evidence'], lesson: 'Reuse persistent provider lesson.' }),
      async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }),
    );

    const secondEngine = new AdaptiveExecutionEngine(new JsonOutcomeStore(file));
    const result = await secondEngine.execute(
      { id: 'persist-2', objective: 'Refactor persistent provider', capability: 'provider', kind: 'build' },
      async (_task, _route, prior) => ({ evidence: [`prior:${prior.length}`] }),
      async () => ({ passed: true, checks: [{ name: 'tests', passed: true }] }),
    );

    assert.ok(result.priorOutcomes.some(outcome => outcome.taskId === 'persist-1'));
  } finally {
    await rm(file, { force: true });
  }
});

test('lifecycle hooks execute in deterministic order', async () => {
  const events: LifecycleEvent[] = [];
  const hooks = new LifecycleHooks();
  hooks.register(event => { events.push(event); });
  const engine = new AdaptiveExecutionEngine(new InMemoryOutcomeStore(), hooks);

  await engine.execute(
    { id: '5', objective: 'Research routing patterns', capability: 'research', kind: 'research' },
    async () => ({ evidence: ['source-a'] }),
    async () => ({ passed: true, checks: [{ name: 'evidence', passed: true }] }),
  );

  assert.deepEqual(events, [
    'session:start',
    'task:pre',
    'validation:pre',
    'validation:post',
    'task:post',
    'session:end',
  ]);
});
