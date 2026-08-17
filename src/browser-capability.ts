import { browserHealth, browserOperatorPolicy, type BrowserBackend } from './browser-operator.js';
import { RuntimeCapabilityRegistry, type CapabilityExecutionContext, type RuntimeCapability } from './runtime-capability-seam.js';

export interface BrowserCapabilityInput {
  action: 'health';
  backend?: BrowserBackend;
}

export interface BrowserCapabilityOutput {
  backend: BrowserBackend;
  available: boolean;
  command: string;
  detail?: string;
  policy: ReturnType<typeof browserOperatorPolicy>;
}

export function createBrowserCapability(): RuntimeCapability<BrowserCapabilityInput, BrowserCapabilityOutput> {
  return {
    name: 'browser.operator',
    async execute(input: BrowserCapabilityInput, _context: CapabilityExecutionContext<BrowserCapabilityInput>): Promise<BrowserCapabilityOutput> {
      if (input.action !== 'health') throw new Error(`Unsupported browser action: ${String(input.action)}`);
      const health = await browserHealth(input.backend);
      return { ...health, policy: browserOperatorPolicy() };
    },
  };
}

export function registerBrowserCapability(registry: RuntimeCapabilityRegistry) {
  return registry.register(createBrowserCapability());
}

export function installBrowserPolicyGate(registry: RuntimeCapabilityRegistry) {
  return registry.intercept({
    name: 'browser-policy-gate',
    phase: 'before',
    run(context) {
      if (context.capability !== 'browser.operator') return;
      const input = context.input as BrowserCapabilityInput;
      if (input.action !== 'health') throw new Error('Browser capability blocked: only non-destructive health action is allowed in the experimental seam.');
    },
  });
}
