export type MuninAgentId =
  | 'product-state-manager'
  | 'researcher'
  | 'engineer'
  | 'qa-verifier'
  | 'memory-curator'
  | 'operator';

export type MuninWorkType =
  | 'product'
  | 'research'
  | 'engineering'
  | 'verification'
  | 'memory'
  | 'operations'
  | 'mixed';

export type AgentExecutionStatus = 'completed' | 'retry' | 'blocked' | 'failed';
export type OrchestratorRunStatus = 'done' | 'blocked' | 'failed' | 'limit_reached';

export interface MuninAgentDefinition {
  id: MuninAgentId;
  name: string;
  mission: string;
  capabilities: string[];
}

export interface AgentExecutionContext {
  runId: string;
  objective: string;
  workType: MuninWorkType;
  agent: MuninAgentDefinition;
  cycle: number;
  context: Record<string, unknown>;
  previousResults: AgentExecutionRecord[];
}

export interface AgentExecutionResult {
  status: AgentExecutionStatus;
  summary: string;
  blocker?: string;
  evidence?: string[];
  nextAgent?: MuninAgentId;
  fingerprint?: string;
}

export interface AgentExecutionRecord extends AgentExecutionResult {
  agentId: MuninAgentId;
  cycle: number;
  at: string;
}

export type MuninAgentExecutor = (context: AgentExecutionContext) => Promise<AgentExecutionResult>;
export type MuninAgentExecutors = Partial<Record<MuninAgentId, MuninAgentExecutor>>;

export interface OrchestratorPolicy {
  maxCycles: number;
  maxAgentRetries: number;
}

export interface OrchestratorRunResult {
  runId: string;
  objective: string;
  workType: MuninWorkType;
  status: OrchestratorRunStatus;
  plan: MuninAgentId[];
  trace: AgentExecutionRecord[];
  blocker?: string;
}

export interface HumanBlockerDecision {
  humanRequired: boolean;
  category?: 'credential' | '2fa' | 'financial' | 'irreversible' | 'permission' | 'strategic-ambiguity';
  reason: string;
}

export const MUNIN_AGENT_REGISTRY: Record<MuninAgentId, MuninAgentDefinition> = {
  'product-state-manager': {
    id: 'product-state-manager',
    name: 'Munin Product & State Manager',
    mission: 'Translate objectives into executable work, keep durable state current, and select the next highest-value unblocked action.',
    capabilities: ['backlog', 'prioritization', 'acceptance-criteria', 'state-management', 'handoff'],
  },
  researcher: {
    id: 'researcher',
    name: 'Munin Researcher',
    mission: 'Gather evidence, compare alternatives, and turn external or repository intelligence into decision-ready recommendations.',
    capabilities: ['research', 'repository-intelligence', 'benchmarking', 'source-evaluation'],
  },
  engineer: {
    id: 'engineer',
    name: 'Munin Engineer',
    mission: 'Implement approved work using the autonomous PLAN → BUILD → TEST → VERIFY → FIX engineering loop.',
    capabilities: ['code', 'tests', 'refactoring', 'git', 'browser-automation'],
  },
  'qa-verifier': {
    id: 'qa-verifier',
    name: 'Munin QA & Verifier',
    mission: 'Independently verify acceptance criteria, tests, regression risk, and end-to-end evidence before completion.',
    capabilities: ['qa', 'verification', 'regression', 'e2e', 'evidence'],
  },
  'memory-curator': {
    id: 'memory-curator',
    name: 'Munin Memory Curator',
    mission: 'Promote durable project knowledge while separating decisions and evidence from transient conversation.',
    capabilities: ['memory', 'continuity', 'provenance', 'decision-log', 'knowledge-promotion'],
  },
  operator: {
    id: 'operator',
    name: 'Munin Operator',
    mission: 'Operate recurring technical workflows, health checks, delivery state, alerts, and recovery paths.',
    capabilities: ['operations', 'health-check', 'ci', 'runtime', 'recovery', 'observability'],
  },
};

const DEFAULT_POLICY: OrchestratorPolicy = {
  maxCycles: 8,
  maxAgentRetries: 2,
};

