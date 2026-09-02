import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type RequestOptions } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  JsonOutcomeStore,
  type OutcomeStore,
  type OutcomeRecord,
} from '../src/adaptive-execution.js';
import { createAdaptiveFeedbackHandler } from '../src/adaptive-feedback-api.js';
import { ContextStore } from '../src/store.js';

const token = 'test-adaptive-feedback-token';

function outcome(id: string): OutcomeRecord {
  return {
    id,
    taskId: 'task-feedback',
    objective: 'Build adapter with authorization: Bearer private-value',
    capability: 'provider',
    route: { primary: 'builder', reviewers: ['reviewer'], rationale: [] },
    status: 'passed',
    evidence: ['credential token=private-value'],
    lesson: 'Keep local feedback deterministic.',
    tags: ['provider'],
    createdAt: '2026-09-01T12:00:00.000Z',
  };
}

type ApiResponse = { status: number; headers: Record<string, string | string[] | undefined>; text: string };

async function withApi(
  run: (context: {
    request: (pathname: string, options?: { method?: string; authorization?: string; body?: string; origin?: string }) => Promise<ApiResponse>;
    outcomeFile: string;
  }) => Promise<void>,
  storeOverride?: OutcomeStore,
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'munin-adaptive-feedback-api-'));
  const outcomeFile = path.join(root, 'adaptive-outcomes.json');
  const store = new JsonOutcomeStore(outcomeFile, { eventStore: new ContextStore(path.join(root, 'context')) });
  await store.save(outcome('outcome with space'));
  const handler = createAdaptiveFeedbackHandler(storeOverride ?? store);
  const server = createServer((request, response) => void handler(request, response));
  const previousToken = process.env.MUNIN_MOBILE_TOKEN;
  const previousWebPort = process.env.MUNIN_WEB_PORT;
  process.env.MUNIN_MOBILE_TOKEN = token;
  process.env.MUNIN_WEB_PORT = '5173';

  try {
    await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const request = (pathname: string, options: { method?: string; authorization?: string; body?: string; origin?: string } = {}) => new Promise<ApiResponse>((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (options.authorization) headers.authorization = options.authorization;
      if (options.origin) headers.origin = options.origin;
      if (options.body !== undefined) {
        headers['content-type'] = 'application/json';
        headers['content-length'] = String(Buffer.byteLength(options.body));
      }
      const requestOptions: RequestOptions = {
        host: '127.0.0.1',
        port: address.port,
        path: pathname,
        method: options.method ?? 'POST',
        headers,
      };
      const outgoing = httpRequest(requestOptions, incoming => {
        const chunks: Buffer[] = [];
        incoming.on('data', chunk => chunks.push(Buffer.from(chunk)));
        incoming.once('end', () => resolve({
          status: incoming.statusCode ?? 0,
          headers: incoming.headers,
          text: Buffer.concat(chunks).toString('utf8'),
        }));
      });
      outgoing.once('error', reject);
      if (options.body !== undefined) outgoing.write(options.body);
      outgoing.end();
    });

    await run({ request, outcomeFile });
  } finally {
    if (previousToken === undefined) delete process.env.MUNIN_MOBILE_TOKEN;
    else process.env.MUNIN_MOBILE_TOKEN = previousToken;
    if (previousWebPort === undefined) delete process.env.MUNIN_WEB_PORT;
    else process.env.MUNIN_WEB_PORT = previousWebPort;
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}

test('missing or wrong bearer credentials return 401 without changing the outcome store', async () => {
  await withApi(async ({ request, outcomeFile }) => {
    const before = await readFile(outcomeFile);
    for (const authorization of [undefined, 'Bearer wrong-token']) {
      const response = await request('/api/adaptive/outcomes/outcome%20with%20space/feedback', {
        authorization,
        body: JSON.stringify({ rating: 'helpful' }),
      });
      assert.equal(response.status, 401);
      assert.deepEqual(JSON.parse(response.text), { error: 'Unauthorized', code: 'MOBILE_AUTH_REQUIRED' });
      assert.deepEqual(await readFile(outcomeFile), before);
    }
  });
});

