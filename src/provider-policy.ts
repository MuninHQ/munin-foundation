import { OllamaProvider } from './ollama-provider.js';
import { DeterministicProvider, type ExecutionProvider, type ProviderRequest } from './providers.js';
import { ProviderResilience, ResilientProvider } from './resilience.js';

export interface ProviderProfile {
  id: string;
  provider: ExecutionProvider;
  capabilities: string[];
  mode: 'offline' | 'external';
  estimatedCostPerCall: number;
  estimatedLatencyMs: number;
  enabled: boolean;
}

export interface ProviderPolicy {
  offlineOnly: boolean;
  maxCostPerCall?: number;
  maxLatencyMs?: number;
  preferredProviders?: string[];
}

export interface ProviderDecision {
  selectedProviderId?: string;
  consideredProviderIds: string[];
  rejected: Array<{ providerId: string; reason: string }>;
  rationale: string[];
}

export class ProviderSelectionError extends Error {
  constructor(readonly decision: ProviderDecision, capability: string) {
    super(`No provider satisfies policy for capability: ${capability}`);
    this.name = 'ProviderSelectionError';
  }
}

export function defaultProviderProfiles(): ProviderProfile[] {
  const deterministic = new ResilientProvider(new DeterministicProvider());
  const ollamaTimeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 120_000);
  const ollama = new ResilientProvider(
    new OllamaProvider({ timeoutMs: ollamaTimeoutMs }),
    new ProviderResilience({ timeoutMs: ollamaTimeoutMs, maxAttempts: 1, circuitFailureThreshold: 3, circuitResetMs: 30_000 }),
  );
  return [
    {
      id: deterministic.id,
      provider: deterministic,
      capabilities: ['*'],
      mode: 'offline',
      estimatedCostPerCall: 0,
      estimatedLatencyMs: 1,
      enabled: true,
    },
    {
      id: ollama.id,
      provider: ollama,
      capabilities: ['research', 'write', 'code', 'review', 'strategy', 'execute', 'synthesis', 'council'],
      mode: 'offline',
      estimatedCostPerCall: 0,
      estimatedLatencyMs: 30_000,
      enabled: process.env.MUNIN_OLLAMA_ENABLED !== '0',
    },
  ];
}

export class ProviderRegistry {
  constructor(private readonly profiles: ProviderProfile[]) {}

  list(): ProviderProfile[] {
    return this.profiles.map(profile => ({ ...profile }));
  }

  select(request: ProviderRequest, policy: ProviderPolicy): { provider: ExecutionProvider; decision: ProviderDecision } {
    const rejected: ProviderDecision['rejected'] = [];
    const preferred = policy.preferredProviders ?? [];
    const ordered = [...this.profiles].sort((a, b) => {
      const ai = preferred.indexOf(a.id);
      const bi = preferred.indexOf(b.id);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
      return a.estimatedCostPerCall - b.estimatedCostPerCall || a.estimatedLatencyMs - b.estimatedLatencyMs;
    });

    for (const profile of ordered) {
      if (!profile.enabled) { rejected.push({ providerId: profile.id, reason: 'disabled' }); continue; }
      if (!profile.capabilities.includes(request.capability) && !profile.capabilities.includes('*')) {
        rejected.push({ providerId: profile.id, reason: `unsupported capability: ${request.capability}` });
        continue;
      }
      if (policy.offlineOnly && profile.mode !== 'offline') {
        rejected.push({ providerId: profile.id, reason: 'offline-only policy' });
        continue;
      }
      if (policy.maxCostPerCall !== undefined && profile.estimatedCostPerCall > policy.maxCostPerCall) {
        rejected.push({ providerId: profile.id, reason: 'cost limit exceeded' });
        continue;
      }
      if (policy.maxLatencyMs !== undefined && profile.estimatedLatencyMs > policy.maxLatencyMs) {
        rejected.push({ providerId: profile.id, reason: 'latency limit exceeded' });
        continue;
      }
      return {
        provider: profile.provider,
        decision: {
          selectedProviderId: profile.id,
          consideredProviderIds: ordered.map(item => item.id),
          rejected,
          rationale: [
            `capability ${request.capability} supported`,
            `${profile.mode} mode allowed`,
            `estimated cost ${profile.estimatedCostPerCall}`,
            `estimated latency ${profile.estimatedLatencyMs}ms`,
          ],
        },
      };
    }

    throw new ProviderSelectionError({
      consideredProviderIds: ordered.map(item => item.id),
      rejected,
      rationale: ['No eligible provider remained after policy evaluation.'],
    }, request.capability);
  }
}
