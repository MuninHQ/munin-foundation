import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ContextStore } from './store.js';
import { MuninService } from './service.js';
import { buildKnowledgeGraph, buildTimeline, generateDailyBrief, generateInsights, resolveContext } from './intelligence.js';
import type { JobStatus, Priority, Status } from './types.js';

const store = new ContextStore();
const service = new MuninService(store);

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' });
  response.end(JSON.stringify(body));
}
async function body(request: IncomingMessage): Promise<Record<string, unknown>> { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); if (!chunks.length) return {}; const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON object body required'); return parsed as Record<string, unknown>; }
function text(value: unknown, field: string): string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`); return value.trim(); }

export async function handleApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', service: 'munin-workspace' });
    if (request.method === 'GET' && url.pathname === '/api/workspace') { const state = await store.load(); const events = await store.events(); const careerQueue = await service.careerQueue(); return json(response, 200, { state, events: events.slice(-20).reverse(), careerQueue, intelligence: { dailyBrief: generateDailyBrief(state), timeline: buildTimeline(state, events, 30), graph: buildKnowledgeGraph(state), insights: generateInsights(state).slice(0, 20) } }); }
    if (request.method === 'GET' && url.pathname === '/api/sitrep') return json(response, 200, { report: await service.sitrep() });
    if (request.method === 'GET' && url.pathname === '/api/intelligence/timeline') { const state = await store.load(); return json(response, 200, { items: buildTimeline(state, await store.events(), Number(url.searchParams.get('limit') ?? 100)) }); }
    if (request.method === 'GET' && url.pathname === '/api/intelligence/graph') return json(response, 200, buildKnowledgeGraph(await store.load()));
    if (request.method === 'GET' && url.pathname === '/api/intelligence/daily-brief') return json(response, 200, generateDailyBrief(await store.load()));
    if (request.method === 'GET' && url.pathname === '/api/intelligence/insights') return json(response, 200, { items: generateInsights(await store.load()) });
    if (request.method === 'GET' && url.pathname === '/api/intelligence/context') return json(response, 200, { query: url.searchParams.get('q') ?? '', matches: resolveContext(await store.load(), url.searchParams.get('q') ?? '') });
    if (request.method === 'POST' && url.pathname === '/api/projects') { const input = await body(request); return json(response, 201, await service.addProject(text(input.name, 'name'), (input.priority as Priority | undefined) ?? 'P1')); }
    if (request.method === 'POST' && url.pathname === '/api/actions') { const input = await body(request); return json(response, 201, await service.addAction(text(input.title, 'title'), (input.priority as Priority | undefined) ?? 'P1', typeof input.projectId === 'string' && input.projectId ? input.projectId : undefined)); }
    if (request.method === 'POST' && url.pathname === '/api/jobs') { const input = await body(request); return json(response, 201, await service.addJob(text(input.company, 'company'), text(input.role, 'role'), typeof input.description === 'string' ? input.description : '')); }
    if (request.method === 'POST' && url.pathname === '/api/research') { const input = await body(request); return json(response, 201, await service.addResearch(text(input.question, 'question'), typeof input.projectId === 'string' && input.projectId ? input.projectId : undefined)); }
    const project = url.pathname.match(/^\/api\/projects\/([^/]+)$/); if (request.method === 'PATCH' && project) { const input = await body(request); return json(response, 200, await service.updateProject(project[1], text(input.status, 'status') as Status, typeof input.nextAction === 'string' ? input.nextAction : undefined)); }
    const job = url.pathname.match(/^\/api\/jobs\/([^/]+)$/); if (request.method === 'PATCH' && job) { const input = await body(request); return json(response, 200, await service.updateJob(job[1], text(input.status, 'status') as JobStatus, typeof input.nextAction === 'string' ? input.nextAction : undefined)); }
    const touch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/touch$/); if (request.method === 'POST' && touch) { const input = await body(request); return json(response, 200, await service.touchJob(touch[1], typeof input.note === 'string' ? input.note : undefined)); }
    const action = url.pathname.match(/^\/api\/actions\/([^/]+)\/complete$/); if (request.method === 'POST' && action) { const input = await body(request); return json(response, 200, await service.execute(action[1], typeof input.outcome === 'string' && input.outcome.trim() ? input.outcome.trim() : 'Completed')); }
    const evidence = url.pathname.match(/^\/api\/research\/([^/]+)\/evidence$/); if (request.method === 'POST' && evidence) { const input = await body(request); return json(response, 201, await service.addEvidence(evidence[1], text(input.title, 'title'), text(input.url, 'url'), (input.sourceType as 'primary' | 'secondary' | undefined) ?? 'secondary', typeof input.note === 'string' ? input.note : undefined)); }
    const synthesis = url.pathname.match(/^\/api\/research\/([^/]+)\/synthesize$/); if (request.method === 'POST' && synthesis) { const input = await body(request); return json(response, 201, await service.synthesizeResearch(synthesis[1], text(input.summary, 'summary'))); }
    return json(response, 404, { error: 'Not found' });
  } catch (error) { return json(response, 400, { error: error instanceof Error ? error.message : String(error) }); }
}
export function createApiServer() { return createServer((request, response) => void handleApi(request, response)); }
if (process.argv[1]?.endsWith('api.js')) { const port = Number(process.env.MUNIN_API_PORT ?? 4310); createApiServer().listen(port, '127.0.0.1', () => console.log(`Munin API running at http://127.0.0.1:${port}`)); }
