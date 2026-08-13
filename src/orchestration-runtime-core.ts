import { CouncilOrchestrator } from './council.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationInput } from './intelligence-orchestration.js';
import { defaultProviderProfiles, ProviderRegistry, type ProviderProfile } from './provider-policy.js';
import { orchestrationPolicy } from './orchestration-provider-preference.js';
import type { ProviderRequest } from './providers.js';
import type { OrchestrationAttempt, OrchestrationTrace } from './orchestration-trace.js';

export class OrchestrationRuntimeError extends Error {
  constructor(message: string, readonly trace: OrchestrationTrace) {
    super(message);
    this.name = 'OrchestrationRuntimeError';
  }
}

function preferenceIndex(plan: ReturnType<IntelligenceOrchestrationPlanner['plan']>, id: string): number {
  const index = plan.providerPreference.indexOf(id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

export class OrchestrationRuntimeCore {
  constructor(private readonly profiles: ProviderProfile[] = defaultProviderProfiles()) {}

  async run(input: OrchestrationInput) {
    const plan = new IntelligenceOrchestrationPlanner().plan(input);
    const startedAt = new Date().toISOString();
    const attempts: OrchestrationAttempt[] = [];
    const request: ProviderRequest = {
      taskId: plan.id,
      objective: input.objective,
      title: `Munin orchestration: ${input.capability}`,
      capability: input.capability,
      expectedOutput: 'Produce a concise operational result.',
      context: input.context ?? {},
    };

    const candidates = this.profiles
      .filter(profile => profile.enabled)
      .filter(profile => profile.mode === 'offline')
      .filter(profile => profile.estimatedCostPerCall <= plan.maxCostPerCall)
      .filter(profile => profile.capabilities.includes(input.capability) || profile.capabilities.includes('*'))
      .sort((a, b) => preferenceIndex(plan, a.id) - preferenceIndex(plan, b.id));

    if (!candidates.length) {
      const trace: OrchestrationTrace = {
        planId: plan.id,
        route: plan.route,
        attempts,
        startedAt,
        completedAt: new Date().toISOString(),
      };
      throw new OrchestrationRuntimeError('No eligible local provider is available.', trace);
    }

    for (const profile of candidates) {
      const choice = new ProviderRegistry([profile]).select(request, orchestrationPolicy(plan, profile.id));
      try {
        if (plan.route === 'council') {
          const council = await new CouncilOrchestrator(choice.provider).deliberate({
            objective: input.objective,
            context: input.context ?? {},
          });
          attempts.push({ providerId: profile.id, ok: true });
          const trace: OrchestrationTrace = {
            planId: plan.id,
            route: plan.route,
            attempts,
            selectedProviderId: profile.id,
            providerDecision: choice.decision,
            startedAt,
            completedAt: new Date().toISOString(),
          };
          return { plan, providerId: profile.id, decision: choice.decision, council, trace };
        }

        const response = await choice.provider.execute(request);
        attempts.push({ providerId: profile.id, ok: true });
        const trace: OrchestrationTrace = {
          planId: plan.id,
          route: plan.route,
          attempts,
          selectedProviderId: profile.id,
          providerDecision: choice.decision,
          startedAt,
          completedAt: new Date().toISOString(),
        };
        return { plan, providerId: profile.id, decision: choice.decision, response, trace };
      } catch (error) {
        attempts.push({
          providerId: profile.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const trace: OrchestrationTrace = {
      planId: plan.id,
      route: plan.route,
      attempts,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    throw new OrchestrationRuntimeError('All eligible local providers failed.', trace);
  }
}
