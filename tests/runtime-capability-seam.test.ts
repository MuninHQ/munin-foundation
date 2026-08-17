import test from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';

test('registers, executes, traces and disposes a capability', async () => {
  const registry = new RuntimeCapabilityRegistry();
  const registration = registry.register<{ value: number }, number>({
    name: 'double',
    async execute(input) { return input.value * 2; },
  });

  assert.deepEqual(registry.list(), ['double']);
  const result = await registry.execute<{ value: number }, number>('double', { value: 21 }, { source: 'test' });
  assert.equal(result.output, 42);
  assert.equal(result.trace.some(event => event.phase === 'execute'), true);

  registration.dispose();
  assert.equal(registry.has('double'), false);
  await assert.rejects(() => registry.execute('double', { value: 1 }), /Capability not registered/);
});

test('fails closed on duplicate capability registration', () => {
  const registry = new RuntimeCapabilityRegistry();
  registry.register({ name: 'shell', async execute() { return 'ok'; } });
  assert.throws(() => registry.register({ name: 'shell', async execute() { return 'other'; } }), /already registered/);
});

test('runs deterministic before and after interceptors around execution', async () => {
  const registry = new RuntimeCapabilityRegistry();
  const order: string[] = [];

  registry.intercept({ name: 'policy', phase: 'before', run() { order.push('before'); } });
  registry.intercept({ name: 'audit', phase: 'after', run() { order.push('after'); } });
  registry.register({
    name: 'browser',
    async execute() { order.push('execute'); return 'done'; },
  });

  const result = await registry.execute('browser', {});
  assert.deepEqual(order, ['before', 'execute', 'after']);
  assert.deepEqual(result.trace.map(event => event.phase), ['before', 'execute', 'after']);
});

test('before hook can block execution and error hook observes failure without masking it', async () => {
  const registry = new RuntimeCapabilityRegistry();
  let executed = false;
  let observed = false;

  registry.intercept({
    name: 'permission-gate',
    phase: 'before',
    run() { throw new Error('approval required'); },
  });
  registry.intercept({
    name: 'failure-audit',
    phase: 'error',
    run(_context, value) {
      observed = value instanceof Error && value.message === 'approval required';
    },
  });
  registry.register({
    name: 'external-write',
    async execute() { executed = true; return 'unsafe'; },
  });

  await assert.rejects(() => registry.execute('external-write', {}), /approval required/);
  assert.equal(executed, false);
  assert.equal(observed, true);
});

test('interceptors are reversibly removable', async () => {
  const registry = new RuntimeCapabilityRegistry();
  let calls = 0;
  const hook = registry.intercept({ name: 'temporary', phase: 'before', run() { calls += 1; } });
  registry.register({ name: 'noop', async execute() { return true; } });

  await registry.execute('noop', {});
  hook.dispose();
  await registry.execute('noop', {});

  assert.equal(calls, 1);
});

test('scope mounts capabilities and hooks together and disposes them as one reversible unit', async () => {
  const registry = new RuntimeCapabilityRegistry();
  const scope = registry.scope('browser-bundle');
  let calls = 0;

  scope.intercept({ name: 'scope-policy', phase: 'before', run() { calls += 1; } });
  scope.register({ name: 'scope.echo', async execute(input: { value: string }) { return input.value; } });

  const result = await registry.execute<{ value: string }, string>('scope.echo', { value: 'ok' });
  assert.equal(result.output, 'ok');
  assert.equal(calls, 1);

  scope.dispose();
  assert.equal(registry.has('scope.echo'), false);
  await assert.rejects(() => registry.execute('scope.echo', { value: 'x' }), /Capability not registered/);
});

test('scope disposal is idempotent and disposed scopes fail closed on new registrations', () => {
  const registry = new RuntimeCapabilityRegistry();
  const scope = registry.scope('temporary');
  scope.register({ name: 'temporary.capability', async execute() { return true; } });

  scope.dispose();
  scope.dispose();

  assert.equal(registry.has('temporary.capability'), false);
  assert.throws(() => scope.register({ name: 'late', async execute() { return true; } }), /scope is disposed/);
  assert.throws(() => scope.intercept({ name: 'late-hook', phase: 'before', run() {} }), /scope is disposed/);
});
