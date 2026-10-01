# Munin Token Efficiency v2 + Codex Web Zero Risk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, observable efficiency layer that bounds repository context and command output, routes work economically within existing policy, persists compact checkpoints, produces diff-first reviews, and prepares manual-only Codex Web handoffs.

**Architecture:** Extend the existing Token Governor with focused pure modules and a small `EfficiencyRuntime` facade. Integrate at the orchestration boundary without changing Provider Registry authority, then expose the same status contract through CLI, API, and a Munin diagnostic page.

**Tech Stack:** Node.js 20+, TypeScript 5.6, Node test runner, Vite 6, existing Munin JSONL/runtime stores and HTTP helpers.

**Spec:** `docs/superpowers/specs/2026-09-28-munin-token-efficiency-v2-design.md`

## Global Constraints

- Preserve zero-mandatory-cost and local-first operation.
- Do not add dependencies or paid services.
- Reuse Provider Registry, provider policy, orchestration traces, Token Governor, Control Room state, and the manual ChatGPT operator bridge.
- Model routing remains provider-neutral and cannot make an ineligible provider eligible.
- Zero Risk may prepare, copy, and visibly open a destination; it may not send, inspect DOM, scrape, ingest responses, or automate a browser.
- All persisted telemetry, checkpoints, and handoff data must be bounded and recursively secret-redacted.
- Preserve Windows support and unrelated working-tree changes.
- Use TDD for every behavior change and commit only task-owned files.

## Review Focus

- A large single-line command containing a secret must remain bounded and must not leak a prefix or suffix fragment of the secret; Task 1 tests this through the real reducer.
- A repository with no Git or `rg` discovery result must refuse broad reads instead of admitting every file; Task 2 tests the degraded result.
- Unknown optional MCP capabilities must remain unavailable without blocking deterministic core capabilities; Task 3 tests partial selection.
- A stale Build State revision must not overwrite a newer checkpoint or replay consolidated history; Task 4 tests optimistic revision checks and digest reuse.
- A launcher marked unavailable must still produce a copy-only packet, and no public API may exist for browser response ingestion; Tasks 6 and 8 test both boundaries.

---

### Task 1: Output Reduction, Test Failure Extraction, and Three-Tier Routing

**Files:**
- Modify: `src/token-governor.ts`
- Modify: `src/token-governor-store.ts`
- Modify: `tests/token-governor.test.ts`
- Modify: `tests/token-governor-store.test.ts`

**Interfaces:**
- Consumes: existing `redactSecretText(text: string): string`, `estimateTokens(text: string): number`, and shadow observations.
- Produces: `reduceCommandOutput(input: CommandOutputInput, options?: TokenGovernorOptions): ReducedCommandOutput`, `extractTestFailures(text: string, limit?: number): TestFailureExtraction`, and `recommendEconomicRoute(input: EconomicRouteInput): EconomicRouteRecommendation`.

- [ ] **Step 1: Write failing reducer and extractor tests**

```ts
test('failed test output retains failing cases stacks summary and exit code', () => {
  const output = ['TAP version 13', ...Array.from({ length: 80 }, (_, i) => `ok ${i}`), 'not ok 81 - rejects unsafe packet', 'AssertionError: expected false', '    at tests/zero-risk.test.ts:21:4', '# tests 81', '# pass 80', '# fail 1'].join('\n');
  const result = reduceCommandOutput({ output, exitCode: 1, kind: 'test' }, { largeOutputChars: 200, maxSummaryChars: 360 });
  assert.equal(result.exitCode, 1);
  assert.equal(result.failed, true);
  assert.match(result.summary, /not ok 81 - rejects unsafe packet/);
  assert.match(result.summary, /AssertionError/);
  assert.match(result.summary, /# fail 1/);
  assert.ok(result.truncatedChars > 0);
});

test('large secret-bearing single line is redacted before clipping', () => {
  const secret = `ghp_${'z'.repeat(24)}`;
  const result = reduceCommandOutput({ output: `begin ${secret} ${'x'.repeat(5000)} end`, exitCode: 2, kind: 'command' }, { largeOutputChars: 50, maxSummaryChars: 180 });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  assert.match(result.summary, /REDACTED/);
  assert.equal(result.exitCode, 2);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: compilation fails because `reduceCommandOutput` is not exported.

- [ ] **Step 3: Implement bounded output and failure extraction**

```ts
export interface CommandOutputInput { output: string; exitCode: number | null; kind: 'command' | 'test'; }
export interface TestFailureExtraction { detected: boolean; failures: string[]; stacks: string[]; summary: string[]; }
export interface ReducedCommandOutput extends ContextSummary {
  exitCode: number | null;
  failed: boolean;
  truncationReason?: 'large-command-output' | 'large-test-output';
  truncatedChars: number;
  failureEvidence: TestFailureExtraction;
}

