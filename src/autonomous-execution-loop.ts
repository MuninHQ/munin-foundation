export type AutonomousPhase = 'PLAN' | 'BUILD' | 'TEST' | 'VERIFY' | 'FIX';
export type AutonomousStepStatus = 'PASS' | 'RETRY' | 'BLOCKED' | 'FAILED';
export type AutonomousRunStatus = 'DONE' | 'BLOCKED' | 'FAILED' | 'LIMIT_REACHED';
export type AutonomousCompletionDecision = 'CONTINUE' | 'COMPLETE' | 'BLOCKED' | 'ESCALATE';

export interface AutonomousStepResult {
  status: AutonomousStepStatus;
  summary?: string;
  blocker?: string;
  fingerprint?: string;
}

export interface AutonomousLoopContext {
  runId: string;
  objective: string;
  iteration: number;
  phase: AutonomousPhase;
  previous?: AutonomousStepResult;
}

export type AutonomousPhaseExecutor = (context: AutonomousLoopContext) => Promise<AutonomousStepResult>;

export interface AutonomousLoopPolicy {
  maxIterations: number;
  maxRepeatedFailureFingerprints: number;
}

export interface CompletionContract {
  criteria: string[];
  minimumEvidenceItems?: number;
  maxDurationMs?: number;
}

export interface AutonomousCompletionEvaluation {
  decision: AutonomousCompletionDecision;
  summary?: string;
  evidence?: string[];
  blocker?: string;
}

export interface AutonomousCompletionContext {
  runId: string;
  objective: string;
  iteration: number;
  contract: CompletionContract;
  trace: readonly AutonomousTraceEvent[];
}

export type AutonomousCompletionEvaluator = (
  context: AutonomousCompletionContext,
) => Promise<AutonomousCompletionEvaluation>;

export interface AutonomousCompletionConfig {
  contract: CompletionContract;
  evaluator?: AutonomousCompletionEvaluator;
}

export interface AutonomousCompletionTraceEvent extends AutonomousCompletionEvaluation {
  iteration: number;
  at: string;
}

export interface AutonomousTraceEvent {
  iteration: number;
  phase: AutonomousPhase;
  status: AutonomousStepStatus;
  at: string;
  summary?: string;
  blocker?: string;
  fingerprint?: string;
}

export interface AutonomousRunResult {
  runId: string;
  objective: string;
  status: AutonomousRunStatus;
  iterations: number;
  startedAt: string;
  finishedAt: string;
  trace: AutonomousTraceEvent[];
  completionEvaluations?: AutonomousCompletionTraceEvent[];
  blocker?: string;
}

const DEFAULT_POLICY: AutonomousLoopPolicy = {
  maxIterations: 5,
  maxRepeatedFailureFingerprints: 2,
};

function timestamp(): string {
  return new Date().toISOString();
}

function validatePolicy(policy: AutonomousLoopPolicy): void {
  if (!Number.isInteger(policy.maxIterations) || policy.maxIterations < 1 || policy.maxIterations > 25) {
    throw new Error('maxIterations must be an integer between 1 and 25.');
  }
  if (!Number.isInteger(policy.maxRepeatedFailureFingerprints) || policy.maxRepeatedFailureFingerprints < 1 || policy.maxRepeatedFailureFingerprints > 10) {
    throw new Error('maxRepeatedFailureFingerprints must be an integer between 1 and 10.');
  }
}

function validateCompletionContract(contract: CompletionContract): void {
  if (!Array.isArray(contract.criteria) || contract.criteria.length === 0 || contract.criteria.some(item => !item.trim())) {
    throw new Error('Completion contract requires at least one non-empty criterion.');
  }
  if (contract.minimumEvidenceItems !== undefined && (!Number.isInteger(contract.minimumEvidenceItems) || contract.minimumEvidenceItems < 0 || contract.minimumEvidenceItems > 100)) {
    throw new Error('minimumEvidenceItems must be an integer between 0 and 100.');
  }
  if (contract.maxDurationMs !== undefined && (!Number.isFinite(contract.maxDurationMs) || contract.maxDurationMs < 1)) {
    throw new Error('maxDurationMs must be a positive number.');
  }
}

export class AutonomousExecutionLoop {
  readonly policy: AutonomousLoopPolicy;

