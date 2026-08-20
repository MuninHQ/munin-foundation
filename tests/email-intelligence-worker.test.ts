import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('email intelligence worker is bounded and read-only by construction',async()=>{
  const source=await readFile(new URL('../../src/email-intelligence-worker.ts',import.meta.url),'utf8');
  assert.match(source,/Math\.max\(5\*60_000/);
  assert.match(source,/15\*60_000/);
  assert.match(source,/backoff\*2/);
  assert.match(source,/syncCareerInbox/);
  assert.match(source,/refreshEmailIntelligence/);
  assert.doesNotMatch(source,/sendMail|messages\.send|Mail\.Send|smtp/i);
});

test('Windows startup installs only the local email worker command',async()=>{
  const startup=await readFile(new URL('../../scripts/install-email-intelligence-startup.ps1',import.meta.url),'utf8');
  assert.match(startup,/npm run email:worker/);
  assert.doesNotMatch(startup,/http:|https:|powershell -Command|Invoke-Expression/);
});

test('one-shot host bootstrap installs email intelligence startup',async()=>{
  const bootstrap=await readFile(new URL('../../scripts/bootstrap-chatgpt-first-host.ps1',import.meta.url),'utf8');
  assert.match(bootstrap,/install-email-intelligence-startup\.ps1/);
});
