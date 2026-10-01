import { RuntimeCapabilityRegistry } from './runtime-capability-seam.js';
import { registerAutomatonLocalCapability } from './automaton-local-capability.js';
import type { OrchestrationInput } from './intelligence-orchestration.js';
import type { ProviderResponse } from './providers.js';

export interface AutomatonBridgeTransport {
  health(): Promise<any>;
  submit(objective: string): Promise<any>;
  status(taskId: string): Promise<any>;
  cancel(taskId: string): Promise<any>;
}

export interface AutomatonRouteResult {
  used: boolean;
  attempted: boolean;
  reason: string;
  elapsedMs: number;
  taskId?: string;
  cancelled?: boolean;
  response?: ProviderResponse;
}

export interface AutomatonReadOnlyRouterOptions {
  enabled?: boolean;
  preflightTimeoutMs?: number;
  slaMs?: number;
  pollMs?: number;
  transport?: AutomatonBridgeTransport;
}

const SAFE_CAPABILITIES = new Set(['research', 'review', 'synthesis']);
const READ_ONLY_INTENT = /\b(inspect|analy[sz]e|review|summari[sz]e|classify|diagnos(?:e|is)|read|audit|compare|explain|investigat|pesquis|analis|revis|resum|classific|diagnostic|inspec|compar|explic)\w*/i;
const MUTATION_INTENT = /\b(write|edit|modify|delete|remove|move|rename|install|upgrade|update|commit|push|publish|send|email|message|post|upload|download|execute|run|deploy|restart|shutdown|kill|create|save|editar|alterar|apagar|excluir|mover|renomear|instalar|atualizar|commit|publicar|enviar|executar|rodar|deploy|reiniciar|desligar|criar|salvar)\w*/i;
const EXTERNAL_INTENT = /\b(web|internet|browser|website|linkedin|gmail|email|http|api|external|online|site|navegador)\b/i;

function envInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function outputFromResult(value: unknown): string | undefined {
  let parsed = value;
  if (typeof parsed === 'string') {
    const text = parsed;
    try { parsed = JSON.parse(text); } catch { return text.trim() || undefined; }
  }
  if (!parsed || typeof parsed !== 'object') return undefined;
  const output = (parsed as { output?: unknown }).output;
  return typeof output === 'string' && output.trim() ? output.trim() : undefined;
}

function defaultTransport(): AutomatonBridgeTransport {
  const registry = new RuntimeCapabilityRegistry();
  registerAutomatonLocalCapability(registry);
  return {
    async health() { return (await registry.execute<any, any>('execution.automaton-local', { action: 'health' })).output; },
    async submit(objective: string) { return (await registry.execute<any, any>('execution.automaton-local', { action: 'submit', objective })).output; },
    async status(taskId: string) { return (await registry.execute<any, any>('execution.automaton-local', { action: 'status', taskId })).output; },
    async cancel(taskId: string) { return (await registry.execute<any, any>('execution.automaton-local', { action: 'cancel', taskId })).output; },
  };
}

export function automatonReadOnlyEligibility(input: OrchestrationInput): { eligible: boolean; reason: string } {
  const context = input.context ?? {};
  const explicitReadOnly = context.readOnly === true;
  if (input.risk === 'high') return { eligible: false, reason: 'high-risk task' };
  if (!SAFE_CAPABILITIES.has(input.capability) && !explicitReadOnly) return { eligible: false, reason: 'capability is not read-only allowlisted' };
  const text = input.objective;
  if (MUTATION_INTENT.test(text)) return { eligible: false, reason: 'mutation intent detected' };
  if (EXTERNAL_INTENT.test(text) || context.external === true || context.network === true) return { eligible: false, reason: 'external/network intent detected' };
  if (!explicitReadOnly && !READ_ONLY_INTENT.test(text)) return { eligible: false, reason: 'read-only intent not explicit' };
  return { eligible: true, reason: explicitReadOnly ? 'explicit read-only context' : 'safe read-only intent' };
}

