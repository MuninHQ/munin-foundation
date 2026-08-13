import type { OrchestrationPlan } from './intelligence-orchestration.js';
import type { ProviderPolicy } from './provider-policy.js';

export function orchestrationPolicy(plan: OrchestrationPlan, preferredProvider: string): ProviderPolicy {
  return {
    offlineOnly: plan.localOnly,
    maxCostPerCall: plan.maxCostPerCall,
    preferredProviders: [preferredProvider],
  };
}
