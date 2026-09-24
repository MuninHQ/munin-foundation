import { CouncilOrchestrator } from './council.js';
import { IntelligenceOrchestrationPlanner, type OrchestrationInput } from './intelligence-orchestration.js';
import { defaultProviderProfiles, ProviderRegistry, type ProviderProfile } from './provider-policy.js';
import { orchestrationPolicy } from './orchestration-provider-preference.js';
import type { ProviderRequest } from './providers.js';
import type { OrchestrationAttempt, OrchestrationTrace } from './orchestration-trace.js';
import { observeTokenUsage, type TokenGovernorObservation, type TokenGovernorOptions } from './token-governor.js';

export interface OrchestrationRuntimeOptions {
  tokenGovernor?: TokenGovernorOptions;
  tokenGovernorStore?: { append(observation: TokenGovernorObservation): Promise<void> };
  tokenGovernorTimeoutMs?: number;
}

async function boundedObservationWrite(operation: Promise<void>, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, timeoutMs);
    operation.then(() => { clearTimeout(timer); resolve(); }, error => { clearTimeout(timer); reject(error); });
  });
}

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
  constructor(
    private readonly profiles: ProviderProfile[] = defaultProviderProfiles(),
    private readonly options: OrchestrationRuntimeOptions = {},
  ) {}

  private async observe(input: OrchestrationInput, request: ProviderRequest, providerId: string, output: string): Promise<TokenGovernorObservation | undefined> {
    try {
      let requestText = request.objective;
      try { requestText = JSON.stringify(request); } catch { /* Objective remains a safe bounded fallback. */ }
      const observation = observeTokenUsage({
        runId: request.taskId,
        source: 'provider',
        capability: request.capability,
        risk: input.risk ?? 'medium',
        selectedProviderId: providerId,
        input: requestText.slice(0, 100_000),
        output,
      }, this.options.tokenGovernor);
      try {
        const write = this.options.tokenGovernorStore?.append(observation);
        if (write) await boundedObservationWrite(write, Math.max(1, Math.min(5_000, this.options.tokenGovernorTimeoutMs ?? 250)));
      } catch { /* Shadow telemetry cannot fail execution. */ }
      return observation;
    } catch {
      return undefined;
    }
  }

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
            tokenGovernor: await this.observe(input, request, profile.id, ''),
            startedAt,
            completedAt: new Date().toISOString(),
          };
          return { plan, providerId: profile.id, decision: choice.decision, council, trace };
        }

        const response = await choice.provider.execute(request);
        attempts.push({ providerId: profile.id, ok: true });
        const tokenGovernor = await this.observe(input, request, profile.id, response.output);
        const trace: OrchestrationTrace = {
          planId: plan.id,
          route: plan.route,
          attempts,
          selectedProviderId: profile.id,
          providerDecision: choice.decision,
          tokenGovernor,
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