async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    operation,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Automaton preflight timeout')), timeoutMs)),
  ]);
}

export class AutomatonReadOnlyRouter {
  private readonly enabled: boolean;
  private readonly preflightTimeoutMs: number;
  private readonly slaMs: number;
  private readonly pollMs: number;
  private readonly transport: AutomatonBridgeTransport;

  constructor(options: AutomatonReadOnlyRouterOptions = {}) {
    this.enabled = options.enabled ?? process.env.MUNIN_AUTOMATON_AUTO_ROUTE === '1';
    this.preflightTimeoutMs = options.preflightTimeoutMs ?? envInt('MUNIN_AUTOMATON_PREFLIGHT_MS', 900, 100, 5000);
    this.slaMs = options.slaMs ?? envInt('MUNIN_AUTOMATON_SLA_MS', 90_000, 1000, 600_000);
    this.pollMs = options.pollMs ?? envInt('MUNIN_AUTOMATON_POLL_MS', 750, 100, 5000);
    this.transport = options.transport ?? defaultTransport();
  }

  async tryRoute(input: OrchestrationInput): Promise<AutomatonRouteResult> {
    const started = Date.now();
    if (!this.enabled) return { used: false, attempted: false, reason: 'auto-route disabled', elapsedMs: 0 };
    const eligibility = automatonReadOnlyEligibility(input);
    if (!eligibility.eligible) return { used: false, attempted: false, reason: eligibility.reason, elapsedMs: Date.now() - started };

    let taskId: string | undefined;
    try {
      const health = await bounded(this.transport.health(), this.preflightTimeoutMs);
      const state = health?.state;
      const activeGoals = Array.isArray(state?.goals) ? state.goals.filter((goal: any) => goal?.status === 'active').length : 0;
      const queued = Number(state?.counts?.queued ?? 0);
      if (!health?.ready || state?.runtime?.running !== true || state?.agent?.localOnly !== true) {
        return { used: false, attempted: false, reason: 'Automaton local runtime is not ready', elapsedMs: Date.now() - started };
      }
      if (activeGoals > 0 || queued > 0) {
        return { used: false, attempted: false, reason: 'Automaton is busy', elapsedMs: Date.now() - started };
      }

      const objective = `READ-ONLY MUNIN ROUTE. ${input.objective}\nDo not modify files, configuration, repositories, processes, network state, or external services. Return concise evidence only.`;
      const submitted = await this.transport.submit(objective);
      taskId = submitted?.taskId;
      if (!submitted?.ready || !taskId) return { used: false, attempted: true, reason: 'Automaton rejected task submission', elapsedMs: Date.now() - started };

      const deadline = Date.now() + this.slaMs;
      while (Date.now() < deadline) {
        const status = await this.transport.status(taskId);
        const output = outputFromResult(status?.result);
        if (status?.status === 'completed' && output) {
          return {
            used: true,
            attempted: true,
            reason: eligibility.reason,
            elapsedMs: Date.now() - started,
            taskId,
            response: { providerId: 'automaton-local', output, metadata: { taskId, goalId: status?.goalId, localOnly: true, readOnly: true } },
          };
        }
        if (status?.status === 'failed' || status?.status === 'cancelled') {
          return { used: false, attempted: true, reason: `Automaton ended with status ${status.status}`, elapsedMs: Date.now() - started, taskId };
        }
        await sleep(this.pollMs);
      }

      await this.transport.cancel(taskId);
      return { used: false, attempted: true, reason: 'Automaton SLA exceeded; task cancelled for provider fallback', elapsedMs: Date.now() - started, taskId, cancelled: true };
    } catch (error) {
      if (taskId) {
        try { await this.transport.cancel(taskId); } catch {}
      }
      return { used: false, attempted: Boolean(taskId), reason: error instanceof Error ? error.message : String(error), elapsedMs: Date.now() - started, taskId, cancelled: Boolean(taskId) };
    }
  }
}
