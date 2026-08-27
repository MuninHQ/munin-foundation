---
name: code-review-gate
description: Gate delivery on objective satisfaction, validation evidence, surgical diff scope, safety and repository integrity.
version: 1.2.0
triggers: review,revisar,validate,validar,verify,verificar,pr
permissions: read
source: munin-local-karpathy-inspired
---
# Code Review Gate

Use this skill after implementation and validation, before delivery or merge. A green test suite is necessary but is not sufficient evidence that the requested change is correct.

## Review against the objective

Recover the stated objective, material assumptions and observable success criteria. Confirm that the implementation actually produces the requested behavior in the intended architecture seam. Prefer concrete file, test, trace, command or runtime evidence over confidence language.

Check that validation covers the changed contract rather than merely exercising adjacent code. If an observable criterion lacks evidence, treat it as unverified instead of assuming success.

## Review the diff surgically

Every changed line must trace to the objective or to validation required by it. Flag:

- speculative features;
- single-use abstractions or unnecessary frameworks;
- configurability that was not requested;
- drive-by refactors;
- unrelated formatting or comment churn;
- weakened assertions, skipped checks or swallowed errors;
- new mandatory providers, subscriptions or paid dependencies;
- changes to approval, audit, state or secret-handling boundaries without explicit justification.

Confirm that dead imports, variables, functions or branches introduced by the change were removed while pre-existing unrelated code was preserved.

## Consequence-based findings

Classify findings by consequence rather than style preference.

**Blocking:** correctness regression, security issue, data-loss risk, secret exposure, policy violation, hidden mandatory cost, broken auditability, weakened approval boundary, failing required validation or an unverified core success criterion.

**Repair before delivery when local and low-risk:** clear maintainability defects, unnecessary duplication introduced by the change, misleading names, dead code or missing focused tests.

**Record without scope expansion:** unrelated pre-existing problems or improvements that would materially widen the task.

## Completion evidence

Delivery passes this gate only when all applicable evidence agrees:

1. Objective is satisfied.
2. Implementation is coherent and located in the intended seam.
3. Focused validation passes.
4. Relevant broader build/tests pass.
5. Final diff is surgical and free of accidental scope.
6. Safety, auditability, local-first behavior and zero-mandatory-cost constraints remain intact.
7. Repository/branch/commit/PR state is known.
8. Any unresolved blocker is a genuine human boundary.

If a check could not be executed in the current environment, report it explicitly as missing evidence. Never convert an unexecuted check into a claim of completion.
