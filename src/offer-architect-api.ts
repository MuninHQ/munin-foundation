import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, readJsonBody } from './http.js';
import { buildOfferArchitecture, type OfferArchitectInput } from './offer-architect.js';
import { assessOfferBackedOpportunity, type OfferOpportunityMeta } from './offer-opportunity-adapter.js';

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(field + ' object is required.');
  return value as Record<string, unknown>;
}

export async function handleOfferArchitectApi(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/offer-architect') {
      return json(request, response, 200, {
        status: 'ok',
        mode: 'zero-cost deterministic core',
        evidenceGate: ['PROVEN', 'ASSUMPTION', 'TEST', 'INVALID'],
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/offer-architect/analyze') {
      const body = await readJsonBody(request, 1_000_000);
      return json(request, response, 200, buildOfferArchitecture(body as unknown as OfferArchitectInput));
    }
    if (request.method === 'POST' && url.pathname === '/api/offer-architect/opportunity') {
      const body = await readJsonBody(request, 1_000_000);
      const offer = object(body.offer, 'offer') as unknown as OfferArchitectInput;
      const opportunity = object(body.opportunity, 'opportunity') as unknown as OfferOpportunityMeta;
      return json(request, response, 200, assessOfferBackedOpportunity(offer, opportunity));
    }
    return json(request, response, 404, { error: 'Offer Architect route not found' });
  } catch (error) {
    return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
