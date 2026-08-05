export interface ProviderRequest {
  taskId: string;
  objective: string;
  title: string;
  capability: string;
  expectedOutput: string;
  context: Record<string, unknown>;
}

export interface ProviderResponse {
  output: string;
  providerId: string;
  model?: string;
  metadata: Record<string, unknown>;
}

export interface ExecutionProvider {
  id: string;
  execute(request: ProviderRequest): Promise<ProviderResponse>;
}

export class DeterministicProvider implements ExecutionProvider {
  readonly id = 'deterministic-local';

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    return {
      providerId: this.id,
      output: `${request.title}: ${request.expectedOutput}`,
      metadata: {
        capability: request.capability,
        objective: request.objective,
        simulated: true,
      },
    };
  }
}
