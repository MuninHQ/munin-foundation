import assert from 'node:assert/strict';
import test from 'node:test';
import { createContextMemoryServer } from '../src/context-memory-api.js';

test('daily dashboard exposes canonical executive snapshot through existing memory API', async () => {
  const server = createContextMemoryServer();
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const address = server.address() as {port:number};
    const response = await fetch(`http://127.0.0.1:${address.port}/api/second-brain/daily`);
    assert.equal(response.status,200);
    const data = await response.json() as any;
    assert.ok(Array.isArray(data.executive.active));
    assert.ok(Array.isArray(data.executive.blocked));
    assert.ok(Array.isArray(data.executive.recentlyCompleted));
    assert.equal(typeof data.generatedAt,'string');
  } finally { await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }
});
