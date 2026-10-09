import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTokenEfficiencyConfig } from '../src/token-efficiency-config.js';

test('token efficiency is disabled by default with ordered thresholds', () => {
  const config = loadTokenEfficiencyConfig({});
  assert.equal(config.enabled, false);
  assert.ok(config.taskWarningTokens < config.taskCriticalTokens);
  assert.ok(config.sessionWarningTokens < config.sessionCriticalTokens);
  assert.ok(config.sessionCriticalTokens <= config.freshSessionTokens);
});

test('invalid threshold overrides fall back as one safe policy', () => {
  const config = loadTokenEfficiencyConfig({
    MUNIN_TOKEN_EFFICIENCY_ENABLED: '1',
    MUNIN_TOKEN_TASK_WARNING_TOKENS: '9000',
    MUNIN_TOKEN_TASK_CRITICAL_TOKENS: '100',
  });
  assert.equal(config.enabled, true);
  assert.ok(config.warnings.some(item => item.includes('threshold')));
  assert.equal(config.taskWarningTokens, 32_000);
  assert.equal(config.taskCriticalTokens, 64_000);
});

test('individual flags accept only literal one', () => {
  const config = loadTokenEfficiencyConfig({
    MUNIN_TOKEN_EFFICIENCY_ENABLED: 'true',
    MUNIN_TOKEN_EFFICIENCY_ROUTER_ENABLED: '0',
  });
  assert.equal(config.enabled, false);
  assert.equal(config.routerEnabled, false);
  assert.equal(config.telemetryEnabled, true);
});
