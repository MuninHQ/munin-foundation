#!/usr/bin/env node
import { FccProvider } from './fcc-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { ProviderRegistry, defaultProviderProfiles, type ProviderPolicy } from './provider-policy.js';
import type { ProviderRequest } from './providers.js';

const registry = new ProviderRegistry(defaultProviderProfiles());
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
} else if (command === 'health') {
  const target = capability;
  if (target === 'fcc') {
    console.log(JSON.stringify(await new FccProvider().health(), null, 2));
  } else if (target === 'all') {
    console.log(JSON.stringify({
      ollama: await new OllamaProvider().health(),
      fcc: await new FccProvider().health(),
    }, null, 2));
  } else {
    console.log(JSON.stringify(await new OllamaProvider().health(), null, 2));
  }
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
  console.log('Usage:\n  provider-policy list\n  provider-policy health [ollama|fcc|all]\n  provider-policy evaluate <capability> [--allow-external] [--max-cost=N] [--max-latency=N] [--prefer=ollama-local,fcc-gateway]');
}
