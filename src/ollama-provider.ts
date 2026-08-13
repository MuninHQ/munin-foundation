import type { ExecutionProvider, ProviderRequest, ProviderResponse } from './providers.js';

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface OllamaGenerateResponse {
  model?: string;
  response?: string;
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function requestPrompt(request: ProviderRequest): string {
  return [
    'You are an execution provider inside Munin, a local personal intelligence operating system.',
    `Objective: ${request.objective}`,
    `Task: ${request.title}`,
    `Capability: ${request.capability}`,
    `Expected output: ${request.expectedOutput}`,
    `Context: ${JSON.stringify(request.context)}`,
    'Return only the useful answer for the task. Be precise and operational.',
  ].join('\n');
}

export class OllamaProvider implements ExecutionProvider {
  readonly id = 'ollama-local';
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = cleanBaseUrl(options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434');
    this.model = options.model ?? process.env.OLLAMA_MODEL ?? 'qwen3:8b';
    this.timeoutMs = options.timeoutMs ?? Number(process.env.OLLAMA_TIMEOUT_MS ?? 120_000);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: requestPrompt(request), stream: false }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}`);
      const payload = await response.json() as OllamaGenerateResponse;
      if (!payload.response?.trim()) throw new Error('Ollama returned an empty response');
      return {
        providerId: this.id,
        model: payload.model ?? this.model,
        output: payload.response.trim(),
        metadata: {
          capability: request.capability,
          objective: request.objective,
          latencyMs: Date.now() - startedAt,
          totalDurationNs: payload.total_duration,
          loadDurationNs: payload.load_duration,
          promptEvalCount: payload.prompt_eval_count,
          evalCount: payload.eval_count,
          local: true,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`Ollama request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<{ ready: boolean; model: string; baseUrl: string; models?: string[]; error?: string }> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5_000)) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { models?: Array<{ name?: string }> };
      const models = (payload.models ?? []).map(item => item.name).filter((name): name is string => Boolean(name));
      return { ready: models.includes(this.model), model: this.model, baseUrl: this.baseUrl, models };
    } catch (error) {
      return { ready: false, model: this.model, baseUrl: this.baseUrl, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
