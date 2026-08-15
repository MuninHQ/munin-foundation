import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AutonomousGoalRunner } from './autonomous-runner.js';
import { executeAssistantCommand } from './assistant.js';
import { json, readJsonBody, requireText as text } from './http.js';
import { MuninService } from './service.js';
import { ContextStore } from './store.js';
import { ContinuityMemoryStore, type MemoryInput } from './continuity-memory.js';
import { chatGptExportSummary, parseChatGptExport } from './chatgpt-export.js';
import { ProjectMemoryStore, type ProjectMemoryInput } from './project-memory.js';
import { MemoryReviewQueue } from './memory-review-queue.js';

const store = new ContextStore();
const service = new MuninService(store);
const continuity = new ContinuityMemoryStore();
const projectMemory = new ProjectMemoryStore();
const memoryReview = new MemoryReviewQueue();

function configuredToken(): string | undefined { const value = process.env.MUNIN_MOBILE_TOKEN?.trim(); return value || undefined; }
function tokenMatches(candidate: string, expected: string): boolean { const left = Buffer.from(candidate); const right = Buffer.from(expected); return left.length === right.length && timingSafeEqual(left, right); }
export function mobileAuthorized(request: IncomingMessage): boolean { const expected = configuredToken(); if (!expected) return false; const authorization = request.headers.authorization ?? ''; const match = authorization.match(/^Bearer\s+(.+)$/i); return Boolean(match?.[1] && tokenMatches(match[1], expected)); }

