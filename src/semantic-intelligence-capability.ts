import { decideSemanticPromotion, semanticBackendHealth, semanticCodeIntelligencePolicy, type SemanticBackend } from './semantic-code-intelligence.js';
import { RuntimeCapabilityRegistry, type RuntimeCapability } from './runtime-capability-seam.js';

export interface SemanticIntelligenceCapabilityInput {
  action: 'health';
  backend?: SemanticBackend;
  repositoryRoot?: string;
}

export interface SemanticIntelligenceCapabilityOutput {
  health: Awaited<ReturnType<typeof semanticBackendHealth>>;
  promotion: ReturnType<typeof decideSemanticPromotion>;
  policy: ReturnType<typeof semanticCodeIntelligencePolicy>;
}

export function createSemanticIntelligenceCapability(): RuntimeCapability<SemanticIntelligenceCapabilityInput, SemanticIntelligenceCapabilityOutput> {
  return {
    name: 'code.semantic-intelligence',
    async execute(input) {
      if (input.action !== 'health') throw new Error(`Unsupported semantic intelligence action: ${String((input as {action?:unknown}).action)}`);
      const backend = input.backend ?? 'serena';
      const health = await semanticBackendHealth(backend, input.repositoryRoot);
      return {
        health,
        promotion: decideSemanticPromotion(health.backend === 'serena' ? health : { backend:'serena', available:false, capabilities:[], detail:'Serena was not evaluated.' }),
        policy: semanticCodeIntelligencePolicy(),
      };
    },
  };
}

export function registerSemanticIntelligenceCapability(registry: RuntimeCapabilityRegistry): void {
  if (!registry.has('code.semantic-intelligence')) registry.register(createSemanticIntelligenceCapability());
}
