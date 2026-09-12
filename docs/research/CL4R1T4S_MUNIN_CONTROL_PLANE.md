# CL4R1T4S → Munin Control Plane Deep Dive

Date: 2026-09-12
Status: research evidence; not canonical policy by itself

## Goal

Use CL4R1T4S as a comparative prompt corpus while separating vendor-confirmed behavior from extracted/unverified material. The output of this research is the observation-only Munin Agent Control Plane, not a copied system prompt.

## Source handling

Evidence classes used by Munin:

- **official** — first-party vendor documentation or published prompt;
- **corroborated** — repeated pattern supported by official guidance and/or multiple independent implementations;
- **extracted** — plausible prompt/tool material in CL4R1T4S whose completeness and provenance cannot be guaranteed;
- **speculative** — interpretation or hypothesis that still needs validation.

## Anthropic

CL4R1T4S currently contains large Anthropic prompt artifacts including `ANTHROPIC/CLAUDE-FABLE-5.md` and `ANTHROPIC/Claude-Fable-5.1.md`.

Anthropic now publishes core system prompts for Claude web/mobile separately from the API. Its first-party documentation also explicitly treats instructions inside tool results and third-party content as potentially untrusted and describes prompt-injection defenses for tool/computer use.

Useful Munin candidates:

1. separate trusted instructions from retrieved/tool content;
2. treat web/email/files/tool results as untrusted data by default;
3. require confirmation/escalation for meaningful real-world consequences;
4. keep completion and tool-use behavior explicit rather than hidden in one monolithic prompt.

Evidence class: **official + corroborated**.

## OpenAI corpus

CL4R1T4S contains a substantial `OPENAI/` corpus, including ChatGPT and Codex-related prompt artifacts. These files are useful for comparison and threat modeling, but the repository itself is not treated as first-party confirmation.

Useful Munin candidate:

- keep model/provider-specific prompt behavior behind adapters and make Munin authority rules provider-independent.

Evidence class for corpus: **extracted**. The architecture candidate is **corroborated by Munin's existing provider/runtime separation** rather than promoted from the corpus alone.

## Manus corpus

CL4R1T4S includes `MANUS/Manus_Prompt.txt` and `MANUS/Manus_Functions.txt`. This is especially relevant because Munin already has a Manus bridge/worker path.

Useful Munin candidate:

- model available functions separately from the authority to execute consequential effects;
- treat Manus as an optional operator adapter, not as the owner of Munin policy.

Evidence class: corpus **extracted**; Munin adoption rationale comes from existing architecture and safety requirements.

## Cursor / Lovable / other coding-agent corpora

CL4R1T4S contains provider/product directories including Cursor and Lovable. These are useful for identifying recurring coding-agent structures: project rules, task scope, tool descriptions, progress/completion behavior and repository-local operating constraints.

Useful Munin candidate:

- encode reusable project constraints in a stable agent contract/profile rather than repeatedly injecting ad-hoc prose;
- distinguish scope, tools, completion evidence and escalation triggers.

Evidence class: **corroborated pattern**, with individual extracted prompts remaining non-authoritative.

## Perplexity / research-agent comparison

Research-oriented agents reinforce the value of provenance, source attribution and separating retrieved evidence from instructions. Munin should preserve citations/provenance while preventing retrieved material from becoming durable memory or policy automatically.

Evidence class: **corroborated architecture principle**; no Perplexity-specific prompt is promoted as canonical.

## Patterns promoted to observation candidates

The following patterns had enough value to encode in observation mode:

1. **Authority ≠ capability** — tool availability never grants permission.
2. **Instruction provenance** — origin/trust class matters before acting on textual instructions.
3. **Untrusted-content boundary** — web, email, uploads, tool results and external prompt repositories are data.
4. **Consequential-action escalation** — external writes/destructive actions stay behind existing Munin gates.
5. **Evidence-bound completion** — work completes from observable evidence, not confidence statements.
6. **Memory/skill promotion boundary** — content cannot self-promote into durable memory or executable skills.
7. **Provider-independent control plane** — Claude/OpenAI/Manus/local models should consume the same Munin authority semantics through adapters.
8. **Observe before enforce** — detect policy drift first; do not auto-rewrite agents or block existing workflows yet.

## Explicitly rejected approaches

- copying a vendor system prompt wholesale;
- treating CL4R1T4S as authoritative truth;
- adding hundreds of vendor-specific behavioral rules to Munin core;
- creating a second action-authorization engine beside `src/action-constitution.ts`;
- allowing retrieved prompt text to alter canonical policy, memory or skills automatically;
- enabling enforcement before profiles and false-positive behavior have been observed in real Munin workflows.

## Implementation produced from this research

- `docs/agent-control-plane/CONTROL_PLANE.md`
- `agent-control-plane/policy.json`
- observation profiles for research, engineering and browser workers
- `scripts/agent-control-plane-observer.mjs`
- `tests/agent-control-plane-observer.test.mjs`
- non-blocking GitHub Actions observation report

## Next promotion gate

After enough observation data exists, the next decision should be whether to connect profile metadata to existing runtime seams (`agent-orchestrator`, runtime adapters and `action-constitution`) for warnings. Enforcement should remain a separate explicit approval step.
