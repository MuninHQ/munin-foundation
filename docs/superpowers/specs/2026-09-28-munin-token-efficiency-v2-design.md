# Munin Token Efficiency v2 + Codex Web Zero Risk

## Status

Approved conversational design recorded on 2026-09-28. This specification defines the implementation boundary for the next planning stage.

## Intent

Reduce real context and credit consumption in Munin engineering and orchestration work without weakening safety, provider policy, auditability, or local-first operation. Add an optional manual Codex Web Zero Risk route that prepares a sanitized context packet for the operator to paste and send, without browser automation, DOM access, response extraction, or attempts to bypass service limits.

Success means Munin selects less context, retains useful failures when output is compressed, chooses the least expensive eligible model tier, avoids replaying consolidated history, exposes its decisions and savings proxies, and continues to operate when optional Web tooling is absent.

## Constraints

- Preserve zero-mandatory-cost and local-first operation.
- Reuse the Provider Registry, provider policy, orchestration traces, Token Governor, Control Room state, and existing ChatGPT operator bridge.
- Do not add a paid service or make a paid provider necessary for core behavior.
- Do not silently replace deterministic-local, Ollama, Manus, Host Worker, or existing orchestration routes.
- Keep model routing provider-neutral. Model names are capabilities supplied by existing providers, not hard dependencies.
- Keep consequential actions and external communication behind existing approval boundaries.
- Never place secrets, raw credentials, private stores, or unbounded user content in telemetry or a Web handoff.
- Support Windows as the primary runtime environment.
- Preserve unrelated working-tree changes.

## Existing Foundations

Munin already has a shadow-mode Token Governor with deterministic summarization, estimated token metrics, conservative model-tier recommendations, redaction, trace integration, and a status CLI. It also has a provider registry and zero-cost-first policy, durable orchestration traces, executive checkpoints, a supervised workspace runtime, and a manual ChatGPT operator bridge that copies a sanitized snapshot.

Version 2 promotes bounded context and output handling into explicit deterministic runtime services while retaining the Provider Registry as the authority for eligible providers. It extends rather than replaces the current Token Governor.

## Architecture

### Efficiency Runtime

Introduce a focused `EfficiencyRuntime` facade composed of deterministic services:

1. `ContextSelector` applies repository-first discovery and a context budget.
2. `OutputReducer` caps command output while preserving the head, diagnostics, and tail.
3. `TestFailureExtractor` recognizes large test output and retains failing tests, relevant stacks, and the suite summary.
4. `CapabilitySelector` chooses the minimum registered tool or MCP capability set required by an objective.
5. `EconomicModelRouter` recommends economy, standard, or premium execution within existing provider and zero-cost policy constraints.
6. `BuildStateStore` persists one small canonical task checkpoint.
7. `EfficiencyTelemetryStore` records context-efficiency evidence and a separately labeled credit-savings proxy.
8. `ManualWebHandoff` builds a sanitized Zero Risk packet and reports launcher availability without performing browser automation.

The facade may be called by engineering and orchestration boundaries. It does not execute arbitrary shell commands, discover paid providers, or override provider selection.

### Context Budget Gate

Every efficiency session receives an explicit character budget and an estimated-token budget. Before full file content is accepted, the selector requires a candidate set produced from deterministic discovery evidence such as changed files, tracked-file metadata, path matches, symbol or text search hits, and direct dependencies.

The selector returns:

- selected files and bounded excerpts;
- rejected candidates and reasons;
- budget used and remaining;
- characters and estimated tokens avoided;
- discovery commands and evidence;
- whether a requested broad read was refused or narrowed.

Selection is deterministic and stable for the same repository state and inputs. Binary files, generated outputs, ignored files, runtime data, secret-shaped paths, and files larger than the configured per-file limit are excluded unless an explicit safe rule permits a bounded excerpt.

### File Relevance Gate

Repository discovery follows this order:

1. Git status and changed-file inspection when the task concerns current work.
2. Git-tracked file inventory and recent history when provenance matters.
3. `rg` filename, symbol, and text search.
4. Bounded excerpts around matching lines.
5. Full-file reads only for selected small files or when the remaining budget allows them.

The runtime records why each selected file is relevant. Directory-wide recursive reads are rejected when no discovery evidence exists.

### Output Cap and Test Failure Extraction

Command output below the threshold is preserved unchanged after redaction. Large output is reduced using a fixed allocation for:

- beginning of output;
- unique diagnostics, errors, warnings, failure markers, exit status, and stack frames;
- end of output.

For detected test-suite output, failure extraction takes precedence over generic diagnostics. The extractor preserves failing test names, assertion or exception messages, bounded stacks, and the final pass/fail/skip/duration summary. It records original and retained characters, estimated tokens, omitted lines, truncation reason, and whether failure evidence was found.

Reduction must never turn a failed command into a successful result, remove the exit code, or hide that diagnostics were omitted.

