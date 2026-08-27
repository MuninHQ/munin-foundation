import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AgentExecutionRecord, OrchestratorRunResult } from './agent-orchestrator.js';
import { runtimePath } from './config.js';
import { redactSecrets, redactSecretText } from './secret-redaction.js';

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
    summary: redactSecretText(record.summary),
    evidence: (record.evidence ?? []).map(redactSecretText),
    fingerprint: record.fingerprint ? redactSecretText(record.fingerprint) : undefined,
    at: record.at,
  };
}

export function buildExecutionReceipt(run: OrchestratorRunResult, completedAt = new Date().toISOString()): ExecutionReceipt {
  return {
    schemaVersion: 1,
    runId: run.runId,
    objective: redactSecretText(run.objective),
    workType: run.workType,
    status: run.status,
    blocker: run.blocker ? redactSecretText(run.blocker) : undefined,
    plan: run.plan.map(redactSecretText),
    steps: run.trace.map(toReceiptStep),
    completedAt,
    replay: {
      objective: redactSecretText(run.objective),
      workType: run.workType,
      plan: run.plan.map(redactSecretText),
      priorFingerprints: run.trace.map(item => item.fingerprint ? redactSecretText(item.fingerprint) : undefined).filter((value): value is string => Boolean(value)),
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

export class ExecutionReceiptStore {
  readonly path: string;

  constructor(path = runtimePath('telemetry', 'execution-receipts.jsonl')) {
    this.path = resolve(path);
  }

  async append(receipt: ExecutionReceipt): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(redactSecrets(receipt))}\n`, 'utf8');
  }

  async list(limit = 100): Promise<ExecutionReceipt[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit must be an integer between 1 and 1000');
    try {
      const rows = (await readFile(this.path, 'utf8')).split(/\r?\n/).filter(Boolean);
      return rows.slice(-limit).map(row => JSON.parse(row) as ExecutionReceipt).reverse();
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
}