export function extractTestFailures(text: string, limit = 20): TestFailureExtraction {
  const lines = text.split(/\r?\n/).map(line => line.slice(0, 4096));
  const failures = lines.filter(line => /(?:^|\s)(?:not ok|FAIL|FAILED|✖|×)(?:\s|:|-)/i.test(line)).slice(0, limit);
  const stacks = lines.filter(line => /^\s*at\s+|AssertionError|Error:|Exception|Traceback/i.test(line)).slice(0, limit * 3);
  const summary = lines.filter(line => /^\s*#?\s*(?:tests?|pass(?:ed)?|fail(?:ed)?|skip(?:ped)?|duration|time)\b/i.test(line)).slice(-12);
  return { detected: failures.length > 0 || summary.some(line => /fail/i.test(line)), failures, stacks, summary };
}
```

Build `reduceCommandOutput` by redacting first, using `extractTestFailures` for test output, allocating bounded head/diagnostic/tail segments, and carrying exit status independently from summarized text.

- [ ] **Step 4: Run reducer tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: all Token Governor tests pass.

- [ ] **Step 5: Write failing three-tier routing and compatibility tests**

```ts
test('economic routing uses standard for bounded code and premium only with trusted availability', () => {
  const standard = recommendEconomicRoute({ kind: 'code', risk: 'medium', complexity: 5, impact: 5, contextTokens: 3000, premiumAvailable: false });
  const premium = recommendEconomicRoute({ kind: 'review', risk: 'high', complexity: 9, impact: 9, contextTokens: 24000, premiumAvailable: true });
  assert.equal(standard.modelTier, 'standard');
  assert.equal(premium.modelTier, 'premium');
  assert.equal(standard.applied, false);
});
```

- [ ] **Step 6: Run routing test and verify RED**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js`

Expected: compilation fails because `recommendEconomicRoute` is not exported.

- [ ] **Step 7: Add portable economic routing and extend store aggregation**

```ts
export type EconomicModelTier = 'economy' | 'standard' | 'premium';
export interface EconomicRouteInput { kind: 'search' | 'triage' | 'write' | 'code' | 'review' | 'strategy'; risk: 'low' | 'medium' | 'high'; complexity: number; impact: number; contextTokens: number; premiumAvailable: boolean; selectedProviderId?: string; }
export interface EconomicRouteRecommendation { modelTier: EconomicModelTier; effort: ShadowReasoningEffort; applied: false; selectedProviderId?: string; reasonCode: 'deterministic-or-low-risk' | 'bounded-change' | 'complex-high-impact' | 'premium-unavailable'; reasons: string[]; }
```

Keep `recommendShadowRoute` as a compatibility projection, accept historical two-tier observations in `TokenGovernorStore`, and aggregate a three-key `byModelTier` result with zero defaults.

- [ ] **Step 8: Run focused store and governor tests**

Run: `npm run build:core && node --test dist/tests/token-governor.test.js dist/tests/token-governor-store.test.js dist/tests/token-governor-cli.test.js`

Expected: all focused tests pass and historical observations still load.

- [ ] **Step 9: Commit Task 1**

```powershell
git add -- src/token-governor.ts src/token-governor-store.ts tests/token-governor.test.ts tests/token-governor-store.test.ts
git commit -m "feat: add bounded output and economic routing"
```

### Task 2: Context Budget and File Relevance Gates

**Files:**
- Create: `src/context-budget.ts`
- Create: `src/repository-context-selector.ts`
- Create: `tests/context-budget.test.ts`
- Create: `tests/repository-context-selector.test.ts`

**Interfaces:**
- Consumes: repository root, objective text, explicit candidate evidence, and injected deterministic command runner.
- Produces: `applyContextBudget(candidates, budget): ContextSelection` and `RepositoryContextSelector.select(input): Promise<RepositoryContextResult>`.

- [ ] **Step 1: Write failing pure budget tests**

```ts
test('selection requires evidence and stops at the configured character budget', () => {
  const result = applyContextBudget([
    { path: 'src/a.ts', content: 'a'.repeat(80), evidence: ['rg:a'] },
    { path: 'src/b.ts', content: 'b'.repeat(80), evidence: [] },
    { path: 'src/c.ts', content: 'c'.repeat(80), evidence: ['git:changed'] },
  ], { maxChars: 100, maxEstimatedTokens: 25, maxFileChars: 90 });
  assert.deepEqual(result.selected.map(item => item.path), ['src/a.ts']);
  assert.equal(result.rejected.find(item => item.path === 'src/b.ts')?.reason, 'missing-relevance-evidence');
  assert.equal(result.usedChars, 80);
  assert.equal(result.avoidedChars, 160);
});

test('invalid budgets fail before candidate content is inspected', () => {
  assert.throws(() => applyContextBudget([], { maxChars: 0, maxEstimatedTokens: 10, maxFileChars: 10 }), /maxChars/);
});
```

- [ ] **Step 2: Run budget tests and verify RED**

Run: `npm run build:core && node --test dist/tests/context-budget.test.js`

Expected: compilation fails because `src/context-budget.ts` does not exist.

- [ ] **Step 3: Implement deterministic budget selection**

```ts
export interface ContextBudget { maxChars: number; maxEstimatedTokens: number; maxFileChars: number; }
export interface ContextCandidate { path: string; content: string; evidence: string[]; score?: number; generated?: boolean; ignored?: boolean; binary?: boolean; }
export interface ContextSelection { selected: ContextCandidate[]; rejected: Array<{ path: string; reason: string }>; usedChars: number; remainingChars: number; avoidedChars: number; estimatedSelectedTokens: number; estimatedAvoidedTokens: number; }
```

Validate positive finite integers, sort by score then normalized path, reject missing evidence/generated/ignored/binary/oversized candidates, and stop without splitting a candidate when either budget would be exceeded.

- [ ] **Step 4: Run pure budget tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/context-budget.test.js`

Expected: all context budget tests pass.

- [ ] **Step 5: Write failing repository discovery tests with an injected runner**

```ts
test('git and rg evidence admit bounded excerpts while broad reads are refused', async () => {
  const selector = new RepositoryContextSelector({
    readText: async path => path.endsWith('target.ts') ? `${'x'.repeat(40)}\nneedle\n${'y'.repeat(40)}` : 'unrelated',
    run: async command => command.kind === 'git-status' ? { ok: true, lines: ['src/changed.ts'] } : { ok: true, lines: ['src/target.ts:2:needle'] },
    isTracked: async () => true,
  });
  const result = await selector.select({ root: 'C:/repo', objective: 'fix needle', budget: { maxChars: 120, maxEstimatedTokens: 30, maxFileChars: 100 } });
  assert.ok(result.selection.selected.some(item => item.path === 'src/target.ts'));
  assert.equal(result.broadReadRefused, true);
  assert.deepEqual(result.discovery.map(item => item.kind), ['git-status', 'rg']);
});
```

- [ ] **Step 6: Run repository selector tests and verify RED**

Run: `npm run build:core && node --test dist/tests/repository-context-selector.test.js`

Expected: compilation fails because `RepositoryContextSelector` does not exist.

- [ ] **Step 7: Implement Git/rg-first incremental discovery**

```ts
export interface RepositoryContextInput { root: string; objective: string; budget: ContextBudget; explicitPaths?: string[]; }
export interface RepositoryContextResult { selection: ContextSelection; discovery: Array<{ kind: 'git-status' | 'git-files' | 'git-log' | 'rg'; ok: boolean; detail: string }>; broadReadRefused: boolean; degraded: boolean; diagnostics: string[]; }
```

Normalize paths under `root`, reject traversal, collect changed and tracked paths before `rg` matches, read bounded excerpts around matches, and return degraded diagnostics when Git or `rg` is unavailable. Never replace missing discovery with a recursive read.

- [ ] **Step 8: Run context selector tests**

Run: `npm run build:core && node --test dist/tests/context-budget.test.js dist/tests/repository-context-selector.test.js`

Expected: all context selection tests pass.

- [ ] **Step 9: Commit Task 2**

```powershell
git add -- src/context-budget.ts src/repository-context-selector.ts tests/context-budget.test.ts tests/repository-context-selector.test.ts
git commit -m "feat: gate repository context by relevance"
```

### Task 3: Lazy Capability and MCP Selection

**Files:**
- Create: `src/capability-selector.ts`
- Create: `tests/capability-selector.test.ts`

**Interfaces:**
- Consumes: portable capability descriptors and requested objective signals.
- Produces: `selectCapabilities(input): CapabilitySelection` without starting, installing, connecting, or authenticating services.

- [ ] **Step 1: Write failing capability minimization tests**

```ts
test('selects deterministic core plus only the cheapest available coverage', () => {
  const result = selectCapabilities({ required: ['repo.search', 'test.run'], descriptors: [
    { id: 'core-rg', provides: ['repo.search'], activationCost: 0, locality: 'local', available: true, core: true },
    { id: 'core-test', provides: ['test.run'], activationCost: 0, locality: 'local', available: true },
    { id: 'github', provides: ['repo.search', 'issues.read'], activationCost: 5, locality: 'external', available: true },
    { id: 'slack', provides: ['chat.read'], activationCost: 5, locality: 'external', available: false },
  ] });
  assert.deepEqual(result.active.map(item => item.id), ['core-rg', 'core-test']);
  assert.deepEqual(result.inactive.map(item => item.id).sort(), ['github', 'slack']);
});

test('missing optional capability degrades without blocking core selection', () => {
  const result = selectCapabilities({ required: ['repo.search'], optional: ['chat.read'], descriptors: [{ id: 'core-rg', provides: ['repo.search'], activationCost: 0, locality: 'local', available: true, core: true }] });
  assert.deepEqual(result.missingOptional, ['chat.read']);
  assert.equal(result.blocked, false);
});
```

- [ ] **Step 2: Run capability tests and verify RED**

Run: `npm run build:core && node --test dist/tests/capability-selector.test.js`

Expected: compilation fails because the module does not exist.

- [ ] **Step 3: Implement deterministic lazy selection**

```ts
export interface CapabilityDescriptor { id: string; provides: string[]; activationCost: number; locality: 'local' | 'external'; available: boolean; core?: boolean; prerequisite?: string; }
export interface CapabilitySelection { active: CapabilityDescriptor[]; inactive: CapabilityDescriptor[]; missingRequired: string[]; missingOptional: string[]; blocked: boolean; considered: number; }
```

Select core descriptors first, then greedily cover remaining required capabilities by lowest activation cost, locality, and stable identifier. Record unavailable descriptors but perform no activation side effect.

- [ ] **Step 4: Run capability tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/capability-selector.test.js`

Expected: all capability tests pass.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/capability-selector.ts tests/capability-selector.test.ts
git commit -m "feat: select runtime capabilities lazily"
```

### Task 4: Compact Build State and Diff-First Review Packets

**Files:**
- Create: `src/efficiency-build-state.ts`
- Create: `src/diff-review-packet.ts`
- Create: `tests/efficiency-build-state.test.ts`
- Create: `tests/diff-review-packet.test.ts`

**Interfaces:**
- Consumes: runtime file path, revisioned state update, repository diff metadata, selected context, and verification evidence.
- Produces: `EfficiencyBuildStateStore.load/save`, `historyReuse`, and `buildDiffReviewPacket(input)`.

- [ ] **Step 1: Write failing revision, digest, and bounding tests**

```ts
test('newer revision wins and consolidated history is referenced by digest', async () => {
  const store = new EfficiencyBuildStateStore(file);
  const first = await store.save({ taskId: 'task-1', expectedRevision: 0, objective: 'build efficiency', status: 'running', decisions: ['manual web only'], relevantFiles: ['src/a.ts'], blockers: [], tests: [], nextAction: 'run tests', consolidatedHistory: 'accepted design and spec' });
  assert.equal(first.revision, 1);
  assert.equal(historyReuse(first, 'accepted design and spec').reused, true);
  await assert.rejects(() => store.save({ ...first, expectedRevision: 0, nextAction: 'overwrite' }), /revision/i);
  assert.ok(JSON.stringify(first).length < 12_000);
});
```

- [ ] **Step 2: Run Build State tests and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-build-state.test.js`

Expected: compilation fails because the store does not exist.

- [ ] **Step 3: Implement atomic compact Build State persistence**

```ts
export type EfficiencyBuildStatus = 'planned' | 'running' | 'blocked' | 'verifying' | 'complete' | 'failed';
export interface EfficiencyBuildState { taskId: string; revision: number; objective: string; status: EfficiencyBuildStatus; decisions: string[]; relevantFiles: string[]; blockers: string[]; tests: Array<{ command: string; outcome: 'passed' | 'failed' | 'not-run'; summary: string }>; nextAction: string; historyDigest: string; updatedAt: string; }
```

Hash consolidated history with SHA-256, cap arrays and strings, redact recursively, write a temporary sibling file, then rename atomically. Reject stale `expectedRevision` values.

- [ ] **Step 4: Run Build State tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/efficiency-build-state.test.js`

Expected: all Build State tests pass.

- [ ] **Step 5: Write failing diff-first packet tests**

```ts
test('review packet contains affected hunks and names unrelated dirty paths without reading them', () => {
  const packet = buildDiffReviewPacket({ objective: 'add gate', constraints: ['zero cost'], buildState, affected: [{ path: 'src/gate.ts', patch: '@@ -1 +1 @@\n-old\n+new' }], unrelatedDirtyPaths: ['src/offer-architect.ts'], tests: [{ command: 'npm test', outcome: 'passed', summary: '200 passed' }] });
  assert.match(packet.text, /src\/gate.ts/);
  assert.match(packet.text, /@@ -1 \+1 @@/);
  assert.match(packet.text, /src\/offer-architect.ts/);
  assert.doesNotMatch(packet.text, /offer architect implementation/);
  assert.ok(packet.includedFiles < 10);
});
```

- [ ] **Step 6: Run review packet tests and verify RED**

Run: `npm run build:core && node --test dist/tests/diff-review-packet.test.js`

Expected: compilation fails because `buildDiffReviewPacket` does not exist.

- [ ] **Step 7: Implement bounded diff-first review packets**

```ts
export interface DiffReviewPacket { text: string; includedFiles: number; omittedHunks: number; originalChars: number; retainedChars: number; }
```

Render objective, constraints, compact Build State, affected paths and bounded patches, test evidence, and unrelated dirty path names. Apply the output reducer to oversized patches and never read unrelated file contents.

- [ ] **Step 8: Run Task 4 tests**

Run: `npm run build:core && node --test dist/tests/efficiency-build-state.test.js dist/tests/diff-review-packet.test.js`

Expected: all checkpoint and review tests pass.

- [ ] **Step 9: Commit Task 4**

```powershell
git add -- src/efficiency-build-state.ts src/diff-review-packet.ts tests/efficiency-build-state.test.ts tests/diff-review-packet.test.ts
git commit -m "feat: persist compact build state"
```

### Task 5: Efficiency Telemetry and Status Projection

**Files:**
- Create: `src/efficiency-telemetry.ts`
- Create: `src/efficiency-telemetry-store.ts`
- Create: `tests/efficiency-telemetry.test.ts`
- Create: `tests/efficiency-telemetry-store.test.ts`

**Interfaces:**
- Consumes: context selection, output reduction, capability selection, route recommendation, checkpoint reuse, and manual Web state.
- Produces: bounded `EfficiencyObservation`, separate `contextEfficiency` and `creditSavingsProxy`, JSONL persistence, and aggregate status.

- [ ] **Step 1: Write failing metric-separation tests**

```ts
test('observable context efficiency is separate from non-billing credit proxy', () => {
  const observation = observeEfficiency({ runId: 'r1', selectedFiles: 2, candidateFiles: 20, inputChars: 10000, selectedChars: 2000, outputOriginalChars: 5000, outputRetainedChars: 900, capabilitiesConsidered: 8, capabilitiesActive: 2, reusedHistoryChars: 1200, modelTier: 'economy', reasonCode: 'deterministic-or-low-risk', zeroRiskMode: 'copy-only' });
  assert.equal(observation.contextEfficiency.avoidedContextChars, 8000);
  assert.equal(observation.contextEfficiency.truncatedOutputChars, 4100);
  assert.equal(observation.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
  assert.equal('currency' in observation.creditSavingsProxy, false);
  assert.equal('realizedCredits' in observation.creditSavingsProxy, false);
});
```

- [ ] **Step 2: Run telemetry test and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-telemetry.test.js`

Expected: compilation fails because `observeEfficiency` does not exist.

- [ ] **Step 3: Implement the telemetry contract and aggregation**

```ts
export interface EfficiencyObservation {
  runId: string;
  observedAt: string;
  contextEfficiency: { candidateFiles: number; selectedFiles: number; inputChars: number; selectedChars: number; avoidedContextChars: number; estimatedAvoidedContextTokens: number; outputOriginalChars: number; outputRetainedChars: number; truncatedOutputChars: number; capabilitiesConsidered: number; capabilitiesActive: number; reusedHistoryChars: number; modelTier: EconomicModelTier; reasonCode: string; zeroRiskMode: 'disabled' | 'copy-only' | 'copy-and-open'; };
  creditSavingsProxy: { kind: 'estimated-avoidable-context-tokens'; estimatedTokens: number; limitation: string; };
}
```

Aggregate counts and sums without inferring money, provider invoices, or realized credits.

- [ ] **Step 4: Write failing store resilience tests**

```ts
test('store redacts observations and ignores malformed historical rows', async () => {
  await appendFile(file, '{bad json}\n', 'utf8');
  await store.append(observationWithSecret);
  const bytes = await readFile(file, 'utf8');
  assert.doesNotMatch(bytes, /ghp_[a-z0-9]+/i);
  assert.equal((await store.list()).length, 1);
});
```

- [ ] **Step 5: Run store test and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-telemetry-store.test.js`

Expected: compilation fails because `EfficiencyTelemetryStore` does not exist.

- [ ] **Step 6: Implement non-blocking JSONL storage**

Use `runtimePath('efficiency-observations.jsonl')`, recursive string redaction, a maximum of 1,000 returned records, and malformed-row skipping consistent with `TokenGovernorStore`.

- [ ] **Step 7: Run telemetry tests**

Run: `npm run build:core && node --test dist/tests/efficiency-telemetry.test.js dist/tests/efficiency-telemetry-store.test.js`

Expected: all telemetry tests pass.

- [ ] **Step 8: Commit Task 5**

```powershell
git add -- src/efficiency-telemetry.ts src/efficiency-telemetry-store.ts tests/efficiency-telemetry.test.ts tests/efficiency-telemetry-store.test.ts
git commit -m "feat: record token efficiency metrics"
```

### Task 6: Manual Codex Web Zero Risk Packet

**Files:**
- Create: `src/manual-web-handoff.ts`
- Create: `tests/manual-web-handoff.test.ts`
- Modify: `apps/web/src/chatgpt-operator-bridge.ts`
- Modify: `tests/chatgpt-operator-bridge.test.ts`

**Interfaces:**
- Consumes: objective, compact Build State, selected context, constraints, response contract, configured visible destination, and passive launcher status.
- Produces: `prepareManualWebHandoff(input): ManualWebPacket` and browser-side copy/open actions with no send or response path.

- [ ] **Step 1: Write failing packet safety tests**

```ts
test('manual packet is bounded redacted and copy-only when launcher is unavailable', () => {
  const secret = `ghp_${'q'.repeat(24)}`;
  const packet = prepareManualWebHandoff({ objective: 'review change', constraints: ['zero cost'], buildState, selectedContext: [{ path: 'src/a.ts', excerpt: `safe ${secret}` }], responseContract: 'Return findings only.', launcher: { status: 'unavailable' }, maxChars: 4000 });
  assert.equal(packet.mode, 'copy-only');
  assert.equal(packet.launcher.status, 'unavailable');
  assert.doesNotMatch(packet.text, new RegExp(secret));
  assert.match(packet.text, /MANUAL ONLY/);
  assert.ok(packet.text.length <= 4000);
  assert.equal('send' in packet, false);
  assert.equal('ingestResponse' in packet, false);
});
```

- [ ] **Step 2: Run handoff tests and verify RED**

Run: `npm run build:core && node --test dist/tests/manual-web-handoff.test.js`

Expected: compilation fails because the module does not exist.

- [ ] **Step 3: Implement the structurally manual packet builder**

```ts
export type LauncherState = { status: 'available' | 'unavailable' | 'unknown'; url?: string; guidance?: string };
export interface ManualWebPacket { id: string; mode: 'copy-only' | 'copy-and-open'; text: string; chars: number; estimatedTokens: number; launcher: LauncherState; preparedAt: string; boundary: 'manual-only-no-response-ingestion'; }
```

Reject non-HTTP(S) destinations, redact every string, enforce the supplied cap, include no browser control object, and expose no method that accepts an external response.

- [ ] **Step 4: Run handoff tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/manual-web-handoff.test.js`

Expected: all manual handoff tests pass.

- [ ] **Step 5: Add failing bridge contract assertions**

```ts
assert.match(bridge, /ZERO RISK · MANUAL/);
assert.match(bridge, /navigator\.clipboard\.writeText/);
assert.match(bridge, /window\.open/);
assert.doesNotMatch(bridge, /querySelector\([^)]*iframe|contentDocument|contentWindow|MutationObserver|postMessage|sendPrompt|readResponse/);
```

- [ ] **Step 6: Run bridge contract test and verify RED**

Run: `npm run build:core && node --test dist/tests/chatgpt-operator-bridge.test.js`

Expected: the new Zero Risk copy is absent.

- [ ] **Step 7: Update bridge copy and API-backed packet preparation**

Keep the existing clipboard and visible `window.open` behavior, replace direct broad snapshot construction with a request to the bounded packet endpoint added in Task 8, and fall back to the existing sanitized small snapshot if that endpoint is unavailable. Display manual-only and launcher-degraded states explicitly.

- [ ] **Step 8: Run bridge tests**

Run: `npm run build:core && node --test dist/tests/manual-web-handoff.test.js dist/tests/chatgpt-operator-bridge.test.js`

Expected: all Zero Risk contract tests pass.

- [ ] **Step 9: Commit Task 6**

```powershell
git add -- src/manual-web-handoff.ts tests/manual-web-handoff.test.ts apps/web/src/chatgpt-operator-bridge.ts tests/chatgpt-operator-bridge.test.ts
git commit -m "feat: add manual zero risk handoff"
```

### Task 7: Efficiency Runtime Facade and Orchestration Observation

**Files:**
- Create: `src/efficiency-runtime.ts`
- Create: `tests/efficiency-runtime.test.ts`
- Modify: `src/orchestration-runtime-core.ts`
- Modify: `src/orchestration-trace.ts`
- Modify: `src/orchestration-trace-store.ts`
- Modify: `tests/orchestration-runtime.test.ts`
- Modify: `tests/orchestration-trace-store.test.ts`

**Interfaces:**
- Consumes: selectors and stores built in Tasks 1–6.
- Produces: `EfficiencyRuntime.prepare(input)`, `EfficiencyRuntime.observe(input)`, and optional `efficiency` evidence on orchestration traces.

- [ ] **Step 1: Write failing facade tests**

```ts
test('prepare combines bounded context capabilities route and checkpoint without invoking a provider', async () => {
  let providerCalls = 0;
  const runtime = new EfficiencyRuntime(dependencies({ providerExecute: async () => { providerCalls += 1; } }));
  const result = await runtime.prepare({ runId: 'r1', objective: 'review changed auth code', root, taskKind: 'review', risk: 'high', complexity: 8, impact: 8, budget: { maxChars: 5000, maxEstimatedTokens: 1250, maxFileChars: 3000 }, requiredCapabilities: ['repo.search', 'diff.read'] });
  assert.ok(result.context.selection.selected.length > 0);
  assert.equal(result.route.applied, false);
  assert.equal(providerCalls, 0);
});
```

- [ ] **Step 2: Run facade test and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-runtime.test.js`

Expected: compilation fails because `EfficiencyRuntime` does not exist.

- [ ] **Step 3: Implement the facade with dependency injection**

```ts
export interface EfficiencyPreparation { context: RepositoryContextResult; capabilities: CapabilitySelection; route: EconomicRouteRecommendation; buildState?: EfficiencyBuildState; diagnostics: string[]; }
export class EfficiencyRuntime {
  async prepare(input: EfficiencyPrepareInput): Promise<EfficiencyPreparation>;
  async observe(input: EfficiencyObserveInput): Promise<EfficiencyObservation | undefined>;
  async status(): Promise<EfficiencyStatus>;
}
```

Keep preparation deterministic and side-effect-free except checkpoint/telemetry persistence. Wrap store writes in bounded non-blocking handling.

- [ ] **Step 4: Run facade tests and verify GREEN**

Run: `npm run build:core && node --test dist/tests/efficiency-runtime.test.js`

Expected: all facade tests pass.

- [ ] **Step 5: Write failing orchestration observation tests**

```ts
assert.equal(result.trace.efficiency?.route.modelTier, 'economy');
assert.equal(result.trace.efficiency?.contextEfficiency.selectedFiles, 0);
assert.equal(result.trace.efficiency?.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
assert.equal(result.trace.tokenGovernor?.mode, 'shadow');
```

- [ ] **Step 6: Run orchestration tests and verify RED**

Run: `npm run build:core && node --test dist/tests/orchestration-runtime.test.js dist/tests/orchestration-trace-store.test.js`

Expected: trace lacks `efficiency` evidence.

- [ ] **Step 7: Integrate observation without changing provider selection**

Add an optional efficiency observer dependency to `OrchestrationRuntimeOptions`. Observe the already selected request and response after Provider Registry selection. Do not change `candidates`, `ProviderRegistry.select`, `orchestrationPolicy`, or provider execution order. Redact the new trace field in `OrchestrationTraceStore`.

- [ ] **Step 8: Run orchestration tests**

Run: `npm run build:core && node --test dist/tests/efficiency-runtime.test.js dist/tests/orchestration-runtime.test.js dist/tests/orchestration-trace-store.test.js`

Expected: all runtime tests pass and existing Token Governor evidence remains compatible.

- [ ] **Step 9: Commit Task 7**

```powershell
git add -- src/efficiency-runtime.ts tests/efficiency-runtime.test.ts src/orchestration-runtime-core.ts src/orchestration-trace.ts src/orchestration-trace-store.ts tests/orchestration-runtime.test.ts tests/orchestration-trace-store.test.ts
git commit -m "feat: observe efficiency at orchestration boundary"
```

### Task 8: CLI and HTTP Diagnostics

**Files:**
- Create: `src/efficiency-cli.ts`
- Create: `src/efficiency-api.ts`
- Create: `tests/efficiency-cli.test.ts`
- Create: `tests/efficiency-api.test.ts`
- Modify: `src/server.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `EfficiencyRuntime.status()` and `prepareManualWebHandoff`.
- Produces: `npm run efficiency:status`, `GET /api/efficiency/status`, and `POST /api/efficiency/manual-web-packet`.

- [ ] **Step 1: Write failing CLI status contract test**

```ts
test('status labels context metrics and credit proxy separately', async () => {
  const status = await efficiencyStatus(fakeRuntime);
  assert.ok(status.contextEfficiency);
  assert.equal(status.creditSavingsProxy.kind, 'estimated-avoidable-context-tokens');
  assert.match(status.limitations.join(' '), /not realized provider billing savings/i);
});
```

- [ ] **Step 2: Run CLI test and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-cli.test.js`

Expected: compilation fails because `efficiencyStatus` does not exist.

- [ ] **Step 3: Implement CLI projection and package script**

Add `"efficiency:status": "npm run build:core && node dist/src/efficiency-cli.js"` and print only bounded JSON status.

- [ ] **Step 4: Run CLI test and verify GREEN**

Run: `npm run build:core && node --test dist/tests/efficiency-cli.test.js`

Expected: CLI contract test passes.

- [ ] **Step 5: Write failing API route tests**

```ts
test('manual packet endpoint prepares but never sends or ingests a response', async () => {
  const response = await request(handler, 'POST', '/api/efficiency/manual-web-packet', { objective: 'review diff' });
  assert.equal(response.status, 201);
  assert.equal(response.body.boundary, 'manual-only-no-response-ingestion');
  assert.equal('response' in response.body, false);
});

test('unknown efficiency route returns 404', async () => {
  const response = await request(handler, 'POST', '/api/efficiency/response', { text: 'external answer' });
  assert.equal(response.status, 404);
});
```

- [ ] **Step 6: Run API tests and verify RED**

Run: `npm run build:core && node --test dist/tests/efficiency-api.test.js`

Expected: compilation fails because `handleEfficiencyApi` does not exist.

- [ ] **Step 7: Implement bounded API routes and server registration**

Use `readJsonBody(request, 100_000)`, `requireText`, finite enum parsing, and existing `json`. Register `['/api/efficiency', handleEfficiencyApi]` before generic routes. Expose no response-ingestion route.

- [ ] **Step 8: Run CLI and API tests**

Run: `npm run build:core && node --test dist/tests/efficiency-cli.test.js dist/tests/efficiency-api.test.js`

Expected: all diagnostic surface tests pass.

- [ ] **Step 9: Commit Task 8 without staging unrelated package or server hunks**

Use `git diff -- package.json src/server.ts` to confirm the existing Offer Architect hunks remain unstaged, then stage only the efficiency hunks with an interactive patch operation or a temporary index-safe patch.

```powershell
git add -- src/efficiency-cli.ts src/efficiency-api.ts tests/efficiency-cli.test.ts tests/efficiency-api.test.ts
git add -p -- package.json src/server.ts
git commit -m "feat: expose efficiency diagnostics"
```

### Task 9: Munin Efficiency UI

**Files:**
- Create: `apps/web/token-efficiency.html`
- Create: `tests/token-efficiency-web-contract.test.ts`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/public/munin-nav.js`

**Interfaces:**
- Consumes: `GET /api/efficiency/status` and `POST /api/efficiency/manual-web-packet`.
- Produces: responsive `/token-efficiency.html` diagnostics with copy-only/manual Zero Risk controls.

- [ ] **Step 1: Write failing UI contract tests**

```ts
test('efficiency surface shows all governed diagnostic dimensions', async () => {
  const page = await readFile(new URL('../apps/web/token-efficiency.html', import.meta.url), 'utf8');
  for (const text of ['Contexto selecionado', 'Budget', 'Rota econômica', 'Output truncado', 'Build State', 'Zero Risk · manual', 'Proxy de economia']) assert.match(page, new RegExp(text, 'i'));
  assert.match(page, /\/api\/efficiency\/status/);
  assert.match(page, /\/api\/efficiency\/manual-web-packet/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(page, /contentDocument|MutationObserver|readResponse|sendPrompt/);
});
```

- [ ] **Step 2: Run UI contract and verify RED**

Run: `npm run build:core && node --test dist/tests/token-efficiency-web-contract.test.js`

Expected: page file is missing.

- [ ] **Step 3: Build the diagnostic page using current Munin patterns**

Create semantic metric cards, selected-file rows, capability chips, checkpoint summary, and a manual packet panel. Use `/munin.css`, `/munin-nav.js`, existing surface colors, visible focus, text state labels, escaped dynamic text, responsive grids, useful empty/error states, and no new framework.

- [ ] **Step 4: Add Vite and navigation entries carefully around existing Offer Architect edits**

Add `'token-efficiency': path.resolve(root, 'token-efficiency.html')`, a primary or Tools navigation link labeled `Efficiency`, and a command-palette entry. Do not reorder or rewrite unrelated navigation entries.

- [ ] **Step 5: Run UI, bridge, navigation, and Web build checks**

Run: `npm run build:core && node --test dist/tests/token-efficiency-web-contract.test.js dist/tests/chatgpt-operator-bridge.test.js dist/tests/web-navigation.test.js && npm run build:web`

Expected: tests and Vite build pass.

- [ ] **Step 6: Run the design drift diagnostic**

Run: `node scripts/design-drift-checker.mjs design/drift.config.json`

Expected: tool exits successfully; record observations without auto-fixing unrelated screens.

- [ ] **Step 7: Commit Task 9 without staging Offer Architect hunks**

```powershell
git add -- apps/web/token-efficiency.html tests/token-efficiency-web-contract.test.ts
git add -p -- apps/web/vite.config.ts apps/web/public/munin-nav.js
git commit -m "feat: add token efficiency diagnostics UI"
```

### Task 10: AGENTS Diet and Operating Documentation

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/engineering/CONTEXT_EFFICIENCY.md`
- Create: `docs/engineering/CODEX_WEB_ZERO_RISK.md`
- Create: `docs/engineering/AGENTS_AUDIT_2026-09-28.md`

**Interfaces:**
- Consumes: implemented commands, routes, metrics, and safety boundaries.
- Produces: shorter root context plus scoped operating references for engineering efficiency and manual Web handoff.

- [ ] **Step 1: Capture the root instruction baseline**

Run: `(Get-Content -Raw AGENTS.md).Length`

Expected: record the exact pre-change character count in `AGENTS_AUDIT_2026-09-28.md`.

- [ ] **Step 2: Reduce root instructions without weakening global rules**

Keep mission, non-negotiable cost/safety rules, architecture entry points, Second Brain commands, evidence-bound engineering loop, UI governance reference, and completion gate. Move explanatory Hermes workflow detail and specialized implementation elaboration to the scoped engineering document while retaining links from root.

- [ ] **Step 3: Document the command-first and context-selection workflow**

`CONTEXT_EFFICIENCY.md` must document Git/`rg`/test-first discovery, default budgets, output reduction, test extraction, Build State, diff-first review, lazy capabilities, metric semantics, CLI/API/UI diagnostics, and degraded modes.

- [ ] **Step 4: Document the manual-only Web boundary**

`CODEX_WEB_ZERO_RISK.md` must explicitly list allowed prepare/copy/open actions and forbidden send, DOM, scraping, cookie, response-ingestion, quota-evasion, and background automation actions. Include copy-only behavior when no launcher exists.

- [ ] **Step 5: Complete the audit with before/after measurements**

Run: `(Get-Content -Raw AGENTS.md).Length`

Expected: after count is smaller than baseline. Document relocated sections and confirm approval, secret, Windows, zero-cost, validation, and durable-state requirements remain.

- [ ] **Step 6: Verify documentation and links**

Run: `rg -n "CONTEXT_EFFICIENCY|CODEX_WEB_ZERO_RISK|second-brain:recall|npm test|zero-mandatory-cost|Windows" AGENTS.md docs/engineering`

Expected: all canonical references are present and no incomplete marker or unsupported billing claim exists.

- [ ] **Step 7: Commit Task 10**

```powershell
git add -- AGENTS.md docs/engineering/CONTEXT_EFFICIENCY.md docs/engineering/CODEX_WEB_ZERO_RISK.md docs/engineering/AGENTS_AUDIT_2026-09-28.md
git commit -m "docs: reduce global agent context"
```

### Task 11: Full Verification, Controlled Restart, and Runtime Smoke Test

**Files:**
- Modify only if a verification failure is reproduced with a new failing test in the owning task files.
- Update: `ops/SESSION_LOG.md` only through the required Second Brain post-task command.

**Interfaces:**
- Consumes: completed implementation, supervised workspace state, and local API/Web endpoints.
- Produces: fresh test/build evidence, controlled restart receipt, post-restart status/UI smoke evidence, final diff review, and durable Second Brain summary.

- [ ] **Step 1: Run all focused efficiency tests together**

Run:

```powershell
npm run build:core
node --test dist/tests/token-governor.test.js dist/tests/token-governor-store.test.js dist/tests/context-budget.test.js dist/tests/repository-context-selector.test.js dist/tests/capability-selector.test.js dist/tests/efficiency-build-state.test.js dist/tests/diff-review-packet.test.js dist/tests/efficiency-telemetry.test.js dist/tests/efficiency-telemetry-store.test.js dist/tests/manual-web-handoff.test.js dist/tests/efficiency-runtime.test.js dist/tests/orchestration-runtime.test.js dist/tests/orchestration-trace-store.test.js dist/tests/efficiency-cli.test.js dist/tests/efficiency-api.test.js dist/tests/chatgpt-operator-bridge.test.js dist/tests/token-efficiency-web-contract.test.js
```

Expected: zero failed tests.

- [ ] **Step 2: Run the complete repository suite**

Run: `npm test`

Expected: build completes and the full test runner reports zero failures. If an unrelated existing failure appears, report it by exact test name; do not hide or waive it.

- [ ] **Step 3: Run design diagnostics**

Run: `node scripts/design-drift-checker.mjs design/drift.config.json`

Expected: diagnostic completes. Record findings attributable to the new page separately from pre-existing drift.

- [ ] **Step 4: Inspect the final diff and repository state**

Run: `git status --short`, `git diff --stat HEAD~10..HEAD`, and scoped `git diff` checks for every changed efficiency file.

Expected: Offer Architect files and other pre-existing changes remain present and unmodified except for intentional non-overlapping shared-file hunks; no runtime data, credentials, build output, or dependency changes are committed.

- [ ] **Step 5: Request the existing controlled restart**

Run:

```powershell
node --input-type=module -e "import { LocalHostAdapter } from './dist/src/local-host-adapter.js'; console.log(await new LocalHostAdapter({ cwd: process.cwd() }).restartMunin())"
```

Expected: receipt contains `Controlled Munin restart requested through workspace supervisor`.

- [ ] **Step 6: Confirm supervisor generation advances and services recover**

Read `data/runtime/workspace-supervisor.json` until `status` is `running`, heartbeat is younger than 15 seconds, and generation is greater than its pre-restart value. Do not wait longer than 60 seconds without reporting status.

- [ ] **Step 7: Smoke-test API, UI, and copy-only degradation**

Run:

```powershell
Invoke-RestMethod 'http://127.0.0.1:4310/api/efficiency/status'
Invoke-WebRequest 'http://127.0.0.1:5173/token-efficiency.html' -UseBasicParsing
Invoke-RestMethod 'http://127.0.0.1:4310/api/efficiency/manual-web-packet' -Method Post -ContentType 'application/json' -Body '{"objective":"Runtime smoke test","launcher":{"status":"unavailable"}}'
```

Expected: status is 200, UI HTML contains `Token Efficiency`, and the packet reports `copy-only` plus `manual-only-no-response-ingestion` without an external response field.

- [ ] **Step 8: Commit durable task memory**

Run:

```powershell
npm run second-brain:commit -- --task "Munin Token Efficiency v2 and Codex Web Zero Risk" --summary "Implemented bounded context, output reduction, test failure extraction, lazy capabilities, economic routing, compact Build State, diff-first review, separate efficiency telemetry, manual-only Zero Risk handoff, diagnostics and runtime verification." --project "munin-foundation" --decisions "Extend Token Governor through focused deterministic modules|Keep Provider Registry authoritative|Keep Codex Web copy/open manual-only" --changed "Efficiency runtime and tests|CLI API and UI diagnostics|Scoped AGENTS guidance" --next "Collect representative local efficiency evidence before any routing promotion" --failed "None"
```

Expected: Second Brain records a bounded post-task event without secrets.

- [ ] **Step 9: Re-run repository status and report evidence**

Run: `git status --short` and `git log --oneline -12`.

Expected: repository state and all task commits are known; unrelated pre-existing changes are listed accurately.