function timestamp(): string {
  return new Date().toISOString();
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function inferWorkType(objective: string): MuninWorkType {
  const text = normalize(objective);
  const scores: Record<Exclude<MuninWorkType, 'mixed'>, number> = {
    product: 0,
    research: 0,
    engineering: 0,
    verification: 0,
    memory: 0,
    operations: 0,
  };

  const match = (type: keyof typeof scores, terms: string[]) => {
    for (const term of terms) if (text.includes(term)) scores[type] += 1;
  };

  match('product', ['backlog', 'roadmap', 'prioridade', 'requisito', 'criterio de aceite', 'produto']);
  match('research', ['pesquis', 'github', 'benchmark', 'compare', 'avaliar', 'evidencia externa']);
  match('engineering', ['build', 'implementar', 'codigo', 'code', 'refactor', 'feature', 'bug', 'integrar']);
  match('verification', ['test', 'validar', 'verify', 'qa', 'regress', 'e2e']);
  match('memory', ['memoria', 'contexto', 'continuity', 'historico', 'decision log']);
  match('operations', ['operacao', 'health', 'ci', 'deploy', 'runtime', 'alert', 'recovery']);

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[Exclude<MuninWorkType, 'mixed'>, number]>;
  if (ranked[0][1] === 0) return 'mixed';
  if (ranked[1][1] > 0 && ranked[0][1] === ranked[1][1]) return 'mixed';
  return ranked[0][0];
}

export function buildAgentPlan(workType: MuninWorkType): MuninAgentId[] {
  switch (workType) {
    case 'product':
      return ['product-state-manager', 'memory-curator'];
    case 'research':
      return ['researcher', 'product-state-manager', 'memory-curator'];
    case 'engineering':
      return ['product-state-manager', 'engineer', 'qa-verifier', 'memory-curator', 'operator'];
    case 'verification':
      return ['qa-verifier', 'product-state-manager', 'memory-curator'];
    case 'memory':
      return ['memory-curator', 'product-state-manager'];
    case 'operations':
      return ['operator', 'qa-verifier', 'memory-curator'];
    case 'mixed':
      return ['product-state-manager', 'researcher', 'engineer', 'qa-verifier', 'memory-curator', 'operator'];
  }
}

export function classifyHumanBlocker(blocker: string | undefined): HumanBlockerDecision {
  const text = normalize(blocker ?? '');
  if (!text) return { humanRequired: false, reason: 'No blocker supplied.' };

  const rules: Array<[HumanBlockerDecision['category'], string[], string]> = [
    ['2fa', ['2fa', 'mfa', 'two-factor', 'codigo de verificacao', 'verification code'], 'Interactive second-factor authentication is required.'],
    ['credential', ['senha', 'password', 'secret', 'api key', 'token ausente', 'credential'], 'A credential unavailable to the runtime is required.'],
    ['financial', ['pagamento', 'payment', 'purchase', 'comprar', 'cobranca', 'billing'], 'A financial commitment requires human approval.'],
    ['irreversible', ['irreversivel', 'irreversible', 'delete production', 'apagar producao', 'destroy production'], 'An irreversible high-impact action requires human approval.'],
    ['permission', ['permission denied', 'forbidden', 'sem permissao', 'access denied', 'owner approval'], 'External permission must be granted by a human or system owner.'],
    ['strategic-ambiguity', ['decisao estrategica', 'strategic decision', 'tradeoff sem criterio', 'ambiguous product direction'], 'Material strategic ambiguity cannot be resolved from existing constraints.'],
  ];

  for (const [category, terms, reason] of rules) {
    if (terms.some(term => text.includes(term))) return { humanRequired: true, category, reason };
  }

  return {
    humanRequired: false,
    reason: 'The blocker is not intrinsically human-only; the orchestrator should attempt recovery, rerouting, or another safe method.',
  };
}

function validatePolicy(policy: OrchestratorPolicy): void {
  if (!Number.isInteger(policy.maxCycles) || policy.maxCycles < 1 || policy.maxCycles > 25) throw new Error('maxCycles must be an integer between 1 and 25.');
  if (!Number.isInteger(policy.maxAgentRetries) || policy.maxAgentRetries < 0 || policy.maxAgentRetries > 10) throw new Error('maxAgentRetries must be an integer between 0 and 10.');
}

export class MuninAgentOrchestrator {
  readonly policy: OrchestratorPolicy;

  constructor(
    private readonly executors: MuninAgentExecutors,
    policy: Partial<OrchestratorPolicy> = {},
  ) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    validatePolicy(this.policy);
  }

  async run(objective: string, context: Record<string, unknown> = {}): Promise<OrchestratorRunResult> {
    if (!objective.trim()) throw new Error('Objective is required.');

    const runId = `munin-${Date.now().toString(36)}`;
    const workType = inferWorkType(objective);
    const plan = buildAgentPlan(workType);
    const trace: AgentExecutionRecord[] = [];
    const retries = new Map<MuninAgentId, number>();
    let queue = [...plan];
    let cycles = 0;

    const finish = (status: OrchestratorRunStatus, blocker?: string): OrchestratorRunResult => ({
      runId,
      objective,
      workType,
      status,
      plan,
      trace,
      blocker,
    });

    while (queue.length && cycles < this.policy.maxCycles) {
      cycles += 1;
      const agentId = queue.shift()!;
      const executor = this.executors[agentId];
      if (!executor) {
        trace.push({ agentId, cycle: cycles, status: 'failed', summary: `No executor registered for ${agentId}.`, fingerprint: `executor:${agentId}:missing`, at: timestamp() });
        return finish('failed', `No executor registered for ${agentId}.`);
      }

      let result: AgentExecutionResult;
      try {
        result = await executor({
          runId,
          objective,
          workType,
          agent: MUNIN_AGENT_REGISTRY[agentId],
          cycle: cycles,
          context,
          previousResults: [...trace],
        });
      } catch (error) {
        result = {
          status: 'failed',
          summary: error instanceof Error ? error.message : String(error),
          fingerprint: `exception:${agentId}:${error instanceof Error ? error.name : 'unknown'}`,
        };
      }

      trace.push({ ...result, agentId, cycle: cycles, at: timestamp() });

      if (result.status === 'completed') {
        if (result.nextAgent) queue.unshift(result.nextAgent);
        continue;
      }

      if (result.status === 'blocked') {
        const decision = classifyHumanBlocker(result.blocker ?? result.summary);
        if (decision.humanRequired) return finish('blocked', `${decision.reason} ${result.blocker ?? result.summary}`.trim());
      }

      const retryCount = (retries.get(agentId) ?? 0) + 1;
      retries.set(agentId, retryCount);
      if (retryCount <= this.policy.maxAgentRetries) {
        if (agentId === 'qa-verifier' && plan.includes('engineer')) queue.unshift('engineer', 'qa-verifier');
        else queue.unshift(agentId);
        continue;
      }

      if (result.status === 'blocked') return finish('failed', `Non-human blocker could not be recovered after ${retryCount} attempts: ${result.blocker ?? result.summary}`);
      return finish('failed', result.summary);
    }

    if (queue.length) return finish('limit_reached', 'Maximum orchestration cycles reached before the execution queue was exhausted.');
    return finish('done');
  }
}
