import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';
import { ProviderResilience, ResilientProvider } from '../src/resilience.js';

const request: ProviderRequest = {
  taskId: 'tsk-1', objective: 'test', title: 'Run', capability: 'write', expectedOutput: 'Result', context: {},
};

class FlakyProvider implements ExecutionProvider {
  readonly id = 'flaky';
  calls = 0;
  async execute(): Promise<ProviderResponse> {
    this.calls += 1;
    if (this.calls === 1) throw new Error('transient');
    return { providerId: this.id, output: 'Run: Result', metadata: {} };
  }
}

class FailingProvider implements ExecutionProvider {
  readonly id = 'failing';
  calls = 0;
  async execute(): Promise<ProviderResponse> { this.calls += 1; throw new Error('down'); }
}

test('retries transient provider failure and records attempts', async () => {
  const provider = new FlakyProvider();
  const wrapped = new ResilientProvider(provider, new ProviderResilience({ timeoutMs: 100, maxAttempts: 2, circuitFailureThreshold: 3, circuitResetMs: 1_000 }));
  const response = await wrapped.execute(request);
  assert.equal(provider.calls, 2);
  assert.equal(response.metadata.attemptCount, 2);
  assert.deepEqual((response.metadata.attempts as Array<{ outcome: string }>).map(item => item.outcome), ['failure', 'success']);
});

test('times out slow provider', async () => {
  const slow: ExecutionProvider = { id: 'slow', execute: async () => new Promise(resolve => setTimeout(() => resolve({ providerId: 'slow', output: 'late', metadata: {} }), 50)) };
  const wrapped = new ResilientProvider(slow, new ProviderResilience({ timeoutMs: 5, maxAttempts: 1, circuitFailureThreshold: 3, circuitResetMs: 1_000 }));
  await assert.rejects(() => wrapped.execute(request), /Provider timeout/);
});

test('opens circuit after repeated failures and blocks further calls', async () => {
  const provider = new FailingProvider();
  const resilience = new ProviderResilience({ timeoutMs: 100, maxAttempts: 1, circuitFailureThreshold: 2, circuitResetMs: 10_000 });
  const wrapped = new ResilientProvider(provider, resilience);
  await assert.rejects(() => wrapped.execute(request), /down/);
  await assert.rejects(() => wrapped.execute(request), /down/);
  await assert.rejects(() => wrapped.execute(request), /Circuit breaker open/);
  assert.equal(provider.calls, 2);
  assert.equal(resilience.status(provider.id), 'open');
});
