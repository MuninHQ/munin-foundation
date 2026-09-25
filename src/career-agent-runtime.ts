import type { MuninState, JobOpportunity } from './types.js';
import type { OutcomeRecord } from './adaptive-execution.js';
import { AgentRuntimeV1 } from './agent-runtime-v1.js';
import { buildCareerApplicationPacket, type CareerApplicationPacket } from './career-application-packet.js';
import { evaluateWatch, type WatchDefinition, type WatchSample } from './watchers.js';

export interface CareerRuntimePreparation {
  packet: CareerApplicationPacket;
  runtime: Awaited<ReturnType<AgentRuntimeV1['plan']>>;
  watcher?: ReturnType<typeof evaluateWatch>;
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

  let watcher: ReturnType<typeof evaluateWatch> | undefined;
  if (options.previousFitScore !== undefined) {
    const definition: WatchDefinition = { id: `career-fit:${job.id}`, name: `Career fit threshold for ${job.company} ${job.role}`, comparator: 'gte', target: 80 };
    const previous: WatchSample = { value: options.previousFitScore, sampledAt: now.toISOString() };
    const current: WatchSample = { value: job.fitScore, sampledAt: now.toISOString() };
    watcher = evaluateWatch(definition, current, previous);
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
    effect: { type: 'career.submit', resourceId: job.id, payload: { company: job.company, role: job.role, link: job.link } },
  }, options.outcomes ?? [], options.now ?? new Date());
}
