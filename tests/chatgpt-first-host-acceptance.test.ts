import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('host acceptance runner is read-only and checks ChatGPT-first signals', async () => {
  const script = await readFile(new URL('../../scripts/acceptance-chatgpt-first.ps1', import.meta.url), 'utf8');
  assert.match(script, /127\.0\.0\.1:4310/);
  assert.match(script, /127\.0\.0\.1:5173/);
  assert.match(script, /Get-Process -Name 'ollama'/);
  assert.match(script, /Ollama process detected independently/);
  assert.match(script, /Add-Result 'ollama-not-required' \$true/);
  assert.match(script, /function Invoke-WebWithRetry/);
  assert.match(script, /Start-Sleep -Milliseconds 500/);
  assert.match(script, /Invoke-WebWithRetry \$WebUrl/);
  assert.match(script, /\$webResponse = Invoke-WebWithRetry \$WebUrl/);
  assert.doesNotMatch(script, /\$home\s*=/i);
  assert.match(script, /api\/workspace/);
  assert.match(script, /chatgpt-operator-bridge/);
  assert.doesNotMatch(script, /Stop-Process|Remove-Item|Set-Content|Invoke-Expression|Start-Process/);
});
