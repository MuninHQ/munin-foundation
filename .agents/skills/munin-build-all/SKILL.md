---
name: munin-build-all
description: "Execute a bounded Munin BUILD ALL cycle: inspect state, recall durable context, implement the smallest coherent change, test, verify, and write back. Use for build all, continue implementation, fix everything in scope, or autonomous Munin engineering."
---

# Munin BUILD ALL

1. Read `AGENTS.md`, `ops/CURRENT_STATE.md`, and the relevant implementation/tests.
2. Run the Second Brain pre-task recall when the repository runtime is available:
   `npm run second-brain:recall -- --task "<task>" --project "munin"`
3. State observable success criteria from evidence, not optimism.
4. Work in an isolated non-main branch/worktree unless already operating in one.
5. Reuse existing architecture seams and dependencies before adding anything new.
6. Implement the smallest coherent change.
7. Run focused validation, then `npm test` when the host permits.
8. Inspect the final diff for unrelated changes, secret leakage, paid dependencies and weakened safety gates.
9. Record durable outcome with Second Brain post-task commit when available.
10. Report branch, commit, changed files, test evidence, remaining human boundary and rollback.

Never merge to main, enable billing, expose secrets, publish externally, or bypass approval gates.
