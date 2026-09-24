import { AgentTelemetry } from './agent-telemetry.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { MuninAgentId } from './agent-orchestrator.js';
import { evaluateContextBudget } from './token-efficiency-budget.js';
import type { TokenEfficiencyConfig } from './token-efficiency-config.js';
import { recommendExecutionTier, type EfficiencyProfileDescriptor, type EfficiencyTaskDescriptor } from './token-efficiency-router.js';
import { normalizeTokenUsage, type TokenUsageInput } from './token-efficiency-usage.js';

export interface EfficiencyTaskObservation {
  runId: string;
  taskId?: string;
  sessionId?: string;
  agentId?: MuninAgentId;
  task: EfficiencyTaskDescriptor;
  profiles: EfficiencyProfileDescriptor[];
}
export interface EfficiencyCompletionObservation {
  runId: string;
  taskId?: string;
  sessionId?: string;
  agentId?: MuninAgentId;
  usage?: TokenUsageInput;
}

export interface TokenEfficiencyHealthSnapshot {
  enabled: boolean;
  latestBudgetState: string;
  observations: number;
  latestRunId: string;
}
export interface TokenEfficiencyHealthSink {
  write(snapshot: TokenEfficiencyHealthSnapshot): Promise<void>;
  flush?(): Promise<void>;
}

export class JsonTokenEfficiencyHealthSink implements TokenEfficiencyHealthSink {
  private tail: Promise<void> = Promise.resolve();
  constructor(readonly path: string) {}
  write(snapshot: TokenEfficiencyHealthSnapshot): Promise<void> {
    const operation = this.tail.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.tmp`;
      await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      await rename(temporary, this.path);
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  async flush(): Promise<void> { await this.tail; }
}

export class TokenEfficiencyObserver {
  private health: TokenEfficiencyHealthSnapshot = { enabled: false, latestBudgetState: 'unavailable', observations: 0, latestRunId: '' };
  constructor(readonly config: Readonly<TokenEfficiencyConfig>, private readonly telemetry: AgentTelemetry, private readonly healthSink?: TokenEfficiencyHealthSink) {
    this.health.enabled = config.enabled;
  }

  private publishHealth(runId: string, latestBudgetState = this.health.latestBudgetState): void {
    this.health = { enabled: this.config.enabled, latestBudgetState, observations: this.health.observations + 1, latestRunId: runId };
    try { void this.healthSink?.write({ ...this.health }).catch(() => undefined); } catch { return; }
  }

  async flushHealth(): Promise<void> { try { await this.healthSink?.flush?.(); } catch { return; } }

  observeStart(input: EfficiencyTaskObservation): void {
    if (!this.config.enabled || !this.config.routerEnabled) return;
    try {
      const recommendation = recommendExecutionTier(input.task, input.profiles);
      this.telemetry.emit({
        name: 'efficiency.route_recommended', runId: input.runId, taskId: input.taskId, agentId: input.agentId,
        metadata: { ...recommendation, sessionId: input.sessionId },
      });
      this.publishHealth(input.runId);
    } catch { return; }
  }

  observeCompletion(input: EfficiencyCompletionObservation): void {
    if (!this.config.enabled || !this.config.telemetryEnabled) return;
    try {
      const usage = normalizeTokenUsage({ ...input.usage, runId: input.runId, taskId: input.taskId, sessionId: input.sessionId, agentId: input.agentId });
      this.telemetry.emit({ name: 'efficiency.usage_observed', runId: input.runId, taskId: input.taskId, agentId: input.agentId, providerId: usage.providerId, cost: usage.costUsd, metadata: { ...usage } });
      if (!this.config.budgetEnabled) return;
      const budget = evaluateContextBudget('task', [usage], this.config);
      if (!['healthy', 'unavailable'].includes(budget.state)) {
        this.telemetry.emit({ name: 'efficiency.budget_warning', runId: input.runId, taskId: input.taskId, agentId: input.agentId, metadata: { ...budget, sessionId: input.sessionId } });
      }
      this.publishHealth(input.runId, budget.state);
    } catch { return; }
  }
}
