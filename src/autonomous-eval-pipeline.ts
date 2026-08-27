import type { AutonomousRunResult } from './autonomous-execution-loop.js';
import { runAgentEvalSuite, type AgentEvalResult, type AgentEvalTrial, type AgentGrader } from './agent-eval-suite.js';
import { emitAgentEvalTelemetry, evalToOutcomeSample } from './agent-eval-telemetry.js';
import type { AgentOutcomeSample } from './agent-scorecards.js';
import type { AgentTelemetry } from './agent-telemetry.js';

export interface AutonomousEvalPipelineResult {
  trial: AgentEvalTrial;
  evaluation: AgentEvalResult;
  sample: AgentOutcomeSample;
}

export function autonomousRunToEvalTrial(run: AutonomousRunResult, agentId: string, capability: string, expectedOutcome = 'done'): AgentEvalTrial {
  const completionEvidence = run.completionEvaluations?.flatMap(item => item.evidence ?? []) ?? [];
  const steps = run.trace.map((event, index) => ({
    tool: event.phase.toLowerCase(),
    action: event.summary ?? event.phase,
    status: event.status === 'PASS' ? 'PASS' as const : event.status === 'BLOCKED' ? 'BLOCKED' as const : 'FAIL' as const,
    evidence: index === run.trace.length - 1 && completionEvidence.length ? completionEvidence : undefined,
  }));
  return {
    trialId: `${run.runId}:eval`,
    agentId,
    capability,
    expectedOutcome,
    actualOutcome: run.status === 'DONE' ? expectedOutcome : run.status.toLowerCase(),
    completed: run.status === 'DONE',
    steps,
  };
}

export async function evaluateAutonomousRun(
  run: AutonomousRunResult,
  agentId: string,
  capability: string,
  graders: AgentGrader[],
  telemetry?: AgentTelemetry,
): Promise<AutonomousEvalPipelineResult> {
  const trial = autonomousRunToEvalTrial(run, agentId, capability);
  const evaluation = await runAgentEvalSuite(trial, graders);
  const sample = evalToOutcomeSample(trial, evaluation);
  if (telemetry) emitAgentEvalTelemetry(telemetry, run.runId, trial, evaluation);
  return { trial, evaluation, sample };
}
