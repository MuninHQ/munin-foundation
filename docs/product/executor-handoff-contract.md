# Executor Handoff Contract

## Purpose

Standardize how the Munin Control Room delegates work to any compatible executor while preserving context, acceptance criteria, verification, and durable write-back.

## Required task envelope

Every delegated task should include:

1. **Objective** — the concrete outcome to produce.
2. **Priority** — P0/P1/P2/P3.
3. **Scope** — files, modules, services, or workflows that may change.
4. **Constraints** — cost, security, compatibility, publication, environment, or architectural guardrails.
5. **Relevant state** — links/paths to canonical state, decisions, specifications, and prior work.
6. **Acceptance criteria** — observable conditions that define completion.
7. **Verification plan** — tests, lint, type checks, browser checks, smoke tests, or manual evidence required.
8. **Write-back requirements** — which state/backlog/log/ADR files must be updated when the task changes project state.

## Executor behavior

The executor must:

1. Read canonical state before modifying anything.
2. Inspect the relevant implementation before proposing changes.
3. Prefer the smallest safe change that satisfies acceptance criteria.
4. Run available automated verification.
5. Diagnose and fix recoverable failures rather than immediately escalating.
6. Repeat the loop until completion or a real blocker is reached.
7. Report evidence, not just confidence.
8. Update durable project state when meaningful progress occurs.

Default loop:

`PLAN → BUILD → TEST → VERIFY → FIX → repeat`

## Blocker escalation payload

When escalation is truly required, provide:

- what is blocked;
- why the executor cannot resolve it;
- evidence already gathered;
- what alternatives were attempted;
- the smallest specific action required from the human;
- what execution will resume immediately after that action.

Do not escalate generic uncertainty when a reversible decision can be made from existing principles.

## Completion payload

A completed task must report:

- outcome;
- changed files/components;
- verification performed and results;
- residual risks or known limitations;
- durable state updates performed;
- next eligible backlog item.

## Provider neutrality

No field in this contract may require a Claude-, OpenAI-, Gemini-, DeepSeek-, or other vendor-specific feature. Provider-specific adapters may enrich execution, but the core contract must remain portable.

## Example task envelope

```yaml
objective: Implement repository state hydration for the Munin Control Room
priority: P0
scope:
  - ops/
  - docs/product/
constraints:
  - no paid dependency
  - model agnostic
  - preserve existing interfaces
relevant_state:
  - ops/CURRENT_STATE.md
  - ops/BACKLOG.md
  - decisions/ADR-0005-control-room-and-durable-state.md
acceptance_criteria:
  - new session can identify current objective, blockers, and next executable item from repo state
  - missing optional state does not crash execution
verification:
  - automated tests
  - lint/type checks where configured
write_back:
  - ops/CURRENT_STATE.md
  - ops/BACKLOG.md
  - ops/SESSION_LOG.md
```
