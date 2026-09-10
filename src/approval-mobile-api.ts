import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, readJsonBody } from './http.js';
import { mobileAuthorized } from './mobile-api.js';
import { ApprovalQueue, type ApprovalRecord } from './sentinel.js';
import { ApprovalExecutor } from './approval-executor.js';

function safeNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const note = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 500);
  return note || undefined;
}

export function createApprovalMobileHandler(approvals = new ApprovalQueue(), executor = new ApprovalExecutor(approvals)) {
  return async function handleApprovalMobileApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method === 'OPTIONS') return json(request, response, 204, {});
    if (!mobileAuthorized(request)) return json(request, response, 401, { error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' });
    const url = new URL(request.url ?? '/', 'http://localhost');
    try {
      if (request.method === 'GET' && url.pathname === '/api/mobile/approvals') {
        const items = await approvals.list();
        const executions = await executor.list();
        return json(request, response, 200, { generatedAt: new Date().toISOString(), items: items.slice().reverse(), executions: executions.slice().reverse() });
      }
      const executeMatch = url.pathname.match(/^\/api\/mobile\/approvals\/([^/]+)\/execute$/);
      if (request.method === 'POST' && executeMatch) {
        const execution = await executor.execute(executeMatch[1]);
        return json(request, response, execution.status === 'applied' ? 200 : 409, execution);
      }
      const match = url.pathname.match(/^\/api\/mobile\/approvals\/([^/]+)\/(approve|reject)$/);
      if (request.method === 'POST' && match) {
        const input = await readJsonBody(request, 20_000);
        const status: ApprovalRecord['status'] = match[2] === 'approve' ? 'approved' : 'rejected';
        const approval = await approvals.resolve(match[1], status, safeNote(input.note));
        if (status === 'rejected' || !approval.decision.request.effect) return json(request, response, 200, { approval });
        try {
          const execution = await executor.execute(approval.id);
          return json(request, response, 200, { approval, execution });
        } catch (error) {
          return json(request, response, 200, { approval, execution: { status: 'blocked', error: error instanceof Error ? error.message : String(error) } });
        }
      }
      return json(request, response, 404, { error: 'Approval route not found' });
    } catch (error) {
      return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}

export const handleApprovalMobileApi = createApprovalMobileHandler();