  constructor(
    private readonly executor: AutonomousPhaseExecutor,
    policy: Partial<AutonomousLoopPolicy> = {},
    private readonly completion?: AutonomousCompletionConfig,
  ) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    validatePolicy(this.policy);
    if (this.completion) validateCompletionContract(this.completion.contract);
  }

  async run(objective: string): Promise<AutonomousRunResult> {
    if (!objective.trim()) throw new Error('Objective is required.');

    const runId = `auto-${Date.now().toString(36)}`;
    const startedAt = timestamp();
    const startedAtMs = Date.now();
    const trace: AutonomousTraceEvent[] = [];
    const completionEvaluations: AutonomousCompletionTraceEvent[] = [];
    const failures = new Map<string, number>();
    let previous: AutonomousStepResult | undefined;

    const execute = async (iteration: number, phase: AutonomousPhase): Promise<AutonomousStepResult> => {
      let result: AutonomousStepResult;
      try {
        result = await this.executor({ runId, objective, iteration, phase, previous });
      } catch (error) {
        result = {
          status: 'FAILED',
          summary: error instanceof Error ? error.message : String(error),
          fingerprint: `exception:${error instanceof Error ? error.name : 'unknown'}`,
        };
      }
      trace.push({ iteration, phase, status: result.status, at: timestamp(), summary: result.summary, blocker: result.blocker, fingerprint: result.fingerprint });
      previous = result;
      return result;
    };

    const finish = (status: AutonomousRunStatus, iterations: number, blocker?: string): AutonomousRunResult => ({
      runId,
      objective,
      status,
      iterations,
      startedAt,
      finishedAt: timestamp(),
      trace,
      completionEvaluations: completionEvaluations.length > 0 ? completionEvaluations : undefined,
      blocker,
    });

    const durationLimitReached = (): boolean => {
      const maxDurationMs = this.completion?.contract.maxDurationMs;
      return maxDurationMs !== undefined && Date.now() - startedAtMs >= maxDurationMs;
    };

    const checkStop = (result: AutonomousStepResult, iteration: number): AutonomousRunResult | undefined => {
      if (result.status === 'BLOCKED') return finish('BLOCKED', iteration, result.blocker ?? result.summary ?? 'Human action required.');
      if (result.status === 'FAILED' && result.fingerprint) {
        const count = (failures.get(result.fingerprint) ?? 0) + 1;
        failures.set(result.fingerprint, count);
        if (count >= this.policy.maxRepeatedFailureFingerprints) {
          return finish('FAILED', iteration, `Repeated failure threshold reached: ${result.fingerprint}`);
        }
      }
      return undefined;
    };

    const evaluateCompletion = async (iteration: number): Promise<AutonomousRunResult | undefined> => {
      if (!this.completion) return finish('DONE', iteration);
      if (!this.completion.evaluator) {
        return finish('FAILED', iteration, 'Completion contract configured without an independent evaluator.');
      }

      let evaluation: AutonomousCompletionEvaluation;
      try {
        evaluation = await this.completion.evaluator({
          runId,
          objective,
          iteration,
          contract: this.completion.contract,
          trace,
        });
      } catch (error) {
        evaluation = {
          decision: 'CONTINUE',
          summary: `Completion evaluator failed closed: ${error instanceof Error ? error.message : String(error)}`,
          evidence: [],
        };
      }

      const requiredEvidence = this.completion.contract.minimumEvidenceItems ?? 1;
      const evidenceCount = evaluation.evidence?.filter(item => item.trim()).length ?? 0;
      if (evaluation.decision === 'COMPLETE' && evidenceCount < requiredEvidence) {
        evaluation = {
          ...evaluation,
          decision: 'CONTINUE',
          summary: `${evaluation.summary ? `${evaluation.summary} ` : ''}Completion rejected: ${evidenceCount}/${requiredEvidence} required evidence items supplied.`,
        };
      }

      completionEvaluations.push({ ...evaluation, iteration, at: timestamp() });

      if (evaluation.decision === 'COMPLETE') return finish('DONE', iteration);
      if (evaluation.decision === 'BLOCKED') return finish('BLOCKED', iteration, evaluation.blocker ?? evaluation.summary ?? 'Completion evaluator reported a blocker.');
      if (evaluation.decision === 'ESCALATE') return finish('BLOCKED', iteration, evaluation.blocker ?? evaluation.summary ?? 'Independent evaluator requested escalation.');
      return undefined;
    };

    for (let iteration = 1; iteration <= this.policy.maxIterations; iteration += 1) {
      if (durationLimitReached()) return finish('LIMIT_REACHED', iteration - 1, 'Maximum autonomous duration reached.');

      let needsFix = false;
      for (const phase of ['PLAN', 'BUILD', 'TEST', 'VERIFY'] as const) {
        const result = await execute(iteration, phase);
        const stopped = checkStop(result, iteration);
        if (stopped) return stopped;
        if (result.status !== 'PASS') {
          needsFix = true;
          break;
        }
      }

      if (!needsFix) {
        const completionResult = await evaluateCompletion(iteration);
        if (completionResult) return completionResult;
        if (durationLimitReached()) return finish('LIMIT_REACHED', iteration, 'Maximum autonomous duration reached.');
        continue;
      }

      const fixResult = await execute(iteration, 'FIX');
      const stopped = checkStop(fixResult, iteration);
      if (stopped) return stopped;
    }

    return finish('LIMIT_REACHED', this.policy.maxIterations, 'Maximum autonomous iterations reached.');
  }
}
