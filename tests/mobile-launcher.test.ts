import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mobile launcher only reuses an API that accepts its bearer token', async () => {
  const source = await readFile(new URL('../../scripts/launch-mobile.mjs', import.meta.url), 'utf8');
  assert.match(source, /Authorization:`Bearer \$\{token\}`/);
  assert.match(source, /return response\.status===200/);
  assert.match(source, /function monitorApi\(\)/);
  assert.match(source, /setInterval/);
  assert.match(source, /API unavailable; recovering automatically/);
  assert.match(source, /await recoverApi\(\)/);
  assert.match(source, /clearInterval\(apiMonitor\)/);
  assert.match(source, /Guardian active\. Keep this window open/);
  assert.match(source, /await new Promise\(\(\)=>\{\}\)/);
  assert.match(source, /process\.env\.MUNIN_NPM_COMMAND/);
  assert.match(source, /run\(process\.execPath,\['dist\/src\/server\.js'\]/);
  assert.doesNotMatch(source, /response\.status!==404/);
});
