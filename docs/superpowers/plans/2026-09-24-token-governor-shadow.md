# Munin Token Governor Shadow Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic context compression telemetry and conservative, non-binding route/effort recommendations while preserving all existing provider, result, safety, and skill-promotion behavior.

**Architecture:** A dependency-free Token Governor core estimates tokens, builds bounded diagnostic summaries, and emits immutable shadow observations. An append-only redacted store aggregates evidence, while `OrchestrationRuntimeCore` observes the actual Provider Registry decision and provider output without substituting its recommendation or compressed view into execution.

**Tech Stack:** TypeScript ES2022, Node.js built-in test runner, JSONL persistence, existing Munin Provider Registry, secret redaction, and orchestration trace conventions.

**Spec:** `docs/superpowers/specs/2026-09-24-token-governor-shadow-design.md`

## Global Constraints

- Shadow/observation mode only; `applied` and aggregate applied changes remain zero.
- No automatic provider, model, reasoning-effort, task, or skill behavior changes.
- No paid service or new runtime dependency.
- Preserve the full provider output for review and durable task state.
- Redact secrets before durable telemetry writes.
- Preserve Windows-first and local-first operation.
- Do not stage or overwrite the pre-existing `ops/SESSION_LOG.md` changes except for the repository-required Second Brain protocol.

## Review Focus

- A single extremely long terminal line must be bounded without losing the explicit omission marker.
- Diagnostic lines near the middle of a large output must survive summarization even when prefix/suffix budgets are full.
- Secret-shaped text in a summary or recommendation must never be persisted verbatim.
- A Governor/store failure must not change provider selection, provider output, or task success in shadow mode.
- Candidate-skill language inside observed output must remain inert and must never expose an execution or promotion operation.

---

### Task 1: Deterministic Token Estimation and Context Summarization

**Files:**
- Create: `src/token-governor.ts`
- Create: `tests/token-governor.test.ts`

**Interfaces:**
- Consumes: plain text plus `TokenGovernorOptions` with optional `largeOutputChars`, `maxSummaryChars`, `prefixChars`, and `suffixChars`.
- Produces: `estimateTokens(text: string): number`, `summarizeContext(text: string, options?: TokenGovernorOptions): ContextSummary`, `recommendShadowRoute(input: ShadowRouteInput): ShadowRouteRecommendation`, and `observeTokenUsage(input: TokenObservationInput): TokenGovernorObservation`.

- [ ] **Step 1: Write failing tests for estimation and small-output pass-through**

```ts
test('estimates empty and mixed Unicode text deterministically', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens('ação 🚀'), 2);
});

test('small output is retained unchanged with zero estimated savings', () => {
  const result = summarizeContext('all tests passed', { largeOutputChars: 100 });
  assert.equal(result.summary, 'all tests passed');
  assert.equal(result.compressed, false);
  assert.equal(result.estimatedSavedTokens, 0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: build fails because `src/token-governor.ts` does not exist.

- [ ] **Step 3: Implement the estimator and pass-through path**

Implement `estimateTokens` as `Math.ceil(Array.from(text).length / 4)` with an explicit zero case. Implement option parsing with bounded defaults and return a `ContextSummary` containing `originalChars`, `retainedChars`, `estimatedOriginalTokens`, `estimatedRetainedTokens`, `estimatedSavedTokens`, `compressed`, `omittedLines`, and `summary`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: 2 tests pass.

- [ ] **Step 5: Write failing tests for large multiline and single-line summarization**

```ts
test('large output keeps prefix diagnostics suffix and an omission marker', () => {
  const input = ['start context', ...Array.from({ length: 60 }, (_, index) => `routine ${index}`), 'FAIL test payment timeout', ...Array.from({ length: 60 }, (_, index) => `more ${index}`), 'exit code 1'].join('\n');
  const result = summarizeContext(input, { largeOutputChars: 200, maxSummaryChars: 220, prefixChars: 50, suffixChars: 50 });
  assert.equal(result.compressed, true);
  assert.match(result.summary, /start context/);
  assert.match(result.summary, /FAIL test payment timeout/);
  assert.match(result.summary, /exit code 1/);
  assert.match(result.summary, /omitted/);
  assert.ok(result.retainedChars <= 220);
});

