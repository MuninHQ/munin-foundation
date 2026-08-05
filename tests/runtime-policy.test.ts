import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ExecutionEngine } from '../src/runtime.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';
import type { ProviderProfile } from '../src/provider-policy.js';

class TestProvider implements ExecutionProvider {
  constructor(readonly id: string, private readonly output = 'Detailed accepted execution output') {}
  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    return { providerId: this.id, output: `${request.expectedOutput}: ${this.output}`, metadata: { test: true } };
  }
}

test('runtime selects preferred eligible provider and persists routing decision', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-policy-'));
  try {
    const profiles: ProviderProfile[] = [
      { id: 'local-a', provider: new TestProvider('local-a'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 10, enabled: true },
      { id: 'local-b', provider: new TestProvider('local-b'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 20, enabled: true },
    ];
    const engine = new ExecutionEngine(dir, profiles, { offlineOnly: true, preferredProviders: ['local-b'] });
    const plan = await engine.createPlan('Build code for policy routing');
    const result = await engine.run(plan.id);
    assert.equal(result.status, 'DONE');
    assert.equal(result.tasks[0].providerId, 'local-b');
    assert.equal(result.tasks[0].providerDecision?.selectedProviderId, 'local-b');
    assert.deepEqual(result.tasks[0].providerDecision?.consideredProviderIds, ['local-b', 'local-a']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime fails safely and blocks dependents when no provider satisfies policy', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-policy-'));
  try {
    const profiles: ProviderProfile[] = [
      { id: 'external-only', provider: new TestProvider('external-only'), capabilities: ['*'], mode: 'external', estimatedCostPerCall: 1, estimatedLatencyMs: 500, enabled: true },
    ];
    const engine = new ExecutionEngine(dir, profiles, { offlineOnly: true });
    const plan = await engine.createPlan('Build code for blocked routing');
    const result = await engine.run(plan.id);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.tasks[0].status, 'FAILED');
    assert.match(result.tasks[0].error ?? '', /No provider satisfies policy/);
    assert.equal(result.tasks[0].providerDecision?.rejected[0].reason, 'offline-only policy');
    assert.equal(result.tasks[1].status, 'BLOCKED');
    const telemetry = await engine.telemetry();
    assert.equal(telemetry.rejectedByProviderPolicy, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime falls back from ineligible preferred provider to eligible provider', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-policy-'));
  try {
    const profiles: ProviderProfile[] = [
      { id: 'preferred-expensive', provider: new TestProvider('preferred-expensive'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 5, estimatedLatencyMs: 10, enabled: true },
      { id: 'fallback-local', provider: new TestProvider('fallback-local'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 20, enabled: true },
    ];
    const engine = new ExecutionEngine(dir, profiles, { offlineOnly: true, maxCostPerCall: 1, preferredProviders: ['preferred-expensive'] });
    const plan = await engine.createPlan('Build code with fallback');
    const result = await engine.run(plan.id);
    assert.equal(result.tasks[0].providerId, 'fallback-local');
    assert.equal(result.tasks[0].providerDecision?.rejected[0].providerId, 'preferred-expensive');
    assert.equal(result.tasks[0].providerDecision?.rejected[0].reason, 'cost limit exceeded');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
