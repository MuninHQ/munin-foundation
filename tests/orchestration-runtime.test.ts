import test from 'node:test';
import assert from 'node:assert/strict';
import { OrchestrationRuntimeCore, OrchestrationRuntimeError } from '../src/orchestration-runtime-core.js';
import type { ProviderProfile } from '../src/provider-policy.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';

class StubProvider implements ExecutionProvider {
  constructor(readonly id: string, private readonly fail = false) {}

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.fail) throw new Error(`${this.id} unavailable`);
    return {
      providerId: this.id,
      output: `${this.id}:${request.capability}`,
      metadata: {},
    };
  }
}

function profile(id: string, fail = false): ProviderProfile {
  return {
    id,
    provider: new StubProvider(id, fail),
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: id === 'ollama-local' ? 100 : 1,
    enabled: true,
  };
}

test('runtime executes a direct local orchestration', async () => {
  const previous = process.env.MUNIN_OLLAMA_ENABLED;
  process.env.MUNIN_OLLAMA_ENABLED = '0';
  try {
    const result = await new OrchestrationRuntimeCore().run({
      objective: 'Summarize next action',
      capability: 'execute',
      mode: 'direct',
      context: { source: 'test' },
    });
    assert.equal(result.plan.route, 'direct');
    assert.equal(result.providerId, 'deterministic-local');
    assert.ok('response' in result);
    assert.deepEqual(result.trace.attempts, [{ providerId: 'deterministic-local', ok: true }]);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OLLAMA_ENABLED;
    else process.env.MUNIN_OLLAMA_ENABLED = previous;
  }
});

test('runtime executes council routing locally', async () => {
  const previous = process.env.MUNIN_OLLAMA_ENABLED;
  process.env.MUNIN_OLLAMA_ENABLED = '0';
  try {
    const result = await new OrchestrationRuntimeCore().run({
      objective: 'Review a high-risk decision',
      capability: 'review',
      risk: 'high',
    });
    assert.equal(result.plan.route, 'council');
    assert.equal(result.providerId, 'deterministic-local');
    assert.ok('council' in result);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OLLAMA_ENABLED;
    else process.env.MUNIN_OLLAMA_ENABLED = previous;
  }
});

test('runtime falls back after preferred provider fails and records both attempts', async () => {
  const runtime = new OrchestrationRuntimeCore([
    profile('ollama-local', true),
    profile('deterministic-local'),
  ]);

  const result = await runtime.run({
    objective: 'Execute with fallback',
    capability: 'execute',
    mode: 'direct',
  });

  assert.equal(result.providerId, 'deterministic-local');
  assert.deepEqual(result.trace.attempts, [
    { providerId: 'ollama-local', ok: false, error: 'ollama-local unavailable' },
    { providerId: 'deterministic-local', ok: true },
  ]);
  assert.equal(result.trace.selectedProviderId, 'deterministic-local');
});

test('runtime throws a trace-bearing error after all providers fail', async () => {
  const runtime = new OrchestrationRuntimeCore([
    profile('ollama-local', true),
    profile('deterministic-local', true),
  ]);

  await assert.rejects(
    runtime.run({ objective: 'Fail safely', capability: 'execute', mode: 'direct' }),
    (error: unknown) => {
      assert.ok(error instanceof OrchestrationRuntimeError);
      assert.equal(error.trace.attempts.length, 2);
      assert.equal(error.trace.attempts.every(attempt => !attempt.ok), true);
      assert.equal(error.trace.selectedProviderId, undefined);
      return true;
    },
  );
});
