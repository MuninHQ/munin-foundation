import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { json, readJsonBody } from './http.js';
import { mobileAuthorized } from './mobile-api.js';
import { JsonHostJobQueue } from './json-host-job-queue.js';
import { HostBridgeWorker } from './host-bridge-worker.js';
import { validateHostJob, type HostJobType } from './host-bridge-protocol.js';

const queuePath = resolve(process.cwd(), 'data', 'runtime', 'host-bridge-queue.json');
const worker = new HostBridgeWorker({ queuePath });
const queue: JsonHostJobQueue = worker.queue;
let activeDrain: Promise<number> | undefined;
function drainQueue(): Promise<number> {
  if (!activeDrain) activeDrain = worker.runUntilEmpty().finally(() => { activeDrain = undefined; });
  return activeDrain;
}
const ALLOWED: ReadonlySet<HostJobType> = new Set(['runtime-health','git-fast-forward','deploy-main','restart-munin','run-acceptance','tailscale-health']);

function parseType(value: unknown): HostJobType | undefined {
  return typeof value === 'string' && ALLOWED.has(value as HostJobType) ? value as HostJobType : undefined;
}

export async function handleHostMobileApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  if (!mobileAuthorized(request)) return json(request, response, 401, { error:'Unauthorized', code:'MOBILE_AUTH_REQUIRED' });
  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/mobile/host/jobs') {
      void drainQueue();
      const jobs = await queue.list();
      return json(request, response, 200, { jobs: jobs.slice(-50).reverse() });
    }
    if (request.method === 'POST' && url.pathname === '/api/mobile/host/jobs') {
      const input = await readJsonBody(request, 20_000);
      const type = parseType(input.type);
      if (!type) return json(request, response, 400, { error:'Unsupported Host Bridge job type.' });
      const job = {
        id: `host-${Date.now().toString(36)}-${randomUUID().slice(0,8)}`,
        type,
        dryRun: input.dryRun === true,
        createdAt: new Date().toISOString(),
        ...(type === 'git-fast-forward'||type==='deploy-main' ? { repo:'MuninHQ/munin-foundation' as const, branch:'main' as const } : {}),
      };
      const gate = validateHostJob(job);
      if (gate.status !== 'approved') return json(request, response, 400, gate);
      const queued = await queue.enqueue(job);
      json(request, response, 202, queued);
      void drainQueue();
      return;
    }
    return json(request, response, 404, { error:'Host Bridge mobile route not found' });
  } catch (error) {
    return json(request, response, 400, { error:error instanceof Error ? error.message : String(error) });
  }
}
