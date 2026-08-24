---
name: hermes-learning-loop
description: Convert repeated successful Munin procedures into reviewed, reusable local skills without adding paid dependencies or parallel state.
version: 1.0.0
triggers: learn,aprender,promote-skill,reusable-procedure,hermes
permissions: read,local-write,git-write
source: hermes-agent-inspired
---
# Hermes Learning Loop for Munin

Use this skill after a Munin task has completed successfully and there is evidence that the procedure is likely to recur.

Do not create a skill from a single accidental workaround. Promote a procedure only when it is reusable, deterministic enough to review, and materially reduces future work or error risk.

Before promotion, inspect existing files under `skills/` and reuse or improve an existing skill when possible. Never duplicate an existing workflow under a new name merely because a different agent discovered it.

A promoted procedure must:

- contain no secrets, tokens, OAuth material, private user data, machine-specific absolute paths, or hidden credentials;
- preserve Munin's local-first and zero-mandatory-cost constraints;
- identify when human approval is required;
- state observable success criteria and bounded failure behavior;
- prefer canonical Control Room/session state rather than creating a parallel memory store;
- remain useful across multiple sessions and not just the incident that produced it.

Write promoted skills using the repository's `skills/<name>/SKILL.md` convention and preserve the frontmatter pattern already used by Munin. Prefer concise operational instructions over narrative documentation.

After creating or modifying a skill, validate that the repository still passes its relevant checks. Include the learned procedure, evidence that motivated promotion, changed files, validation result, and any remaining limitation in the completion report.

If a procedure depends on a transient external service, paid provider, unstable UI, or unverified behavior, record it as a candidate instead of promoting it to an authoritative Munin skill.