### AGENTS Diet

Audit repository instruction files for duplicated prose, obsolete routing guidance, and rules that apply only to a subdirectory or workflow. Keep the root `AGENTS.md` limited to project-wide mission, non-negotiable safety and cost rules, architecture entry points, the canonical engineering loop, required memory protocol, and completion evidence.

Move specialized guidance into the narrowest existing local document or local `AGENTS.md` that owns the workflow. Do not weaken or delete approval, secret-handling, Windows, zero-cost, validation, or durable-state requirements. Record before/after character counts as context-efficiency telemetry, not as provider billing savings.

### MCP and Capability Lazy Loading

Represent tools and integrations as descriptors containing capability names, activation cost, locality, externality, and prerequisites. Given an objective and execution kind, `CapabilitySelector` chooses only the minimum descriptors that cover required capabilities.

Unknown objectives receive the safe deterministic core rather than every integration. Missing optional servers remain unavailable with a diagnostic; they do not fail unrelated work. The selector does not install, connect, authenticate, or start external services.

### Economic Model Router

Extend routing from two shadow tiers to three recommendations:

- `economy`: search, inventory, triage, classification, deterministic preparation, and low-risk small reads;
- `standard`: bounded code or documentation changes with moderate reasoning and limited blast radius;
- `premium`: high-complexity or high-risk work where cheaper eligible routes are insufficient and premium availability is explicitly trustworthy.

Routing considers task kind, impact, complexity, autonomy, risk, selected-context size, requested capabilities, and available provider profiles. It respects existing provider enablement, cost ceilings, offline-only rules, explicit preferences, and premium availability. A recommendation cannot make an ineligible provider eligible. When no trustworthy paid-credit state exists, the automatic route remains zero-cost.

Telemetry stores the tier and reasoning rationale, not hidden reasoning content. Model names such as Luna or Sol may appear only as provider configuration metadata; core policy is expressed in portable tiers.

### Compaction Awareness and Build State

Persist one small `BuildState` per long-running task with:

- task identifier and objective;
- status and last update time;
- accepted decisions;
- selected or changed files;
- blockers;
- latest verification evidence;
- next action;
- a digest of the consolidated history.

Before constructing a new packet, compare its history digest and checkpoint revision. Content already represented by the current checkpoint is referenced by digest instead of being re-expanded. Updates replace the compact state atomically and append a bounded audit event. Raw command logs and full conversation history are not stored in Build State.

### Diff-First Review

Review packets contain the objective, applicable constraints, current Build State, Git diff metadata, affected files or bounded hunks, and verification evidence. Repository-wide content is excluded unless the reviewer identifies a concrete missing dependency and the Context Budget Gate admits it.

The packet reports untracked and unrelated dirty paths without including their content. Review remains read-only and cannot stage, revert, or commit changes.

### Command-First Rule

For repository tasks, deterministic operations precede model inference when they can answer the question or narrow the input. Preferred operations are Git metadata and diffs, `rg`, project scripts, TypeScript compilation, focused tests, and deterministic parsers.

Each inference packet records which deterministic checks ran and what unresolved question still requires a model. The rule is advisory when commands are unavailable, but the degradation is visible.

### Telemetry

Keep two metric families distinct:

`context_efficiency` measures observable local reduction:

- candidate and selected file counts;
- input, selected, avoided, and retained characters;
- estimated input, selected, avoided, and retained tokens;
- output characters truncated;
- failure records preserved;
- capabilities considered and activated;
- Build State reuse and history bytes avoided;
- selected model tier and rationale code.

`credit_savings_proxy` is an explicitly estimated, non-billing metric based on avoided estimated tokens and tier recommendations. It must never be presented as realized money, provider credits, or invoiced token savings.

All telemetry is local, bounded, redacted, and non-blocking. Malformed historical observations are ignored. Store failures cannot block the governed task.

### Codex Web Zero Risk

The optional Web route performs only these actions:

1. Assemble an objective, constraints, compact Build State, selected context, and requested response contract.
2. Redact secrets and enforce the context budget.
3. Render and copy the packet for the operator.
4. Optionally open a configured Web destination or launcher using a normal user-visible navigation action.
5. Mark the handoff as `prepared` and later allow the operator to record a manual disposition.

It must not inject text into a Web page, click Send, read or manipulate the DOM, observe the response, scrape content, reuse session cookies, automate a browser, or claim that an external answer was consumed. It must not suggest using Web access to evade quotas or limitations.

Launcher/plugin detection is passive. States are `available`, `unavailable`, or `unknown`. `unavailable` leaves copy-only mode operational and includes setup guidance without installing anything.

### Operator UI and Diagnostics

Add one Token Efficiency diagnostic surface, linked from the existing operator experience, using Munin's current dark semantic design and shared components. It displays:

