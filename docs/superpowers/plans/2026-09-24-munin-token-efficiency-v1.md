# Munin Token Efficiency v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider-neutral token/context efficiency observation, advisory routing, budgets, structured compaction, fresh-session handoffs, and savings reports without changing production execution.

**Architecture:** Add focused pure modules under `src/token-efficiency-*` and connect them through the existing telemetry and orchestrator observation seams. Persist only redacted bounded observations under `data/runtime`, keep every integration disabled by default, and keep router output structurally incapable of selecting an executor.

**Tech Stack:** Node.js 20+, TypeScript 5.6, Node test runner, existing Munin JSON/JSONL stores, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-24-munin-token-efficiency-v1-design.md`

## Global Constraints

- Shadow/observation mode only; recommendations must not alter executors, providers, prompts, context, retries, or promotion decisions.
- `MUNIN_TOKEN_EFFICIENCY_ENABLED` defaults to disabled.
- Preserve Windows support, local-first behavior, zero mandatory cost, provider independence, secret redaction, and existing durable-state conventions.
- Do not add paid services, packages, schemas, raw prompt persistence, or automatic session creation.
- Exact, provider-reported, estimated, and unavailable values must remain distinguishable.
- Observation failures must not fail productive execution.

## Review Focus

- Missing usage data must produce `unavailable`, not zero usage or a healthy budget result; Task 2 tests this.
- Unknown models must never receive invented dollar pricing; Task 2 tests this.
- High-risk work must never be recommended below `strong_model`; Task 3 tests this.
- Secret-bearing and oversized evidence must be redacted and bounded while preserving errors and decisions; Task 4 tests this.
- Enabling observation must leave orchestration results and Promotion Gate decisions unchanged; Tasks 6 and 7 test this.

---

### Task 1: Safe configuration policy

**Files:**
- Create: `src/token-efficiency-config.ts`
- Test: `tests/token-efficiency-config.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `NodeJS.ProcessEnv`
- Produces: `TokenEfficiencyConfig`, `DEFAULT_TOKEN_EFFICIENCY_CONFIG`, `loadTokenEfficiencyConfig(env)`

- [ ] **Step 1: Write the failing configuration tests**

```ts
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
  assert.ok(config.taskWarningTokens < config.taskCriticalTokens);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-config.test.js`  
Expected: TypeScript fails because `token-efficiency-config.ts` does not exist.

- [ ] **Step 3: Implement the immutable configuration loader**

