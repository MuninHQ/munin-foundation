import type { MuninState } from './types.js';
import type { OutcomeRecord } from './adaptive-execution.js';
import type { ActionRequest } from './action-constitution.js';
import { ActionAuditLog } from './action-constitution.js';
import { buildGoalEngineSnapshot } from './goal-engine.js';
import { ApprovalQueue, evaluateSentinel, type SentinelDecision } from './sentinel.js';
import { resolveExecutionSandbox, type ExecutionSandboxStatus } from './execution-sandbox.js';

export interface AgentRuntimePlan {
  generatedAt: string;
  goalEngine: ReturnType<typeof buildGoalEngineSnapshot>;
  sentinel: SentinelDecision;
  sandbox?: ExecutionSandboxStatus;
  approvalId?: string;
}

export class AgentRuntimeV1 {
  constructor(
    private readonly audit = new ActionAuditLog(),
    private readonly approvals = new ApprovalQueue(),
  ) {}

  async plan(
    state: MuninState,
    request: ActionRequest,
    outcomes: OutcomeRecord[] = [],
    now = new Date(),
  ): Promise<AgentRuntimePlan> {
    const goalEngine = buildGoalEngineSnapshot(state, outcomes, now);
    const sentinel = evaluateSentinel(request);
    await this.audit.append(sentinel.policy);

    if (sentinel.disposition === 'needs_approval') {
      const approval = await this.approvals.enqueue(sentinel, request.reason);
      return { generatedAt: now.toISOString(), goalEngine, sentinel, approvalId: approval.id };
    }

    if (sentinel.disposition === 'guarded_execute') {
      const sandbox = await resolveExecutionSandbox({ policy: 'auto' });
      return { generatedAt: now.toISOString(), goalEngine, sentinel, sandbox: sandbox.status };
    }

    return { generatedAt: now.toISOString(), goalEngine, sentinel };
  }
}
