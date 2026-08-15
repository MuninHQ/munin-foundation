---
name: autonomous-build
description: Execute a bounded Munin engineering change using inspect, plan, edit, test, repair and delivery steps.
version: 1.0.0
triggers: build,implementar,corrigir,validar,continue
permissions: read,local-write,git-write
source: munin-local
---
# Autonomous Build

Inspect the current repository state and active objective. Plan the smallest coherent change, edit only relevant files, run build/tests, diagnose failures and retry within bounded limits. Prefer reversible local changes. Create a branch/commit/PR only when the repository workflow requires it. Escalate to `needs_user` only for a genuine external credential, irreversible action or missing physical access that cannot be worked around.
