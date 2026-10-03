# Munin Glossary

This file defines the shortest canonical language for recurring Munin concepts. Agents should prefer these terms over re-explaining the same concepts in longer prose.

- **Build All** — bounded Munin engineering loop: inspect → plan → build → test → verify → fix/retry → write back.
- **Control Room** — canonical operational state for objectives, actions, receipts, blockers and continuation.
- **Second Brain** — durable recall/write-back protocol over Munin context, Knowledge Vault, current state and timeline.
- **Capability** — one named, policy-gated function exposed through Munin's runtime capability seam.
- **Provider** — replaceable execution backend selected by Provider Policy; never synonymous with a capability.
- **Provider Policy** — zero-cost/offline/capability rules that decide which provider may serve a request.
- **Runtime Capability Seam** — registry boundary used to expose optional capabilities without replacing the orchestrator.
- **Host Worker** — allowlisted Windows-side executor for bounded host operations.
- **Manus Worker** — optional bridge for allowlisted research, analysis, draft and diagnostic tasks.
- **Guard** — read-only governance assessment for candidate agents, skills, MCPs, plugins, automations and repositories.
- **Evidence Gate** — rule that a claim or promotion must be backed by observable evidence rather than confidence language.
- **Promotion Gate** — review boundary before an observed capability or skill may become active.
- **Skill Candidate** — observed reusable procedure that is not installed, executed or promoted automatically.
- **Observation Mode** — collect evidence and replay data without granting execution or routing authority.
- **Replay** — deterministic record of what a capability or candidate would do, used for review and regression.
- **Token Governor** — shadow telemetry for context compression opportunity and non-binding model/effort routing advice.
- **Context Profiler** — component-level estimate of which request surfaces consume context; it reports sizes, not raw content.
- **Context Diet** — reducing repeated context by canonical vocabulary, pointers and bounded summaries instead of deleting required evidence.
- **Knowledge Vault** — durable project knowledge indexed for recall; not a replacement for Control Room state.
- **Money Printer** — Munin's separate governed content/video production workflow.
- **Content Video** — provider-neutral capability that prepares or runs a local video-production request.
- **Local Render Pipeline** — deterministic Money Printer render contract: script → beats → assets → voice → captions → overlays → render → thumbnail → review.
- **Local Video** — optional generative-video backend; distinct from assembling/editing an existing content-video project.
- **Render Manifest** — structured, portable description of the requested content-video stages and output constraints.
- **Human Boundary** — step that genuinely requires credentials, irreversible approval, inaccessible hardware/device or consequential user choice.
- **Safe Reversible Work** — work that can proceed autonomously without crossing a Human Boundary.
- **ChatGPT Cockpit** — primary interactive operator surface; conversation history is not Munin's system of record.
- **Zero Mandatory Cost** — core operation must not require a paid API, subscription or metered inference path.
- **Local-First** — private state and deterministic execution prefer the user's controlled environment; cloud paths remain optional adapters.
- **Fail Closed** — when a required safety, credential, isolation or policy condition is absent, execution is blocked rather than silently weakened.
- **Diff Integrity** — every changed line traces to the stated objective or required validation; unrelated cleanup stays out.
- **Empirical Acceptance** — verification that must happen on the real target host/device rather than being inferred from repository code.
