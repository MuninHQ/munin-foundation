import type { IncomingMessage, ServerResponse } from 'node:http';
import { EfficiencyRuntime } from './efficiency-runtime.js';
import { json, readJsonBody, requireText } from './http.js';
import { prepareManualWebHandoff, type LauncherState } from './manual-web-handoff.js';

const runtime = new EfficiencyRuntime();
function launcher(value: unknown): LauncherState { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; const status = item.status === 'available' || item.status === 'unavailable' ? item.status : 'unknown'; return { status, url: typeof item.url === 'string' ? item.url : undefined, guidance: typeof item.guidance === 'string' ? item.guidance : undefined }; }
export async function handleEfficiencyApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request,response,204,{});
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  try {
    if (request.method === 'GET' && pathname === '/api/efficiency/status') return json(request,response,200,await runtime.status());
    if (request.method === 'POST' && pathname === '/api/efficiency/manual-web-packet') { const input=await readJsonBody(request,100_000);const objective=requireText(input.objective,'objective');const status=await runtime.status();const packet=prepareManualWebHandoff({objective,constraints:['zero mandatory cost','manual send only','no browser automation or response extraction'],buildState:status.buildState,selectedContext:[],responseContract:'Return a concise answer with decisions, evidence, risks, and next action.',launcher:launcher(input.launcher),maxChars:20_000});return json(request,response,201,packet); }
    return json(request,response,404,{error:'Not found'});
  } catch (error) { return json(request,response,400,{error:error instanceof Error?error.message:String(error)}); }
}
