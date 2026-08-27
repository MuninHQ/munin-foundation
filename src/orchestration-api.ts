import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  IntelligenceOrchestrationPlanner,
  type OrchestrationInput,
  type OrchestrationMode,
  type OrchestrationRisk,
} from './intelligence-orchestration.js';
import { OrchestrationRuntimeCore, OrchestrationRuntimeError } from './orchestration-runtime-core.js';
import type { OrchestrationTrace } from './orchestration-trace.js';
import { OrchestrationTraceStore, summarizeOrchestrationTraces } from './orchestration-trace-store.js';
import { runMuninSecurityBench } from './agent-security-policy-evaluator.js';
import { executionSandboxStatus } from './execution-sandbox.js';
import { json, readJsonBody, requireText } from './http.js';

const traces: OrchestrationTrace[] = [];
const MAX_TRACES = 100;
const traceStore = new OrchestrationTraceStore();

function optionalMode(value: unknown): OrchestrationMode | undefined {
  if (value === undefined) return undefined;
  if (value === 'auto' || value === 'direct' || value === 'council') return value;
  throw new Error('mode must be auto, direct or council');
}

function optionalRisk(value: unknown): OrchestrationRisk | undefined {
  if (value === undefined) return undefined;
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error('risk must be low, medium or high');
}

function parseInput(body: Record<string, unknown>): OrchestrationInput {
  const context =
    body.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? body.context as Record<string, unknown>
      : {};

  return {
    objective: requireText(body.objective, 'objective'),
    capability: requireText(body.capability, 'capability'),
    mode: optionalMode(body.mode),
    risk: optionalRisk(body.risk),
    context,
  };
}

async function rememberTrace(trace: OrchestrationTrace): Promise<void> {
  traces.push(trace);
  if (traces.length > MAX_TRACES) traces.splice(0, traces.length - MAX_TRACES);
  try { await traceStore.append(trace); } catch { /* observability must never break execution */ }
}

export function recentOrchestrationTraces(): OrchestrationTrace[] {
  return [...traces].reverse();
}

export async function handleOrchestration(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  try {
    if (request.method === 'GET' && url.pathname === '/api/orchestration/traces') {
      const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit') ?? 100)));
      const durable = await traceStore.list(Number.isFinite(limit) ? Math.floor(limit) : 100);
      return json(request, response, 200, { traces: durable.length ? durable : recentOrchestrationTraces() });
    }

    if (request.method === 'GET' && url.pathname === '/api/orchestration/metrics') {
      const durable = await traceStore.list(1000);
      const source = durable.length ? durable : recentOrchestrationTraces();
      return json(request, response, 200, { generatedAt: new Date().toISOString(), metrics: summarizeOrchestrationTraces(source) });
    }

    if (request.method === 'GET' && url.pathname === '/api/orchestration/security-bench') {
      return json(request, response, 200, { generatedAt: new Date().toISOString(), report: await runMuninSecurityBench() });
    }

    if (request.method === 'GET' && url.pathname === '/api/orchestration/sandbox') {
      return json(request, response, 200, { generatedAt: new Date().toISOString(), sandbox: await executionSandboxStatus() });
    }

    if (request.method === 'POST' && url.pathname === '/api/orchestration/plan') {
      const body = await readJsonBody(request, 1_000_000);
      const input = parseInput(body);
      const plan = new IntelligenceOrchestrationPlanner().plan(input);
      return json(request, response, 200, { plan });
    }

    if (request.method === 'POST' && url.pathname === '/api/orchestration/run') {
      const body = await readJsonBody(request, 1_000_000);
      const input = parseInput(body);
      const result = await new OrchestrationRuntimeCore().run(input);
      await rememberTrace(result.trace);
      return json(request, response, 200, result);
    }

    return json(request, response, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof OrchestrationRuntimeError) {
      await rememberTrace(error.trace);
      return json(request, response, 503, { error: error.message, trace: error.trace });
    }
    return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
