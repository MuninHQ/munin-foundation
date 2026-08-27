---
name: autonomous-build
description: Execute a bounded Munin engineering change using inspect, assumptions, observable criteria, surgical edits, validation, diff review and delivery.
version: 1.2.0
triggers: build,implementar,corrigir,validar,continue
permissions: read,local-write,git-write
source: munin-local-karpathy-inspired
---
# Autonomous Build

Use this skill for bounded implementation work. The purpose is not merely to produce code; it is to produce the smallest verified change that satisfies the objective without creating accidental scope, cost or risk.

## 1. Inspect before editing

Inspect the current repository state, active objective, relevant implementation seams and nearby tests before changing anything. Reuse existing abstractions when they already solve part of the problem.

State material assumptions when they affect behavior, architecture, data, safety, cost or compatibility. Do not choose silently between interpretations that would produce materially different implementations.

Translate the request into observable success criteria. Prefer statements that can be demonstrated by a test, command result, API response, state transition or visible product behavior.

## 2. Plan the smallest coherent change

Choose the simplest approach that satisfies the success criteria. Avoid speculative features, premature abstractions, one-off frameworks and configurability that was not requested.

Edit only files relevant to the objective. Match existing style and preserve unrelated code, comments, formatting and behavior. Remove only imports, variables, functions or branches made obsolete by the current change. Record unrelated issues separately instead of silently expanding scope.

Every planned file change should have a reason that traces directly to the objective or to validation required by the objective.

## 3. Validate in layers

Run the narrowest useful validation first so failures are easy to diagnose. Then run the relevant broader build and test suite. For behavior changes, add or update deterministic tests whenever practical.

When validation fails, diagnose from evidence and repair the cause. Do not weaken assertions, skip tests, suppress errors or reinterpret a failure merely to obtain a green result.

Retry autonomously while changes remain reversible and bounded. Escalate to `needs_user` only for a genuine human boundary such as an inaccessible credential, irreversible approval, unavailable physical device/machine or external decision that cannot be inferred safely.

## 4. Review the final diff

Passing tests are necessary but not sufficient. Inspect the final diff and verify:

- every changed line traces to the objective;
- no unrelated refactor, formatting churn or comment rewrite slipped in;
- no speculative capability or hidden mandatory dependency was added;
- no secret, private runtime data or credential can be committed;
- approval gates, auditability, local-first operation and zero-mandatory-cost behavior remain intact;
- new dead code, imports or branches introduced by the change are removed.

## 5. Deliver evidence, not confidence

A build is complete only when objective, implementation, validation evidence, diff scope and repository state agree.

Report:

- what changed and why;
- which observable success criteria were satisfied;
- exact tests/builds/checks that were executed and their results;
- branch/commit/PR state when applicable;
- any remaining blocker or human setup.

Never claim a test, build, installation, deployment or runtime validation that was not actually executed. Prefer reversible local changes. Create a branch, commit or PR when the repository workflow requires it, and continue until completion or a genuine human boundary.
