import { AgentTelemetry } from './agent-telemetry.js';
import { buildExecutionReceipt, type ExecutionReceipt } from './execution-receipts.js';
import {
  MuninAgentOrchestrator,
  type AgentExecutionResult,
  type MuninAgentExecutors,
  type OrchestratorPolicy,
  type OrchestratorRunResult,
} from './agent-orchestrator.js';
import type { TokenEfficiencyObserver } from './token-efficiency-observer.js';
import { estimateTokens } from './token-efficiency-usage.js';

function riskFromContext(context: Record<string, unknown>, objective: string): 'low' | 'medium' | 'high' {
  if (context.efficiencyRisk === 'high' || context.risk === 'high' || /safety-critical|security-critical|high[- ]risk/i.test(objective)) return 'high';
  if (context.efficiencyRisk === 'low' || context.risk === 'low') return 'low';
  return 'medium';
}

function ambiguityFromContext(context: Record<string, unknown>, workType: string, objective: string): 'low' | 'medium' | 'high' {
  if (context.efficiencyAmbiguity === 'high' || /architect|novel diagnosis|conflicting evidence/i.test(objective) || workType === 'mixed') return 'high';
  if (context.efficiencyAmbiguity === 'low') return 'low';
  return 'medium';
}

export function instrumentAgentExecutors(executors: MuninAgentExecutors, telemetry: AgentTelemetry, efficiency?: TokenEfficiencyObserver): MuninAgentExecutors {
  const instrumented: MuninAgentExecutors = {};
  const startedRuns = new Set<string>();

  for (const [agentId, executor] of Object.entries(executors)) {
    if (!executor) continue;
    instrumented[agentId as keyof MuninAgentExecutors] = async context => {
      if (!startedRuns.has(context.runId)) {
        startedRuns.add(context.runId);
        telemetry.emit({ name: 'run.started', runId: context.runId, metadata: { objective: context.objective, workType: context.workType } });
      }
      const startedAt = Date.now();
      telemetry.emit({ name: 'agent.started', runId: context.runId, agentId, metadata: { cycle: context.cycle, workType: context.workType } });
      efficiency?.observeStart({
        runId: context.runId,
        taskId: typeof context.context.taskId === 'string' ? context.context.taskId : `${context.runId}:${agentId}:${context.cycle}`,
        sessionId: typeof context.context.sessionId === 'string' ? context.context.sessionId : context.runId,
        agentId: context.agent.id,
        task: {
          workType: context.workType,
          capabilities: context.agent.capabilities,
          localCapable: context.context.localCapable !== false,
          risk: riskFromContext(context.context, context.objective),
          ambiguity: ambiguityFromContext(context.context, context.workType, context.objective),
          verificationRequired: agentId === 'engineer' || agentId === 'qa-verifier',
          contextTokens: estimateTokens(JSON.stringify(context.context)),
          actualExecutorId: agentId,
        },
        profiles: [],
      });
      try {
        const result: AgentExecutionResult = await executor(context);
        efficiency?.observeCompletion({
          runId: context.runId,
          taskId: typeof context.context.taskId === 'string' ? context.context.taskId : `${context.runId}:${agentId}:${context.cycle}`,
          sessionId: typeof context.context.sessionId === 'string' ? context.context.sessionId : context.runId,
          agentId: context.agent.id,
          usage: result.usage,
        });
        telemetry.emit({
          name: result.status === 'completed' ? 'agent.completed' : 'agent.failed',
          runId: context.runId,
          agentId,
          durationMs: Date.now() - startedAt,
          outcome: result.status,
          evidence: result.evidence,
          metadata: { cycle: context.cycle, fingerprint: result.fingerprint, blocker: result.blocker },
        });
        if (result.status === 'retry') telemetry.emit({ name: 'retry.scheduled', runId: context.runId, agentId, outcome: result.status });
        if (result.status === 'blocked') telemetry.emit({ name: 'human.blocked', runId: context.runId, agentId, outcome: result.status, metadata: { blocker: result.blocker ?? result.summary } });
        if (agentId === 'qa-verifier' && result.status !== 'completed') telemetry.emit({ name: 'verification.failed', runId: context.runId, agentId, outcome: result.status, evidence: result.evidence });
        return result;
      } catch (error) {
        telemetry.emit({
          name: 'agent.failed',
          runId: context.runId,
          agentId,
          durationMs: Date.now() - startedAt,
          outcome: 'exception',
          metadata: { error: error instanceof Error ? error.message : String(error) },
        });
        throw error;
      }
    };
  }

  return instrumented;
}

export async function runObservedOrchestration(
  objective: string,
  context: Record<string, unknown>,
  executors: MuninAgentExecutors,
  telemetry: AgentTelemetry,
  policy: Partial<OrchestratorPolicy> = {},
  efficiency?: TokenEfficiencyObserver,
): Promise<{ result: OrchestratorRunResult; receipt: ExecutionReceipt }> {
  const orchestrator = new MuninAgentOrchestrator(instrumentAgentExecutors(executors, telemetry, efficiency), policy);
  const result = await orchestrator.run(objective, context);
  const receipt = buildExecutionReceipt(result);
  telemetry.emit({
    name: 'run.completed',
    runId: result.runId,
    outcome: result.status,
    evidence: result.trace.flatMap(item => item.evidence ?? []),
    metadata: { workType: result.workType, steps: result.trace.length, blocker: result.blocker },
  });
  return { result, receipt };
}
