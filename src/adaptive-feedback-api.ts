import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  JsonOutcomeStore,
  OutcomeFeedbackAuditBackpressureError,
  OutcomeFeedbackValidationError,
  OutcomeNotFoundError,
  type OutcomeStore,
} from './adaptive-execution.js';
import { JsonBodyValidationError, json, readJsonBody } from './http.js';
import { mobileAuthorized } from './mobile-api.js';
import { redactSecrets } from './secret-redaction.js';

const routeNotFound = (request: IncomingMessage, response: ServerResponse): void => json(
  request,
  response,
  404,
  { error: 'Adaptive feedback route not found', code: 'ADAPTIVE_FEEDBACK_ROUTE_NOT_FOUND' },
);

function feedbackOutcomeId(request: IncomingMessage): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  } catch {
    return undefined;
  }
  const match = pathname.match(/^\/api\/adaptive\/outcomes\/([^/]+)\/feedback$/);
  if (!match) return undefined;
  try {
    const decoded = decodeURIComponent(match[1]);
    return decoded && !decoded.includes('/') ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export function createAdaptiveFeedbackHandler(store: OutcomeStore = new JsonOutcomeStore()) {
  return async function handleAdaptiveFeedbackApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method === 'OPTIONS') return json(request, response, 204, {});
    if (!mobileAuthorized(request)) return json(request, response, 401, { error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' });

    const outcomeId = feedbackOutcomeId(request);
    if (request.method !== 'POST' || !outcomeId) return routeNotFound(request, response);

    try {
      const input = await readJsonBody(request, 2_000);
      const updated = await store.recordFeedback(outcomeId, input);
      return json(request, response, 200, redactSecrets(updated));
    } catch (error) {
      if (error instanceof JsonBodyValidationError || error instanceof OutcomeFeedbackValidationError) {
        return json(request, response, 400, { error: 'Invalid adaptive feedback', code: 'ADAPTIVE_FEEDBACK_INVALID' });
      }
      if (error instanceof OutcomeNotFoundError) {
        return json(request, response, 404, { error: 'Outcome not found', code: 'ADAPTIVE_OUTCOME_NOT_FOUND' });
      }
      if (error instanceof OutcomeFeedbackAuditBackpressureError) {
        return json(request, response, 503, { error: 'Adaptive feedback audit is temporarily unavailable', code: 'ADAPTIVE_FEEDBACK_AUDIT_BACKPRESSURE' });
      }
      return json(request, response, 500, { error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}

export const handleAdaptiveFeedbackApi = createAdaptiveFeedbackHandler();
