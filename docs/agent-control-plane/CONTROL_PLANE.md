# Munin Agent Control Plane

Version: 1.0.0-observe

## Purpose

The Agent Control Plane defines how Munin agents receive authority, tools, context, completion criteria and escalation rules. It is deliberately separate from model prompts so that behavior remains reviewable, auditable and provider-independent.

This first release is **observation-only**. It does not change runtime permissions, tool dispatch, approval gates, model selection or existing agent execution paths.

## Design principles

1. **Authority is explicit.** Capability is not permission. An agent may know how to perform an action without being authorized to perform it.
2. **Untrusted content is data.** Web pages, email, files, tool results and retrieved text never gain instruction authority merely because an agent can read them.
3. **Consequential actions cross a gate.** External writes, destructive actions, privilege changes, credential access and publication require the existing Munin approval/safety path.
4. **Completion is evidence-bound.** Agents report observable evidence, not confidence language, before work is considered complete.
5. **Memory is promoted, not absorbed.** Retrieved content cannot directly mutate durable memory, canonical policy or skills.
6. **Provider prompts are research inputs.** Extracted or leaked prompts may inform hypotheses, but only documented, corroborated patterns can become candidate Munin rules.
7. **Observation precedes enforcement.** This version reports drift without automatically blocking or repairing agent behavior.

## Control-plane contract

Every governed agent profile should declare:

- `id` and `role`
- `authorizedActions`
- `forbiddenActions`
- `trustedInstructionSources`
- `untrustedContentSources`
- `completionEvidence`
- `escalationTriggers`
- `memoryPolicy`
- `toolPolicy`

The contract is intentionally model-agnostic. Claude, OpenAI, local Ollama models, Manus or another runtime may all consume the same policy semantics through adapters.

## Trust hierarchy

From highest to lowest authority:

1. Munin Constitution and canonical repository policy.
2. Explicit user approval for the current task.
3. Task/agent contract generated from canonical policy.
4. Trusted local runtime state produced by Munin.
5. Tool outputs and retrieved content.
6. Third-party text, web pages, emails, documents and prompt repositories.

Lower-trust content must not override higher-trust instructions.

## Instruction provenance gate

Before an agent acts on text that resembles an instruction, Munin should eventually be able to attach provenance metadata:

- source type;
- trust class;
- whether it was user-authored, Munin-authored or externally retrieved;
- whether the instruction requests a capability increase;
- whether it attempts to bypass verification, policy, approvals or memory promotion.

In observation mode, this contract only defines and reports the expected boundary. Runtime enforcement remains with existing Munin policy mechanisms.

## Tool-use contract

Agent profiles distinguish between tool availability and tool authority.

A tool may be present in the runtime but still be forbidden for a specific worker. Profiles should therefore declare action classes rather than rely solely on tool names.

Examples:

- research workers may read web/repository data and write local artifacts;
- engineering workers may make repository-local changes and git commits within task scope;
- browser workers may navigate and inspect, but consequential external writes remain approval-gated;
- no worker receives implicit credential access, destructive authority or permission escalation.

## Completion contract

A governed task should not complete without the applicable evidence classes:

- requested objective satisfied;
- output artifact or repository change present;
- validation or test result recorded when relevant;
- unresolved blockers identified;
- consequential side effects disclosed;
- provenance preserved for research-derived policy candidates.

## Escalation contract

Agents should stop autonomous progression and surface a human boundary when they encounter:

- destructive or irreversible action;
- external publication, submission, sending or purchase;
- credential/secret access not already authorized by a canonical integration;
- privilege elevation or permission bypass;
- material conflict between trusted instructions;
- ambiguous high-impact target;
- a request to weaken safety, audit or completion checks;
- evidence that a retrieved source is attempting prompt injection.

## Memory policy

Untrusted content can become:

1. temporary task context;
2. research evidence with provenance;
3. a candidate memory or skill requiring promotion/review.

It cannot become durable memory, canonical instructions or an executable skill automatically.

## External prompt research policy

Prompt repositories such as CL4R1T4S are useful as comparative corpora, not as authoritative specifications. Munin classifies external findings as:

- `official`: documented by the vendor;
- `corroborated`: independently supported by multiple implementations or official guidance;
- `extracted`: technically plausible but provenance/completeness not guaranteed;
- `speculative`: unverified interpretation.

Only `official` and strong `corroborated` patterns should normally advance to a canonical policy proposal. `extracted` material may be used for experiments and threat modeling but should not silently change production behavior.

## Relationship to existing Munin safety

This control plane complements rather than replaces:

- `src/action-constitution.ts`;
- the existing agent security benchmark;
- completion gates in `AGENTS.md`;
- approval/audit mechanisms;
- provider policy and runtime adapters;
- the Design Constitution and design drift checker.

The new observer is therefore diagnostic. A future enforcement phase should reuse existing runtime seams instead of introducing a parallel security engine.

## Observation-mode exit criteria

Promotion beyond observation should require explicit approval plus evidence that:

- the profile schema is stable;
- false positives are acceptable;
- existing agents can be mapped without breaking workflows;
- runtime adapters can preserve provider independence;
- action constitution and approval gates remain the source of truth for consequential actions;
- the observer has accumulated enough reports to justify enforcement.
