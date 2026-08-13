export type OrchestrationMode = 'auto' | 'direct' | 'council';
export type OrchestrationRisk = 'low' | 'medium' | 'high';

export interface OrchestrationInput {
  objective: string;
  capability: string;
  mode?: OrchestrationMode;
  risk?: OrchestrationRisk;
  context?: Record<string, unknown>;
}

export interface OrchestrationPlan {
  id: string;
  objective: string;
  capability: string;
  route: 'direct' | 'council';
  risk: OrchestrationRisk;
  providerPreference: string[];
  localOnly: true;
  maxCostPerCall: 0;
  rationale: string[];
  createdAt: string;
}

function routeFor(input: OrchestrationInput): { route: 'direct' | 'council'; rationale: string[] } {
  if (input.mode === 'direct') return { route: 'direct', rationale: ['Direct mode explicitly requested.'] };
  if (input.mode === 'council') return { route: 'council', rationale: ['Council mode explicitly requested.'] };
  if (input.risk === 'high') return { route: 'council', rationale: ['High-risk work requires independent lenses before synthesis.'] };
  if (input.capability === 'strategy' || input.capability === 'review') {
    return { route: 'council', rationale: [`${input.capability} benefits from challenge and synthesis.`] };
  }
  return { route: 'direct', rationale: ['Low-complexity work can use the fastest eligible local provider.'] };
}

export class IntelligenceOrchestrationPlanner {
  plan(input: OrchestrationInput): OrchestrationPlan {
    const decision = routeFor(input);
    const risk = input.risk ?? 'medium';
    const now = new Date();
    return {
      id: `orchestration-${now.getTime()}`,
      objective: input.objective,
      capability: input.capability,
      route: decision.route,
      risk,
      providerPreference: ['ollama-local', 'deterministic-local'],
      localOnly: true,
      maxCostPerCall: 0,
      rationale: [
        ...decision.rationale,
        'Local-only policy is enforced for M18.',
        'Ollama is preferred when available; deterministic-local remains the zero-cost fallback.',
      ],
      createdAt: now.toISOString(),
    };
  }
}