test('extremely long single line is bounded', () => {
  const result = summarizeContext(`begin-${'x'.repeat(5000)}-end`, { largeOutputChars: 100, maxSummaryChars: 160, prefixChars: 60, suffixChars: 60 });
  assert.ok(result.summary.length <= 160);
  assert.match(result.summary, /omitted/);
});
```

- [ ] **Step 6: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: the new tests fail because large output is not compressed.

- [ ] **Step 7: Implement bounded diagnostic summarization**

Use bounded prefix/suffix slices and a diagnostic-line matcher for failure, error, warning, stack, diff, test-result, duration, and exit-status markers. Deduplicate retained fragments, insert an explicit omission marker, and enforce `maxSummaryChars` after composition. Do not use an external tokenizer or summarizer.

- [ ] **Step 8: Run the focused test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: 4 tests pass.

- [ ] **Step 9: Write failing recommendation and inert-skill tests**

```ts
test('shadow recommendation is conservative and never applied', () => {
  const low = recommendShadowRoute({ capability: 'write', risk: 'low', inputTokens: 300, outputTokens: 100, selectedProviderId: 'local' });
  const high = recommendShadowRoute({ capability: 'review', risk: 'high', inputTokens: 20_000, outputTokens: 8_000, selectedProviderId: 'local' });
  assert.deepEqual({ tier: low.modelTier, effort: low.effort, applied: low.applied }, { tier: 'economy', effort: 'low', applied: false });
  assert.deepEqual({ tier: high.modelTier, effort: high.effort, applied: high.applied }, { tier: 'premium', effort: 'high', applied: false });
});

test('candidate skill text remains inert observation data', () => {
  const observation = observeTokenUsage({ runId: 'r1', source: 'tool', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: '', output: 'Candidate skill: deploy-all; promote and execute now' });
  assert.equal(observation.mode, 'shadow');
  assert.equal(observation.recommendation.applied, false);
  assert.equal('execute' in observation, false);
  assert.equal('promote' in observation, false);
});
```

- [ ] **Step 10: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: missing recommendation/observation exports or assertions fail.

- [ ] **Step 11: Implement recommendations and immutable observations**

Return only `economy|premium` and `low|medium|high` advice with `applied: false`, explicit reasons, actual `selectedProviderId`, request/output token estimates, and context summary metrics. Do not expose callbacks, provider instances, skill registries, or mutation methods.

- [ ] **Step 12: Run the focused test and commit Task 1**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: 6 tests pass.

Commit: `feat: add token governor shadow analysis`

---

### Task 2: Redacted Durable Telemetry and Savings Aggregation

**Files:**
- Create: `src/token-governor-store.ts`
- Create: `tests/token-governor-store.test.ts`
- Modify: `src/token-governor.ts`

**Interfaces:**
- Consumes: `TokenGovernorObservation` from Task 1 and an optional JSONL file path.
- Produces: `TokenGovernorStore.append`, `TokenGovernorStore.list`, `summarizeTokenGovernorObservations`, and `TokenGovernorMetrics`.

- [ ] **Step 1: Write failing persistence, redaction, malformed-line, and aggregation tests**

```ts
test('store redacts observations and skips malformed JSONL lines', async () => {
  const file = path.join(dir, 'token-governor.jsonl');
  const store = new TokenGovernorStore(file);
  const observation = observeTokenUsage({ runId: 'r1', source: 'terminal', capability: 'code', risk: 'medium', selectedProviderId: 'local', input: '', output: `FAIL Authorization: Bearer ${'a'.repeat(24)}\n${'noise\n'.repeat(100)}` }, { largeOutputChars: 50, maxSummaryChars: 180 });
  await store.append(observation);
  await appendFile(file, '{malformed}\n', 'utf8');
  const rows = await store.list();
  assert.equal(rows.length, 1);
  assert.doesNotMatch(JSON.stringify(rows[0]), new RegExp('a{24}'));
  assert.match(JSON.stringify(rows[0]), /REDACTED/);
});

