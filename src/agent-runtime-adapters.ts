import { appendSessionEvent, hydrateControlRoomState, summarizeHydratedState } from './control-room-state.js';
import { EngineeringAutonomousMission } from './engineering-autonomous-mission.js';
import { OrchestrationRuntimeCore } from './orchestration-runtime-core.js';
import type { AgentExecutionResult, MuninAgentExecutors } from './agent-orchestrator.js';

function completed(summary: string, evidence: string[] = []): AgentExecutionResult {
  return { status: 'completed', summary, evidence };
}

export function createProductionAgentExecutors(root = process.cwd()): MuninAgentExecutors {
  return {
    'product-state-manager': async ({ objective }) => {
      const state = await hydrateControlRoomState(root);
      const summary = summarizeHydratedState(state);
      if (!summary.ready) {
        return { status: 'blocked', summary: 'Canonical Control Room state is incomplete.', blocker: `Missing canonical state: ${summary.missing.join(', ')}`, fingerprint: 'state:missing' };
      }
      return completed('Canonical state hydrated; objective is ready for execution.', [
        `current-state:${summary.currentStateBytes}`,
        `backlog:${summary.backlogBytes}`,
        `session-log:${summary.sessionLogBytes}`,
        `objective:${objective}`,
      ]);
    },

    researcher: async ({ objective, context }) => {
      try {
        const result = await new OrchestrationRuntimeCore().run({ capability: 'research', objective, context });
        return completed(`Research orchestration completed through ${result.providerId}.`, [`provider:${result.providerId}`, `route:${result.plan.route}`]);
      } catch (error) {
        return { status: 'retry', summary: error instanceof Error ? error.message : String(error), fingerprint: 'research:runtime' };
      }
    },

    engineer: async ({ objective }) => {
      const result = await new EngineeringAutonomousMission().run(objective);
      if (result.loop.status === 'BLOCKED') return { status: 'blocked', summary: result.loop.blocker ?? 'Engineering mission blocked.', blocker: result.loop.blocker, fingerprint: 'engineering:blocked' };
      if (result.loop.status !== 'DONE') return { status: 'failed', summary: result.loop.blocker ?? `Engineering mission ended as ${result.loop.status}.`, fingerprint: `engineering:${result.loop.status.toLowerCase()}` };
      const engineering = result.engineering;
      return completed(engineering?.message ?? 'Engineering mission completed.', [engineering?.commit, engineering?.pullRequest, engineering?.branch, ...(engineering?.changedFiles ?? [])].filter((item): item is string => Boolean(item)));
    },

    'qa-verifier': async ({ previousResults }) => {
      const engineering = [...previousResults].reverse().find(item => item.agentId === 'engineer');
      if (!engineering) return { status: 'retry', summary: 'No engineering evidence is available yet.', fingerprint: 'qa:no-engineering-evidence' };
      if (engineering.status !== 'completed') return { status: 'retry', summary: `Engineering is not complete: ${engineering.summary}`, fingerprint: 'qa:engineering-incomplete' };
      if (!(engineering.evidence?.length)) return { status: 'retry', summary: 'Engineering completed without durable verification evidence.', fingerprint: 'qa:evidence-missing' };
      return completed('Independent orchestration gate accepted engineering evidence.', engineering.evidence);
    },

    'memory-curator': async ({ objective, previousResults }) => {
      const evidence = previousResults.flatMap(item => item.evidence ?? []);
      await appendSessionEvent({
        title: 'Multi-agent orchestration completed durable work',
        summary: [`Objective: ${objective}`, `Agents: ${previousResults.map(item => item.agentId).join(' → ')}`, evidence.length ? `Evidence: ${evidence.join(' · ')}` : 'Evidence: no durable artifact emitted.'].join('\n\n'),
      }, root);
      return completed('Durable orchestration event appended to the canonical session log.', [`session-log:${previousResults.length}`]);
    },

    operator: async ({ previousResults }) => {
      const failures = previousResults.filter(item => item.status === 'failed' || item.status === 'blocked');
      if (failures.length) return { status: 'retry', summary: `Operator found ${failures.length} unresolved execution issue(s).`, fingerprint: 'operator:unresolved' };
      return completed('Operational handoff is healthy; no unresolved blocker remains.', [`trace-records:${previousResults.length}`]);
    },
  };
}
