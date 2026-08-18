import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAgentPlan,
  classifyHumanBlocker,
  inferWorkType,
  MuninAgentOrchestrator,
  type MuninAgentExecutors,
} from '../src/agent-orchestrator.js';

test('infers engineering work and builds the full delivery chain', () => {
  assert.equal(inferWorkType('Implementar uma nova feature e validar o código'), 'engineering');
  assert.deepEqual(buildAgentPlan('engineering'), [
    'product-state-manager',
    'engineer',
    'qa-verifier',
    'memory-curator',
    'operator',
  ]);
});

test('only escalates blockers that require human action', () => {
  assert.equal(classifyHumanBlocker('tests are flaky and need another attempt').humanRequired, false);
  assert.equal(classifyHumanBlocker('2FA code required to continue').humanRequired, true);
  assert.equal(classifyHumanBlocker('permission denied: owner approval required').category, 'permission');
});

test('runs specialists in sequence and completes without user intervention', async () => {
  const calls: string[] = [];
  const completed = (id: string) => async () => {
    calls.push(id);
    return { status: 'completed' as const, summary: `${id} complete` };
  };
  const executors: MuninAgentExecutors = {
    'product-state-manager': completed('product-state-manager'),
    engineer: completed('engineer'),
    'qa-verifier': completed('qa-verifier'),
    'memory-curator': completed('memory-curator'),
    operator: completed('operator'),
  };

  const result = await new MuninAgentOrchestrator(executors).run('Implementar feature no código');
  assert.equal(result.status, 'done');
  assert.deepEqual(calls, ['product-state-manager', 'engineer', 'qa-verifier', 'memory-curator', 'operator']);
});

test('sends failed verification back to engineering before continuing', async () => {
  let qaAttempts = 0;
  let engineeringAttempts = 0;
  const executors: MuninAgentExecutors = {
    'product-state-manager': async () => ({ status: 'completed', summary: 'criteria ready' }),
    engineer: async () => {
      engineeringAttempts += 1;
      return { status: 'completed', summary: `engineering pass ${engineeringAttempts}` };
    },
    'qa-verifier': async () => {
      qaAttempts += 1;
      if (qaAttempts === 1) return { status: 'retry', summary: 'regression found', fingerprint: 'qa:regression' };
      return { status: 'completed', summary: 'verified' };
    },
    'memory-curator': async () => ({ status: 'completed', summary: 'memory promoted' }),
    operator: async () => ({ status: 'completed', summary: 'operational checks passed' }),
  };

  const result = await new MuninAgentOrchestrator(executors).run('Build feature');
  assert.equal(result.status, 'done');
  assert.equal(engineeringAttempts, 2);
  assert.equal(qaAttempts, 2);
});

test('continues through recoverable blockers but stops for 2FA', async () => {
  let attempts = 0;
  const recoverable: MuninAgentExecutors = {
    researcher: async () => {
      attempts += 1;
      if (attempts === 1) return { status: 'blocked', summary: 'temporary source failure', blocker: 'temporary source failure' };
      return { status: 'completed', summary: 'research complete' };
    },
    'product-state-manager': async () => ({ status: 'completed', summary: 'state updated' }),
    'memory-curator': async () => ({ status: 'completed', summary: 'memory updated' }),
  };
  const recovered = await new MuninAgentOrchestrator(recoverable).run('Pesquisar benchmark de runtime');
  assert.equal(recovered.status, 'done');
  assert.equal(attempts, 2);

  const blocked: MuninAgentExecutors = {
    operator: async () => ({ status: 'blocked', summary: 'login required', blocker: '2FA code required to access deployment console' }),
    'qa-verifier': async () => ({ status: 'completed', summary: 'unused' }),
    'memory-curator': async () => ({ status: 'completed', summary: 'unused' }),
  };
  const stopped = await new MuninAgentOrchestrator(blocked).run('Verificar runtime e deploy operacional');
  assert.equal(stopped.status, 'blocked');
  assert.match(stopped.blocker ?? '', /second-factor/i);
});
