# Adaptive Relevance Decay and Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make adaptive outcome retrieval decay with age and accept explicit, bounded operator feedback while preserving deterministic local execution, safety authority, and zero mandatory cost.

**Architecture:** Keep `adaptive-execution.ts` authoritative for outcome storage and learned routing, and add a pure `adaptive-relevance.ts` scoring/validation unit. Persist feedback in schema-v2 `adaptive-outcomes.json`, record a redacted local event after successful mutation, and expose one bearer-protected local mutation endpoint through the unified server.

**Tech Stack:** TypeScript 5.6, Node.js 20 built-in test runner, built-in HTTP server, existing atomic JSON storage, existing mobile bearer-token authentication, no new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-02-adaptive-relevance-decay-design.md`

## Global Constraints

- Preserve `localOnly=true`, `maxCostPerCall=0`, reviewer gates, and authoritative high-risk/strategy/review routing.
- Do not start, probe, or wait for Ollama and do not require an OpenAI API key.
- Do not add a paid service, network call, background worker, model, or dependency.
- Keep feedback reasons in ignored runtime storage only; never place them in prompts, Git-tracked fixtures, rationale, events, or API error details.
- Interpret the spec's “existing API authentication” as `mobileAuthorized()` and require `MUNIN_MOBILE_TOKEN` for this mutating endpoint. The normal server binds to `127.0.0.1` by default, but loopback alone is not the authorization control.
- Use an injected `now: Date` for every deterministic ranking or feedback timestamp assertion.
- Run focused tests after each task and `npm test` before completion. Remove generated `dist/` and `dist-web/` only if they are untracked build outputs in this worktree.

## File and Responsibility Map

- **Create `src/adaptive-relevance.ts`:** feedback types, constants, validation, pure score calculation, and stable ranking.
- **Modify `src/adaptive-execution.ts`:** outcome/store contracts, schema migration, atomic feedback mutation, event emission, engine metadata/rationale integration.
- **Create `src/adaptive-feedback-api.ts`:** authenticated feedback HTTP operation and sanitized response/error mapping.
- **Modify `src/server.ts`:** register the new endpoint before the generic API fallback.
- **Modify `src/http.ts`:** permit the already-supported bearer header from allowed local browser origins.
- **Create `tests/adaptive-relevance.test.ts`:** pure scoring and ranking contract.
- **Create `tests/adaptive-feedback-store.test.ts`:** migration, persistence, validation, no-write-on-failure, and local audit contract.
- **Create `tests/adaptive-feedback-api.test.ts`:** authentication, request bounds, endpoint response, and no-provider side effects.
- **Modify `tests/adaptive-execution.test.ts`:** learned-routing and guardrail integration.
- **Modify `docs/architecture/adaptive-execution.md`:** delivered scoring, feedback, explainability, schema, and API behavior.
- **Modify `docs/superpowers/specs/2026-09-02-adaptive-relevance-decay-design.md`:** mark approved/implemented and clarify the concrete bearer control.
- **Modify `ops/BACKLOG.md` and `ops/CURRENT_STATE.md`:** record only delivered repository state; do not copy private operator snapshot contents.

---

### Task 1: Build the pure relevance model

**Files:**
- Create: `src/adaptive-relevance.ts`
- Create: `tests/adaptive-relevance.test.ts`

- [ ] **Step 1: Write the failing scoring tests**

Add fixtures with identical lexical content and assert:

```ts
const ranked = rankRelevantOutcomes([recent, old], task, new Date('2026-09-02T00:00:00.000Z'));
assert.equal(ranked[0].id, recent.id);
assert.equal(ranked.find(item => item.id === old.id)?.relevance.timeWeight, 0.5);
```

Cover these exact cases in the same file: 30-day half-life, future timestamp clamped to age zero, invalid timestamp excluded, multipliers `1.25/1/1/0.25`, descending score, descending valid `createdAt`, ascending stable `id`, zero lexical matches excluded, and a maximum of five results.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run build:core && node --test dist/tests/adaptive-relevance.test.js`

