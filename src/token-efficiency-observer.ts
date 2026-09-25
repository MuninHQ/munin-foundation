import { AgentTelemetry } from './agent-telemetry.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { MuninAgentId } from './agent-orchestrator.js';
import { evaluateContextBudget } from './token-efficiency-budget.js';
import type { TokenEfficiencyConfig } from './token-efficiency-config.js';
import { recommendExecutionTier, type EfficiencyProfileDescriptor, type EfficiencyTaskDescriptor } from './token-efficiency-router.js';
import { normalizeTokenUsage, type TokenUsageInput } from './token-efficiency-usage.js';
import { redactSecrets } from './secret-redaction.js';

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
      await writeFile(temporary, `${JSON.stringify(redactSecrets(snapshot), null, 2)}\n`, 'utf8');
      await rename(temporary, this.path);
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  async flush(): Promise<void> { await this.tail; }
}

export class TokenEfficiencyObserver {
  private health: TokenEfficiencyHealthSnapshot = { enabled: false, latestBudgetState: 'unavailable', observations: 0, latestRunId: '' };
  private readonly taskUsage = new Map<string, { total: number; incomplete: boolean }>();
  private readonly sessionUsage = new Map<string, { total: number; incomplete: boolean }>();
  constructor(readonly config: Readonly<TokenEfficiencyConfig>, private readonly telemetry: AgentTelemetry, private readonly healthSink?: TokenEfficiencyHealthSink) {
    this.health.enabled = config.enabled;
  }

  private publishHealth(runId: string, latestBudgetState = this.health.latestBudgetState): void {
    this.health = { enabled: this.config.enabled, latestBudgetState: latestBudgetState.slice(0, 64), observations: this.health.observations + 1, latestRunId: redactSecrets(runId).slice(0, 256) };
    try { void this.healthSink?.write({ ...this.health }).catch(() => undefined); } catch { return; }
  }

  async flushHealth(timeoutMs = 1_000): Promise<void> {
    if (!this.healthSink?.flush) return;
    try { await Promise.race([this.healthSink.flush(), new Promise<void>(resolve => setTimeout(resolve, Math.max(0, timeoutMs)))]); } catch { return; }
  }

  private accumulate(target: Map<string, { total: number; incomplete: boolean }>, key: string, usage: ReturnType<typeof normalizeTokenUsage>) {
    const current = target.get(key) ?? { total: 0, incomplete: false };
    const next = { total: current.total + (usage.totalTokens ?? 0), incomplete: current.incomplete || usage.totalTokens === undefined || usage.quality === 'unavailable' };
    target.set(key, next);
    if (target.size > 1_000) target.delete(target.keys().next().value as string);
    return next;
  }

  private assessAccumulated(scope: 'task' | 'session', accumulated: { total: number; incomplete: boolean }) {
    return evaluateContextBudget(scope, accumulated.incomplete ? [{ quality: 'unavailable' }] : [{ totalTokens: accumulated.total, quality: 'measured' }], this.config);
  }

  observeStart(input: EfficiencyTaskObservation): void {
    if (!this.config.enabled || !this.config.telemetryEnabled || !this.config.routerEnabled) return;
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
      const taskKey = input.taskId ?? `${input.runId}:${input.agentId ?? 'unknown'}`;
      const sessionKey = input.sessionId ?? input.runId;
      const assessments = [
        this.assessAccumulated('task', this.accumulate(this.taskUsage, taskKey, usage)),
        this.assessAccumulated('session', this.accumulate(this.sessionUsage, sessionKey, usage)),
      ];
      for (const budget of assessments) if (!['healthy', 'unavailable'].includes(budget.state)) {
        this.telemetry.emit({ name: 'efficiency.budget_warning', runId: input.runId, taskId: input.taskId, agentId: input.agentId, metadata: { ...budget, sessionId: input.sessionId } });
      }
      const severity = ['unavailable', 'healthy', 'warning', 'critical', 'checkpoint_recommended'];
      const latestState = assessments.map(item => item.state).sort((left, right) => severity.indexOf(right) - severity.indexOf(left))[0];
      this.publishHealth(input.runId, latestState);
    } catch { return; }
  }
}