```ts
export interface TokenEfficiencyConfig {
  enabled: boolean;
  telemetryEnabled: boolean;
  routerEnabled: boolean;
  budgetEnabled: boolean;
  compactionEnabled: boolean;
  checkpointEnabled: boolean;
  reportEnabled: boolean;
  promotionObservationEnabled: boolean;
  taskWarningTokens: number;
  taskCriticalTokens: number;
  sessionWarningTokens: number;
  sessionCriticalTokens: number;
  freshSessionTokens: number;
  warnings: readonly string[];
}

export const DEFAULT_TOKEN_EFFICIENCY_CONFIG = Object.freeze({
  enabled: false,
  telemetryEnabled: true,
  routerEnabled: true,
  budgetEnabled: true,
  compactionEnabled: true,
  checkpointEnabled: true,
  reportEnabled: true,
  promotionObservationEnabled: true,
  taskWarningTokens: 32_000,
  taskCriticalTokens: 64_000,
  sessionWarningTokens: 128_000,
  sessionCriticalTokens: 224_000,
  freshSessionTokens: 272_000,
  warnings: [] as readonly string[],
});

export function loadTokenEfficiencyConfig(env: NodeJS.ProcessEnv = process.env): Readonly<TokenEfficiencyConfig> {
  const enabled = (name: string, fallback: boolean) => env[name] === undefined ? fallback : env[name] === '1';
  const warnings: string[] = [];
  const integer = (name: string, fallback: number) => {
    const parsed = Number(env[name]);
    if (env[name] === undefined) return fallback;
    if (!Number.isInteger(parsed) || parsed < 1) { warnings.push(`${name} must be a positive integer; default thresholds applied.`); return fallback; }
    return parsed;
  };
  const thresholds = {
    taskWarningTokens: integer('MUNIN_TOKEN_TASK_WARNING_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskWarningTokens),
    taskCriticalTokens: integer('MUNIN_TOKEN_TASK_CRITICAL_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskCriticalTokens),
    sessionWarningTokens: integer('MUNIN_TOKEN_SESSION_WARNING_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionWarningTokens),
    sessionCriticalTokens: integer('MUNIN_TOKEN_SESSION_CRITICAL_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionCriticalTokens),
    freshSessionTokens: integer('MUNIN_TOKEN_FRESH_SESSION_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.freshSessionTokens),
  };
  const ordered = thresholds.taskWarningTokens < thresholds.taskCriticalTokens
    && thresholds.sessionWarningTokens < thresholds.sessionCriticalTokens
    && thresholds.sessionCriticalTokens <= thresholds.freshSessionTokens;
  if (!ordered) warnings.push('Token efficiency threshold ordering is invalid; default thresholds applied.');
  return Object.freeze({
    ...DEFAULT_TOKEN_EFFICIENCY_CONFIG,
    enabled: enabled('MUNIN_TOKEN_EFFICIENCY_ENABLED', false),
    telemetryEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_TELEMETRY_ENABLED', true),
    routerEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_ROUTER_ENABLED', true),
    budgetEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_BUDGET_ENABLED', true),
    compactionEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_COMPACTION_ENABLED', true),
    checkpointEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_CHECKPOINT_ENABLED', true),
    reportEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_REPORT_ENABLED', true),
    promotionObservationEnabled: enabled('MUNIN_TOKEN_EFFICIENCY_PROMOTION_OBSERVATION_ENABLED', true),
    ...(ordered ? thresholds : {
      taskWarningTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskWarningTokens,
      taskCriticalTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskCriticalTokens,
      sessionWarningTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionWarningTokens,
      sessionCriticalTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionCriticalTokens,
      freshSessionTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.freshSessionTokens,
    }),
    warnings: Object.freeze(warnings),
  });
}
```

Add all flags and thresholds to `.env.example` with observation-only comments and `MUNIN_TOKEN_EFFICIENCY_ENABLED=0`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-config.test.js`  
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/token-efficiency-config.ts tests/token-efficiency-config.test.ts .env.example
git commit -m "feat: add safe token efficiency configuration"
```

### Task 2: Usage normalization, estimation, and telemetry schema

**Files:**
- Create: `src/token-efficiency-usage.ts`
- Test: `tests/token-efficiency-usage.test.ts`
- Modify: `src/agent-telemetry.ts`
- Modify: `tests/agent-telemetry.test.ts`

**Interfaces:**
- Consumes: provider usage fields, bounded strings, `AgentTelemetry`
- Produces: `TokenUsageSample`, `normalizeTokenUsage(input)`, `estimateTokens(text)`, efficiency telemetry event names

- [ ] **Step 1: Write failing usage tests**

```ts
test('provider usage remains provider reported and totals are normalized', () => {
  assert.deepEqual(normalizeTokenUsage({ inputTokens: 100, outputTokens: 25, providerId: 'ollama' }), {
    inputTokens: 100, outputTokens: 25, totalTokens: 125,
    providerId: 'ollama', quality: 'provider_reported', costUsd: undefined,
  });
});

test('missing usage is unavailable and unknown models have no invented cost', () => {
  assert.equal(normalizeTokenUsage({ modelId: 'unknown-model' }).quality, 'unavailable');
  assert.equal(normalizeTokenUsage({ modelId: 'unknown-model' }).costUsd, undefined);
});

test('local estimation is deterministic and explicitly estimated', () => {
  const sample = normalizeTokenUsage({ inputText: 'four short words here' });
  assert.equal(sample.quality, 'estimated');
  assert.equal(sample.inputTokens, estimateTokens('four short words here'));
});
```

Add an agent telemetry test that emits `efficiency.usage_observed` containing `apiKey: 'secret'`, flushes, and verifies redaction.

