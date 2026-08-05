import type { ExecutionProvider, ProviderRequest, ProviderResponse } from './providers.js';

export interface ResiliencePolicy {
  timeoutMs: number;
  maxAttempts: number;
  circuitFailureThreshold: number;
  circuitResetMs: number;
}

export interface ExecutionAttempt {
  attempt: number;
  providerId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  outcome: 'success' | 'failure' | 'timeout' | 'circuit-open';
  error?: string;
}

interface CircuitState { failures: number; openedAt?: number; }

export class ProviderResilience {
  private readonly circuits = new Map<string, CircuitState>();

  constructor(private readonly policy: ResiliencePolicy = {
    timeoutMs: 5_000,
    maxAttempts: 2,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
  }) {}

  status(providerId: string, now = Date.now()): 'closed' | 'open' | 'half-open' {
    const state = this.circuits.get(providerId);
    if (!state?.openedAt) return 'closed';
    return now - state.openedAt >= this.policy.circuitResetMs ? 'half-open' : 'open';
  }

  private recordSuccess(providerId: string): void { this.circuits.set(providerId, { failures: 0 }); }
  private recordFailure(providerId: string): void {
    const state = this.circuits.get(providerId) ?? { failures: 0 };
    state.failures += 1;
    if (state.failures >= this.policy.circuitFailureThreshold) state.openedAt = Date.now();
    this.circuits.set(providerId, state);
  }

  async execute(provider: ExecutionProvider, request: ProviderRequest): Promise<{ response: ProviderResponse; attempts: ExecutionAttempt[] }> {
    const attempts: ExecutionAttempt[] = [];
    if (this.status(provider.id) === 'open') {
      const now = new Date().toISOString();
      attempts.push({ attempt: 0, providerId: provider.id, startedAt: now, finishedAt: now, durationMs: 0, outcome: 'circuit-open', error: 'Circuit breaker is open' });
      throw Object.assign(new Error(`Circuit breaker open for provider: ${provider.id}`), { attempts });
    }

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt += 1) {
      const started = Date.now();
      const startedAt = new Date(started).toISOString();
      try {
        const response = await Promise.race([
          provider.execute(request),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Provider timeout after ${this.policy.timeoutMs}ms`)), this.policy.timeoutMs)),
        ]);
        const finished = Date.now();
        attempts.push({ attempt, providerId: provider.id, startedAt, finishedAt: new Date(finished).toISOString(), durationMs: finished - started, outcome: 'success' });
        this.recordSuccess(provider.id);
        return { response, attempts };
      } catch (error) {
        const finished = Date.now();
        lastError = error instanceof Error ? error : new Error(String(error));
        const timeout = lastError.message.startsWith('Provider timeout');
        attempts.push({ attempt, providerId: provider.id, startedAt, finishedAt: new Date(finished).toISOString(), durationMs: finished - started, outcome: timeout ? 'timeout' : 'failure', error: lastError.message });
        this.recordFailure(provider.id);
        if (this.status(provider.id) === 'open') break;
      }
    }
    throw Object.assign(lastError ?? new Error(`Provider execution failed: ${provider.id}`), { attempts });
  }
}

export class ResilientProvider implements ExecutionProvider {
  readonly id: string;

  constructor(
    private readonly inner: ExecutionProvider,
    private readonly resilience = new ProviderResilience(),
  ) {
    this.id = inner.id;
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    try {
      const { response, attempts } = await this.resilience.execute(this.inner, request);
      return {
        ...response,
        metadata: {
          ...response.metadata,
          attempts,
          attemptCount: attempts.length,
          circuitState: this.resilience.status(this.inner.id),
        },
      };
    } catch (error) {
      const attempts = (error as { attempts?: ExecutionAttempt[] }).attempts ?? [];
      const wrapped = error instanceof Error ? error : new Error(String(error));
      throw Object.assign(wrapped, {
        attempts,
        providerId: this.inner.id,
        circuitState: this.resilience.status(this.inner.id),
      });
    }
  }
}
