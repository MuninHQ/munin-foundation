import test from 'node:test';
import assert from 'node:assert/strict';
import { OrchestrationRuntimeCore, OrchestrationRuntimeError } from '../src/orchestration-runtime-core.js';
import type { ProviderProfile } from '../src/provider-policy.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';
import { observeEfficiency } from '../src/efficiency-telemetry.js';

class StubProvider implements ExecutionProvider {
  constructor(readonly id: string, private readonly fail = false, private readonly output?: string) {}

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.fail) throw new Error(`${this.id} unavailable`);
    return {
      providerId: this.id,
      output: this.output ?? `${this.id}:${request.capability}`,
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

test('runtime prefers Automaton for eligible read-only work when router completes', async () => {
  const provider = new StubProvider('deterministic-local', false, 'fallback should not run');
  const runtime = new OrchestrationRuntimeCore([{
    id: provider.id,
    provider,
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: 1,
    enabled: true,
  }, profile('automaton-local')], {
    automatonRouter: {
      async tryRoute() {
        return {
          used: true,
          attempted: true,
          reason: 'safe read-only intent',
          elapsedMs: 10,
          taskId: 'task-a',
          response: { providerId: 'automaton-local', output: 'automaton result', metadata: { localOnly: true } },
        };
      },
    },
  });

  const result = await runtime.run({
    objective: 'Inspect local logs and summarize failures',
    capability: 'research',
    risk: 'low',
    mode: 'direct',
  });

  assert.equal(result.providerId, 'automaton-local');
  assert.equal(result.response?.output, 'automaton result');
  assert.deepEqual(result.trace.attempts, [{ providerId: 'automaton-local', ok: true }]);
});

test('runtime records Automaton timeout then falls back to normal provider', async () => {
  const runtime = new OrchestrationRuntimeCore([profile('deterministic-local'), profile('automaton-local')], {
    automatonRouter: {
      async tryRoute() {
        return { used: false, attempted: true, reason: 'Automaton SLA exceeded; task cancelled for provider fallback', elapsedMs: 50, taskId: 'task-a', cancelled: true };
      },
    },
  });

  const result = await runtime.run({
    objective: 'Inspect local logs and summarize failures',
    capability: 'research',
    risk: 'low',
    mode: 'direct',
  });

  assert.equal(result.providerId, 'deterministic-local');
  assert.deepEqual(result.trace.attempts, [
    { providerId: 'automaton-local', ok: false, error: 'Automaton SLA exceeded; task cancelled for provider fallback' },
    { providerId: 'deterministic-local', ok: true },
  ]);
});

test('Automaton cannot bypass absent, disabled, external, costly or unsupported provider profiles', async () => {
  for (const profiles of [[], [{ ...profile('automaton-local'), enabled: false }],
    [{ ...profile('automaton-local'), mode: 'external' as const }],
    [{ ...profile('automaton-local'), estimatedCostPerCall: 1 }],
    [{ ...profile('automaton-local'), capabilities: ['write'] }]]) {
    let calls = 0;
    const runtime = new OrchestrationRuntimeCore(profiles, { automatonRouter: {
      async tryRoute() { calls++; return { used: true, attempted: true, reason: 'mock', elapsedMs: 0,
        response: { providerId: 'automaton-local', output: 'unauthorized', metadata: {} } }; },
    } });
    await assert.rejects(runtime.run({ objective: 'Inspect logs', capability: 'research', mode: 'direct', risk: 'low' }));
    assert.equal(calls, 0);
  }
});

test('runtime blocks fallback when Automaton cancellation is not confirmed', async () => {
  let fallbackCalls = 0;
  const fallback = profile('deterministic-local');
  fallback.provider.execute = async () => { fallbackCalls++; throw new Error('must not execute'); };
  const runtime = new OrchestrationRuntimeCore([fallback, profile('automaton-local')], { automatonRouter: {
    async tryRoute() { return { used: false, attempted: true, reason: 'cancellation unconfirmed', elapsedMs: 0, cancelled: false, fallbackSafe: false }; },
  } });
  await assert.rejects(runtime.run({ objective: 'Inspect logs', capability: 'research', mode: 'direct', risk: 'low' }), /cancellation unconfirmed/);
  assert.equal(fallbackCalls, 0);
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

test('runtime records shadow advice without changing provider or output', async () => {
  const largeOutput = `start\n${'routine output\n'.repeat(500)}FAIL payment timeout\nexit code 1`;
  const provider = new StubProvider('deterministic-local', false, largeOutput);
  const runtime = new OrchestrationRuntimeCore([{
    id: provider.id,
    provider,
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: 1,
    enabled: true,
  }], { tokenGovernor: { largeOutputChars: 100, maxSummaryChars: 240 }, efficiencyObserver: { observe: async input => observeEfficiency(input) } });
  const result = await runtime.run({ objective: 'Inspect logs', capability: 'execute', mode: 'direct', risk: 'low' });
  assert.equal(result.providerId, 'deterministic-local');
  assert.ok('response' in result);
  assert.equal(result.response?.output, largeOutput);
  assert.equal(result.trace.tokenGovernor?.mode, 'shadow');
  assert.equal(result.trace.tokenGovernor?.recommendation.applied, false);
  assert.ok((result.trace.tokenGovernor?.output.estimatedSavedTokens ?? 0) > 0);
  assert.equal(result.trace.efficiency?.contextEfficiency.modelTier, 'economy');
  assert.equal(result.trace.efficiency?.contextEfficiency.selectedFiles, 0);
  assert.equal(result.trace.efficiency?.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
});

test('telemetry write failure cannot fail the governed task', async () => {
  const expectedOutput = 'governed output remains available';
  const provider = new StubProvider('deterministic-local', false, expectedOutput);
  const runtime = new OrchestrationRuntimeCore([{
    id: provider.id,
    provider,
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: 1,
    enabled: true,
  }], { tokenGovernorStore: { async append() { throw new Error('disk unavailable'); } } });
  const result = await runtime.run({ objective: 'Continue safely', capability: 'execute', mode: 'direct' });
  assert.equal(result.providerId, 'deterministic-local');
  assert.ok('response' in result);
  assert.equal(result.response?.output, expectedOutput);
});

test('telemetry write that never settles is bounded and cannot stall task completion', async () => {
  const provider = new StubProvider('deterministic-local', false, 'completed output');
  const runtime = new OrchestrationRuntimeCore([{
    id: provider.id,
    provider,
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: 1,
    enabled: true,
  }], { tokenGovernorStore: { async append() { await new Promise(() => undefined); } }, tokenGovernorTimeoutMs: 20 });
  const result = await Promise.race([
    runtime.run({ objective: 'Do not stall', capability: 'execute', mode: 'direct' }),
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('runtime stalled')), 250)),
  ]);
  assert.equal(result.response?.output, 'completed output');
});