Expected: compilation fails because `adaptive-relevance.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal pure unit**

Define the public contract:

```ts
export const OUTCOME_HALF_LIFE_DAYS = 30;
export type OutcomeFeedbackRating = 'helpful' | 'neutral' | 'harmful';
export interface OutcomeFeedback { rating: OutcomeFeedbackRating; reason?: string; createdAt: string }
export interface OutcomeRelevance { lexicalScore: number; ageDays: number; timeWeight: number; feedbackMultiplier: number; weightedScore: number }
export type RankedOutcome = OutcomeRecord & { relevance: OutcomeRelevance };
export function validateOutcomeFeedback(input: unknown, now: Date): OutcomeFeedback;
export function rankRelevantOutcomes(records: OutcomeRecord[], task: AdaptiveTask, now: Date): RankedOutcome[];
```

Use a type-only import from `adaptive-execution.ts`. Compute `ageDays = Math.max(0, (now.getTime() - createdAtMs) / 86_400_000)`, return no candidate for a non-finite timestamp, and calculate `0.5 ** (ageDays / OUTCOME_HALF_LIFE_DAYS)`. Validate `now` too. Trim `reason`, omit it when empty, reject length above 500, reject unknown keys only if they can affect the stored contract, and reuse `sensitiveHistoricalContent()` to reject credential-shaped content without persisting or echoing it.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm run build:core && node --test dist/tests/adaptive-relevance.test.js`

Expected: all relevance tests pass.

- [ ] **Step 5: Commit the pure model**

```text
git add src/adaptive-relevance.ts tests/adaptive-relevance.test.ts
git commit -m "feat: add deterministic adaptive relevance scoring"
```

---

### Task 2: Upgrade durable outcome storage and add audited feedback mutation

**Files:**
- Modify: `src/adaptive-execution.ts`
- Create: `tests/adaptive-feedback-store.test.ts`
- Modify: `tests/adaptive-execution.test.ts`

- [ ] **Step 1: Write failing store contract tests**

Create a temporary schema-v1 file and assert it loads unchanged. Then submit feedback and assert schema v2, preserved records, atomic replacement of only the matching outcome, and a second submission replaces the first. Snapshot the file bytes before invalid rating, 501-character reason, secret-shaped reason, and unknown ID; assert the bytes are unchanged after each rejection.

Assert the local event file receives exactly one `adaptive.outcome.feedback.updated` event per successful mutation with `{ rating }` only—never `reason`—and no event for failures.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm run build:core && node --test dist/tests/adaptive-feedback-store.test.js dist/tests/adaptive-execution.test.js`

Expected: compilation fails because the store has no feedback operation or schema-v2 contract.

- [ ] **Step 3: Extend the store types and adapters**

Change the contracts to:

```ts
export interface OutcomeRecord { /* existing fields */ feedback?: OutcomeFeedback }
export interface OutcomeStore {
  save(record: OutcomeRecord): Promise<void>;
  findRelevant(task: AdaptiveTask, now?: Date): Promise<RankedOutcome[]>;
  recordFeedback(outcomeId: string, input: unknown, now?: Date): Promise<OutcomeRecord>;
}
```

`InMemoryOutcomeStore` validates before locating/replacing and performs no mutation on failure. `JsonOutcomeStore` accepts optional constructor dependencies `{ eventStore?: ContextStore }`, loads both schema versions into a normalized in-memory shape, and writes only schema version 2 on successful `save` or `recordFeedback`. Preserve the 500-record bound and `writeJsonAtomic`.

Use explicit errors safe for API mapping: `OutcomeFeedbackValidationError` and `OutcomeNotFoundError`; neither message may contain a file path, record content, or submitted reason. Emit the event only after the atomic outcome write succeeds:

```ts
await this.eventStore.event('adaptive.outcome.feedback.updated', 'system', outcomeId, { rating: feedback.rating });
```

- [ ] **Step 4: Pass injected time through retrieval**

Replace the private lexical scorer with `rankRelevantOutcomes`. Default `now` only at the adapter boundary (`now = new Date()`), so pure tests remain clock-controlled. Preserve existing imports from `adaptive-execution.ts` by re-exporting feedback and relevance types from that module.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npm run build:core && node --test dist/tests/adaptive-relevance.test.js dist/tests/adaptive-feedback-store.test.js dist/tests/adaptive-execution.test.js`