- [ ] **Step 2: Run and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-usage.test.js dist/tests/agent-telemetry.test.js`  
Expected: build fails on missing module and missing event union member.

- [ ] **Step 3: Implement bounded usage normalization**

```ts
export type UsageQuality = 'measured' | 'provider_reported' | 'estimated' | 'unavailable';
export interface TokenUsageSample {
  runId?: string; taskId?: string; sessionId?: string; agentId?: string;
  providerId?: string; modelId?: string;
  inputTokens?: number; outputTokens?: number; cachedInputTokens?: number;
  reasoningTokens?: number; totalTokens?: number; costUsd?: number;
  contextBytes?: number; itemCount?: number; durationMs?: number;
  quality: UsageQuality;
}
export function estimateTokens(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}
export function normalizeTokenUsage(input: TokenUsageInput): TokenUsageSample {
  const valid = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
  const inputTokens = valid(input.inputTokens) ?? (input.inputText === undefined ? undefined : estimateTokens(input.inputText));
  const outputTokens = valid(input.outputTokens) ?? (input.outputText === undefined ? undefined : estimateTokens(input.outputText));
  const reported = valid(input.inputTokens) !== undefined || valid(input.outputTokens) !== undefined;
  const estimated = !reported && (input.inputText !== undefined || input.outputText !== undefined);
  return {
    ...input, inputTokens, outputTokens,
    totalTokens: valid(input.totalTokens) ?? (inputTokens === undefined && outputTokens === undefined ? undefined : (inputTokens ?? 0) + (outputTokens ?? 0)),
    costUsd: valid(input.costUsd),
    quality: input.quality ?? (reported ? 'provider_reported' : estimated ? 'estimated' : 'unavailable'),
  };
}
```

Extend `AgentTelemetryEventName` with:

```ts
| 'efficiency.usage_observed'
| 'efficiency.route_recommended'
| 'efficiency.budget_warning'
| 'efficiency.context_compacted'
| 'efficiency.checkpoint_created'
| 'efficiency.report_generated'
| 'efficiency.promotion_observed'
```

- [ ] **Step 4: Run and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-usage.test.js dist/tests/agent-telemetry.test.js`  
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/token-efficiency-usage.ts src/agent-telemetry.ts tests/token-efficiency-usage.test.ts tests/agent-telemetry.test.ts
git commit -m "feat: observe normalized token usage"
```

### Task 3: Advisory model router and context budgets

**Files:**
- Create: `src/token-efficiency-router.ts`
- Create: `src/token-efficiency-budget.ts`
- Test: `tests/token-efficiency-router.test.ts`
- Test: `tests/token-efficiency-budget.test.ts`

**Interfaces:**
- Consumes: `MuninWorkType`, task descriptors, provider profile descriptors, `TokenEfficiencyConfig`, `TokenUsageSample[]`
- Produces: `recommendExecutionTier(task, profiles)`, `evaluateContextBudget(scope, samples, config)`

- [ ] **Step 1: Write failing router tests**

```ts
test('mechanical local-capable work recommends deterministic local execution', () => {
  const result = recommendExecutionTier({ workType: 'operations', capabilities: ['format'], localCapable: true, risk: 'low', ambiguity: 'low', verificationRequired: false }, []);
  assert.equal(result.recommendedTier, 'deterministic_local');
  assert.equal('provider' in result, false);
});

test('high-risk work cannot be recommended below strong model', () => {
  const result = recommendExecutionTier({ workType: 'engineering', capabilities: ['architecture'], localCapable: true, risk: 'high', ambiguity: 'high', verificationRequired: true }, []);
  assert.equal(result.recommendedTier, 'strong_model');
  assert.ok(result.reasonCodes.includes('high-risk'));
});
```

- [ ] **Step 2: Write failing budget boundary tests**

```ts
test('budget states honor exact boundaries', () => {
  assert.equal(evaluateContextBudget('task', [{ totalTokens: 31_999, quality: 'measured' }], config).state, 'healthy');
  assert.equal(evaluateContextBudget('task', [{ totalTokens: 32_000, quality: 'measured' }], config).state, 'warning');
  assert.equal(evaluateContextBudget('session', [{ totalTokens: 272_000, quality: 'measured' }], config).state, 'checkpoint_recommended');
});

test('missing token values produce unavailable instead of healthy', () => {
  assert.equal(evaluateContextBudget('task', [{ quality: 'unavailable' }], config).state, 'unavailable');
});
```

- [ ] **Step 3: Run both tests and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-router.test.js dist/tests/token-efficiency-budget.test.js`  
Expected: build fails because both modules are absent.

