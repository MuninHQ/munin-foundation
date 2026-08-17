import { classifyActionIntent, evaluateAction } from './action-constitution.js';
import { AutonomousExecutionLoop, type AutonomousLoopPolicy, type AutonomousPhaseExecutor, type AutonomousRunResult, type AutonomousStepResult } from './autonomous-execution-loop.js';
import { EngineeringAgentRuntime, type EngineeringResult } from './engineering-runtime.js';

export interface EngineeringMissionRuntime {
  execute(objective: string): Promise<EngineeringResult>;
}

export interface EngineeringAutonomousMissionResult {
  loop: AutonomousRunResult;
  engineering?: EngineeringResult;
}

function failureFingerprint(result: EngineeringResult): string {
  const normalized = result.message.toLowerCase().replace(/\s+/g, ' ').slice(0, 160);
  return `engineering:${result.status}:${normalized}`;
}

export class EngineeringAutonomousMission {
  constructor(
    private readonly runtime: EngineeringMissionRuntime = new EngineeringAgentRuntime(),
    private readonly policy: Partial<AutonomousLoopPolicy> = {},
  ) {}

  async run(objective: string): Promise<EngineeringAutonomousMissionResult> {
    let engineering: EngineeringResult | undefined;

    const executor: AutonomousPhaseExecutor = async context => {
      if (context.phase === 'PLAN') {
        const actionClass = classifyActionIntent(objective, 'local-write');
        const policy = evaluateAction({ class: actionClass, tool: 'engineering.autonomous-mission', target: 'repository', payloadPreview: objective, reason: 'Autonomous engineering mission preflight.' });
        if (policy.decision !== 'allow') {
          return { status: 'BLOCKED', blocker: `Action Constitution ${policy.decision}: ${policy.rule}`, fingerprint: `policy:${policy.rule}` };
        }
        return { status: 'PASS', summary: `Action Constitution allowed ${actionClass}.` };
      }

      if (context.phase === 'BUILD') {
        engineering = await this.runtime.execute(objective);
        if (engineering.status === 'needs_user') {
          return { status: 'BLOCKED', blocker: engineering.message, fingerprint: failureFingerprint(engineering) };
        }
        if (engineering.status === 'failed') {
          return { status: 'FAILED', summary: engineering.message, fingerprint: failureFingerprint(engineering) };
        }
        return { status: 'PASS', summary: engineering.message };
      }

      if (context.phase === 'TEST') {
        if (!engineering) return { status: 'FAILED', summary: 'Engineering runtime produced no result.', fingerprint: 'engineering:no-result' };
        if (engineering.validation?.toLowerCase().includes('passed')) return { status: 'PASS', summary: engineering.validation };
        return { status: 'FAILED', summary: engineering.validation ?? 'Engineering validation evidence is missing.', fingerprint: 'engineering:validation-missing' };
      }

      if (context.phase === 'VERIFY') {
        if (!engineering) return { status: 'FAILED', summary: 'Nothing available to verify.', fingerprint: 'engineering:no-result' };
        if (engineering.status !== 'completed') return { status: 'FAILED', summary: engineering.message, fingerprint: failureFingerprint(engineering) };
        const evidence = [engineering.commit, engineering.pullRequest, engineering.branch, ...engineering.changedFiles].filter(Boolean);
        return { status: 'PASS', summary: evidence.length ? `Engineering delivery verified: ${evidence.join(' · ')}` : 'Engineering objective verified with no repository change required.' };
      }

      if (context.phase === 'FIX') {
        return { status: 'PASS', summary: 'Re-entering the bounded engineering runtime for a fresh repair attempt.' };
      }

      const exhaustive: never = context.phase;
      return exhaustive;
    };

    const loop = new AutonomousExecutionLoop(executor, this.policy);
    const result = await loop.run(objective);
    return { loop: result, engineering };
  }
}

export function summarizeEngineeringMissionStep(result: EngineeringResult): AutonomousStepResult {
  if (result.status === 'needs_user') return { status: 'BLOCKED', blocker: result.message, fingerprint: failureFingerprint(result) };
  if (result.status === 'failed') return { status: 'FAILED', summary: result.message, fingerprint: failureFingerprint(result) };
  return { status: 'PASS', summary: result.message };
}
