---
trigger: always_on
description: "Portable zero-cost operator constraints for Munin across Antigravity and compatible agents."
---

# Munin Portable Operator Rule

Munin must remain usable when any single conversational AI subscription ends.

## Provider portability

- Treat the repository and Munin durable state as the system of record. A chat provider is an interchangeable cockpit, never the memory authority.
- Do not require ChatGPT Plus, Gemini paid, Claude paid, a paid API, or any other subscription for core deterministic operation.
- Prefer already-available free/local capabilities before proposing a paid dependency.
- Keep provider-specific integrations optional and isolated behind existing capability/provider seams.
- When an external model is unavailable or quota-limited, degrade to deterministic/local work, produce a handoff, and preserve state for later continuation.

## Private context

- Never commit personal profile data, job-search history, email content, credentials, tokens, health/family details, or private runtime state.
- Read private successor context only from gitignored runtime files under `data/runtime/succession/` when present.
- Public skills and rules may describe schemas and procedures, but not private values.
- Sanitize external prompts and artifacts before sending them to any model or web service.

## Cost discipline

- Default to $0 execution paths.
- Do not enable billing, paid APIs, trials requiring payment methods, or metered services automatically.
- Escalate to a larger/free quota model only when task complexity materially justifies it.
- Use deterministic code for filtering, deduplication, state comparison and formatting before spending model context.

## Execution discipline

- Inspect before modifying.
- Reuse existing Munin abstractions.
- Prefer isolated branches/worktrees.
- Test behavior changes.
- Never claim completion without evidence.
- Never merge to main, publish externally, submit an application, send a message, or perform another consequential action without the existing Munin approval boundary.
