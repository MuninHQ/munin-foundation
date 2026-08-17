# DeepSeek Harness bake-off for Munin

Status: P0 architecture research for #180.

## Scope

This comparison evaluates the official `deepseek-ai/deepseek-harness` as an architectural reference and optional execution-runtime adapter. It does **not** make DeepSeek, Cordis, or any paid API a Munin dependency.

## Constraints

Munin keeps these invariants:

- local-first, zero recurring cost by default;
- Ollama/local models remain first-class;
- provider/model portability;
- governed Context Memory remains authoritative for user context;
- leases, fencing, outbox, recovery and idempotency safety contracts remain intact;
- destructive/external side effects remain policy-gated;
- product realms and Munin identity remain above the runtime.

## Capability matrix

| Capability | DeepSeek Harness pattern | Munin today | Verdict | Action |
| --- | --- | --- | --- | --- |
| Runtime composition | Cordis plugin tree, ordered profiles/bundles, reversible effects | Static TypeScript composition plus focused registries | ADAPT | Add a small reversible capability registry independent of Cordis |
| Model abstraction | Replaceable `ctx.llm` adapters | `ProviderRegistry` + provider policy | KEEP | Preserve provider policy; expose it through a runtime seam |
| Tool registry | Scoped `ctx.tools`, guarded pre/execute/post pipeline | Capabilities are largely implicit in runtime/provider routing | ADAPT | Introduce registered capabilities with execution interceptors |
| Agent lifecycle | Agent registry + `agent/*` live events | Fixed agent registry + autonomous runner | ADAPT | Add lifecycle hooks without replacing current agents |
| Durable event history | Append-only session events are source of model-visible context | `events.jsonl`, execution records, governed context stores | KEEP/ADAPT | Keep stores; adopt explicit rule that runtime-visible decisions emit trace events |
| Context assembly | System-prompt sections and session-log projection | Governed Context Memory + assistant/runtime context | KEEP | Never delegate authority to DSH session log |
| Permissions | Approval/sandbox policy as pluggable capabilities | action constitution + side-effect/outbox policy | KEEP | Existing policy stays authoritative |
| Sandbox | Swappable sandbox/subprocess providers | Local execution boundaries are distributed across current modules | EVALUATE | Future isolated adapter only; no baseline dependency |
| MCP interoperability | Capability/plugin integration surface | Existing MCP direction in roadmap | ADAPT | Bind MCP as a capability provider, not as runtime core |
| Subagents | Provider seam for child/delegated agents | Council + autonomous execution primitives | ADAPT | Normalize behind capability registration later |
| Observability | Durable session events plus live extension events | execution plans, telemetry, events | KEEP/ADAPT | Add structured capability trace envelope |
| UI/runtime split | Web and headless are separate bundles | Unified server + web/mobile product surfaces | KEEP | Do not import DSH Web UI into Munin |
| Cordis dependency | Foundational composability framework | No Cordis dependency | IGNORE for baseline | Re-evaluate only after seam benchmark demonstrates concrete gain |

## Architectural takeaway

The most valuable DSH idea for Munin is **not** its model adapter or Web UI. It is the separation of a capability into definition, provider and consumer, combined with reversible registration and interception around execution.

Munin can obtain that benefit with a very small native seam while preserving its stronger existing safety/runtime contracts. This avoids importing a developer-preview framework into the core while still making the runtime easier to extend and benchmark.

## PoC seam

`src/runtime-capability-seam.ts` introduces an intentionally small experimental abstraction:

1. capability providers register by name;
2. registration returns a disposer, so activation is reversible;
3. execution passes through ordered `before`, `after` and `error` hooks;
4. callers receive an auditable trace envelope;
5. duplicate capability registration fails closed;
6. no provider, network, DeepSeek API, Cordis, or MCP dependency is required.

The seam is deliberately **adjacent** to `ExecutionEngine` rather than wired into production execution in this PR. Promotion requires a benchmark proving that it improves extension ergonomics without weakening leases/outbox/provider-policy behavior.

## Promotion gate

Promote the seam into `ExecutionEngine` only if all are true:

- reversible registration is covered by tests;
- hook failures cannot silently bypass policy;
- provider portability remains unchanged;
- current runtime tests stay green;
- at least one real capability (browser, MCP, shell, or subagent) becomes simpler to integrate;
- the adapter adds no paid dependency and no mandatory DeepSeek API call;
- ADR-031 is updated from experimental to accepted.

## Sources reviewed

- Official DeepSeek Harness README: developer preview, Cordis, everything-is-a-plugin, MIT.
- Official architecture document: plugin tree, profiles/bundles, session events, agent events, tool pipeline, capability seams and reversible registrations.

Upstream is explicitly a developer preview with compatibility-breaking changes expected. Therefore Munin should copy proven architectural ideas before considering a framework dependency.