test('OPTIONS returns 204 without authentication and permits the bearer CORS header', async () => {
  await withApi(async ({ request }) => {
    const response = await request('/api/adaptive/outcomes/anything/feedback', {
      method: 'OPTIONS',
      origin: 'http://127.0.0.1:5173',
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
    assert.equal(response.headers['access-control-allow-headers'], 'content-type, authorization');
  });
});

test('valid feedback updates the decoded outcome ID and returns a sanitized record', async () => {
  await withApi(async ({ request, outcomeFile }) => {
    const response = await request('/api/adaptive/outcomes/outcome%20with%20space/feedback', {
      authorization: `Bearer ${token}`,
      body: JSON.stringify({ rating: 'helpful', reason: '  Correct routing  ' }),
    });
    assert.equal(response.status, 200);
    const body = JSON.parse(response.text) as OutcomeRecord;
    assert.equal(body.id, 'outcome with space');
    assert.deepEqual(body.feedback && { rating: body.feedback.rating, reason: body.feedback.reason }, { rating: 'helpful', reason: 'Correct routing' });
    assert.equal(body.objective, 'Build adapter with authorization: Bearer [REDACTED]');
    assert.equal(body.evidence[0], 'credential token=[REDACTED]');

    const persisted = JSON.parse(await readFile(outcomeFile, 'utf8')) as { records: OutcomeRecord[] };
    assert.equal(persisted.records[0].feedback?.rating, 'helpful');
    assert.equal(persisted.records[0].objective, 'Build adapter with authorization: Bearer private-value');
  });
});

test('invalid, oversized, and secret feedback return safe 400 responses without writes', async () => {
  await withApi(async ({ request, outcomeFile }) => {
    const secretReason = 'Bearer abcdefghijklmnop1234';
    const rejectedBodies = [
      JSON.stringify({ rating: 'invalid' }),
      JSON.stringify({ rating: 'helpful', reason: 'x'.repeat(2_001) }),
      JSON.stringify({ rating: 'helpful', reason: secretReason }),
    ];

    for (const body of rejectedBodies) {
      const before = await readFile(outcomeFile);
      const response = await request('/api/adaptive/outcomes/outcome%20with%20space/feedback', {
        authorization: `Bearer ${token}`,
        body,
      });
      assert.equal(response.status, 400);
      assert.equal(response.text.includes(secretReason), false);
      assert.equal(response.text.includes(rootPathFragment(outcomeFile)), false);
      assert.equal(response.text.includes('stack'), false);
      assert.deepEqual(await readFile(outcomeFile), before);
    }
  });
});

test('unknown outcomes return 404 and wrong methods or paths do not reach the store', async () => {
  await withApi(async ({ request, outcomeFile }) => {
    const before = await readFile(outcomeFile);
    const unknown = await request('/api/adaptive/outcomes/missing/feedback', {
      authorization: `Bearer ${token}`,
      body: JSON.stringify({ rating: 'neutral' }),
    });
    assert.equal(unknown.status, 404);

    for (const route of [
      ['/api/adaptive/outcomes/outcome%20with%20space/feedback', 'GET'],
      ['/api/adaptive/outcomes/outcome%20with%20space', 'POST'],
      ['/api/adaptive/outcomes/encoded%2Fslash/feedback', 'POST'],
      ['/api/adaptive/outcomes/%E0%A4%A/feedback', 'POST'],
    ] as const) {
      const response = await request(route[0], {
        method: route[1],
        authorization: `Bearer ${token}`,
        body: route[1] === 'POST' ? JSON.stringify({ rating: 'neutral' }) : undefined,
      });
      assert.equal(response.status, 404);
    }
    assert.deepEqual(await readFile(outcomeFile), before);
  });
});

test('unexpected store errors return a generic 500 without leaking private details', async () => {
  const privateError = 'C:\\Users\\private\\adaptive-outcomes.json Bearer private-token-value';
  const failingStore: OutcomeStore = {
    async save() {},
    async findRelevant() { return []; },
    async recordFeedback() { throw new Error(privateError); },
  };
  await withApi(async ({ request }) => {
    const response = await request('/api/adaptive/outcomes/target/feedback', {
      authorization: `Bearer ${token}`,
      body: JSON.stringify({ rating: 'helpful' }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(JSON.parse(response.text), { error: 'Internal server error', code: 'INTERNAL_ERROR' });
    assert.equal(response.text.includes(privateError), false);
    assert.equal(response.text.includes('stack'), false);
  }, failingStore);
});

function rootPathFragment(file: string): string {
  return path.dirname(file);
}
