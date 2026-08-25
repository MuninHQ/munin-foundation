import type { AgentExecutionRecord, OrchestratorRunResult } from './agent-orchestrator.js';

export interface ExecutionReceiptStep {
  agentId: string;
  cycle: number;
  status: string;
  summary: string;
  evidence: string[];
  fingerprint?: string;
  at: string;
}

export interface ExecutionReceipt {
  schemaVersion: 1;
  runId: string;
  objective: string;
  workType: string;
  status: string;
  blocker?: string;
  plan: string[];
  steps: ExecutionReceiptStep[];
  completedAt: string;
  replay: {
    objective: string;
    workType: string;
    plan: string[];
    priorFingerprints: string[];
  };
}

function toReceiptStep(record: AgentExecutionRecord): ExecutionReceiptStep {
  return {
    agentId: record.agentId,
    cycle: record.cycle,
    status: record.status,
    summary: record.summary,
    evidence: [...(record.evidence ?? [])],
    fingerprint: record.fingerprint,
    at: record.at,
  };
}

export function buildExecutionReceipt(run: OrchestratorRunResult, completedAt = new Date().toISOString()): ExecutionReceipt {
  return {
    schemaVersion: 1,
    runId: run.runId,
    objective: run.objective,
    workType: run.workType,
    status: run.status,
    blocker: run.blocker,
    plan: [...run.plan],
    steps: run.trace.map(toReceiptStep),
    completedAt,
    replay: {
      objective: run.objective,
      workType: run.workType,
      plan: [...run.plan],
      priorFingerprints: run.trace.map(item => item.fingerprint).filter((value): value is string => Boolean(value)),
    },
  };
}

export function receiptSummary(receipt: ExecutionReceipt): {
  stepCount: number;
  evidenceCount: number;
  retryLikeSteps: number;
  failedSteps: number;
} {
  return {
    stepCount: receipt.steps.length,
    evidenceCount: receipt.steps.reduce((total, step) => total + step.evidence.length, 0),
    retryLikeSteps: receipt.steps.filter(step => step.status === 'retry' || step.status === 'blocked').length,
    failedSteps: receipt.steps.filter(step => step.status === 'failed').length,
  };
}
