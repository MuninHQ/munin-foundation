import { browserHealth, browserOperatorPolicy, inspectBrowserReadOnly, validateBrowserInspectionUrl, type BrowserBackend } from './browser-operator.js';
import { RuntimeCapabilityRegistry, type CapabilityExecutionContext, type RuntimeCapability } from './runtime-capability-seam.js';

export type BrowserCapabilityInput =
  | { action: 'health'; backend?: BrowserBackend }
  | { action: 'inspect'; url: string; backend?: BrowserBackend };

export interface BrowserCapabilityOutput {
  backend: BrowserBackend;
  available: boolean;
  command: string;
  detail?: string;
  url?: string;
  snapshot?: string;
  readOnly?: true;
  policy: ReturnType<typeof browserOperatorPolicy>;
}

export function createBrowserCapability(): RuntimeCapability<BrowserCapabilityInput, BrowserCapabilityOutput> {
  return {
    name: 'browser.operator',
    async execute(input: BrowserCapabilityInput, _context: CapabilityExecutionContext<BrowserCapabilityInput>): Promise<BrowserCapabilityOutput> {
      if (input.action === 'health') {
        const health = await browserHealth(input.backend);
        return { ...health, policy: browserOperatorPolicy() };
      }
      if (input.action === 'inspect') {
        const inspection = await inspectBrowserReadOnly(input.url, input.backend);
        return { ...inspection, policy: browserOperatorPolicy() };
      }
      throw new Error(`Unsupported browser action: ${String((input as { action?: unknown }).action)}`);
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
      if (input.action === 'health') return;
      if (input.action === 'inspect') {
        validateBrowserInspectionUrl(input.url);
        if (input.backend && input.backend !== 'playwright-cli') throw new Error('Browser capability blocked: read-only inspection is promoted only for Playwright CLI.');
        return;
      }
      throw new Error('Browser capability blocked: unsupported or unapproved action.');
    },
  });
}
