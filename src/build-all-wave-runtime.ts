import {
  executeParallelAgentWaves,
  planParallelAgentWaves,
  type ParallelAgentExecutionResult,
  type ParallelAgentTask,
  type ParallelAgentTaskResult,
  type ParallelAgentTaskRunner,
  type ParallelAgentWavePlan,
} from './parallel-agent-waves.js';

export type BuildAllRunStatus = 'DONE' | 'BLOCKED' | 'FAILED';
export type BuildAllVerificationStatus = 'PASS' | 'BLOCKED' | 'FAILED';

export interface BuildAllPlan {
  objective: string;
  tasks: ParallelAgentTask[];
  completionCriteria: string[];
}

export interface BuildAllVerificationResult {
  status: BuildAllVerificationStatus;
  summary: string;
  evidence?: string[];
  blocker?: string;
}

export interface BuildAllVerificationContext {
  plan: BuildAllPlan;
  wavePlan: ParallelAgentWavePlan;
  execution: ParallelAgentExecutionResult;
}

export type BuildAllPlanner = (objective: string) => Promise<BuildAllPlan>;
export type BuildAllVerifier = (context: BuildAllVerificationContext) => Promise<BuildAllVerificationResult>;

export interface BuildAllRunResult {
  objective: string;
  status: BuildAllRunStatus;
  wavePlan?: ParallelAgentWavePlan;
  taskResults: ParallelAgentTaskResult[];
  verification?: BuildAllVerificationResult;
  blocker?: string;
}

function validatePlan(plan: BuildAllPlan, objective: string): void {
  if (!plan.objective.trim()) throw new Error('BUILD ALL plan objective is required.');
  if (plan.objective.trim() !== objective.trim()) throw new Error('BUILD ALL plan objective must match the requested objective.');
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) throw new Error('BUILD ALL plan requires at least one task.');
  if (!Array.isArray(plan.completionCriteria) || plan.completionCriteria.length === 0) {
    throw new Error('BUILD ALL plan requires at least one completion criterion.');
  }
  if (plan.completionCriteria.some(criterion => !criterion.trim())) {
    throw new Error('BUILD ALL completion criteria must be non-empty.');
  }
}

function failResult(objective: string, blocker: string): BuildAllRunResult {
  return { objective, status: 'FAILED', taskResults: [], blocker };
}

export class BuildAllWaveRuntime {
  constructor(
    private readonly planner: BuildAllPlanner,
    private readonly taskRunner: ParallelAgentTaskRunner,
    private readonly verifier: BuildAllVerifier,
  ) {}

  async run(objective: string): Promise<BuildAllRunResult> {
    if (!objective.trim()) throw new Error('BUILD ALL objective is required.');

    let plan: BuildAllPlan;
    try {
      plan = await this.planner(objective);
      validatePlan(plan, objective);
    } catch (error) {
      return failResult(objective, `Planning failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    let wavePlan: ParallelAgentWavePlan;
    try {
      wavePlan = planParallelAgentWaves(plan.tasks);
    } catch (error) {
      return failResult(objective, `Wave planning failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const execution = await executeParallelAgentWaves(wavePlan, this.taskRunner);
    if (execution.status === 'BLOCKED') {
      return {
        objective,
        status: 'BLOCKED',
        wavePlan,
        taskResults: execution.results,
        blocker: execution.blocker ?? 'BUILD ALL task execution blocked.',
      };
    }
    if (execution.status === 'FAILED') {
      return {
        objective,
        status: 'FAILED',
        wavePlan,
        taskResults: execution.results,
        blocker: execution.blocker ?? 'BUILD ALL task execution failed.',
      };
    }

    let verification: BuildAllVerificationResult;
    try {
      verification = await this.verifier({ plan, wavePlan, execution });
    } catch (error) {
      verification = {
        status: 'FAILED',
        summary: `Independent verification failed closed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (verification.status === 'BLOCKED') {
      return {
        objective,
        status: 'BLOCKED',
        wavePlan,
        taskResults: execution.results,
        verification,
        blocker: verification.blocker ?? verification.summary,
      };
    }

    if (verification.status === 'FAILED') {
      return {
        objective,
        status: 'FAILED',
        wavePlan,
        taskResults: execution.results,
        verification,
        blocker: verification.blocker ?? verification.summary,
      };
    }

    const evidenceCount = verification.evidence?.filter(item => item.trim()).length ?? 0;
    if (evidenceCount === 0) {
      return {
        objective,
        status: 'FAILED',
        wavePlan,
        taskResults: execution.results,
        verification: {
          ...verification,
          status: 'FAILED',
          summary: `${verification.summary} Verification supplied no evidence.`,
        },
        blocker: 'BUILD ALL completion requires independent verification evidence.',
      };
    }

    return {
      objective,
      status: 'DONE',
      wavePlan,
      taskResults: execution.results,
      verification,
    };
  }
}
