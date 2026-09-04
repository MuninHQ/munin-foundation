import { BaseAwareEngineeringAgentAdapter } from './base-aware-engineering-adapter.js';
import type { BuildAllPlan, BuildAllVerificationResult } from './build-all-wave-runtime.js';
import { planParallelAgentWaves, type ParallelAgentWavePlan } from './parallel-agent-waves.js';
import { ProductionBuildAllPlanner, type ProductionBuildAllPlannerLike } from './production-build-all-planner.js';
import {
  GitProductionBuildAllVerifier,
  type ProductionBuildAllVerifierLike,
} from './production-build-all-verifier.js';
import {
  ReconciledWaveEngineeringRuntime,
  type ReconciledWaveEngineeringResult,
} from './reconciled-wave-engineering.js';

export type ProductionBuildAllStatus = 'DONE' | 'BLOCKED' | 'FAILED';

export interface ProductionBuildAllRunResult {
  objective: string;
  status: ProductionBuildAllStatus;
  plan?: BuildAllPlan;
  wavePlan?: ParallelAgentWavePlan;
  engineering?: ReconciledWaveEngineeringResult;
  verification?: BuildAllVerificationResult;
  blocker?: string;
}

export interface ProductionWaveEngineeringLike {
  run(objective: string, plan: ParallelAgentWavePlan, baseRef?: string): Promise<ReconciledWaveEngineeringResult>;
}

export class ProductionBuildAllRuntime {
  constructor(
    private readonly planner: ProductionBuildAllPlannerLike = new ProductionBuildAllPlanner(),
    private readonly engineering: ProductionWaveEngineeringLike = new ReconciledWaveEngineeringRuntime(new BaseAwareEngineeringAgentAdapter()),
    private readonly verifier: ProductionBuildAllVerifierLike = new GitProductionBuildAllVerifier(),
  ) {}

  async run(objective: string, baseRef = 'main'): Promise<ProductionBuildAllRunResult> {
    if (!objective.trim()) throw new Error('BUILD ALL objective is required.');

    let plan: BuildAllPlan;
    try {
      plan = await this.planner.plan(objective);
    } catch (error) {
      return {
        objective,
        status: 'FAILED',
        blocker: `Production planning failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    let wavePlan: ParallelAgentWavePlan;
    try {
      wavePlan = planParallelAgentWaves(plan.tasks);
    } catch (error) {
      return {
        objective,
        status: 'FAILED',
        plan,
        blocker: `Production wave planning failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const engineering = await this.engineering.run(objective, wavePlan, baseRef);
    if (engineering.status === 'blocked') {
      return {
        objective,
        status: 'BLOCKED',
        plan,
        wavePlan,
        engineering,
        blocker: engineering.blocker ?? 'Production engineering blocked.',
      };
    }
    if (engineering.status === 'failed' || !engineering.integrationHead) {
      return {
        objective,
        status: 'FAILED',
        plan,
        wavePlan,
        engineering,
        blocker: engineering.blocker ?? 'Production engineering did not produce an integrated head.',
      };
    }

    let verification: BuildAllVerificationResult;
    try {
      verification = await this.verifier.verify({ objective, plan, integrationHead: engineering.integrationHead });
    } catch (error) {
      verification = {
        status: 'FAILED',
        summary: `Independent final verification failed closed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (verification.status === 'BLOCKED') {
      return {
        objective,
        status: 'BLOCKED',
        plan,
        wavePlan,
        engineering,
        verification,
        blocker: verification.blocker ?? verification.summary,
      };
    }
    if (verification.status !== 'PASS') {
      return {
        objective,
        status: 'FAILED',
        plan,
        wavePlan,
        engineering,
        verification,
        blocker: verification.blocker ?? verification.summary,
      };
    }

    const evidence = verification.evidence?.filter(item => item.trim()) ?? [];
    if (evidence.length === 0) {
      return {
        objective,
        status: 'FAILED',
        plan,
        wavePlan,
        engineering,
        verification: { ...verification, status: 'FAILED', summary: `${verification.summary} No evidence was supplied.` },
        blocker: 'BUILD ALL final verification requires durable evidence.',
      };
    }

    return { objective, status: 'DONE', plan, wavePlan, engineering, verification };
  }
}
