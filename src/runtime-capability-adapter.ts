import { registerAutonomousLoopCapability, type AutonomousLoopCapabilityInput } from './autonomous-loop-capability.js';
import type { AutonomousRunResult } from './autonomous-execution-loop.js';
import { installBrowserPolicyGate, registerBrowserCapability, type BrowserCapabilityInput, type BrowserCapabilityOutput } from './browser-capability.js';
import { ExecutionEngine } from './runtime.js';
import { RuntimeCapabilityRegistry, type CapabilityExecutionResult } from './runtime-capability-seam.js';

export interface RuntimeCapabilityAdapterOptions {
  enabled?: boolean;
  registry?: RuntimeCapabilityRegistry;
}

export class RuntimeCapabilityAdapter {
  readonly registry: RuntimeCapabilityRegistry;
  readonly enabled: boolean;

  constructor(
    readonly engine: ExecutionEngine,
    options: RuntimeCapabilityAdapterOptions = {},
  ) {
    this.enabled = options.enabled ?? process.env.MUNIN_RUNTIME_CAPABILITIES === '1';
    this.registry = options.registry ?? new RuntimeCapabilityRegistry();
    if (this.enabled) {
      if (!this.registry.has('browser.operator')) {
        registerBrowserCapability(this.registry);
        installBrowserPolicyGate(this.registry);
      }
      registerAutonomousLoopCapability(this.registry);
    }
  }

  capabilityNames(): string[] {
    return this.enabled ? this.registry.list() : [];
  }

  async browser(input: BrowserCapabilityInput): Promise<CapabilityExecutionResult<BrowserCapabilityOutput>> {
    this.assertEnabled();
    return this.registry.execute<BrowserCapabilityInput, BrowserCapabilityOutput>('browser.operator', input, {
      source: 'execution-engine-adapter',
      experimental: true,
    });
  }

  async autonomousLoop(input: AutonomousLoopCapabilityInput): Promise<CapabilityExecutionResult<AutonomousRunResult>> {
    this.assertEnabled();
    return this.registry.execute<AutonomousLoopCapabilityInput, AutonomousRunResult>('execution.autonomous-loop', input, {
      source: 'execution-engine-adapter',
      experimental: true,
    });
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new Error('Runtime capability seam is disabled. Set MUNIN_RUNTIME_CAPABILITIES=1 to opt in.');
  }
}

export function createRuntimeCapabilityAdapter(
  engine = new ExecutionEngine(),
  options: RuntimeCapabilityAdapterOptions = {},
): RuntimeCapabilityAdapter {
  return new RuntimeCapabilityAdapter(engine, options);
}