Expected: all focused tests pass, including existing persistence/reuse behavior.

- [ ] **Step 6: Commit storage and migration**

```text
git add src/adaptive-execution.ts tests/adaptive-feedback-store.test.ts tests/adaptive-execution.test.ts
git commit -m "feat: persist bounded outcome feedback"
```

---

### Task 3: Integrate weighted evidence into learned routing and explainability

**Files:**
- Modify: `src/adaptive-execution.ts`
- Modify: `tests/adaptive-execution.test.ts`

- [ ] **Step 1: Add failing learned-routing tests**

Seed two old or harmful direct failures plus at least five stronger recent relevant outcomes and assert the five-result relevance cap ranks the stronger evidence first, leaving the failures outside the learned set so the later medium-risk task is not forced to Council. Assert `priorOutcomes` exposes exact relevance metadata and the rationale contains a generic bounded explanation such as `Weighted relevance prioritized current operator-trusted evidence.` without a feedback reason.

Retain and extend the high-risk test to assert Council, reviewer, `localOnly === true`, `maxCostPerCall === 0`, and local provider preference regardless of helpful direct feedback.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm run build:core && node --test dist/tests/adaptive-execution.test.js`

Expected: new routing/explainability assertions fail.

- [ ] **Step 3: Implement bounded learned evidence**

Update runner/result types to use `RankedOutcome[]`. Apply the existing count rules to the five ranked outcomes exactly as the approved design specifies; do not introduce a relevance threshold or delete old records. Add a generic explanation when selected outcomes contain decay or non-neutral feedback; never add timestamps or feedback reason text to that message. Keep mission-context evidence limited to the same five selected outcomes, so lower-ranked stale/harmful records that fell outside the cap cannot enter provider context.

- [ ] **Step 4: Run focused and compatibility tests**

Run: `npm run build:core && node --test dist/tests/adaptive-execution.test.js dist/tests/adaptive-convergence-runtime.test.js dist/tests/autonomous-goals.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit routing integration**

```text
git add src/adaptive-execution.ts tests/adaptive-execution.test.ts
git commit -m "feat: apply weighted evidence to adaptive routing"
```

---

### Task 4: Expose the authenticated local feedback API

**Files:**
- Create: `src/adaptive-feedback-api.ts`
- Modify: `src/server.ts`
- Modify: `src/http.ts`
- Create: `tests/adaptive-feedback-api.test.ts`

- [ ] **Step 1: Write failing endpoint tests**

Start a temporary HTTP server around a dependency-injected handler and a temporary `JsonOutcomeStore`. Test:

- missing or wrong bearer token returns `401` and performs no write;
- `OPTIONS` returns `204` without requiring a token;
- valid `POST /api/adaptive/outcomes/:id/feedback` returns `200` with the updated sanitized outcome;
- invalid rating/oversized/secret reason returns `400` without echoing the reason;
- unknown ID returns `404`;
- wrong method/path returns `404`;
- the handler makes no network/provider call (the only injected dependency is `OutcomeStore`).

- [ ] **Step 2: Run the endpoint test and confirm RED**

Run: `npm run build:core && node --test dist/tests/adaptive-feedback-api.test.js`

Expected: compilation fails because the handler does not exist.

- [ ] **Step 3: Implement the handler with explicit dependencies**

Use:

```ts
export function createAdaptiveFeedbackHandler(store: OutcomeStore = new JsonOutcomeStore()) {
  return async function handleAdaptiveFeedbackApi(request: IncomingMessage, response: ServerResponse): Promise<void> { /* ... */ };
}
export const handleAdaptiveFeedbackApi = createAdaptiveFeedbackHandler();
```

