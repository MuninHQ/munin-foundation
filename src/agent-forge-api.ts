import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { json } from './http.js';
import { runtimePath } from './config.js';
import type { AgentTelemetryEvent } from './agent-telemetry.js';

export type AgentForgeStatus = 'working' | 'verifying' | 'retrying' | 'blocked' | 'completed' | 'failed';
export interface AgentForgeItem {
  id: string;
  runId: string;
  taskId?: string;
  agentId: string;
  capability?: string;
  phase?: string;
  status: AgentForgeStatus;
  startedAt: string;
  updatedAt: string;
  durationMs?: number;
  outcome?: string;
  evidenceCount: number;
  lastEvent: string;
}

function statusFor(event: AgentTelemetryEvent): AgentForgeStatus {
  if (event.name === 'human.blocked') return 'blocked';
  if (event.name === 'agent.failed' || event.name === 'verification.failed') return 'failed';
  if (event.name === 'retry.scheduled') return 'retrying';
  if (event.name === 'run.completed' || event.name === 'agent.completed') return 'completed';
  if (event.name === 'tool.completed' && String(event.metadata?.phase ?? '').toUpperCase() === 'VERIFY') return 'verifying';
  return 'working';
}

function project(events: AgentTelemetryEvent[], now = Date.now()): AgentForgeItem[] {
  const byAgent = new Map<string, AgentForgeItem>();
  for (const event of events) {
    const agentId = event.agentId?.trim() || 'munin-core';
    const key = `${event.runId}:${event.taskId ?? agentId}`;
    const previous = byAgent.get(key);
    const at = event.at || new Date(now).toISOString();
    const metadata = event.metadata ?? {};
    byAgent.set(key, {
      id: key,
      runId: event.runId,
      taskId: event.taskId,
      agentId,
      capability: typeof metadata.capability === 'string' ? metadata.capability : previous?.capability,
      phase: typeof metadata.phase === 'string' ? metadata.phase : previous?.phase,
      status: statusFor(event),
      startedAt: previous?.startedAt ?? at,
      updatedAt: at,
      durationMs: event.durationMs ?? previous?.durationMs,
      outcome: event.outcome ?? previous?.outcome,
      evidenceCount: (previous?.evidenceCount ?? 0) + (event.evidence?.length ?? 0),
      lastEvent: event.name,
    });
  }

  return [...byAgent.values()].filter(item => {
    const age = now - Date.parse(item.updatedAt);
    if (item.status === 'blocked') return age <= 86_400_000;
    if (item.status === 'completed' || item.status === 'failed') return age <= 30_000;
    return age <= 300_000;
  }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 12);
}

export async function handleAgentForgeApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET') return json(request, response, 405, { error: 'Method not allowed' });
  let events: AgentTelemetryEvent[] = [];
  try {
    const raw = await readFile(runtimePath('telemetry', 'agent-events.jsonl'), 'utf8');
    events = raw.split(/\r?\n/).filter(Boolean).slice(-400).flatMap(line => {
      try { return [JSON.parse(line) as AgentTelemetryEvent]; } catch { return []; }
    });
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const items = project(events);
  return json(request, response, 200, {
    generatedAt: new Date().toISOString(),
    active: items.filter(item => !['completed', 'failed'].includes(item.status)).length,
    items,
  });
}

export const projectAgentForgeEvents = project;
