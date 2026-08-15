import test from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { mobileAuthorized } from '../src/mobile-api.js';

function request(authorization?: string): IncomingMessage {
  return { headers: authorization ? { authorization } : {} } as IncomingMessage;
}

test('mobile gateway denies access when no token is configured', () => {
  const previous = process.env.MUNIN_MOBILE_TOKEN;
  delete process.env.MUNIN_MOBILE_TOKEN;
  try { assert.equal(mobileAuthorized(request('Bearer anything')), false); }
  finally { if (previous === undefined) delete process.env.MUNIN_MOBILE_TOKEN; else process.env.MUNIN_MOBILE_TOKEN = previous; }
});

test('mobile gateway accepts only the configured bearer token', () => {
  const previous = process.env.MUNIN_MOBILE_TOKEN;
  process.env.MUNIN_MOBILE_TOKEN = 'test-secret-token';
  try {
    assert.equal(mobileAuthorized(request()), false);
    assert.equal(mobileAuthorized(request('Bearer wrong-token')), false);
    assert.equal(mobileAuthorized(request('Bearer test-secret-token')), true);
  } finally { if (previous === undefined) delete process.env.MUNIN_MOBILE_TOKEN; else process.env.MUNIN_MOBILE_TOKEN = previous; }
});
