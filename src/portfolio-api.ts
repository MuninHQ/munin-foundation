import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from './http.js';
import { loadPortfolioSnapshot } from './portfolio-intelligence.js';

export async function handlePortfolio(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  if (request.method === 'OPTIONS') {
    return json(request, response, 204, {});
  }

  if (
    request.method === 'GET'
    && (
      url.pathname === '/api/portfolio'
      || url.pathname === '/api/portfolio/summary'
      || url.pathname === '/api/portfolio/health'
    )
  ) {
    try {
      const snapshot = await loadPortfolioSnapshot();

      if (url.pathname.endsWith('/health')) {
        return json(request, response, 200, {
          source: snapshot.source,
          generatedAt: snapshot.generatedAt,
          lastUpdated: snapshot.lastUpdated,
          health: snapshot.health,
        });
      }

      if (url.pathname.endsWith('/summary')) {
        return json(request, response, 200, {
          source: snapshot.source,
          generatedAt: snapshot.generatedAt,
          lastUpdated: snapshot.lastUpdated,
          counts: snapshot.counts,
          health: snapshot.health,
        });
      }

      return json(request, response, 200, snapshot);
    } catch (error) {
      return json(request, response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json(request, response, 404, { error: 'Not found' });
}
