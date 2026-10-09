import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  resolveBrowserInvocation,
  validateBrowserInspectionUrl,
  type BrowserBackend,
} from './browser-operator.js';

const execFileAsync = promisify(execFile);
const SESSION_ID = /^munin-ro-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReadOnlyBrowserSessionState = 'active' | 'closed' | 'error';
export interface ReadOnlyBrowserSessionResult {
  backend: BrowserBackend;
  available: boolean;
  sessionId: string;
  url?: string;
  command: string;
  state: ReadOnlyBrowserSessionState;
  snapshot?: string;
  detail?: string;
  readOnly: true;
  handoff: {
    sessionId: string;
    automaticInputAllowed: false;
    note: string;
  };
}

function browserEnv(): NodeJS.ProcessEnv {
  return { ...process.env, NO_UPDATE_NOTIFIER: '1' };
}

function baseResult(
  backend: BrowserBackend,
  sessionId: string,
  state: ReadOnlyBrowserSessionState,
  available: boolean,
): ReadOnlyBrowserSessionResult {
  const invocation = resolveBrowserInvocation(backend);
  return {
    backend,
    available,
    sessionId,
    command: invocation.displayCommand,
    state,
    readOnly: true,
    handoff: {
      sessionId,
      automaticInputAllowed: false,
      note: 'The named Playwright session may be inspected or taken over manually; Munin does not type, click, or submit through this read-only capability.',
    },
  };
}

export function validateReadOnlyBrowserSessionId(value: string): string {
  if (!SESSION_ID.test(value)) throw new Error('Invalid Munin read-only browser session id.');
  return value.toLowerCase();
}

function argsFor(backend: BrowserBackend, sessionId: string, values: string[]): { command: string; args: string[]; displayCommand: string } {
  const invocation = resolveBrowserInvocation(backend);
  return {
    command: invocation.command,
    args: [...invocation.argsPrefix, `-s=${sessionId}`, ...values],
    displayCommand: invocation.displayCommand,
  };
}

export async function openReadOnlyBrowserSession(
  rawUrl: string,
  backend: BrowserBackend = 'playwright-cli',
): Promise<ReadOnlyBrowserSessionResult> {
  const url = validateBrowserInspectionUrl(rawUrl);
  const sessionId = `munin-ro-${randomUUID()}`;
  if (backend !== 'playwright-cli') {
    return {
      ...baseResult(backend, sessionId, 'error', false),
      url,
      detail: 'Read-only persistent sessions are promoted only for Playwright CLI.',
    };
  }
  const invocation = argsFor(backend, sessionId, ['open', url]);
  let opened = false;
  try {
    await execFileAsync(invocation.command, invocation.args, {
      timeout: 45_000,
      windowsHide: true,
      maxBuffer: 2_000_000,
      env: browserEnv(),
    });
    opened = true;
    const snapshotInvocation = argsFor(backend, sessionId, ['snapshot', '--depth=6']);
    const snapshot = await execFileAsync(snapshotInvocation.command, snapshotInvocation.args, {
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 2_000_000,
      env: browserEnv(),
    });
    return {
      ...baseResult(backend, sessionId, 'active', true),
      url,
      snapshot: String(snapshot.stdout ?? '').trim().slice(0, 120_000),
    };
  } catch (error) {
    if (opened) {
      try {
        const close = argsFor(backend, sessionId, ['close']);
        await execFileAsync(close.command, close.args, {
          timeout: 10_000,
          windowsHide: true,
          maxBuffer: 200_000,
          env: browserEnv(),
        });
      } catch {
        // best-effort cleanup
      }
    }
    return {
      ...baseResult(backend, sessionId, 'error', false),
      url,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function snapshotReadOnlyBrowserSession(
  rawSessionId: string,
  backend: BrowserBackend = 'playwright-cli',
): Promise<ReadOnlyBrowserSessionResult> {
  const sessionId = validateReadOnlyBrowserSessionId(rawSessionId);
  if (backend !== 'playwright-cli') {
    return {
      ...baseResult(backend, sessionId, 'error', false),
      detail: 'Read-only persistent sessions are promoted only for Playwright CLI.',
    };
  }
  const invocation = argsFor(backend, sessionId, ['snapshot', '--depth=6']);
  try {
    const snapshot = await execFileAsync(invocation.command, invocation.args, {
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 2_000_000,
      env: browserEnv(),
    });
    return {
      ...baseResult(backend, sessionId, 'active', true),
      snapshot: String(snapshot.stdout ?? '').trim().slice(0, 120_000),
    };
  } catch (error) {
    return {
      ...baseResult(backend, sessionId, 'error', false),
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeReadOnlyBrowserSession(
  rawSessionId: string,
  backend: BrowserBackend = 'playwright-cli',
): Promise<ReadOnlyBrowserSessionResult> {
  const sessionId = validateReadOnlyBrowserSessionId(rawSessionId);
  if (backend !== 'playwright-cli') {
    return {
      ...baseResult(backend, sessionId, 'error', false),
      detail: 'Read-only persistent sessions are promoted only for Playwright CLI.',
    };
  }
  const invocation = argsFor(backend, sessionId, ['close']);
  try {
    await execFileAsync(invocation.command, invocation.args, {
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 200_000,
      env: browserEnv(),
    });
    return baseResult(backend, sessionId, 'closed', true);
  } catch (error) {
    return {
      ...baseResult(backend, sessionId, 'error', false),
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