- [ ] **Step 4: Implement pure recommendation and budget functions**

```ts
export type ExecutionTier = 'deterministic_local' | 'local_model' | 'strong_model';
export interface ExecutionTierRecommendation {
  classification: 'mechanical' | 'bounded_reasoning' | 'complex_reasoning' | 'high_stakes';
  recommendedTier: ExecutionTier;
  recommendedProfileId?: string;
  confidence: 'low' | 'medium' | 'high';
  reasonCodes: string[];
  actualExecutorId?: string;
  actualProviderId?: string;
}

export type ContextBudgetState = 'healthy' | 'warning' | 'critical' | 'checkpoint_recommended' | 'unavailable';
export interface ContextBudgetAssessment {
  scope: 'task' | 'session'; state: ContextBudgetState;
  usedTokens?: number; thresholdTokens?: number; percentUsed?: number; reason: string;
}
```

The profile descriptor contains identifiers and tier labels only. It does not contain `ExecutionProvider`, callbacks, or executable methods.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-router.test.js dist/tests/token-efficiency-budget.test.js`  
Expected: all focused tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/token-efficiency-router.ts src/token-efficiency-budget.ts tests/token-efficiency-router.test.ts tests/token-efficiency-budget.test.ts
git commit -m "feat: recommend execution tiers and context budgets"
```

### Task 4: Structured compaction and fresh-session checkpoints

**Files:**
- Create: `src/token-efficiency-compaction.ts`
- Create: `src/token-efficiency-checkpoint.ts`
- Test: `tests/token-efficiency-compaction.test.ts`
- Test: `tests/token-efficiency-checkpoint.test.ts`

**Interfaces:**
- Consumes: orchestration records, decisions, errors, artifacts, blockers, verification state, usage snapshots
- Produces: `compactWorkflowContext(input, limits)`, `TokenEfficiencyCheckpointStore.write(input)`

- [ ] **Step 1: Write failing preservation and privacy tests**

```ts
test('compaction preserves priority fields while redacting and bounding text', () => {
  const compact = compactWorkflowContext({
    objective: 'ship', status: 'blocked',
    decisions: [{ summary: 'Use local provider', evidence: ['ADR-3'] }],
    errors: ['Authorization: Bearer super-secret-value'],
    artifacts: [{ id: 'spec', path: 'docs/spec.md' }],
    blockers: ['human approval'], nextSteps: ['review'], verification: ['tests pending'],
    commentary: ['x'.repeat(20_000)],
  }, { maxTextChars: 500, maxItemsPerSection: 10 });
  const serialized = JSON.stringify(compact);
  assert.match(serialized, /Use local provider/);
  assert.match(serialized, /docs\/spec.md/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /super-secret-value/);
  assert.ok(compact.metrics.compactedBytes < compact.metrics.originalBytes);
});
```

- [ ] **Step 2: Write failing checkpoint idempotency test**

```ts
test('checkpoint is idempotent for the same source revision', async () => {
  const store = new TokenEfficiencyCheckpointStore(path.join(dir, 'checkpoints'));
  const first = await store.write({ runId: 'r1', sessionId: 's1', sourceRevision: 'abc', compact });
  const second = await store.write({ runId: 'r1', sessionId: 's1', sourceRevision: 'abc', compact });
  assert.equal(first.path, second.path);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.match(first.checkpoint.continuationPrompt, /handoff summary/i);
});
```

