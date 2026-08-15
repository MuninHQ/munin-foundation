import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AutonomousGoalRunner } from './autonomous-runner.js';
import { executeAssistantCommand } from './assistant.js';
import { json, readJsonBody, requireText as text } from './http.js';
import { MuninService } from './service.js';
import { ContextStore } from './store.js';

const store = new ContextStore();
const service = new MuninService(store);

function configuredToken(): string | undefined {
  const value = process.env.MUNIN_MOBILE_TOKEN?.trim();
  return value || undefined;
}

function tokenMatches(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mobileAuthorized(request: IncomingMessage): boolean {
  const expected = configuredToken();
  if (!expected) return false;
  const authorization = request.headers.authorization ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return Boolean(match?.[1] && tokenMatches(match[1], expected));
}

export async function handleMobileApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  if (!mobileAuthorized(request)) return json(request, response, 401, { error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' });

  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/mobile/health') {
      return json(request, response, 200, { status: 'ok', service: 'munin-mobile-gateway' });
    }
    if (request.method === 'GET' && url.pathname === '/api/mobile/home') {
      const state = await store.load();
      const goals = state.goals
        .filter(goal => ['planned', 'active', 'blocked'].includes(goal.status))
        .sort((a, b) => a.priority.localeCompare(b.priority) || b.progress - a.progress)
        .slice(0, 8);
      const pendingActions = state.actions
        .filter(action => ['planned', 'active', 'blocked'].includes(action.status))
        .sort((a, b) => a.priority.localeCompare(b.priority))
        .slice(0, 10);
      return json(request, response, 200, {
        generatedAt: new Date().toISOString(),
        goals,
        pendingActions,
        decisions: state.decisions.filter(decision => decision.status === 'required').slice(0, 8),
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/mobile/sitrep') {
      return json(request, response, 200, { report: await service.sitrep() });
    }
    if (request.method === 'POST' && url.pathname === '/api/mobile/assistant') {
      const input = await readJsonBody(request, 200_000);
      return json(request, response, 200, await executeAssistantCommand(text(input.command, 'command')));
    }
    if (request.method === 'POST' && url.pathname === '/api/mobile/goal-loop') {
      const input = await readJsonBody(request, 50_000);
      const requested = Number(input.maxCycles ?? 5);
      const maxCycles = Number.isInteger(requested) ? requested : 5;
      return json(request, response, 200, await new AutonomousGoalRunner(store).run(maxCycles));
    }
    const execute = url.pathname.match(/^\/api\/mobile\/actions\/([^/]+)\/complete$/);
    if (request.method === 'POST' && execute) {
      const input = await readJsonBody(request, 100_000);
      const outcome = typeof input.outcome === 'string' && input.outcome.trim() ? input.outcome.trim() : 'Completed from mobile';
      return json(request, response, 200, await service.execute(execute[1], outcome));
    }
    return json(request, response, 404, { error: 'Mobile route not found' });
  } catch (error) {
    return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
