import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseGitHubHostIntent, githubHostInboxContract } from '../src/github-host-inbox.js';
import { githubHostOutboxContract } from '../src/github-host-outbox.js';

const now=Date.parse('2026-08-20T23:15:00Z');
const valid={version:1 as const,id:'health-1',type:'runtime-health' as const,createdAt:'2026-08-20T23:10:00Z',expiresAt:'2026-08-20T23:20:00Z',repo:'MuninHQ/munin-foundation' as const,branch:'main' as const};

test('GitHub Host Inbox accepts only fixed typed Munin intents',()=>{
  assert.equal(parseGitHubHostIntent(valid,now).type,'runtime-health');
  assert.throws(()=>parseGitHubHostIntent({...valid,repo:'other/repo'},now),/restricted/i);
  assert.throws(()=>parseGitHubHostIntent({...valid,branch:'dev'},now),/restricted/i);
  assert.throws(()=>parseGitHubHostIntent({...valid,type:'shell'},now),/allowlisted/i);
});

test('GitHub Host Outbox publishes only a bounded receipt file on its dedicated branch',async()=>{
  const source=await readFile(new URL('../../src/github-host-outbox.ts',import.meta.url),'utf8');
  assert.equal(githubHostOutboxContract.branch,'munin-host-outbox');
  assert.equal(githubHostOutboxContract.file,'host-result.json');
  assert.match(source,/GIT_TERMINAL_PROMPT:'0'/);
  assert.match(source,/\['push',REMOTE,`HEAD:refs\/heads\/\$\{OUTBOX_BRANCH\}`\]/);
  assert.match(source,/redactHostOutput/);
  assert.doesNotMatch(source,/exec\(|Invoke-Expression|cmd\.exe|powershell -Command/);
});

test('GitHub Host Inbox bounds intent lifetime',()=>{
  assert.throws(()=>parseGitHubHostIntent({...valid,expiresAt:'2026-08-20T23:40:00Z'},now),/15 minutes/i);
  assert.equal(githubHostInboxContract.branch,'munin-host-inbox');
  assert.equal(githubHostInboxContract.file,'host-intent.json');
});

test('GitHub inbox reader uses fixed git fetch/show without shell execution',async()=>{
  const source=await readFile(new URL('../../src/github-host-inbox.ts',import.meta.url),'utf8');
  assert.match(source,/execFileAsync\('git'/);
  assert.match(source,/shell:false/);
  assert.match(source,/refs\/heads\/\$\{INBOX_BRANCH\}/);
  assert.match(source,/REMOTE_REF/);
  assert.doesNotMatch(source,/exec\(|spawn\(|Invoke-Expression|cmd\.exe|powershell -Command/);
});

test('Windows startup worker explicitly opts into typed GitHub inbox polling',async()=>{
  const source=await readFile(new URL('../../scripts/install-host-worker-startup.ps1',import.meta.url),'utf8');
  assert.match(source,/npm run host:worker -- --github-inbox/);
});
