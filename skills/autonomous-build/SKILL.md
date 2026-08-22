---
name: autonomous-build
description: Execute a bounded Munin engineering change using inspect, plan, edit, test, repair and delivery steps.
version: 1.1.0
triggers: build,implementar,corrigir,validar,continue
permissions: read,local-write,git-write
source: munin-local-karpathy-inspired
---
# Autonomous Build

Inspect the current repository state and active objective before editing. State material assumptions and translate the request into observable success criteria. When ambiguity would change the implementation, surface the plausible interpretations or ask instead of choosing silently. Prefer the simplest approach that satisfies the objective; avoid speculative features, one-off abstractions and configurability that was not requested.

Plan the smallest coherent change and edit only relevant files. Match existing style and preserve unrelated code, comments, formatting and behavior. Remove only imports, variables or functions made obsolete by the current change. Record unrelated issues separately instead of silently expanding scope.

Run focused validation for the changed behavior, then the relevant broader build and tests. Diagnose failures from evidence and retry within bounded limits. Review the final diff so every changed line traces to the objective. Prefer reversible local changes. Create a branch, commit or PR only when the repository workflow requires it. Escalate to `needs_user` only for a genuine external credential, irreversible action or missing physical access that cannot be worked around.