- current context budget, used amount, and selected files;
- model tier and concise rationale;
- active versus available capabilities;
- original versus retained command output;
- test failures retained;
- context-efficiency metrics and separately labeled credit proxy;
- Build State status and next action;
- Zero Risk state, manual-only boundary, packet size, and launcher availability.

The interface supports keyboard navigation, visible focus, text labels in addition to color, useful empty/error states, and responsive mobile layout. It must not expose raw secrets, full private context, or hidden provider credentials.

## API and CLI Surface

Add a read-only efficiency status endpoint and a bounded packet-preparation endpoint. Packet preparation creates local sanitized state but performs no external send. Mutating manual disposition endpoints, if needed, accept only finite states and a bounded note.

Add an `npm`/CLI diagnostic command that emits the same status contract for local troubleshooting. Existing Token Governor status remains compatible or becomes a documented projection of the new contract.

Exact routes and command names will follow current `control-room-api` and CLI conventions during implementation planning.

## Error Handling

- Invalid budgets fail validation before reading files.
- Repository discovery failures return partial evidence plus a diagnostic and do not silently broaden reads.
- Missing Git or `rg` produces a visible degraded mode and uses only explicitly supplied safe inputs.
- Output reduction preserves command status and redacted failure evidence even when parsing is incomplete.
- Unknown test formats fall back to generic diagnostic reduction.
- Missing optional MCPs, providers, launchers, or plugins do not block deterministic core operation.
- Telemetry and checkpoint write failures are reported as non-blocking diagnostics and must not change the governed task outcome.
- Any redaction uncertainty removes the suspect field from a Web packet.

## Security and Privacy

All persisted packets and telemetry pass through existing recursive secret redaction. Path data is normalized and kept repository-relative where possible. Runtime state remains under ignored Munin runtime storage. Web packets default to summaries and bounded excerpts, never entire runtime stores or user-memory databases.

The Zero Risk contract is enforced structurally: its adapter exposes packet preparation and destination discovery but no API for page inspection, DOM operations, response ingestion, cookie access, or background browser control.

## Testing Strategy

Implementation follows red-green-refactor. Tests cover:

- budget validation, deterministic selection, incremental excerpts, binary/large/ignored exclusions, and broad-read refusal;
- generic output head/diagnostics/tail preservation, exit status, redaction, Unicode, long single lines, and zero-diagnostic output;
- representative Node test failures, bounded stacks, suite summaries, and unknown-format fallback;
- capability minimization, unknown objectives, missing servers, and no implicit activation;
- economy/standard/premium boundaries, zero-cost fallback, provider ineligibility, and unknown premium budget;
- checkpoint replacement, digest reuse, stale revisions, atomic persistence, and non-blocking store failure;
- diff-first packets that exclude unrelated dirty content;
- separate context-efficiency and credit-proxy semantics;
- manual Web packet redaction, budgets, launcher degradation, and absence of automation or response ingestion;
- API, CLI, and UI contracts;
- integration at the orchestration boundary without changing provider authority;
- compatibility with existing Token Governor observations and traces.

Final verification requires the focused tests, complete `npm test`, design-drift diagnostics, a controlled supervised restart, HTTP health/status checks, and a manual UI smoke check of the efficiency and copy-only Zero Risk states.

## Rollout

1. Introduce pure deterministic primitives and compatibility types.
2. Integrate them in observation mode at the orchestration boundary.
3. Expose status, CLI, and UI diagnostics.
4. Enable Context Budget and Output Cap enforcement for the new efficiency session path while preserving existing routes.
5. Add manual Zero Risk packet preparation.
6. Collect representative local evidence before allowing routing recommendations to influence any automatic provider choice beyond existing policy.

No rollout stage may promote paid execution, browser automation, or a new provider without separate explicit approval.

## Acceptance Criteria

- A repository task cannot consume a broad file set through the new path without deterministic candidate selection and budget accounting.
- Large command and test output is reduced while exit status, failures, stacks, diagnostics, and final summaries remain visible.
- Review packets contain the diff, affected context, Build State, and evidence rather than the repository corpus.
- Long tasks reuse a compact checkpoint and report avoided history size.
- Only objective-relevant capabilities are selected; missing optional capabilities degrade gracefully.
- Routing reports economy, standard, or premium with a portable rationale and never bypasses provider or zero-cost policy.
- Context-efficiency metrics and credit-savings proxy are labeled and stored separately.
- The UI and CLI expose selected context, budget, route, truncation, checkpoint, capabilities, and Zero Risk status.
- Zero Risk only prepares/copies a sanitized packet and optionally opens a visible destination; it never sends, scrapes, reads DOM, or ingests an external response.
- Root instruction context is measurably smaller or justified line by line, with specialized rules relocated without weakening governance.
- Existing unrelated changes remain intact.
- Full build and tests pass, the supervised runtime restarts through its controlled mechanism, and post-restart smoke checks confirm the new status and UI paths.
