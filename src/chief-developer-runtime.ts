import { decideByConsensus, zeroCostGate, type CommitteeOpinion, type CostGateInput, type CommitteeDecision } from './consensus-committee.js';
import { runWorkGraph, type WorkLane, type WorkLaneExecutor, type SchedulerResult } from './chief-developer-scheduler.js';
import type { BlockerCategory, BlockerDisposition } from './blocker-ledger.js';
import { JsonBlockerLedger } from './json-blocker-ledger.js';
import { buildAgentScorecard, type AgentOutcomeSample, type AgentScorecard } from './agent-scorecards.js';
import { runtimePath } from './config.js';

export type ChiefDeveloperStatus = 'completed' | 'partial' | 'blocked' | 'failed' | 'needs_revision';

export interface ChiefDeveloperRunInput {
  objective: string;
  lanes: WorkLane[];
  opinions: CommitteeOpinion[];
  cost?: CostGateInput;
  maxParallel?: number;
}

export interface ChiefDeveloperRunResult {
  objective: string;
  status: ChiefDeveloperStatus;
  committee: CommitteeDecision;
  scheduler?: SchedulerResult;
  scorecard?: AgentScorecard;
  blockerIds: string[];
}

function blockerCategory(lane: WorkLane): BlockerCategory {
  if (lane.kind === 'device') return 'device';
  if (lane.kind === 'cloud') return 'cloud';
  return 'repository';
}

function blockerDisposition(lane: WorkLane): BlockerDisposition {
  return lane.kind === 'device' ? 'defer' : 'reroute';
}

export class ChiefDeveloperRuntime {
  constructor(
    private readonly executor: WorkLaneExecutor,
    private readonly blockers: JsonBlockerLedger = new JsonBlockerLedger(runtimePath('chief-developer-blockers.json')),
  ) {}

  async run(input: ChiefDeveloperRunInput): Promise<ChiefDeveloperRunResult> {
    if (!input.objective.trim()) throw new Error('Objective is required.');
    if (!input.lanes.length) throw new Error('At least one work lane is required.');

    const costOpinion = zeroCostGate(input.cost ?? {});
    const committee = decideByConsensus([...input.opinions, costOpinion]);
    if (committee.outcome === 'block') return { objective: input.objective, status: 'blocked', committee, blockerIds: [] };
    if (committee.outcome === 'revise') return { objective: input.objective, status: 'needs_revision', committee, blockerIds: [] };

    const scheduler = await runWorkGraph(input.lanes, this.executor, { maxParallel: input.maxParallel });
    const blockerIds: string[] = [];

    for (const result of scheduler.deferred) {
      const lane = input.lanes.find(item => item.id === result.laneId)!;
      const id = `chief:${result.laneId}:${blockerCategory(lane)}`;
      await this.blockers.add({
        id,
        laneId: lane.id,
        category: blockerCategory(lane),
        disposition: blockerDisposition(lane),
        reason: result.blocker ?? result.summary,
        evidence: result.evidence,
      });
      blockerIds.push(id);
    }

    const samples: AgentOutcomeSample[] = [
      ...scheduler.completed.map(result => ({ agentId: 'chief-developer', completed: true, evidenceCount: result.evidence?.length ?? 0, retries: 0 })),
      ...scheduler.deferred.map(result => ({ agentId: 'chief-developer', completed: false, evidenceCount: result.evidence?.length ?? 0, retries: 0, humanEscalation: input.lanes.find(l => l.id === result.laneId)?.kind === 'device' })),
      ...scheduler.failed.map(result => ({ agentId: 'chief-developer', completed: false, evidenceCount: result.evidence?.length ?? 0, retries: 1, defectEscaped: false })),
    ];
    const scorecard = buildAgentScorecard('chief-developer', samples);

    const status: ChiefDeveloperStatus = scheduler.status === 'done' ? 'completed' : scheduler.status === 'partial' ? 'partial' : 'failed';
    return { objective: input.objective, status, committee, scheduler, scorecard, blockerIds };
  }
}
