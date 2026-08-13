import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';

export async function handleOrchestration(request: IncomingMessage, response: ServerResponse): Promise<void> {
  return json(request, response, 404, { error: 'Not found' });
}
