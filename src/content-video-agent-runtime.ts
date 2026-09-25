import type { MuninState } from './types.js';
import type { OutcomeRecord } from './adaptive-execution.js';
import { AgentRuntimeV1 } from './agent-runtime-v1.js';
import { createContentVideoCapability, type ContentVideoInput } from './content-video-capability.js';

export async function generateVideoDraftWithRuntime(
  state: MuninState,
  input: Omit<ContentVideoInput, 'action'>,
  options: { runtime?: AgentRuntimeV1; outcomes?: OutcomeRecord[]; now?: Date } = {},
) {
  const runtime = options.runtime ?? new AgentRuntimeV1();
  const now = options.now ?? new Date();
  const plan = await runtime.plan(state, {
    class: 'local-write',
    tool: 'generate local video draft',
    target: input.outputDir ?? 'content-video-draft',
    payloadPreview: `${input.topic ?? ''} ${input.language ?? ''} ${input.aspectRatio ?? ''}`,
    reason: 'Generate a reversible local draft; publication remains a separate external action.',
  }, options.outcomes ?? [], now);
  if (plan.sentinel.disposition !== 'guarded_execute') return { plan, output: undefined };
  const capabilityInput: ContentVideoInput = { ...input, action: 'generate' };
  const output = await createContentVideoCapability().execute(capabilityInput, {
    capability: 'media.content-video',
    executionId: `agent-runtime-v1-${Date.now().toString(36)}`,
    input: capabilityInput,
    startedAt: now.toISOString(),
    metadata: { governedBy: 'AgentRuntimeV1' },
  });
  return { plan, output };
}

export async function planVideoPublication(
  state: MuninState,
  target: string,
  summary: string,
  options: { runtime?: AgentRuntimeV1; outcomes?: OutcomeRecord[]; now?: Date } = {},
) {
  const runtime = options.runtime ?? new AgentRuntimeV1();
  return runtime.plan(state, {
    class: 'external-write',
    tool: 'publish video',
    target,
    payloadPreview: summary,
    reason: 'Publishing media is an external side effect and requires explicit user approval.',
    effect: { type: 'video.publish', resourceId: target, payload: { target, summary } },
  }, options.outcomes ?? [], options.now ?? new Date());
}
