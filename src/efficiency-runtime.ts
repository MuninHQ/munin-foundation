import { selectCapabilities, type CapabilityDescriptor, type CapabilitySelection } from './capability-selector.js';
import type { ContextBudget } from './context-budget.js';
import { EfficiencyBuildStateStore, type EfficiencyBuildState } from './efficiency-build-state.js';
import { observeEfficiency, summarizeEfficiencyObservations, type EfficiencyObservation, type EfficiencyObservationInput } from './efficiency-telemetry.js';
import { EfficiencyTelemetryStore } from './efficiency-telemetry-store.js';
import { RepositoryContextSelector, type RepositoryContextResult } from './repository-context-selector.js';
import { recommendEconomicRoute, type EconomicRouteRecommendation, type EconomicRouteInput } from './token-governor.js';

export interface EfficiencyPrepareInput { runId: string; objective: string; root: string; taskKind: EconomicRouteInput['kind']; risk: EconomicRouteInput['risk']; complexity: number; impact: number; budget: ContextBudget; requiredCapabilities: string[]; optionalCapabilities?: string[]; premiumAvailable?: boolean; explicitPaths?: string[]; }
export interface EfficiencyPreparation { context: RepositoryContextResult; capabilities: CapabilitySelection; route: EconomicRouteRecommendation; buildState?: EfficiencyBuildState; diagnostics: string[]; }
export type EfficiencyObserveInput = EfficiencyObservationInput;
interface Dependencies { contextSelector: Pick<RepositoryContextSelector, 'select'>; descriptors: CapabilityDescriptor[]; telemetryStore: Pick<EfficiencyTelemetryStore, 'append' | 'list'>; buildStateStore: Pick<EfficiencyBuildStateStore, 'load'>; providerExecute?: () => Promise<void>; }
const defaultDescriptors: CapabilityDescriptor[] = [
  { id: 'git-rg-core', provides: ['repo.search', 'diff.read'], activationCost: 0, locality: 'local', available: true, core: true },
  { id: 'node-test-core', provides: ['test.run'], activationCost: 0, locality: 'local', available: true, core: true },
];
export class EfficiencyRuntime {
  private readonly dependencies: Dependencies;
  constructor(dependencies: Partial<Dependencies> = {}) { this.dependencies = { contextSelector: dependencies.contextSelector ?? new RepositoryContextSelector(), descriptors: dependencies.descriptors ?? defaultDescriptors, telemetryStore: dependencies.telemetryStore ?? new EfficiencyTelemetryStore(), buildStateStore: dependencies.buildStateStore ?? new EfficiencyBuildStateStore(), providerExecute: dependencies.providerExecute }; }
  async prepare(input: EfficiencyPrepareInput): Promise<EfficiencyPreparation> {
    const context = await this.dependencies.contextSelector.select({ root: input.root, objective: input.objective, budget: input.budget, explicitPaths: input.explicitPaths });
    const capabilities = selectCapabilities({ required: input.requiredCapabilities, optional: input.optionalCapabilities, descriptors: this.dependencies.descriptors });
    const route = recommendEconomicRoute({ kind: input.taskKind, risk: input.risk, complexity: input.complexity, impact: input.impact, contextTokens: context.selection.estimatedSelectedTokens, premiumAvailable: input.premiumAvailable === true });
    let buildState: EfficiencyBuildState | undefined; const diagnostics = [...context.diagnostics];
    try { buildState = await this.dependencies.buildStateStore.load(); } catch (error) { diagnostics.push(`Build State unavailable: ${error instanceof Error ? error.message : String(error)}`); }
    return { context, capabilities, route, buildState, diagnostics };
  }
  async observe(input: EfficiencyObserveInput): Promise<EfficiencyObservation | undefined> { try { const observation = observeEfficiency(input); await Promise.race([this.dependencies.telemetryStore.append(observation), new Promise<void>(resolve => setTimeout(resolve, 250))]); return observation; } catch { return undefined; } }
  async status() { const observations = await this.dependencies.telemetryStore.list(100); let buildState: EfficiencyBuildState | undefined; try { buildState = await this.dependencies.buildStateStore.load(); } catch {} return { ...summarizeEfficiencyObservations(observations), latest: observations[0], buildState, capabilities: selectCapabilities({ required: [], descriptors: this.dependencies.descriptors }) }; }
}
