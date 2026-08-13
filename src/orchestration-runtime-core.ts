import { CouncilOrchestrator } from './council.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationInput } from './intelligence-orchestration.js';
import { defaultProviderProfiles, ProviderRegistry } from './provider-policy.js';
import { orchestrationPolicy } from './orchestration-provider-preference.js';

export class OrchestrationRuntimeCore {
  async run(input: OrchestrationInput) {
    const plan = new IntelligenceOrchestrationPlanner().plan(input);
    const profiles = defaultProviderProfiles();
    const preferred = plan.providerPreference[0];
    const request = {
      taskId: plan.id,
      objective: input.objective,
      title: `Munin orchestration: ${input.capability}`,
      capability: input.capability,
      expectedOutput: 'Produce a concise operational result.',
      context: input.context ?? {},
    };
    const choice = new ProviderRegistry(profiles).select(request, orchestrationPolicy(plan, preferred));
    if (plan.route === 'council') {
      const council = await new CouncilOrchestrator(choice.provider).deliberate({
        objective: input.objective,
        context: input.context ?? {},
      });
      return { plan, providerId: choice.provider.id, decision: choice.decision, council };
    }
    const response = await choice.provider.execute(request);
    return { plan, providerId: choice.provider.id, decision: choice.decision, response };
  }
}
