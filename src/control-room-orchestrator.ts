import { MuninAgentOrchestrator, type MuninAgentExecutors, type OrchestratorRunResult } from './agent-orchestrator.js';
import { createProductionAgentExecutors } from './agent-runtime-adapters.js';
import { ControlPlaneExecutionTracker } from './control-plane-execution-tracker.js';
import { ControlPlaneRuntimeStore } from './control-plane-runtime-store.js';
import { hydrateControlRoomState } from './control-room-state.js';

export interface ControlRoomObjective {
  objective: string;
  context?: Record<string, unknown>;
}

export type ControlRoomExecutorFactory=(root:string)=>MuninAgentExecutors;

function trackingEnabledFromEnv(): boolean {
  return ['1', 'true', 'yes'].includes((process.env.MUNIN_CONTROL_PLANE_TRACKING ?? '').toLowerCase());
}

function trackedExecutors(executors: MuninAgentExecutors, tracker: ControlPlaneExecutionTracker): MuninAgentExecutors {
  const tracked: MuninAgentExecutors = {};
  for (const agentId of Object.keys(executors) as Array<keyof MuninAgentExecutors>) {
    const executor = executors[agentId];
    if (!executor) continue;
    tracked[agentId] = async (context) => {
      await tracker.beforeAgent(context);
      try {
        const result = await executor(context);
        await tracker.afterAgent(context, result);
        return result;
      } catch (error) {
        await tracker.afterAgent(context, {
          status: 'failed',
          summary: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };
  }
  return tracked;
}

export class MuninControlRoomOrchestrator {
  constructor(
    private readonly root = process.cwd(),
    private readonly executorFactory:ControlRoomExecutorFactory=createProductionAgentExecutors,
    private readonly controlPlaneTracking = trackingEnabledFromEnv(),
  ) {}

  async execute(input: ControlRoomObjective): Promise<OrchestratorRunResult> {
    if (!input.objective.trim()) throw new Error('Objective is required.');
    const state = await hydrateControlRoomState(this.root);
    const context = {
      ...(input.context ?? {}),
      canonicalState: {
        currentState: state.currentState,
        backlog: state.backlog,
        sessionLog: state.sessionLog,
        missing: state.missing,
      },
    };

    const baseExecutors = this.executorFactory(this.root);
    if (!this.controlPlaneTracking) return new MuninAgentOrchestrator(baseExecutors).run(input.objective, context);

    const tracker = new ControlPlaneExecutionTracker(new ControlPlaneRuntimeStore(this.root), input.objective);
    const result = await new MuninAgentOrchestrator(trackedExecutors(baseExecutors, tracker)).run(input.objective, context);
    await tracker.finish(result);
    return result;
  }
}
