import test from 'node:test';
import assert from 'node:assert/strict';
import { registerExternalIntelligenceCapability, type ExternalIntelligenceProvider } from '../src/external-intelligence-capability.js';
import { RuntimeCapabilityRegistry } from '../src/runtime-capability-seam.js';

test('external intelligence rejects empty objectives', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registerExternalIntelligenceCapability(registry);
  await assert.rejects(registry.execute('intelligence.external', { objective: '' }), /objective is required/);
});

test('external intelligence uses first available provider', async () => {
  const provider: ExternalIntelligenceProvider = {
    name: 'mock-gpt',
    available: async () => true,
    execute: async input => ({ provider: 'mock-gpt', mode: input.mode ?? 'research', summary: 'Grounded result', evidence: [{ title: 'Source' }] }),
  };
  const registry = new RuntimeCapabilityRegistry();
  registerExternalIntelligenceCapability(registry, [provider]);
  const result = await registry.execute<any, any>('intelligence.external', { objective: 'Research this', requireCitations: true });
  assert.equal(result.output.provider, 'mock-gpt');
  assert.equal(result.output.summary, 'Grounded result');
  assert.equal(result.output.evidence.length, 1);
});

test('external intelligence has a zero-cost local fallback', async () => {
  const registry = new RuntimeCapabilityRegistry();
  registerExternalIntelligenceCapability(registry);
  const result = await registry.execute<any, any>('intelligence.external', { objective: 'Research later' });
  assert.equal(result.output.mode, 'research');
  assert.equal(typeof result.output.summary, 'string');
});
