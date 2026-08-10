/**
 * Unified Munin API server.
 *
 * A single Node process serving every module on one port (default 4310):
 *
 *   /api/visual-assets/*       → Visual Asset Library + Visual Intelligence
 *   /api/linkedin-composer/*   → LinkedIn Composer + Trusted Source Radar
 *   /api/context-memory/*      → governed Context Memory
 *   /api/executive-briefing/*  → Executive Briefing
 *   /api/*                     → core workspace (projects, career, research,
 *                                inbox, settings, assistant, intelligence)
 *
 * Route prefixes are disjoint, so each request is dispatched to exactly one
 * handler. The per-module entrypoints (api.ts, visual-assets-api.ts, …) still
 * work standalone for backwards compatibility, but the workspace launcher now
 * starts only this process.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleApi, startBackgroundJobs } from './api.js';
import { handleVisualAssets } from './visual-assets-api.js';
import { handleLinkedInComposer } from './linkedin-composer-api.js';
import { handleContextMemory } from './context-memory-api.js';
import { handleExecutiveBriefing } from './executive-briefing-api.js';
import { apiPort } from './config.js';

type Handler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

const routes: Array<[prefix: string, handler: Handler]> = [
  ['/api/visual-assets', handleVisualAssets],
  ['/api/linkedin-composer', handleLinkedInComposer],
  ['/api/context-memory', handleContextMemory],
  ['/api/executive-briefing', handleExecutiveBriefing],
];

export async function handleUnified(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  for (const [prefix, handler] of routes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return handler(request, response);
  }
  return handleApi(request, response);
}

export function createUnifiedServer() {
  startBackgroundJobs();
  return createServer((request, response) => void handleUnified(request, response));
}

if (process.argv[1]?.endsWith('server.js')) {
  const port = apiPort();
  createUnifiedServer().listen(port, '127.0.0.1', () =>
    console.log(`Munin API (unified) running at http://127.0.0.1:${port}`),
  );
}
