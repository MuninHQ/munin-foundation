import type { IncomingMessage, ServerResponse } from 'node:http';
import { MuninControlRoomOrchestrator } from './control-room-orchestrator.js';
import { json, readJsonBody, requireText } from './http.js';

const orchestrator = new MuninControlRoomOrchestrator();

export async function handleControlRoomApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  try {
    if (request.method === 'POST' && pathname === '/api/orchestrate') {
      const input = await readJsonBody(request, 1_000_000);
      const objective = requireText(input.objective, 'objective');
      const context = input.context && typeof input.context === 'object' && !Array.isArray(input.context)
        ? input.context as Record<string, unknown>
        : undefined;
      const result = await orchestrator.execute({ objective, context });
      return json(request, response, result.status === 'blocked' ? 409 : 200, result);
    }
    return json(request, response, 404, { error: 'Not found' });
  } catch (error) {
    return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
