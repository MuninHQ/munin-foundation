import { RuntimeCapabilityRegistry, type CapabilityExecutionContext } from './runtime-capability-seam.js';

export type ExternalIntelligenceMode = 'research' | 'analysis' | 'fact-check' | 'synthesis';

export interface ExternalIntelligenceInput {
  objective: string;
  mode?: ExternalIntelligenceMode;
  context?: Record<string, unknown>;
  sources?: string[];
  requireCitations?: boolean;
}

export interface ExternalIntelligenceEvidence {
  title?: string;
  url?: string;
  excerpt?: string;
}

export interface ExternalIntelligenceOutput {
  provider: string;
  mode: ExternalIntelligenceMode;
  summary: string;
  evidence: ExternalIntelligenceEvidence[];
  raw?: unknown;
}

export interface ExternalIntelligenceProvider {
  name: string;
  available(): Promise<boolean>;
  execute(input: ExternalIntelligenceInput): Promise<ExternalIntelligenceOutput>;
}

export class HttpExternalIntelligenceProvider implements ExternalIntelligenceProvider {
  readonly name = 'http-external-intelligence';

  constructor(
    private readonly endpoint = process.env.MUNIN_EXTERNAL_INTELLIGENCE_URL ?? '',
    private readonly token = process.env.MUNIN_EXTERNAL_INTELLIGENCE_TOKEN ?? '',
  ) {}

  async available(): Promise<boolean> {
    return Boolean(this.endpoint.trim());
  }

  async execute(input: ExternalIntelligenceInput): Promise<ExternalIntelligenceOutput> {
    if (!(await this.available())) throw new Error('External intelligence provider is not configured.');
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`External intelligence provider responded ${response.status}.`);
    const payload = await response.json() as any;
    return {
      provider: typeof payload?.provider === 'string' ? payload.provider : this.name,
      mode: input.mode ?? 'research',
      summary: typeof payload?.summary === 'string' ? payload.summary : JSON.stringify(payload),
      evidence: Array.isArray(payload?.evidence) ? payload.evidence : [],
      raw: payload,
    };
  }
}

export class LocalExternalIntelligenceProvider implements ExternalIntelligenceProvider {
  readonly name = 'local-fallback';
  async available(): Promise<boolean> { return true; }
  async execute(input: ExternalIntelligenceInput): Promise<ExternalIntelligenceOutput> {
    return {
      provider: this.name,
      mode: input.mode ?? 'research',
      summary: `External research is not configured. Objective retained for an external provider: ${input.objective}`,
      evidence: [],
    };
  }
}

export function registerExternalIntelligenceCapability(
  registry: RuntimeCapabilityRegistry,
  providers: ExternalIntelligenceProvider[] = [new HttpExternalIntelligenceProvider(), new LocalExternalIntelligenceProvider()],
): void {
  registry.register<ExternalIntelligenceInput, ExternalIntelligenceOutput>({
    name: 'intelligence.external',
    async execute(input: ExternalIntelligenceInput, _context: CapabilityExecutionContext<ExternalIntelligenceInput>) {
      if (!input.objective?.trim()) throw new Error('External intelligence objective is required.');
      for (const provider of providers) {
        if (await provider.available()) return provider.execute({ ...input, mode: input.mode ?? 'research' });
      }
      throw new Error('No external intelligence provider is available.');
    },
  });
}