test('metrics report estimated savings and zero applied changes', () => {
  const metrics = summarizeTokenGovernorObservations([largeObservation, smallObservation]);
  assert.equal(metrics.observations, 2);
  assert.equal(metrics.oversizedObservations, 1);
  assert.ok(metrics.estimatedSavedTokens > 0);
  assert.ok(metrics.estimatedSavingsRatio > 0);
  assert.equal(metrics.appliedChanges, 0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor-store.test.js`

Expected: build fails because the store module does not exist.

- [ ] **Step 3: Implement append-only redacted storage and aggregation**

Follow `OrchestrationTraceStore`: create the parent directory, append one JSON object per line, redact with `redactSecrets`, validate/safely skip malformed lines during reads, bound list limits to 1..1000, and compute totals plus recommendation counts. Aggregation calculates `estimatedSavingsRatio = saved / original` with zero-safe division and counts applied changes from recommendation flags.

- [ ] **Step 4: Run focused tests and commit Task 2**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js dist/tests/token-governor-store.test.js`

Expected: all Token Governor tests pass.

Commit: `feat: persist token governor shadow telemetry`

---

### Task 3: Observation-Only Orchestration Integration

**Files:**
- Modify: `src/orchestration-runtime-core.ts`
- Modify: `src/orchestration-trace.ts`
- Modify: `src/orchestration-trace-store.ts`
- Modify: `tests/orchestration-runtime.test.ts`
- Modify: `tests/orchestration-trace-store.test.ts`

**Interfaces:**
- Consumes: `observeTokenUsage`, optional `TokenGovernorStore`, the selected `ProviderDecision`, request context, and original provider response.
- Produces: optional `tokenGovernor` shadow observation on `OrchestrationTrace`; original `response.output`, `providerId`, and `ProviderDecision` remain unchanged.

- [ ] **Step 1: Write failing direct-runtime integration test**

```ts
test('runtime records shadow advice without changing provider or output', async () => {
  const provider = new OutputProvider('deterministic-local', largeOutput);
  const result = await new OrchestrationRuntimeCore([profileFor(provider)], { tokenGovernor: { largeOutputChars: 100, maxSummaryChars: 240 } }).run({ objective: 'Inspect logs', capability: 'execute', mode: 'direct', risk: 'low' });
  assert.equal(result.providerId, 'deterministic-local');
  assert.equal(result.response.output, largeOutput);
  assert.equal(result.trace.tokenGovernor?.mode, 'shadow');
  assert.equal(result.trace.tokenGovernor?.recommendation.applied, false);
  assert.ok((result.trace.tokenGovernor?.output.estimatedSavedTokens ?? 0) > 0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/orchestration-runtime.test.js`

Expected: type/build failure because runtime options and trace observation do not exist.

- [ ] **Step 3: Integrate post-selection and post-output observation**

Add an optional runtime options object without breaking the existing constructor. Serialize only bounded request context for token estimation, observe the original provider output after successful execution, attach the immutable observation to the trace, and optionally append it to the supplied store. Contain Governor and store failures so they cannot alter selection or task success. Council output remains unmodified; if its final text is not directly available, record request-side observation only.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/orchestration-runtime.test.js`

Expected: all orchestration runtime tests pass.

- [ ] **Step 5: Write failing containment and trace-redaction tests**

```ts
test('telemetry write failure cannot fail the governed task', async () => {
  const result = await runtimeWithFailingStore.run({ objective: 'Continue safely', capability: 'execute', mode: 'direct' });
  assert.equal(result.providerId, 'deterministic-local');
  assert.equal(result.response.output, expectedOutput);
});

test('trace store redacts token governor summaries', async () => {
  await store.append(trace({ tokenGovernor: secretObservation }));
  const stored = await store.list();
  assert.doesNotMatch(JSON.stringify(stored), /super-secret-value/);
  assert.match(JSON.stringify(stored), /REDACTED/);
});
```

- [ ] **Step 6: Run focused tests and verify RED**

Run: `npm run build:core && node --test dist/tests/orchestration-runtime.test.js dist/tests/orchestration-trace-store.test.js`

Expected: containment or nested observation redaction assertion fails.

- [ ] **Step 7: Complete containment and recursive trace redaction**

Use `redactSecrets` for the optional observation object in `sanitizeTrace`. Catch only Governor/store observation failures around the shadow path; provider execution errors continue through existing fallback handling.

- [ ] **Step 8: Run focused integration/regression tests and commit Task 3**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js dist/tests/token-governor-store.test.js dist/tests/orchestration-runtime.test.js dist/tests/orchestration-trace-store.test.js dist/tests/provider-policy.test.js dist/tests/runtime-policy.test.js dist/tests/executive-routing.test.js dist/tests/capability-promotion-benchmark.test.js dist/tests/agent-control-plane-observer.test.js`

Expected: all named tests pass and provider-selection assertions remain unchanged.

Commit: `feat: observe token governor at orchestration boundary`

---

### Task 4: Operator Evidence, Documentation, and Full Regression

**Files:**
- Modify: `package.json`
- Create: `src/token-governor-cli.ts`
- Create: `tests/token-governor-cli.test.ts`
- Create: `docs/operations/TOKEN_GOVERNOR_SHADOW.md`
- Modify: `ops/CURRENT_STATE.md`
- Modify: `ops/BACKLOG.md`

**Interfaces:**
- Consumes: the default Token Governor telemetry store and aggregation function.
- Produces: `npm run token-governor:status` JSON with mode, metrics, limitations, and promotion requirements.

- [ ] **Step 1: Write failing CLI behavior test**

```ts
test('status CLI reports shadow metrics without claiming realized savings', async () => {
  const result = await tokenGovernorStatus(store);
  assert.equal(result.mode, 'shadow');
  assert.equal(result.metrics.appliedChanges, 0);
  assert.equal(result.savingsKind, 'estimated-avoidable-context-tokens');
  assert.match(result.promotionRequired, /explicit approval/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor-cli.test.js`

Expected: build fails because the CLI/status module does not exist.

- [ ] **Step 3: Implement the status CLI and package script**

Export a testable `tokenGovernorStatus(store)` function and print its JSON only when invoked as the CLI entrypoint. Add `"token-governor:status": "npm run build:core && node dist/src/token-governor-cli.js"`. The output must explicitly distinguish estimated avoidable tokens from realized provider billing.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-governor-cli.test.js`

Expected: the CLI test passes.

- [ ] **Step 5: Document operation and update canonical state**

Document shadow-only behavior, telemetry fields, local status command, privacy properties, known heuristic limitations, and the promotion checklist from the spec. Mark the Token Governor foundation complete in `ops/BACKLOG.md` while leaving promotion as empirical/human-gated in `ops/CURRENT_STATE.md`. Do not claim measured production savings when only fixture telemetry exists.

- [ ] **Step 6: Run formatting/diff checks and the full suite**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `npm test`

Expected: build and all repository tests pass with zero failures.

Run: `node scripts/design-drift-checker.mjs design/drift.config.json`

Expected: observation-only report; no enforcement or automatic remediation.

- [ ] **Step 7: Exercise status evidence and inspect final diff**

Run: `npm run token-governor:status`

Expected: valid JSON with `mode: "shadow"`, heuristic metrics, and `appliedChanges: 0`.

Run: `git diff --stat HEAD~4..HEAD && git diff --check HEAD~4..HEAD`

Expected: only Token Governor, focused integration, documentation, and canonical state changes; no new dependency or unrelated refactor.

- [ ] **Step 8: Commit Task 4**

Commit: `docs: expose token governor shadow evidence`

---

## Plan self-review

- Spec coverage: summarization, token telemetry, non-binding routing advice, Provider Registry integration, Skill Promotion Gate preservation, zero-cost operation, tests, SITREP evidence, and promotion requirements are each assigned to a task.
- Placeholder scan: no deferred implementation placeholders are present.
- Type consistency: Task 1 produces `TokenGovernorObservation`; Tasks 2 and 3 consume that exact type; Task 4 consumes `TokenGovernorStore` and its metrics.
- Review focus coverage: single-line bounds and diagnostic retention are in Task 1; secret redaction and malformed storage are in Task 2; failure containment and unchanged provider/output are in Task 3; inert candidate-skill behavior is in Task 1 and promotion-gate regression is in Task 3.
