import type { RuntimeCapabilityRegistry } from './runtime-capability-seam.js';

export type MuninMcpCommand =
  | 'munin.sitrep'
  | 'munin.build'
  | 'munin.career.analyze'
  | 'munin.memory.search'
  | 'munin.linkedin.compose'
  | 'munin.intelligence.research'
  | 'munin.engineering.review';

export interface MuninMcpRequest {
  command: MuninMcpCommand;
  arguments?: Record<string, unknown>;
}

export interface MuninMcpResponse {
  command: MuninMcpCommand;
  ok: boolean;
  capability?: string;
  result?: unknown;
  error?: string;
}

export interface MuninMcpBinding {
  command: MuninMcpCommand;
  capability: string;
}

const DEFAULT_BINDINGS: MuninMcpBinding[] = [
  { command: 'munin.intelligence.research', capability: 'intelligence.external' },
  { command: 'munin.engineering.review', capability: 'engineering.independent-review' },
];

export class MuninMcpBridge {
  private readonly bindings = new Map<MuninMcpCommand, string>();

  constructor(
    private readonly registry: RuntimeCapabilityRegistry,
    bindings: MuninMcpBinding[] = DEFAULT_BINDINGS,
  ) {
    for (const binding of bindings) this.bindings.set(binding.command, binding.capability);
  }

  bind(command: MuninMcpCommand, capability: string): void {
    if (!capability.trim()) throw new Error('MCP capability binding is required.');
    this.bindings.set(command, capability);
  }

  list(): MuninMcpBinding[] {
    return [...this.bindings.entries()].map(([command, capability]) => ({ command, capability }));
  }

  async invoke(request: MuninMcpRequest): Promise<MuninMcpResponse> {
    const capability = this.bindings.get(request.command);
    if (!capability) return { command: request.command, ok: false, error: 'Command is not bound to a runtime capability.' };
    if (!this.registry.has(capability)) return { command: request.command, ok: false, capability, error: 'Bound runtime capability is not registered.' };

    try {
      const execution = await this.registry.execute(capability, request.arguments ?? {}, {
        source: 'munin-mcp-bridge',
        command: request.command,
      });
      return { command: request.command, ok: true, capability, result: execution.output };
    } catch (error) {
      return {
        command: request.command,
        ok: false,
        capability,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
