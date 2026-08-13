import type { IncomingMessage, ServerResponse } from 'node:http';
import { CouncilOrchestrator } from './council.js';
import { json, readJsonBody, requireText } from './http.js';
import { OllamaProvider } from './ollama-provider.js';

function provider(): OllamaProvider {
  return new OllamaProvider();
}

export async function handleCouncil(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  try {
    if (request.method === 'GET' && url.pathname === '/api/council/health') {
      return json(request, response, 200, await provider().health());
    }
    if (request.method === 'POST' && url.pathname === '/api/council/deliberate') {
      const body = await readJsonBody(request, 1_000_000);
      const objective = requireText(body.objective, 'objective');
      const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context)
        ? body.context as Record<string, unknown>
        : {};
      const result = await new CouncilOrchestrator(provider()).deliberate({ objective, context });
      return json(request, response, 200, result);
    }
    return json(request, response, 404, { error: 'Not found' });
  } catch (error) {
    return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
