import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptUrl = new URL('../../scripts/bootstrap-chatgpt-first-host.ps1', import.meta.url);

test('host bootstrap stays fail-closed and fast-forward only', async () => {
  const source = await readFile(scriptUrl, 'utf8');
  assert.match(source, /\[string\[\]\]\$GitArgs/);
  assert.match(source, /& git @GitArgs/);
  assert.doesNotMatch(source, /\[string\[\]\]\$Args|& git @Args/);
  assert.match(source, /\$ErrorActionPreference = 'Continue'/);
  assert.match(source, /\$exitCode = \$LASTEXITCODE/);
  assert.match(source, /finally \{\s*\$ErrorActionPreference = \$previousErrorActionPreference/);
  assert.match(source, /if \(\$exitCode -ne 0\)/);
  assert.match(source, /branch','--show-current/);
  assert.match(source, /status','--porcelain/);
  assert.match(source, /merge','--ff-only','origin\/main/);
  assert.match(source, /install-host-worker-startup\.ps1/);
  assert.match(source, /install-workspace-supervisor-startup\.ps1/);
  assert.match(source, /npm run workspace:supervisor/);
  assert.match(source, /no unsafe process takeover attempted/i);
  assert.match(source, /127\.0\.0\.1:4310\/api\/health/);
  assert.match(source, /127\.0\.0\.1:5173/);
  assert.match(source, /\$workspaceReady = \$apiReady -and \$webReady/);
  assert.match(source, /acceptance-chatgpt-first\.ps1/);
  assert.doesNotMatch(source, /reset\s+--hard/i);
  assert.doesNotMatch(source, /clean\s+-fd/i);
  assert.doesNotMatch(source, /taskkill|Stop-Process/i);
  assert.doesNotMatch(source, /ExecutionPolicy\s+Unrestricted/i);
});