Handle `OPTIONS` first, then require `mobileAuthorized(request)`, match `decodeURIComponent`-protected single path segments, call `readJsonBody(request, 2_000)`, and delegate to `store.recordFeedback`. Map only typed validation/not-found errors to `400/404`; return a generic `500` for unexpected errors and do not expose stack traces or paths.

- [ ] **Step 4: Register the route and bearer CORS header**

Add `['/api/adaptive', handleAdaptiveFeedbackApi]` to `server.ts` before fallback. Change the allowed header string in `http.ts` to `content-type, authorization`; keep the existing origin allowlist unchanged.

- [ ] **Step 5: Run API and server contract tests**

Run: `npm run build:core && node --test dist/tests/adaptive-feedback-api.test.js dist/tests/host-mobile-api-contract.test.js`

Expected: all selected tests pass.

- [ ] **Step 6: Commit the API**

```text
git add src/adaptive-feedback-api.ts src/server.ts src/http.ts tests/adaptive-feedback-api.test.ts
git commit -m "feat: add authenticated adaptive feedback API"
```

---

### Task 5: Align canonical documentation and verify the repository

**Files:**
- Modify: `docs/architecture/adaptive-execution.md`
- Modify: `docs/superpowers/specs/2026-09-02-adaptive-relevance-decay-design.md`
- Modify: `ops/BACKLOG.md`
- Modify: `ops/CURRENT_STATE.md`

- [ ] **Step 1: Update delivered architecture and security facts**

Document the formula, 30-day half-life, multiplier values, five-record cap, schema-v1 migration, schema-v2 persistence, redacted mutation event, and endpoint authentication through `MUNIN_MOBILE_TOKEN`. Explicitly state no feedback reason enters mission context and no policy/cost/provider authority changes.

Mark the spec implemented only after tests pass. Clarify that “existing API authentication” is the constant-time bearer check already used by mobile routes.

- [ ] **Step 2: Update canonical state/backlog without private data**

Add one completed backlog item for adaptive relevance decay/feedback and one current-state bullet. Update dates to `2026-09-02`. Do not copy the snapshot's email subjects, employer names, action titles, or job details into Git.

- [ ] **Step 3: Run the full verification gate**

Run: `npm test`

Expected: build succeeds and every repository test passes. Record the exact test/pass count in the PR handoff; do not claim a count from earlier runs.

- [ ] **Step 4: Check repository hygiene and guardrails**

Run:

```text
git status --short
git diff --check
git diff --stat origin/main...HEAD
git grep -n -E "sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|BEGIN .*PRIVATE KEY" -- . ":(exclude)package-lock.json"
```

Expected: no whitespace errors, no credential matches, no runtime data, no generated build output, and only scoped source/test/docs/ops changes.

- [ ] **Step 5: Perform independent completion review**

Use `superpowers:requesting-code-review` against the full branch diff. Resolve every correctness, security, regression, or scope finding; rerun the focused test for each fix and then rerun `npm test`.

- [ ] **Step 6: Commit documentation and final verified state**

```text
git add docs/architecture/adaptive-execution.md docs/superpowers/specs/2026-09-02-adaptive-relevance-decay-design.md ops/BACKLOG.md ops/CURRENT_STATE.md
git commit -m "docs: record adaptive relevance delivery"
```

- [ ] **Step 7: Prepare the human handoff**

Report commits, exact test evidence, guardrail evidence, changed files, remaining follow-on sequence, and any real human-only blocker. Push the feature branch and create or update one reviewable PR only if the user has authorized that repository write; never merge automatically.

## Plan Self-Review

- [ ] Every design requirement maps to a task and executable test.
- [ ] Every behavior-changing task starts with a failing test.
- [ ] Public types use the same `RankedOutcome` contract across stores, engine, runner, and result.
- [ ] Validation failures are no-write operations and never echo private reasons.
- [ ] Authentication, request bounds, CORS, and unexpected-error behavior are explicit.
- [ ] No placeholder, `TODO`, paid service, provider call, or new dependency is introduced.
- [ ] Full-suite evidence is captured after the final code and documentation changes.
