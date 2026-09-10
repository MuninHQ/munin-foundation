import type { MuninState, JobOpportunity } from './types.js';
import type { OutcomeRecord } from './adaptive-execution.js';
import { AgentRuntimeV1 } from './agent-runtime-v1.js';
import { buildCareerApplicationPacket, type CareerApplicationPacket } from './career-application-packet.js';
import { evaluateWatcher, type WatcherDefinition, type WatcherState } from './watchers.js';

export interface CareerRuntimePreparation {
  packet: CareerApplicationPacket;
  runtime: Awaited<ReturnType<AgentRuntimeV1['plan']>>;
  watcher?: ReturnType<typeof evaluateWatcher>;
}

export async function prepareCareerApplicationWithRuntime(
  state: MuninState,
  job: JobOpportunity,
  context: Record<string, unknown> = {},
  options: { runtime?: AgentRuntimeV1; outcomes?: OutcomeRecord[]; previousFitScore?: number; now?: Date } = {},
): Promise<CareerRuntimePreparation> {
  const runtime = options.runtime ?? new AgentRuntimeV1();
  const now = options.now ?? new Date();
  const packet = buildCareerApplicationPacket(job, context, { generatedAt: now.toISOString() });
  const plan = await runtime.plan(state, {
    class: 'local-write',
    tool: 'prepare career application packet',
    target: `career:${job.id}`,
    payloadPreview: `${job.company} ${job.role} fit=${job.fitScore}`,
    reason: 'Prepare evidence-backed application materials without submitting them.',
  }, options.outcomes ?? [], now);

  let watcher: ReturnType<typeof evaluateWatcher> | undefined;
  if (options.previousFitScore !== undefined) {
    const definition: WatcherDefinition = { id: `career-fit:${job.id}`, metric: `career.fit.${job.id}`, condition: 'gte', threshold: 80 };
    const stateBefore: WatcherState = { watcherId: definition.id, lastValue: options.previousFitScore, lastCheckedAt: now.toISOString() };
    watcher = evaluateWatcher(definition, job.fitScore, stateBefore, now);
  }
  return { packet, runtime: plan, watcher };
}

export async function planCareerSubmission(
  state: MuninState,
  job: JobOpportunity,
  options: { runtime?: AgentRuntimeV1; outcomes?: OutcomeRecord[]; now?: Date } = {},
) {
  const runtime = options.runtime ?? new AgentRuntimeV1();
  return runtime.plan(state, {
    class: 'external-write',
    tool: 'submit job application',
    target: job.link ?? `${job.company}:${job.role}`,
    payloadPreview: `${job.company} ${job.role}`,
    reason: 'Submitting an application changes an external system and requires explicit user approval.',
  }, options.outcomes ?? [], options.now ?? new Date());
}
