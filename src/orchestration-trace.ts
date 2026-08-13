import type { ProviderDecision } from './provider-policy.js';

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
  startedAt: string;
  completedAt: string;
}
