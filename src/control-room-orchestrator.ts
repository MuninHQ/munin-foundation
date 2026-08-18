import { MuninAgentOrchestrator, type OrchestratorRunResult } from './agent-orchestrator.js';
import { createProductionAgentExecutors } from './agent-runtime-adapters.js';
import { hydrateControlRoomState } from './control-room-state.js';

export interface ControlRoomObjective {
  objective: string;
  context?: Record<string, unknown>;
}

export class MuninControlRoomOrchestrator {
  constructor(private readonly root = process.cwd()) {}

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
    return new MuninAgentOrchestrator(createProductionAgentExecutors(this.root)).run(input.objective, context);
  }
}
