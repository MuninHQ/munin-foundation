# GitHub Ecosystem Scan — 2026-08-18

Scope: identify reusable open-source components that materially improve Munin without adding unnecessary cost, lock-in or a second competing orchestration layer.

## Decision summary

No current project justifies replacing the Munin Orchestrator or durable state model wholesale. Several projects are useful as optional capabilities or reference implementations.

## Candidates

### Microsoft Playwright CLI — keep/promote existing choice

Decision: **retain as preferred coding-agent browser backend**.

Why:

- official Playwright tooling;
- CLI + agent skills are explicitly optimized for coding-agent workflows;
- avoids loading a large persistent MCP schema/tree into every coding context;
- fits Munin's existing read-only browser verification seam.

Playwright MCP remains useful for persistent exploratory browser loops, but does not replace the CLI path for normal engineering verification.

### Serena — keep optional, benchmark before promotion

Decision: **keep behind `code.semantic-intelligence` seam; do not make mandatory dependency yet**.

Why:

- symbol-aware retrieval/refactoring is materially stronger than text-only search on large repositories;
- free MIT-licensed LSP backend exists;
- installation introduces Python/uv/language-server runtime dependencies and therefore should earn promotion through Munin's existing benchmark rather than becoming foundational by popularity alone.

Replacement rule: promote Serena only if repository benchmark shows meaningful precision/time/token improvement over the native fallback without degrading reliability.

### Official MCP TypeScript SDK v2 — candidate for the external protocol edge

Decision: **track for the real Munin MCP server edge; do not replace the internal `MuninMcpBridge` yet**.

Why:

- official SDK now exposes server/client packages for the current MCP specification;
- it is the right long-term protocol implementation when Munin exposes a standards-compliant external MCP endpoint;
- adopting it now would add dependencies and may require TypeScript/runtime compatibility work that is unnecessary for the internal bridge.

The internal bridge remains a provider-neutral command/capability adapter. A future external MCP transport can wrap it rather than duplicate business logic.

### DeepSeek Harness — reference architecture, not runtime replacement

Decision: **retain as architectural reference/bakeoff input; do not adopt as Munin's orchestrator**.

Why:

- plugin-first architecture is strategically aligned with Munin capability seams;
- upstream explicitly describes the project as developer preview with compatibility-breaking changes expected;
- replacing Munin's current orchestration/recovery/memory stack would add migration risk without a demonstrated acceptance-test advantage.

Re-evaluate after a stable compatibility line or if a specific plugin architecture feature materially beats the current seam.

### OpenAI Agents SDK TypeScript — optional external agent provider, not core

Decision: **do not replace Munin Orchestrator**.

Why:

- useful agent, handoff, guardrail, session, tracing and sandbox primitives;
- can be consumed later as an execution provider/capability;
- introducing it as the orchestrator would duplicate Munin's existing product-specific state, blocker classification, QA loop and local-first provider policy.

### LangGraph.js — no replacement

Decision: **do not add now**.

Why:

- durable execution, persistence and human-in-the-loop are strong general primitives;
- Munin already implements those product-specific primitives and has acceptance tests around them;
- migration would be architectural churn unless a future scaling requirement exceeds the current runtime.

### ComfyUI + DiffSynth-Studio — optional media backends

Decision: **admit through `media.local-video`; never make either a mandatory Munin dependency**.

Why:

- both provide active local generative-media ecosystems;
- a runner seam preserves model/backend choice and avoids forcing Python/model dependencies into the Node core.

## Replacements made in this scan

None. The strongest candidates improve optional capabilities but do not materially outperform the current canonical component in a way that justifies migration risk today.

## Backlog effect

The open-ended “continue GitHub ecosystem scan” item is closed for this cycle. Future scans are trigger-based rather than permanently open:

- a current dependency becomes unmaintained/insecure;
- a candidate reaches a stable release that resolves a known Munin gap;
- a benchmark demonstrates a material improvement;
- a new product requirement cannot be met cleanly by current seams.

This prevents research from becoming an infinite backlog item while keeping the architecture open to better components.

## Primary sources reviewed

- `microsoft/playwright` — Playwright CLI agent workflow documentation.
- `microsoft/playwright-mcp` — MCP vs CLI guidance.
- `oraios/serena` — semantic code retrieval/refactoring and MCP integration.
- `modelcontextprotocol/typescript-sdk` — official MCP TypeScript SDK.
- `deepseek-ai/deepseek-harness` — plugin-first developer-preview harness.
- `openai/openai-agents-js` — TypeScript multi-agent/sandbox SDK.
- `langchain-ai/langgraphjs` — durable graph execution/persistence.
- `Comfy-Org/ComfyUI` and `modelscope/DiffSynth-Studio` — local media backends.
