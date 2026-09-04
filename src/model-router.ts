import { AsyncLocalStorage } from 'node:async_hooks';

export type ModelTier = 'economy' | 'premium';
export type PremiumBudgetState = {
  available: true | false | 'unknown';
  source: 'manual' | 'environment' | 'unavailable';
  resetAt?: string;
  reason?: string;
};
export type RoutingSignals = {
  impact: number;
  complexity: number;
  toolUse: number;
  autonomy: number;
  risk?: number;
};
export type ModelRoute = {
  tier: ModelTier;
  premiumAllowed: boolean;
  reason: string;
  budget: PremiumBudgetState;
};

const routeContext = new AsyncLocalStorage<ModelRoute>();

function clamp(value: number) { return Math.max(0, Math.min(10, Math.round(value))); }

export function premiumBudgetFromEnv(env: NodeJS.ProcessEnv = process.env): PremiumBudgetState {
  const raw = env.MUNIN_PREMIUM_AVAILABLE?.trim().toLowerCase();
  const resetAt = env.MUNIN_PREMIUM_RESET_AT?.trim() || undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes') return { available: true, source: 'environment', resetAt };
  if (raw === '0' || raw === 'false' || raw === 'no') return { available: false, source: 'environment', resetAt, reason: 'Premium execution manually marked unavailable.' };
  return { available: 'unknown', source: 'unavailable', resetAt, reason: 'No trustworthy premium-credit telemetry is configured.' };
}

export function routeModel(signals: RoutingSignals, budget = premiumBudgetFromEnv()): ModelRoute {
  const impact = clamp(signals.impact);
  const complexity = clamp(signals.complexity);
  const toolUse = clamp(signals.toolUse);
  const autonomy = clamp(signals.autonomy);
  const risk = clamp(signals.risk ?? 0);
  const justified = impact >= 7 && complexity >= 7 && (toolUse >= 6 || autonomy >= 7) && risk <= 8;
  if (!justified) return { tier: 'economy', premiumAllowed: false, budget, reason: 'Economy route is sufficient for this workload.' };
  if (budget.available !== true) return { tier: 'economy', premiumAllowed: false, budget, reason: budget.reason ?? 'Premium budget is not explicitly available.' };
  return { tier: 'premium', premiumAllowed: true, budget, reason: 'High-impact, high-complexity autonomous workload justifies premium execution.' };
}

export function currentModelRoute(): ModelRoute | undefined { return routeContext.getStore(); }
export async function withModelRoute<T>(route: ModelRoute, operation: () => Promise<T>): Promise<T> { return routeContext.run(route, operation); }

export function premiumProviderFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const baseUrl = env.MUNIN_PREMIUM_LLM_BASE_URL?.trim() ?? '';
  const apiKey = env.MUNIN_PREMIUM_LLM_API_KEY?.trim() ?? '';
  const model = env.MUNIN_PREMIUM_LLM_MODEL?.trim() ?? '';
  return { configured: Boolean(baseUrl && model && apiKey), baseUrl, apiKey, model };
}