export async function handleMobileApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  if (!mobileAuthorized(request)) return json(request, response, 401, { error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' });
  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/mobile/health') return json(request, response, 200, { status: 'ok', service: 'munin-mobile-gateway' });
    if (request.method === 'GET' && url.pathname === '/api/mobile/home') {
      const state = await store.load();
      const goals = state.goals.filter(goal => ['planned', 'active', 'blocked'].includes(goal.status)).sort((a, b) => a.priority.localeCompare(b.priority) || b.progress - a.progress).slice(0, 8);
      const pendingActions = state.actions.filter(action => ['planned', 'active', 'blocked'].includes(action.status)).sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 10);
      const reviewItems=await memoryReview.list();
      return json(request, response, 200, { generatedAt: new Date().toISOString(), goals, pendingActions, decisions: state.decisions.filter(decision => decision.status === 'required').slice(0, 8), continuityMemory: await continuity.stats(), projectMemory: await projectMemory.stats(), memoryReview:{pending:reviewItems.length} });
    }
    if (request.method === 'GET' && url.pathname === '/api/mobile/memory/stats') return json(request, response, 200, await continuity.stats());
    if (request.method === 'GET' && url.pathname === '/api/mobile/memory/list') return json(request, response, 200, { records: await continuity.list(url.searchParams.get('includeStale') !== '0') });
    if (request.method === 'GET' && url.pathname === '/api/mobile/memory/export') return json(request, response, 200, await continuity.export());
    if (request.method === 'GET' && url.pathname === '/api/mobile/memory/search') { const query = url.searchParams.get('q')?.trim() ?? ''; if (!query) return json(request, response, 400, { error: 'q is required' }); return json(request, response, 200, { query, records: await continuity.search(query, 20) }); }
    if (request.method === 'GET' && url.pathname === '/api/mobile/memory/review') return json(request,response,200,{items:await memoryReview.list()});
    const reviewItem=url.pathname.match(/^\/api\/mobile\/memory\/review\/([^/]+)\/(approve|drop)$/);
    if(request.method==='POST'&&reviewItem){const [,id,action]=reviewItem;return json(request,response,200,action==='approve'?await memoryReview.approve(id):await memoryReview.drop(id));}
    const memoryRecord = url.pathname.match(/^\/api\/mobile\/memory\/records\/([^/]+)$/);
    if (request.method === 'GET' && memoryRecord) { const record = await continuity.get(memoryRecord[1]); return record ? json(request, response, 200, record) : json(request, response, 404, { error: 'Memory record not found' }); }
    if (request.method === 'PATCH' && memoryRecord) { const input = await readJsonBody(request, 100_000); const subject=text(input.subject,'subject'); const content=text(input.content,'content'); const tags=Array.isArray(input.tags)?input.tags.filter((item):item is string=>typeof item==='string'):[]; return json(request,response,200,await continuity.correct(memoryRecord[1],{subject,content,tags,confidence:input.confidence==='inferred'?'inferred':'confirmed',lastConfirmedAt:typeof input.lastConfirmedAt==='string'?input.lastConfirmedAt:undefined})); }
    if (request.method === 'DELETE' && memoryRecord) { await continuity.backup(); return json(request,response,200,await continuity.remove(memoryRecord[1])); }
    if (request.method === 'DELETE' && url.pathname === '/api/mobile/memory') return json(request,response,200,await continuity.clear());
    if (request.method === 'POST' && url.pathname === '/api/mobile/memory/import') { const input = await readJsonBody(request, 1_000_000); const records = Array.isArray(input.records) ? input.records as MemoryInput[] : []; if (!records.length) return json(request, response, 400, { error: 'records must be a non-empty array' }); return json(request, response, 200, await continuity.import(records)); }
    if (request.method === 'POST' && url.pathname === '/api/mobile/memory/import-chatgpt') { const input = await readJsonBody(request, 100_000_000); const conversations = Array.isArray(input) ? input : input.conversations; if (!Array.isArray(conversations)) return json(request, response, 400, { error: 'Expected ChatGPT conversations array.' }); const records = parseChatGptExport(conversations); if (!records.length) return json(request, response, 400, { error: 'No user-authored continuity records found in this export.' }); const backup = await continuity.backup(); const result = await continuity.import(records); return json(request, response, 200, { summary: chatGptExportSummary(records), result, backup }); }
    if (request.method === 'POST' && url.pathname === '/api/mobile/memory/backup') return json(request, response, 200, await continuity.backup());
    if (request.method === 'GET' && url.pathname === '/api/mobile/project-memory/stats') return json(request, response, 200, await projectMemory.stats());
    if (request.method === 'GET' && url.pathname === '/api/mobile/project-memory/search') { const query = url.searchParams.get('q')?.trim() ?? ''; if (!query) return json(request, response, 400, { error: 'q is required' }); return json(request, response, 200, { query, records: await projectMemory.search(query, 30) }); }
    if (request.method === 'GET' && url.pathname === '/api/mobile/project-memory/state') { const query = url.searchParams.get('q')?.trim() || 'munin'; return json(request, response, 200, await projectMemory.reconstruct(query)); }
    if (request.method === 'POST' && url.pathname === '/api/mobile/project-memory/capture') { const input = await readJsonBody(request, 500_000); return json(request, response, 200, await projectMemory.capture(input as ProjectMemoryInput)); }
    if (request.method === 'POST' && url.pathname === '/api/mobile/project-memory/backup') return json(request, response, 200, await projectMemory.backup());
    if (request.method === 'GET' && url.pathname === '/api/mobile/project-memory/export') return json(request, response, 200, { markdown: await projectMemory.exportMarkdown() });
    if (request.method === 'GET' && url.pathname === '/api/mobile/sitrep') return json(request, response, 200, { report: await service.sitrep() });
    if (request.method === 'POST' && url.pathname === '/api/mobile/assistant') { const input = await readJsonBody(request, 200_000); return json(request, response, 200, await executeAssistantCommand(text(input.command, 'command'))); }
    if (request.method === 'POST' && url.pathname === '/api/mobile/goal-loop') { const input = await readJsonBody(request, 50_000); const requested = Number(input.maxCycles ?? 5); const maxCycles = Number.isInteger(requested) ? requested : 5; return json(request, response, 200, await new AutonomousGoalRunner(store).run(maxCycles)); }
    const execute = url.pathname.match(/^\/api\/mobile\/actions\/([^/]+)\/complete$/);
    if (request.method === 'POST' && execute) { const input = await readJsonBody(request, 100_000); const outcome = typeof input.outcome === 'string' && input.outcome.trim() ? input.outcome.trim() : 'Completed from mobile'; return json(request, response, 200, await service.execute(execute[1], outcome)); }
    return json(request, response, 404, { error: 'Mobile route not found' });
  } catch (error) { return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) }); }
}
