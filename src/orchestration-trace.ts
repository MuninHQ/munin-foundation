import type { ProviderDecision } from './provider-policy.js';
import type { TokenGovernorObservation } from './token-governor.js';

export interface OrchestrationAttempt {
  providerId: string;
  ok: boolean;
  error?: string;
}

export interface OrchestrationTrace {
  planId: string;
  route: 'direct' | 'council';
  attempts: OrchestrationAttempt[];
  selectedProviderId?: string;
  providerDecision?: ProviderDecision;
  tokenGovernor?: TokenGovernorObservation;
  startedAt: string;
  completedAt: string;
}
