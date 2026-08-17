---
name: code-review-gate
description: Review implementation against objective tests safety and repository conventions before delivery.
version: 1.0.0
triggers: review,revisar,validate,validar,verify,verificar,pr
permissions: read
source: munin-local-superpowers-inspired
---
# Code Review Gate

Review the change against the stated objective before treating a green test suite as sufficient. Check that the implementation actually satisfies the requested behavior, that validation covers the changed contract, and that no unrelated scope or protected boundary was weakened. Prefer concrete file, test, trace, or command evidence over confidence language.

Classify findings by consequence. A correctness, security, data-loss, secret-handling, or policy problem blocks completion. A maintainability concern should be repaired when it is local and low-risk; otherwise record it explicitly rather than silently expanding scope. Delivery is complete only when objective, implementation, validation evidence, and repository state agree.
