import { MuninAgentOrchestrator, type MuninAgentExecutors, type OrchestratorRunResult } from './agent-orchestrator.js';
import { createProductionAgentExecutors } from './agent-runtime-adapters.js';
import { hydrateControlRoomState } from './control-room-state.js';

export interface ControlRoomObjective {
  objective: string;
  context?: Record<string, unknown>;
}

export type ControlRoomExecutorFactory=(root:string)=>MuninAgentExecutors;

export class MuninControlRoomOrchestrator {
  constructor(
    private readonly root = process.cwd(),
    private readonly executorFactory:ControlRoomExecutorFactory=createProductionAgentExecutors,
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
    return new MuninAgentOrchestrator(this.executorFactory(this.root)).run(input.objective, context);
  }
}
