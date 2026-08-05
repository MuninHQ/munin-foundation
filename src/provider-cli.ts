#!/usr/bin/env node
import { DeterministicProvider, type ExecutionProvider, type ProviderRequest, type ProviderResponse } from './providers.js';
import { ProviderRegistry, type ProviderPolicy } from './provider-policy.js';

class ExternalPlaceholderProvider implements ExecutionProvider {
  readonly id = 'external-placeholder';
  async execute(_request: ProviderRequest): Promise<ProviderResponse> {
    throw new Error('External provider execution is not configured');
  }
}

const registry = new ProviderRegistry([
  {
    id: 'deterministic-local',
    provider: new DeterministicProvider(),
    capabilities: ['*'],
    mode: 'offline',
    estimatedCostPerCall: 0,
    estimatedLatencyMs: 5,
    enabled: true,
  },
  {
    id: 'external-placeholder',
    provider: new ExternalPlaceholderProvider(),
    capabilities: ['research', 'write', 'code', 'review'],
    mode: 'external',
    estimatedCostPerCall: 0.02,
    estimatedLatencyMs: 1200,
    enabled: false,
  },
]);

const [command, capability = 'write', ...flags] = process.argv.slice(2);

function policyFromFlags(values: string[]): ProviderPolicy {
  const maxCostFlag = values.find(value => value.startsWith('--max-cost='));
  const maxLatencyFlag = values.find(value => value.startsWith('--max-latency='));
  const preferredFlag = values.find(value => value.startsWith('--prefer='));
  return {
    offlineOnly: !values.includes('--allow-external'),
    maxCostPerCall: maxCostFlag ? Number(maxCostFlag.split('=')[1]) : undefined,
    maxLatencyMs: maxLatencyFlag ? Number(maxLatencyFlag.split('=')[1]) : undefined,
    preferredProviders: preferredFlag ? preferredFlag.split('=')[1].split(',').filter(Boolean) : undefined,
  };
}

if (command === 'list') {
  console.log(JSON.stringify(registry.list().map(({ provider, ...profile }) => ({ ...profile, providerId: provider.id })), null, 2));
} else if (command === 'evaluate') {
  const request: ProviderRequest = {
    taskId: 'policy-preview',
    objective: 'Preview provider routing',
    title: 'Provider policy evaluation',
    capability,
    expectedOutput: 'Provider routing decision',
    context: {},
  };
  const selection = registry.select(request, policyFromFlags(flags));
  console.log(JSON.stringify(selection.decision, null, 2));
} else {
  console.log('Usage:\n  provider-policy list\n  provider-policy evaluate <capability> [--allow-external] [--max-cost=N] [--max-latency=N] [--prefer=id1,id2]');
}
