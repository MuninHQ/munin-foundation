import { browserHealth, browserOperatorPolicy, inspectBrowserReadOnly, validateBrowserInspectionUrl, type BrowserBackend } from './browser-operator.js';
import {
  closeReadOnlyBrowserSession,
  openReadOnlyBrowserSession,
  snapshotReadOnlyBrowserSession,
  validateReadOnlyBrowserSessionId,
  type ReadOnlyBrowserSessionState,
} from './browser-session.js';
import { RuntimeCapabilityRegistry, type CapabilityExecutionContext, type RuntimeCapability } from './runtime-capability-seam.js';

export type BrowserCapabilityInput =
  | { action: 'health'; backend?: BrowserBackend }
  | { action: 'inspect'; url: string; backend?: BrowserBackend }
  | { action: 'session_open'; url: string; backend?: BrowserBackend }
  | { action: 'session_snapshot'; sessionId: string; backend?: BrowserBackend }
  | { action: 'session_close'; sessionId: string; backend?: BrowserBackend };

export interface BrowserCapabilityOutput {
  backend: BrowserBackend;
  available: boolean;
  command: string;
  detail?: string;
  url?: string;
  snapshot?: string;
  readOnly?: true;
  sessionId?: string;
  state?: ReadOnlyBrowserSessionState;
  handoff?: {
    sessionId: string;
    automaticInputAllowed: false;
    note: string;
  };
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
      if (input.action === 'session_open') {
        const session = await openReadOnlyBrowserSession(input.url, input.backend);
        return { ...session, policy: browserOperatorPolicy() };
      }
      if (input.action === 'session_snapshot') {
        const session = await snapshotReadOnlyBrowserSession(input.sessionId, input.backend);
        return { ...session, policy: browserOperatorPolicy() };
      }
      if (input.action === 'session_close') {
        const session = await closeReadOnlyBrowserSession(input.sessionId, input.backend);
        return { ...session, policy: browserOperatorPolicy() };
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
      if (input.action === 'inspect' || input.action === 'session_open') {
        validateBrowserInspectionUrl(input.url);
        if (input.backend && input.backend !== 'playwright-cli') throw new Error('Browser capability blocked: read-only inspection and sessions are promoted only for Playwright CLI.');
        return;
      }
      if (input.action === 'session_snapshot' || input.action === 'session_close') {
        validateReadOnlyBrowserSessionId(input.sessionId);
        if (input.backend && input.backend !== 'playwright-cli') throw new Error('Browser capability blocked: read-only sessions are promoted only for Playwright CLI.');
        return;
      }
      throw new Error('Browser capability blocked: unsupported or unapproved action.');
    },
  });
}
