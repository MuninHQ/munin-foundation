import type { MuninWorkType } from './agent-orchestrator.js';

export type ExecutionTier = 'deterministic_local' | 'local_model' | 'strong_model';
export type TaskRisk = 'low' | 'medium' | 'high';
export type TaskAmbiguity = 'low' | 'medium' | 'high';

export interface EfficiencyTaskDescriptor {
  workType: MuninWorkType;
  capabilities: string[];
  localCapable: boolean;
  risk: TaskRisk;
  ambiguity: TaskAmbiguity;
  verificationRequired: boolean;
  contextTokens?: number;
  actualExecutorId?: string;
  actualProviderId?: string;
}

export interface EfficiencyProfileDescriptor {
  id: string;
  tier: ExecutionTier;
  enabled: boolean;
}

export interface ExecutionTierRecommendation {
  classification: 'mechanical' | 'bounded_reasoning' | 'complex_reasoning' | 'high_stakes';
  recommendedTier: ExecutionTier;
  recommendedProfileId?: string;
  confidence: 'low' | 'medium' | 'high';
  reasonCodes: string[];
  actualExecutorId?: string;
  actualProviderId?: string;
}

const MECHANICAL_CAPABILITIES = new Set(['format', 'poll', 'test', 'inspect', 'extract', 'transform']);
const COMPLEX_CAPABILITIES = new Set(['architecture', 'diagnosis', 'strategy', 'synthesis', 'security-review']);

export function recommendExecutionTier(task: EfficiencyTaskDescriptor, profiles: EfficiencyProfileDescriptor[]): ExecutionTierRecommendation {
  const reasonCodes: string[] = [];
  let classification: ExecutionTierRecommendation['classification'];
  let recommendedTier: ExecutionTier;
  if (task.risk === 'high') {
    classification = 'high_stakes';
    recommendedTier = 'strong_model';
    reasonCodes.push('high-risk');
  } else if (task.ambiguity === 'high' || task.capabilities.some(item => COMPLEX_CAPABILITIES.has(item))) {
    classification = 'complex_reasoning';
    recommendedTier = 'strong_model';
    reasonCodes.push('complex-reasoning');
  } else if (task.localCapable && task.risk === 'low' && task.ambiguity === 'low' && task.capabilities.every(item => MECHANICAL_CAPABILITIES.has(item))) {
    classification = 'mechanical';
    recommendedTier = 'deterministic_local';
    reasonCodes.push('repeatable-local-work');
  } else {
    classification = 'bounded_reasoning';
    recommendedTier = task.localCapable ? 'local_model' : 'strong_model';
    reasonCodes.push(task.localCapable ? 'bounded-local-reasoning' : 'local-capability-unavailable');
  }
  if (task.verificationRequired) reasonCodes.push('verification-required');
  if ((task.contextTokens ?? 0) >= 128_000) reasonCodes.push('large-context');
  const recommendedProfileId = profiles.find(profile => profile.enabled && profile.tier === recommendedTier)?.id;
  return Object.freeze({
    classification,
    recommendedTier,
    recommendedProfileId,
    confidence: task.risk === 'high' || classification === 'mechanical' ? 'high' : task.ambiguity === 'medium' ? 'medium' : 'high',
    reasonCodes: Object.freeze(reasonCodes) as unknown as string[],
    actualExecutorId: task.actualExecutorId,
    actualProviderId: task.actualProviderId,
  });
}
