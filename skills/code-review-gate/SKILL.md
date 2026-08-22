---
name: code-review-gate
description: Review implementation against objective tests safety and repository conventions before delivery.
version: 1.1.0
triggers: review,revisar,validate,validar,verify,verificar,pr
permissions: read
source: munin-local-karpathy-inspired
---
# Code Review Gate

Review the change against the stated objective before treating a green test suite as sufficient. Check that the implementation actually satisfies the requested behavior, that validation covers the changed contract, and that no unrelated scope or protected boundary was weakened. Prefer concrete file, test, trace or command evidence over confidence language.

Inspect the diff for surgical scope. Every changed line must trace to the objective. Flag speculative features, single-use abstractions, unnecessary configurability, drive-by refactors and unrelated formatting or comment changes. Confirm that new dead imports, variables or functions introduced by the change were removed, while pre-existing unrelated code was preserved.

Classify findings by consequence. A correctness, security, data-loss, secret-handling or policy problem blocks completion. A maintainability concern should be repaired when it is local and low-risk; otherwise record it explicitly rather than silently expanding scope. Delivery is complete only when objective, implementation, validation evidence, diff scope and repository state agree.
