import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderRegistry } from '../src/provider-policy.js';
import type { ExecutionProvider, ProviderRequest, ProviderResponse } from '../src/providers.js';

class TestProvider implements ExecutionProvider {
  constructor(readonly id: string) {}
  async execute(_request: ProviderRequest): Promise<ProviderResponse> {
    return { providerId: this.id, output: 'test output', metadata: {} };
  }
}

const request: ProviderRequest = {
  taskId: 'tsk-test', objective: 'Test policy', title: 'Test', capability: 'research',
  expectedOutput: 'Decision', context: {},
};

test('offline-only policy selects local provider and audits external rejection', () => {
  const registry = new ProviderRegistry([
    { id: 'external', provider: new TestProvider('external'), capabilities: ['research'], mode: 'external', estimatedCostPerCall: 0.01, estimatedLatencyMs: 100, enabled: true },
    { id: 'local', provider: new TestProvider('local'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 5, enabled: true },
  ]);
  const result = registry.select(request, { offlineOnly: true, preferredProviders: ['external', 'local'] });
  assert.equal(result.provider.id, 'local');
  assert.equal(result.decision.rejected[0].reason, 'offline-only policy');
});

test('policy rejects providers above cost and latency limits', () => {
  const registry = new ProviderRegistry([
    { id: 'expensive', provider: new TestProvider('expensive'), capabilities: ['research'], mode: 'external', estimatedCostPerCall: 1, estimatedLatencyMs: 50, enabled: true },
    { id: 'slow', provider: new TestProvider('slow'), capabilities: ['research'], mode: 'external', estimatedCostPerCall: 0, estimatedLatencyMs: 5000, enabled: true },
  ]);
  assert.throws(() => registry.select(request, { offlineOnly: false, maxCostPerCall: 0.1, maxLatencyMs: 1000 }), /No provider satisfies policy/);
});

test('preferred provider wins when it satisfies policy', () => {
  const registry = new ProviderRegistry([
    { id: 'cheap', provider: new TestProvider('cheap'), capabilities: ['research'], mode: 'external', estimatedCostPerCall: 0, estimatedLatencyMs: 10, enabled: true },
    { id: 'preferred', provider: new TestProvider('preferred'), capabilities: ['research'], mode: 'external', estimatedCostPerCall: 0.05, estimatedLatencyMs: 100, enabled: true },
  ]);
  const result = registry.select(request, { offlineOnly: false, preferredProviders: ['preferred'] });
  assert.equal(result.provider.id, 'preferred');
});

test('unsupported and disabled providers are reported before fallback', () => {
  const registry = new ProviderRegistry([
    { id: 'disabled', provider: new TestProvider('disabled'), capabilities: ['research'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 1, enabled: false },
    { id: 'wrong-capability', provider: new TestProvider('wrong-capability'), capabilities: ['write'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 1, enabled: true },
    { id: 'fallback', provider: new TestProvider('fallback'), capabilities: ['*'], mode: 'offline', estimatedCostPerCall: 0, estimatedLatencyMs: 5, enabled: true },
  ]);
  const result = registry.select(request, { offlineOnly: true, preferredProviders: ['disabled', 'wrong-capability', 'fallback'] });
  assert.equal(result.provider.id, 'fallback');
  assert.deepEqual(result.decision.rejected.map(item => item.reason), ['disabled', 'unsupported capability: research']);
});
