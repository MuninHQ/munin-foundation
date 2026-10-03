import type { RuntimeCapability, RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export type AutomatonLocalAction = 'health' | 'submit' | 'status' | 'cancel';

export interface AutomatonLocalInput {
  action: AutomatonLocalAction;
  objective?: string;
  taskId?: string;
}

export interface AutomatonLocalPolicy {
  enabled: boolean;
  submitEnabled: boolean;
  localOnly: true;
  paidDependencyRequired: false;
  externalSideEffectsAllowed: false;
  baseUrl: string;
}

export interface AutomatonLocalOutput {
  action: AutomatonLocalAction;
  policy: AutomatonLocalPolicy;
  ready: boolean;
  detail: string;
  taskId?: string;
  goalId?: string;
  status?: string;
  result?: unknown;
  state?: unknown;
}

function policy(): AutomatonLocalPolicy {
  const baseUrl = process.env.MUNIN_AUTOMATON_URL?.trim() || 'http://127.0.0.1:3210';
  const parsed = new URL(baseUrl);
  const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (parsed.protocol !== 'http:' || !localHosts.has(parsed.hostname) || parsed.username || parsed.password) {
    throw new Error('MUNIN_AUTOMATON_URL must be an unauthenticated loopback HTTP URL.');
  }
  return {
    enabled: process.env.MUNIN_AUTOMATON_ENABLED === '1',
    submitEnabled: process.env.MUNIN_AUTOMATON_SUBMIT === '1',
    localOnly: true,
    paidDependencyRequired: false,
    externalSideEffectsAllowed: false,
    baseUrl: parsed.origin,
  };
}

async function requestJson(baseUrl: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(5000),
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Automaton returned HTTP ${response.status} for ${path}.`);
  return response.json();
}

export function createAutomatonLocalCapability(): RuntimeCapability<AutomatonLocalInput, AutomatonLocalOutput> {
  return {
    name: 'execution.automaton-local',
    async execute(input, context) {
      const p = policy();
      if (input.action === 'health') {
        try {
          const state = await requestJson(p.baseUrl, '/api/state');
          return { action: 'health', policy: p, ready: true, detail: 'Automaton local console is reachable.', state };
        } catch (error) {
          return { action: 'health', policy: p, ready: false, detail: error instanceof Error ? error.message : String(error) };
        }
      }
      if (input.action === 'status') {
        const taskId = input.taskId?.trim();
        if (!taskId) throw new Error('taskId is required');
        const state = await requestJson(p.baseUrl, '/api/state');
        const inbox = Array.isArray(state?.inbox) ? state.inbox : [];
        const message = inbox.find((item: any) => item?.id === taskId);
        if (!message) return { action: 'status', policy: p, ready: false, detail: 'Automaton task was not found.', taskId, status: 'unknown' };
        const match = String(message.content || '').match(/\[MUNIN:([^\]]+)\]/);
        const marker = match?.[1] ? `[MUNIN:${match[1]}]` : '';
        const goals = Array.isArray(state?.goals) ? state.goals : [];
        const goal = marker ? goals.find((item: any) => String(item?.description || '').includes(marker)) : undefined;
        const tasks = Array.isArray(state?.tasks) && goal ? state.tasks.filter((item: any) => item?.goal_id === goal.id) : [];
        const result = tasks.find((item: any) => item?.result != null)?.result;
        return { action: 'status', policy: p, ready: true, detail: 'Automaton task status resolved.', taskId, goalId: goal?.id, status: goal?.status || message.status, result, state: { inbox: message, goal, tasks } };
      }
      if (input.action === 'cancel') {
        const taskId = input.taskId?.trim();
        if (!taskId) throw new Error('taskId is required');
        const cancelled = await requestJson(p.baseUrl, '/api/tasks/cancel', {
          method: 'POST',
          body: JSON.stringify({ id: taskId }),
        });
        return { action: 'cancel', policy: p, ready: Boolean(cancelled?.ok), detail: 'Automaton task cancellation requested.', taskId, goalId: cancelled?.goalId, status: cancelled?.status, result: cancelled };
      }
      if (!p.enabled) throw new Error('Automaton integration is disabled. Set MUNIN_AUTOMATON_ENABLED=1.');
      if (!p.submitEnabled) throw new Error('Automaton task submission is disabled. Set MUNIN_AUTOMATON_SUBMIT=1.');
      const objective = input.objective?.trim();
      if (!objective) throw new Error('objective is required');
      const content = `[MUNIN:${context.executionId}] ${objective}`;
      const queued = await requestJson(p.baseUrl, '/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      try {
        await requestJson(p.baseUrl, '/api/wake', { method: 'POST', body: '{}' });
      } catch (error) {
        // Preserve accepted identity so the caller can cancel instead of orphaning queued work.
        return { action: 'submit', policy: p, ready: false, taskId: queued.id, status: 'wake_failed',
          detail: `Automaton wake failed: ${error instanceof Error ? error.message : String(error)}` };
      }
      return { action: 'submit', policy: p, ready: true, detail: 'Task queued in Automaton local-only runtime.', taskId: queued.id };
    },
  };
}

export function registerAutomatonLocalCapability(registry: RuntimeCapabilityRegistry): void {
  if (!registry.has('execution.automaton-local')) registry.register(createAutomatonLocalCapability());
}

export function automatonLocalPolicy(): AutomatonLocalPolicy {
  return policy();
}
