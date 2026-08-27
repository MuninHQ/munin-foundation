import { executeWithTripwires, type ToolCall, type ToolResult } from './tool-tripwire.js';

export type CapabilityActionKind = 'read' | 'write' | 'delete' | 'external';

export interface CapabilityBudget {
  maxToolCalls?: number;
  maxWrites?: number;
  maxDeletes?: number;
  maxExternalCalls?: number;
  maxCostUsd?: number;
  maxDurationMs?: number;
  maxDistinctTargets?: number;
  allowedDomains?: string[];
}

export interface CapabilityBudgetUsage {
  toolCalls: number;
  writes: number;
  deletes: number;
  externalCalls: number;
  costUsd: number;
  distinctTargets: string[];
  startedAt: number;
}

export interface CapabilityBudgetAction {
  kind: CapabilityActionKind;
  target?: string;
  domain?: string;
  costUsd?: number;
}

export interface CapabilityBudgetDecision {
  allow: boolean;
  reasons: string[];
  projected: CapabilityBudgetUsage;
}

function finiteNonNegative(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

export function validateCapabilityBudget(budget: CapabilityBudget): void {
  const integerLimits: Array<[string, number | undefined]> = [
    ['maxToolCalls', budget.maxToolCalls],
    ['maxWrites', budget.maxWrites],
    ['maxDeletes', budget.maxDeletes],
    ['maxExternalCalls', budget.maxExternalCalls],
    ['maxDistinctTargets', budget.maxDistinctTargets],
  ];
  for (const [name, value] of integerLimits) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      throw new Error(`${name} must be a non-negative integer.`);
    }
  }
  if (!finiteNonNegative(budget.maxCostUsd)) throw new Error('maxCostUsd must be a non-negative finite number.');
  if (budget.maxDurationMs !== undefined && (!Number.isFinite(budget.maxDurationMs) || budget.maxDurationMs < 1)) {
    throw new Error('maxDurationMs must be a positive finite number.');
  }
  if (budget.allowedDomains?.some(domain => !domain.trim())) throw new Error('allowedDomains cannot contain empty values.');
}

export class CapabilityBudgetGuard {
  readonly usage: CapabilityBudgetUsage;

  constructor(readonly budget: CapabilityBudget, startedAt = Date.now()) {
    validateCapabilityBudget(budget);
    this.usage = {
      toolCalls: 0,
      writes: 0,
      deletes: 0,
      externalCalls: 0,
      costUsd: 0,
      distinctTargets: [],
      startedAt,
    };
  }

  preflight(action: CapabilityBudgetAction, now = Date.now()): CapabilityBudgetDecision {
    const targetSet = new Set(this.usage.distinctTargets);
    if (action.target?.trim()) targetSet.add(action.target.trim());
    const projected: CapabilityBudgetUsage = {
      ...this.usage,
      toolCalls: this.usage.toolCalls + 1,
      writes: this.usage.writes + (action.kind === 'write' ? 1 : 0),
      deletes: this.usage.deletes + (action.kind === 'delete' ? 1 : 0),
      externalCalls: this.usage.externalCalls + (action.kind === 'external' ? 1 : 0),
      costUsd: this.usage.costUsd + Math.max(0, action.costUsd ?? 0),
      distinctTargets: [...targetSet],
    };
    const reasons: string[] = [];

    if (this.budget.maxToolCalls !== undefined && projected.toolCalls > this.budget.maxToolCalls) reasons.push('tool-call budget exceeded');
    if (this.budget.maxWrites !== undefined && projected.writes > this.budget.maxWrites) reasons.push('write budget exceeded');
    if (this.budget.maxDeletes !== undefined && projected.deletes > this.budget.maxDeletes) reasons.push('delete budget exceeded');
    if (this.budget.maxExternalCalls !== undefined && projected.externalCalls > this.budget.maxExternalCalls) reasons.push('external-call budget exceeded');
    if (this.budget.maxCostUsd !== undefined && projected.costUsd > this.budget.maxCostUsd) reasons.push('cost budget exceeded');
    if (this.budget.maxDistinctTargets !== undefined && projected.distinctTargets.length > this.budget.maxDistinctTargets) reasons.push('distinct-target blast radius exceeded');
    if (this.budget.maxDurationMs !== undefined && now - this.usage.startedAt >= this.budget.maxDurationMs) reasons.push('duration budget exceeded');

    if (action.kind === 'external' && this.budget.allowedDomains) {
      const normalized = action.domain?.trim().toLowerCase();
      const allowed = this.budget.allowedDomains.map(domain => domain.trim().toLowerCase());
      if (!normalized || !allowed.includes(normalized)) reasons.push('external domain is outside capability budget');
    }

    return { allow: reasons.length === 0, reasons, projected };
  }

  commit(decision: CapabilityBudgetDecision): void {
    if (!decision.allow) throw new Error(`Capability budget blocked: ${decision.reasons.join(', ')}`);
    Object.assign(this.usage, decision.projected);
  }

  consume(action: CapabilityBudgetAction, now = Date.now()): CapabilityBudgetDecision {
    const decision = this.preflight(action, now);
    if (decision.allow) this.commit(decision);
    return decision;
  }
}

export async function executeWithTripwiresAndBudget<T extends ToolResult>(
  call: ToolCall,
  action: CapabilityBudgetAction,
  guard: CapabilityBudgetGuard,
  execute: () => Promise<T>,
): Promise<T> {
  const budgetDecision = guard.preflight({ ...action, costUsd: action.costUsd ?? call.costUsd });
  if (!budgetDecision.allow) throw new Error(`Capability budget blocked: ${budgetDecision.reasons.join(', ')}`);
  const result = await executeWithTripwires(call, execute);
  guard.commit(budgetDecision);
  return result;
}
