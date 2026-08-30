import type { ExecutionProvider, ProviderRequest, ProviderResponse } from './providers.js';

export interface FccProviderOptions {
  baseUrl?: string;
  model?: string;
  authToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface FccResponsePayload {
  model?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string; output_text?: string }>;
  }>;
  usage?: Record<string, unknown>;
}

interface FccStreamEvent {
  type?: string;
  delta?: string;
  response?: FccResponsePayload;
  error?: { message?: string };
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function requestPrompt(request: ProviderRequest): string {
  return [
    'You are an execution provider inside Munin, a personal intelligence operating system.',
    `Objective: ${request.objective}`,
    `Task: ${request.title}`,
    `Capability: ${request.capability}`,
    `Expected output: ${request.expectedOutput}`,
    `Context: ${JSON.stringify(request.context)}`,
    'Return only the useful answer for the task. Be precise, operational, and do not invent facts.',
  ].join('\n');
}

function extractOutput(payload: FccResponsePayload): string | undefined {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  const parts = (payload.output ?? [])
    .flatMap(item => item.content ?? [])
    .map(item => item.text ?? item.output_text)
    .filter((value): value is string => Boolean(value?.trim()));
  return parts.length ? parts.join('\n').trim() : undefined;
}

async function parseResponse(response: Response): Promise<FccResponsePayload> {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    return await response.json() as FccResponsePayload;
  }

  const deltas: string[] = [];
  let completed: FccResponsePayload = {};
  for (const line of (await response.text()).split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    const event = JSON.parse(data) as FccStreamEvent;
    if (event.type === 'response.output_text.delta' && event.delta) deltas.push(event.delta);
    if (event.type === 'response.completed' && event.response) completed = event.response;
    if (event.type === 'response.failed') throw new Error(event.error?.message ?? 'FCC response stream failed');
  }
  return { ...completed, output_text: deltas.join('') || completed.output_text };
}

export class FccProvider implements ExecutionProvider {
  readonly id = 'fcc-gateway';
  readonly baseUrl: string;
  readonly model: string;
  readonly authToken: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FccProviderOptions = {}) {
    this.baseUrl = cleanBaseUrl(options.baseUrl ?? process.env.FCC_BASE_URL ?? 'http://127.0.0.1:8082/v1');
    this.model = options.model ?? process.env.FCC_MODEL ?? 'nvidia_nim/nvidia/nemotron-3-super-120b-a12b';
    this.authToken = options.authToken ?? process.env.FCC_AUTH_TOKEN ?? 'freecc';
    this.timeoutMs = options.timeoutMs ?? Number(process.env.FCC_TIMEOUT_MS ?? 120_000);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ model: this.model, input: requestPrompt(request) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`FCC request failed with HTTP ${response.status}`);
      const payload = await parseResponse(response);
      const output = extractOutput(payload);
      if (!output) throw new Error('FCC returned an empty response');
      return {
        providerId: this.id,
        model: payload.model ?? this.model,
        output,
        metadata: {
          capability: request.capability,
          objective: request.objective,
          latencyMs: Date.now() - startedAt,
          gateway: 'free-claude-code',
          usage: payload.usage,
          external: true,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`FCC request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<{ ready: boolean; model: string; baseUrl: string; models?: string[]; error?: string }> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/models`, {
        headers: { authorization: `Bearer ${this.authToken}` },
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5_000)),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { data?: Array<{ id?: string }> };
      const models = (payload.data ?? []).map(item => item.id).filter((id): id is string => Boolean(id));
      const modelAvailable = models.some(id => id === this.model || id.endsWith(`/${this.model}`));
      return { ready: models.length === 0 || modelAvailable, model: this.model, baseUrl: this.baseUrl, models };
    } catch (error) {
      return { ready: false, model: this.model, baseUrl: this.baseUrl, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
