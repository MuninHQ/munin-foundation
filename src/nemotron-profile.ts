export type LlmReasoningMode = 'off' | 'medium' | 'full';

export const NEMOTRON_3_ULTRA = {
  id: 'nvidia-nemotron-3-ultra',
  name: 'NVIDIA Nemotron 3 Ultra',
  hostedBaseUrl: 'https://integrate.api.nvidia.com/v1',
  hostedModel: 'nvidia/nemotron-3-ultra-550b-a55b',
  contextTokens: 1_000_000,
  inputModalities: ['text'] as const,
  minimumLocalGpu: '4x GB200/B200/GB300/B300 or 8x H100 (NVFP4)',
} as const;

export type KnownLlmProfile = typeof NEMOTRON_3_ULTRA.id;

export function knownLlmProfile(model: string): KnownLlmProfile | undefined {
  return model.toLowerCase().includes('nemotron-3-ultra') ? NEMOTRON_3_ULTRA.id : undefined;
}

export function isNemotron3Ultra(model: string): boolean {
  return knownLlmProfile(model) === NEMOTRON_3_ULTRA.id;
}

export function normalizeReasoningMode(value: unknown): LlmReasoningMode {
  return value === 'medium' || value === 'full' ? value : 'off';
}

type ChatCompletionBody = {
  model: string;
  temperature?: number;
  top_p?: number;
  chat_template_kwargs?: Record<string, unknown>;
  [key: string]: unknown;
};

export function applyKnownModelChatProfile<T extends ChatCompletionBody>(
  body: T,
  reasoningMode: LlmReasoningMode,
): T & ChatCompletionBody {
  if (!isNemotron3Ultra(body.model)) return body;
  const enabled = reasoningMode !== 'off';
  return {
    ...body,
    temperature: enabled ? 1 : body.temperature ?? 0,
    ...(enabled ? { top_p: 0.95 } : {}),
    chat_template_kwargs: {
      ...body.chat_template_kwargs,
      enable_thinking: enabled,
      ...(reasoningMode === 'medium' ? { medium_effort: true } : {}),
      force_nonempty_content: true,
    },
  };
}

export function finalModelContent(content: string, model: string): string {
  const trimmed = content.trim();
  if (!isNemotron3Ultra(model)) return trimmed;
  const close = trimmed.lastIndexOf('</think>');
  if (close >= 0) return trimmed.slice(close + '</think>'.length).trim();
  if (/^<think>/i.test(trimmed)) return '';
  return trimmed;
}

export function knownModelCapabilities(model: string): { supportsVision: boolean; inputModalities: string[] } {
  if (isNemotron3Ultra(model)) return { supportsVision: false, inputModalities: [...NEMOTRON_3_ULTRA.inputModalities] };
  return { supportsVision: true, inputModalities: ['text', 'image'] };
}