- [ ] **Step 3: Run and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-compaction.test.js dist/tests/token-efficiency-checkpoint.test.js`  
Expected: build fails on missing compaction and checkpoint modules.

- [ ] **Step 4: Implement deterministic compaction**

```ts
export interface CompactWorkflowContext {
  objective: string; status: string;
  decisions: CompactDecision[]; unresolved: string[]; errors: string[];
  artifacts: CompactArtifact[]; blockers: string[]; completed: string[];
  nextSteps: string[]; verification: string[];
  coverage: { sourceItems: number; retainedItems: number; omissions: string[] };
  metrics: { originalBytes: number; compactedBytes: number; estimatedTokenReduction: number };
}
```

Apply `redactSecrets` before returning the artifact. Deduplicate normalized entries, bound arrays and strings, and preserve decisions, errors, artifacts, blockers, and verification before commentary.

- [ ] **Step 5: Implement checkpoint storage**

Use `mkdir`, a SHA-256 hash of `runId/sessionId/sourceRevision`, an atomic temporary-file rename in the same directory, and a Windows-safe filename. Return `{ created, path, checkpoint }`. If the final file already exists, read and return it without rewriting.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-compaction.test.js dist/tests/token-efficiency-checkpoint.test.js`  
Expected: all focused tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src/token-efficiency-compaction.ts src/token-efficiency-checkpoint.ts tests/token-efficiency-compaction.test.ts tests/token-efficiency-checkpoint.test.ts
git commit -m "feat: compact context and create session checkpoints"
```

### Task 5: Before/after and projected savings reports

**Files:**
- Create: `src/token-efficiency-report.ts`
- Test: `tests/token-efficiency-report.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: JSONL `AgentTelemetryEvent` streams and explicit report windows
- Produces: `buildTokenEfficiencyReport(events, options)`, `readEfficiencyEvents(path)`, `token-efficiency:report` command

- [ ] **Step 1: Write failing report tests**

```ts
test('report separates observed from projected savings and reports coverage', () => {
  const report = buildTokenEfficiencyReport(events, { mode: 'projected' });
  assert.equal(report.comparison, 'projected');
  assert.equal(report.samples.total, 2);
  assert.equal(report.samples.measured, 1);
  assert.equal(report.coverage.tokenCoverage, 0.5);
  assert.equal(report.savings.costUsd, undefined);
  assert.ok(report.savings.tokens > 0);
});

test('malformed telemetry is skipped and counted', async () => {
  await writeFile(file, '{"name":"efficiency.usage_observed"}\nnot-json\n');
  const result = await readEfficiencyEvents(file);
  assert.equal(result.invalidLines, 1);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-report.test.js`  
Expected: build fails because report module does not exist.

- [ ] **Step 3: Implement aggregation and a local CLI entrypoint**

```ts
export interface TokenEfficiencyReport {
  comparison: 'observed' | 'projected';
  samples: { total: number; measured: number; estimated: number; unavailable: number };
  actual: { tokens?: number; costUsd?: number };
  counterfactual: { tokens?: number; costUsd?: number };
  savings: { tokens: number; tokenPercent?: number; costUsd?: number; costPercent?: number };
  coverage: { tokenCoverage: number; costCoverage: number; invalidLines: number };
  confidence: 'low' | 'medium' | 'high';
  methodology: string[];
}
```

Create `src/token-efficiency-report-cli.ts` and map `token-efficiency:report` to `npm run build:core && node dist/src/token-efficiency-report-cli.js`. The command reads the default telemetry path and writes a bounded report under `data/runtime/token-efficiency/reports`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-report.test.js`  
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/token-efficiency-report.ts src/token-efficiency-report-cli.ts tests/token-efficiency-report.test.ts package.json
git commit -m "feat: report projected token efficiency savings"
```

### Task 6: Orchestrator, workers, and supervisor observation integration

**Files:**
- Create: `src/token-efficiency-observer.ts`
- Test: `tests/token-efficiency-observer.test.ts`
- Modify: `src/agent-orchestrator.ts`
- Modify: `src/orchestrator-observability.ts`
- Modify: `tests/orchestrator-observability.test.ts`
- Modify: `src/host-bridge-worker.ts`
- Modify: `tests/host-bridge-worker.test.ts`
- Modify: `scripts/workspace-supervisor.mjs`
- Modify: `tests/workspace-supervisor.test.ts`

**Interfaces:**
- Consumes: optional `usage?: TokenUsageInput` on `AgentExecutionResult`, existing context identifiers, telemetry, configuration
- Produces: `TokenEfficiencyObserver.observeStart`, `observeCompletion`, and aggregate health snapshot

- [ ] **Step 1: Write failing disabled-mode regression**

Extend `orchestrator-observability.test.ts` to execute the same deterministic executors with observation disabled and assert:

```ts
assert.deepEqual({ ...observed.result, runId: 'normalized' }, { ...baseline.result, runId: 'normalized' });
assert.equal(sink.events.some(event => event.name.startsWith('efficiency.')), false);
```

