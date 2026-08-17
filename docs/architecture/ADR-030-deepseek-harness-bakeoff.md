# ADR-030 — DeepSeek Harness bake-off

Status: Accepted
Date: 2026-08-17
Related: #180, #197

## Context

DeepSeek Harness (`dsh`) is an MIT-licensed developer-preview agent harness built on Cordis. Its architecture treats model adapters, tool registries, session logging and the agent loop as replaceable plugins. Registrations are reversible effects and profiles/bundles compose a runtime from ordered layers.

Munin already has governed memory, provider policy, leases/fencing, durable outbox/idempotency, recovery, action gates, autonomous engineering loops, browser verification and runtime capability seams. Replacing those foundations would create migration risk without evidence of a proportional benefit.

DeepSeek also explicitly warns that the current developer preview will contain compatibility-breaking changes. Munin therefore treats dsh as an architectural reference rather than a runtime dependency.

## Decision matrix

| DeepSeek Harness capability | Verdict | Munin decision |
|---|---|---|
| Plugin/runtime lifecycle | ADAPT | Keep Munin `RuntimeCapabilityRegistry`; add reversible capability scopes so a related set of capabilities/hooks can mount and unwind together. |
| Tool registration/execution | KEEP + ADAPT | Keep Munin capability seam and Action Constitution; use scoped composition where useful. |
| Model/provider abstraction | KEEP | Munin provider policy and Ollama/local-first routing remain authoritative. |
| Context assembly/lifecycle | KEEP | Governed Context Memory remains authoritative; no duplicate DSH session store. |
| MCP/tool interoperability | ADOPT selectively | Continue tool-specific adapters such as Playwright/Serena rather than importing the DSH runtime. |
| Permissions/destructive-action gates | KEEP | Existing Action Constitution, side-effect gates, fencing and idempotency remain mandatory. |
| Agent/subagent lifecycle | ADAPT later | Borrow cancellation/scoped-lifecycle concepts only when a concrete Munin gap is demonstrated. |
| Event/trace model | ADAPT | Continue explicit capability/engineering traces; evaluate durable model-visible event invariants separately. |
| Web UI/runtime separation | KEEP | Munin already separates runtime/services from web/mobile projections. |
| Cordis dependency | IGNORE for baseline | Do not introduce Cordis as a hard dependency while dsh is in developer preview and Munin's native seam covers current needs. |

## Implemented adaptation

`RuntimeCapabilityRegistry.scope(name)` creates a reversible mount boundary. Capabilities and interceptors registered through the scope are disposed together in reverse registration order. Disposal is idempotent and a disposed scope fails closed if code attempts to add new registrations.

This captures the useful reversible-composition property without changing existing registry APIs or making DeepSeek/Cordis a dependency.

## Invariants

- Repository and governed memory remain authoritative.
- Local-first and zero recurring cost remain the baseline.
- Ollama/local providers remain first-class and model providers remain swappable.
- Outbox, leases, fencing and idempotency are not replaced.
- External/destructive actions continue through explicit policy gates.
- DeepSeek/Cordis is not required to boot or operate Munin.

## Rollback

The scope API is additive. Removing it requires deleting only the scope wrapper and callers using it; direct registry registration/interception remains unchanged.

## Revisit trigger

Reconsider deeper DSH/Cordis integration only after the upstream project stabilizes beyond developer preview or a benchmark shows a material advantage in correctness, recoverability, resource use or provider portability that Munin's native runtime cannot match economically.
