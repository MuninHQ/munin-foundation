export type AutonomousPhase = 'PLAN' | 'BUILD' | 'TEST' | 'VERIFY' | 'FIX';
export type AutonomousStepStatus = 'PASS' | 'RETRY' | 'BLOCKED' | 'FAILED';
export type AutonomousRunStatus = 'DONE' | 'BLOCKED' | 'FAILED' | 'LIMIT_REACHED';

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

export class AutonomousExecutionLoop {
  readonly policy: AutonomousLoopPolicy;

  constructor(
    private readonly executor: AutonomousPhaseExecutor,
    policy: Partial<AutonomousLoopPolicy> = {},
  ) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    validatePolicy(this.policy);
  }

  async run(objective: string): Promise<AutonomousRunResult> {
    if (!objective.trim()) throw new Error('Objective is required.');

    const runId = `auto-${Date.now().toString(36)}`;
    const startedAt = timestamp();
    const trace: AutonomousTraceEvent[] = [];
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
      blocker,
    });

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

    for (let iteration = 1; iteration <= this.policy.maxIterations; iteration += 1) {
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

      if (!needsFix) return finish('DONE', iteration);

      const fixResult = await execute(iteration, 'FIX');
      const stopped = checkStop(fixResult, iteration);
      if (stopped) return stopped;
      if (fixResult.status === 'BLOCKED') return finish('BLOCKED', iteration, fixResult.blocker);
    }

    return finish('LIMIT_REACHED', this.policy.maxIterations, 'Maximum autonomous iterations reached.');
  }
}