Normalize only the generated `runId` before comparison. Do not remove trace, plan, status, evidence, or blocker fields.

- [ ] **Step 2: Write failing enabled observation test**

```ts
const engineer = async () => ({ status: 'completed' as const, summary: 'ok', usage: { inputTokens: 100, outputTokens: 20, providerId: 'ollama' } });
// Run with injected enabled config and assert route, usage, and budget events.
// Assert the result status, plan, trace statuses, summaries, and evidence match baseline.
```

Add worker and supervisor contract tests asserting that observation can add aggregate health fields while queue processing, restart exit code, locking, heartbeat, and shell-free spawning remain unchanged.

- [ ] **Step 3: Run focused integration tests and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-observer.test.js dist/tests/orchestrator-observability.test.js dist/tests/host-bridge-worker.test.js dist/tests/workspace-supervisor.test.js`  
Expected: build fails on missing observer and optional usage contract.

- [ ] **Step 4: Implement the observer facade and optional result usage**

```ts
export class TokenEfficiencyObserver {
  constructor(readonly config: Readonly<TokenEfficiencyConfig>, private readonly telemetry: AgentTelemetry) {}
  observeStart(input: EfficiencyTaskObservation): void {
    if (!this.config.enabled) return;
    try {
      const recommendation = recommendExecutionTier(input.task, input.profiles);
      this.telemetry.emit({ name: 'efficiency.route_recommended', runId: input.runId, taskId: input.taskId, agentId: input.agentId, metadata: recommendation });
    } catch { return; }
  }
  observeCompletion(input: EfficiencyCompletionObservation): void {
    if (!this.config.enabled) return;
    try {
      const usage = normalizeTokenUsage(input.usage ?? {});
      this.telemetry.emit({ name: 'efficiency.usage_observed', runId: input.runId, taskId: input.taskId, agentId: input.agentId, metadata: usage });
      const budget = evaluateContextBudget('task', [usage], this.config);
      if (!['healthy', 'unavailable'].includes(budget.state)) this.telemetry.emit({ name: 'efficiency.budget_warning', runId: input.runId, taskId: input.taskId, agentId: input.agentId, metadata: budget });
    } catch { return; }
  }
}
```

Add `usage?: TokenUsageInput` to `AgentExecutionResult`. Accept an optional observer in `instrumentAgentExecutors` and `runObservedOrchestration`. Wrap observer calls in the observer's internal fail-open boundary; do not catch or suppress executor errors beyond current behavior.

For Host Worker, inject an optional callback receiving job ID and duration after a completed queue transition. For the supervisor, copy a precomputed aggregate snapshot path into state if present; do not make the `.mjs` supervisor parse telemetry or import TypeScript output.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-observer.test.js dist/tests/orchestrator-observability.test.js dist/tests/host-bridge-worker.test.js dist/tests/workspace-supervisor.test.js`  
Expected: all focused tests pass and orchestration outputs remain equivalent.

- [ ] **Step 6: Commit**

```powershell
git add src/token-efficiency-observer.ts src/agent-orchestrator.ts src/orchestrator-observability.ts src/host-bridge-worker.ts scripts/workspace-supervisor.mjs tests/token-efficiency-observer.test.ts tests/orchestrator-observability.test.ts tests/host-bridge-worker.test.ts tests/workspace-supervisor.test.ts
git commit -m "feat: observe efficiency across orchestrator and workers"
```

### Task 7: Skill Promotion Gate observation and operational documentation

**Files:**
- Create: `src/token-efficiency-promotion-observer.ts`
- Test: `tests/token-efficiency-promotion-observer.test.ts`
- Modify: `src/capability-promotion-benchmark.ts`
- Modify: `tests/capability-promotion-benchmark.test.ts`
- Create: `docs/operations/TOKEN_EFFICIENCY_V1.md`
- Modify: `CHANGELOG.md`
- Modify: `ops/CURRENT_STATE.md`
- Modify: `ops/SESSION_LOG.md`

**Interfaces:**
- Consumes: `CapabilityCandidate`, unchanged `CapabilityBenchmarkResult`, config, telemetry
- Produces: advisory promotion observation only

- [ ] **Step 1: Write failing promotion equivalence tests**

