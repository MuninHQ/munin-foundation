import type { ExecutionProvider, ProviderRequest, ProviderResponse } from './providers.js';

export interface OpenRouterProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildPrompt(request: ProviderRequest): string {
  return [
    'You are an optional external execution provider for Munin.',
    'Do not assume authority to perform consequential actions. Return analysis/code/text only.',
    `Objective: ${request.objective}`,
    `Task: ${request.title}`,
    `Capability: ${request.capability}`,
    `Expected output: ${request.expectedOutput}`,
    `Context: ${JSON.stringify(request.context)}`,
    'Be precise, operational, and avoid inventing facts.',
  ].join('\n');
}

export class OpenRouterProvider implements ExecutionProvider {
  readonly id = 'openrouter-external';
  readonly model: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    this.model = options.model ?? process.env.OPENROUTER_MODEL ?? 'stealth/ox-alpha';
    this.baseUrl = cleanBaseUrl(options.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1');
    this.timeoutMs = options.timeoutMs ?? Number(process.env.OPENROUTER_TIMEOUT_MS ?? 120_000);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) throw new Error('OpenRouter API key is not configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          'x-title': 'Munin Foundation',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: buildPrompt(request) }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
      const payload = await response.json() as OpenRouterResponse;
      const output = payload.choices?.[0]?.message?.content?.trim();
      if (!output) throw new Error('OpenRouter returned an empty response');

      return {
        providerId: this.id,
        model: payload.model ?? this.model,
        output,
        metadata: {
          capability: request.capability,
          objective: request.objective,
          latencyMs: Date.now() - startedAt,
          promptTokens: payload.usage?.prompt_tokens,
          completionTokens: payload.usage?.completion_tokens,
          totalTokens: payload.usage?.total_tokens,
          local: false,
          external: true,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenRouter request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
