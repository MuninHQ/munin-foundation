import { resolve } from 'node:path';
import { MuninAgentOrchestrator, type MuninAgentExecutors, type OrchestratorRunResult } from './agent-orchestrator.js';
import { AgentTelemetry, JsonlAgentTelemetrySink } from './agent-telemetry.js';
import { createProductionAgentExecutors } from './agent-runtime-adapters.js';
import { ControlPlaneExecutionTracker } from './control-plane-execution-tracker.js';
import { ControlPlaneRuntimeStore } from './control-plane-runtime-store.js';
import { hydrateControlRoomState } from './control-room-state.js';
import { buildExecutionReceipt, ExecutionReceiptStore } from './execution-receipts.js';
import { instrumentAgentExecutors } from './orchestrator-observability.js';

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

    const runtimeRoot = resolve(this.root, process.env.MUNIN_DATA_DIR ?? 'data/runtime');
    const telemetry = new AgentTelemetry(new JsonlAgentTelemetrySink(resolve(runtimeRoot, 'telemetry/agent-events.jsonl')));
    const receiptStore = new ExecutionReceiptStore(resolve(runtimeRoot, 'telemetry/execution-receipts.jsonl'));
    const tracker = this.controlPlaneTracking ? new ControlPlaneExecutionTracker(new ControlPlaneRuntimeStore(this.root), input.objective) : undefined;
    const baseExecutors = this.executorFactory(this.root);
    const observableExecutors = instrumentAgentExecutors(tracker ? trackedExecutors(baseExecutors, tracker) : baseExecutors, telemetry);
    const result = await new MuninAgentOrchestrator(observableExecutors).run(input.objective, context);
    if (tracker) await tracker.finish(result);
    const receipt = buildExecutionReceipt(result);
    telemetry.emit({ name: 'run.completed', runId: result.runId, outcome: result.status, evidence: result.trace.flatMap(item => item.evidence ?? []), metadata: { workType: result.workType, steps: result.trace.length, blocker: result.blocker } });
    try { await receiptStore.append(receipt); } catch { /* observability must never break objective execution */ }
    await telemetry.flush();
    return result;
  }
}