```ts
test('promotion observation cannot change benchmark decisions', () => {
  const baseline = benchmarkCapabilityCandidate(candidate);
  const enabled = benchmarkCapabilityCandidate(candidate, { observe: event => observations.push(event) });
  assert.deepEqual(enabled, baseline);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].recommendedTier, 'local_model');
});

test('disabled promotion observation emits nothing', () => {
  const result = observePromotionEfficiency(candidate, benchmark, disabledConfig);
  assert.equal(result, undefined);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-promotion-observer.test.js dist/tests/capability-promotion-benchmark.test.js`  
Expected: build fails on the missing observer and optional hook.

- [ ] **Step 3: Implement a side-channel observation hook**

Keep the existing benchmark return object unchanged. Add an optional observer callback that receives a frozen copy of advisory efficiency evidence after the benchmark result is computed. Catch callback errors so Promotion Gate behavior cannot fail.

- [ ] **Step 4: Write operator documentation and repository state updates**

Document flags, defaults, runtime paths, report command, metric-quality labels, rollback by disabling the top-level flag, and the nine prerequisites for real routing from the spec. Update changelog/current state/session log with the exact implementation and validation evidence available at that point.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-efficiency-promotion-observer.test.js dist/tests/capability-promotion-benchmark.test.js`  
Expected: all focused tests pass and benchmark results are identical.

- [ ] **Step 6: Commit**

```powershell
git add src/token-efficiency-promotion-observer.ts src/capability-promotion-benchmark.ts tests/token-efficiency-promotion-observer.test.ts tests/capability-promotion-benchmark.test.ts docs/operations/TOKEN_EFFICIENCY_V1.md CHANGELOG.md ops/CURRENT_STATE.md ops/SESSION_LOG.md
git commit -m "docs: operationalize token efficiency observation"
```

### Task 8: Full verification, governance review, and SITREP evidence

**Files:**
- Modify only if verification exposes a scoped defect: files owned by Tasks 1-7
- Create: `docs/reports/TOKEN_EFFICIENCY_V1_SITREP.md`

**Interfaces:**
- Consumes: completed implementation, full repository validation, Git history
- Produces: current evidence and explicit residual risks

- [ ] **Step 1: Run focused token-efficiency tests together**

Run:

```powershell
npm run build:core
node --test dist/tests/token-efficiency-*.test.js dist/tests/orchestrator-observability.test.js dist/tests/capability-promotion-benchmark.test.js dist/tests/host-bridge-worker.test.js dist/tests/workspace-supervisor.test.js
```

Expected: zero failures.

- [ ] **Step 2: Run complete build and regression suite**

Run: `npm test`  
Expected: TypeScript build, Vite production build, and all compiled Node tests pass with zero failures.

- [ ] **Step 3: Run repository integrity checks**

```powershell
git diff --check origin/main...HEAD
git status --short --branch
rg -n "(sk-(proj-)?[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})" src tests docs ops .env.example
```

Expected: no whitespace errors, only intended files, and no secret matches. Test fixture strings that intentionally exercise redaction must use obviously synthetic values and be described in the SITREP if the bounded scan matches them.

- [ ] **Step 4: Request independent code review**

Provide the reviewer with the spec, this plan, `origin/main` as base, current `HEAD`, and these review questions:

1. Can any new code select or mutate an executor/provider?
2. Can observation failure alter productive execution or promotion decisions?
3. Are measured, estimated, and unavailable metrics separated correctly?
4. Are persisted artifacts bounded and redacted?
5. Do flags default safely and is rollback complete?

Fix all Critical and Important findings with a failing regression test before implementation changes, then rerun Steps 1-3.

- [ ] **Step 5: Write and commit the objective SITREP**

The SITREP must list changed files by subsystem, architecture, exact test commands/counts/results, measured coverage, projected savings methodology, risks, pending work, branch/commit state, and the nine exact requirements that remain before real routing can be enabled.

```powershell
git add docs/reports/TOKEN_EFFICIENCY_V1_SITREP.md
git commit -m "docs: record token efficiency v1 sitrep"
```

- [ ] **Step 6: Re-run verification after the final documentation commit**

Run: `npm test` and `git diff --check origin/main...HEAD`  
Expected: zero test failures and zero diff errors.
