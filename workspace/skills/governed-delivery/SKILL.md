---
name: governed-delivery
description: Deliver repository changes through explicit planning, implementation evidence, independent review, governance checks, and a complete handoff.
---

# Governed Delivery

Use this skill for any non-trivial repository change.

## Sequence

1. Confirm objective, scope, constraints, non-goals, and definition of done.
2. Capture repository baseline: branch, status, relevant docs, tests, and CI.
3. Produce a short execution plan with checkpoints.
4. Implement in the smallest coherent increments.
5. Run relevant tests, lint, build, and secret checks.
6. Request an independent quality review.
7. Run repository governance checks for documentation and state consistency.
8. Update changelog, roadmap, ADR, or handoff artifacts when applicable.
9. Report exact evidence, residual risks, and actions requiring user approval.

## Completion rule

A task is not complete because code was written. It is complete only when the agreed validation is current and the repository tells the same story as the implementation.
