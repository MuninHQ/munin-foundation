# Munin v0.1 Product Specification

> Consolidated product contract as of 2026-08-18.

## Product thesis

Munin is a persistent contextual operating environment that turns objectives into evidence-backed work while preserving enough durable state to continue across sessions, devices and model providers without requiring the user to reconstruct context manually.

The v0.1 north star is not unrestricted autonomy. It is **trusted continuity plus bounded execution**.

## Primary jobs to be done

1. Reconstruct current project state without replaying prior chats.
2. Identify the highest-value safe next action.
3. Execute bounded work through the appropriate specialist/runtime.
4. Test and independently verify completion evidence.
5. Recover from retryable failure without repeatedly asking the user to continue.
6. Stop only at a genuine human boundary such as credentials/2FA, consequential external approval, missing real-world evidence or an irreversible decision.
7. Write meaningful results back into durable state and memory.
8. Let the user inspect, correct, export or delete stored context.

## Canonical operating loop

`objective → hydrate state → plan/route → execute → test → verify → fix/retry → write back → operational handoff`

A later execution must be able to rehydrate prior durable write-back and continue without depending on process-local memory.

## v0.1 product surfaces

### Control Room

- Repo-backed `CURRENT_STATE`, `BACKLOG` and `SESSION_LOG` are canonical operational truth.
- `munin orchestrate <objective>` and `/api/orchestrate` invoke the canonical multi-agent runtime.
- Product/State, Researcher, Engineer, QA Verifier, Memory Curator and Operator roles have explicit responsibilities.

### Autonomous engineering

- Bounded `PLAN → BUILD → TEST → VERIFY → FIX` loop.
- Real-blocker classification and repeated-failure ceilings.
- Skill-aware TDD, systematic debugging, code review and UI/UX methodology.
- Governed read-only Playwright verification when browser evidence is requested.
- Provider-neutral runtime capability seam and reversible integrations.

### Context continuity

- Structured project/continuity memory plus append-only Memory Ledger.
- Durable event mirroring, provenance, semantic deduplication and search.
- Governed ChatGPT export promotion requiring explicit project relevance.
- Secret-bearing historical records fail closed and are not promoted.

### Career

- Career Inbox/Intelligence/Continuity foundations.
- Mobile intake from URL, text, Share Sheet, screenshot and image.
- Transient multimodal extraction; source images are not durably stored.
- Normalization, fit scoring, duplicate prevention and provenance.

### Intelligence and content

- Portfolio intelligence and deterministic SITREP projections.
- LinkedIn content/composer/history/council/visual foundations.
- Trusted-source freshness/provenance gate; public publication remains approval-bound.

### Mobile and provider access

- Mobile API foundation with bearer-token boundary.
- Local/zero-additional-cost Ollama fallback where viable.
- Provider routing remains portable rather than model-specific.

## Trust and safety contract

- Local/private runtime data is not committed to Git by default.
- All meaningful durable state has source/provenance and timestamps where applicable.
- Inferences are distinguishable from confirmed facts/evidence.
- Consequential external actions require the appropriate explicit human boundary.
- Credentials, secrets, OTP/2FA values and private keys are never authorized as durable project memory merely because they appear in historical context.
- Transient screenshots and document bytes stay outside durable repository state.
- Public publishing is never automatic in v0.1.
- Technical decisions may proceed autonomously when safe, reversible and inside accepted guardrails.

## Acceptance criteria

Munin v0.1 is structurally accepted when the repository proves all of the following:

1. A fresh Control Room execution hydrates canonical state before acting.
2. Safe objectives can complete without repeated `cont`/`next` prompts.
3. Engineering work is not marked complete without test/verification evidence.
4. Retryable failures enter bounded FIX/retry behavior; true human blockers stop execution.
5. Meaningful completion writes durable state/session evidence.
6. A fresh execution instance can observe and use a prior execution's write-back.
7. Memory import can distinguish project context from unrelated history and reject secret-bearing records.
8. Career image intake can analyze a transient screenshot without persisting the original bytes.
9. Trusted-source editorial signals are dated and within the allowed freshness window.
10. Core build, web build and automated test suite pass on the integration branch before merge.

## Remaining v0.1 completion work

The core architecture is implemented. Remaining work is integration and operator hardening rather than foundational redesign:

- native/share-sheet Career intake UX completion without colliding with the active Lovable frontend stream;
- broader end-to-end acceptance coverage for engineering verification/recovery paths;
- consolidated operator-facing observability across orchestration, engineering, browser verification, memory and connector health;
- external-connector privacy/security review;
- remote-access/local-host runbook;
- real user/device/host empirical validation where repository tests cannot substitute for observations.

## Explicit non-goals for v0.1

- unrestricted autonomous external mutation;
- automatic public publication;
- mandatory dependency on a single cloud/model provider;
- storing every user conversation as durable project truth;
- replacing human evidence with fabricated benchmark or device observations;
- introducing paid infrastructure when an adequate zero-additional-cost path exists without explicit approval.

## Success metric

A user can reopen Munin from a new session/device, understand the current state, issue one objective, and have Munin safely progress through the executable work until completion or a genuine human boundary—without manually rebuilding project context.

## Kill/narrow criteria

Narrow the product if repeated real-world use shows that durable continuity does not materially reduce context reconstruction, bounded execution creates more supervision than it removes, or verification cannot reliably distinguish actual completion from plausible-looking output.
