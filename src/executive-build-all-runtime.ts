import { ExecutiveCheckpointStore, type ExecutivePhase } from './executive-checkpoint.js';
import { premiumBudgetFromEnv, routeModel, withModelRoute, type ModelRoute, type RoutingSignals } from './model-router.js';
import { ProductionBuildAllRuntime, type ProductionBuildAllRunResult } from './production-build-all-runtime.js';
import { commitAfterTask, recallBeforeTask } from './second-brain.js';

export type ExecutiveLifecycleEvent = {
  phase: ExecutivePhase;
  status: 'completed' | 'degraded' | 'blocked' | 'failed';
  summary: string;
};

export type ExecutiveBuildAllResult = ProductionBuildAllRunResult & {
  executive: {
    route: ModelRoute;
    signals: RoutingSignals;
    lifecycle: ExecutiveLifecycleEvent[];
    checkpointId: string;
    resumed: boolean;
  };
};

export interface BuildAllCoreLike {
  run(objective: string, baseRef?: string): Promise<ProductionBuildAllRunResult>;
}

function scoreObjective(objective: string): RoutingSignals {
  const text = objective.toLowerCase();
  const highImpact = /build all|production|deploy|release|architecture|migration|security|critical|p0/.test(text);
  const complex = /integrat|refactor|debug|repair|multi|workflow|runtime|agent|autonom|browser|computer|remote/.test(text);
  const toolHeavy = /browser|computer|remote|github|deploy|install|configure|test|build|runtime/.test(text);
  return {
    impact: highImpact ? 8 : 6,
    complexity: complex ? 8 : 6,
    toolUse: toolHeavy ? 8 : 5,
    autonomy: /build all|autonom|resolve|end-to-end|end to end/.test(text) ? 9 : 6,
    risk: /delete|secret|credential|payment|production data/.test(text) ? 9 : 4,
  };
}

function challengeObjective(objective: string) {
  const warnings: string[] = [];
  if (/install|add repository|new repo/.test(objective.toLowerCase())) warnings.push('Prefer selective incorporation over adding a redundant dependency or repository.');
  if (/rewrite|replace everything|from scratch/.test(objective.toLowerCase())) warnings.push('Preserve proven components unless replacement has explicit evidence and lower total cost.');
  return warnings;
}

export class ExecutiveBuildAllRuntime {
  constructor(
    private readonly core: BuildAllCoreLike = new ProductionBuildAllRuntime(),
    private readonly checkpoints = new ExecutiveCheckpointStore(),
  ) {}

  async run(objective: string, baseRef = 'main'): Promise<ExecutiveBuildAllResult> {
    const cleanObjective = objective.trim();
    if (!cleanObjective) throw new Error('BUILD ALL objective is required.');
    const lifecycle: ExecutiveLifecycleEvent[] = [];
    const existing = await this.checkpoints.load(cleanObjective);
    const resumed = Boolean(existing && existing.status !== 'done');

    let recallSummary = 'Second Brain recall completed.';
    try {
      const recall = await recallBeforeTask({ task: cleanObjective, project: 'munin' });
      recallSummary = `Second Brain recalled ${recall.context.matches.length} context matches and ${recall.vault.matches.length} vault matches.`;
      lifecycle.push({ phase: 'UNDERSTAND', status: 'completed', summary: recallSummary });
    } catch (error) {
      recallSummary = `Second Brain recall degraded: ${error instanceof Error ? error.message : String(error)}`;
      lifecycle.push({ phase: 'UNDERSTAND', status: 'degraded', summary: recallSummary });
    }
    let checkpoint = await this.checkpoints.advance(cleanObjective, 'UNDERSTAND', { status: 'running', summary: recallSummary });

    const warnings = challengeObjective(cleanObjective);
    const challengeSummary = warnings.length ? warnings.join(' ') : 'Objective passed independent challenge gate; no material redundancy or needless rewrite signal detected.';
    lifecycle.push({ phase: 'CHALLENGE', status: 'completed', summary: challengeSummary });
    checkpoint = await this.checkpoints.advance(cleanObjective, 'CHALLENGE', { summary: challengeSummary });

    const signals = scoreObjective(cleanObjective);
    const route = routeModel(signals, premiumBudgetFromEnv());
    lifecycle.push({ phase: 'PLAN', status: 'completed', summary: `${route.tier.toUpperCase()} route selected. ${route.reason}` });
    checkpoint = await this.checkpoints.advance(cleanObjective, 'PLAN', { route, summary: route.reason });

    lifecycle.push({ phase: 'EXECUTE', status: 'completed', summary: 'Delegated to governed ProductionBuildAllRuntime with durable side-effect protections.' });
    checkpoint = await this.checkpoints.advance(cleanObjective, 'EXECUTE', { route });
    const result = await withModelRoute(route, () => this.core.run(cleanObjective, baseRef));

    const verifyStatus = result.status === 'DONE' ? 'completed' : result.status === 'BLOCKED' ? 'blocked' : 'failed';
    const verifySummary = result.verification?.summary ?? result.blocker ?? `BUILD ALL finished with ${result.status}.`;
    lifecycle.push({ phase: 'VERIFY', status: verifyStatus, summary: verifySummary });
    checkpoint = await this.checkpoints.advance(cleanObjective, 'VERIFY', {
      route,
      status: result.status === 'DONE' ? 'running' : result.status === 'BLOCKED' ? 'blocked' : 'failed',
      blocker: result.blocker,
      summary: verifySummary,
    });

    let rememberStatus: ExecutiveLifecycleEvent['status'] = 'completed';
    let rememberSummary = 'Outcome committed to Second Brain.';
    try {
      await commitAfterTask({
        task: cleanObjective,
        project: 'munin',
        summary: verifySummary,
        decisions: [`Model route: ${route.tier}. ${route.reason}`],
        changed: result.engineering?.changedFiles,
        nextSteps: result.status === 'DONE' ? [] : [result.blocker ?? 'Resume from the durable executive checkpoint.'],
        failed: result.status === 'FAILED' ? [result.blocker ?? verifySummary] : [],
        tags: ['executive', 'build-all', result.status.toLowerCase()],
      });
    } catch (error) {
      rememberStatus = 'degraded';
      rememberSummary = `Core result preserved, but Second Brain commit degraded: ${error instanceof Error ? error.message : String(error)}`;
    }
    lifecycle.push({ phase: 'REMEMBER', status: rememberStatus, summary: rememberSummary });
    checkpoint = await this.checkpoints.advance(cleanObjective, 'REMEMBER', {
      route,
      status: result.status === 'DONE' ? 'done' : result.status === 'BLOCKED' ? 'blocked' : 'failed',
      blocker: result.blocker,
      summary: rememberSummary,
    });

    return {
      ...result,
      executive: { route, signals, lifecycle, checkpointId: checkpoint.id, resumed },
    };
  }
}
