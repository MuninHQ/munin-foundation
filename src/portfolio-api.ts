import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { loadPortfolioSnapshot } from './portfolio-intelligence.js';

export async function handlePortfolio(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  if (request.method === 'GET' && (url.pathname === '/api/portfolio' || url.pathname === '/api/portfolio/summary')) {
    try {
      const snapshot = await loadPortfolioSnapshot();
      const body = url.pathname.endsWith('/summary')
        ? { source: snapshot.source, generatedAt: snapshot.generatedAt, counts: snapshot.counts }
        : snapshot;
      return json(request, response, 200, body);
    } catch (error) {
      return json(request, response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  return json(request, response, 404, { error: 'Not found' });
}
