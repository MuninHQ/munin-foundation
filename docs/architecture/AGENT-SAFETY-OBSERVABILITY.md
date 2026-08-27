# Agent Safety, Isolation and Observability

## Decision

Munin should increase autonomy only together with stronger isolation, evidence, replayability and adversarial testing.

This architecture adds four complementary seams without replacing Munin's existing orchestrator:

1. isolated execution workspaces;
2. execution receipts and replay descriptors;
3. fire-and-forget agent telemetry;
4. a deterministic agent security benchmark harness.

## 1. Isolated execution workspace

`GitWorktreeExecutionWorkspace` creates a detached Git worktree in a temporary directory. Engineering agents can run commands and collect diffs there before any change is promoted to the canonical checkout.

Phase 1 is **repository isolation**, not a complete OS security sandbox. A worktree prevents accidental direct mutation of the canonical checkout but does not stop a malicious process from accessing host resources available to the same user account.

The next hardening step is to place `ExecutionWorkspace` behind a restricted process/container backend while keeping the same interface.

Expected engineering path:

`objective → spec/architecture gate → isolated workspace → implement → test → diff → QA → promote`

## 2. Execution receipts

Every completed orchestration can be reduced to an immutable receipt containing:

- run ID and objective;
- work type and plan;
- step status and summaries;
- evidence;
- fingerprints;
- blocker/final status;
- replay descriptor.

Receipts intentionally contain metadata and evidence references rather than secrets or full private context.

Replay initially means reconstructing the prior objective, work type, plan and fingerprints. It does not imply silently repeating consequential tool calls.

## 3. Agent telemetry

Agent telemetry uses structured events:

- `run.started` / `run.completed`;
- `agent.started` / `agent.completed` / `agent.failed`;
- `provider.selected`;
- `tool.called` / `tool.completed`;
- `verification.failed`;
- `retry.scheduled`;
- `human.blocked`.

Telemetry is fire-and-forget. Collector failure must never become an agent execution failure.

The default local sink can write JSONL. OpenTelemetry export can be added later without changing the agent contract.

Sensitive prompt bodies, OAuth credentials, tokens and private message contents must not be emitted into telemetry.

## 4. Agent security bench

The first baseline contains adversarial scenarios for:

- prompt injection from email/repository/tool output;
- durable memory poisoning;
- `.env`/OAuth secret exfiltration;
- financial and permission-boundary excessive agency;
- verifier/QA sabotage;
- fake test-success claims;
- destructive production commands.

The benchmark runner accepts an evaluator so the same fixtures can test deterministic policy code, provider-backed agents or full orchestration flows.

Security score is a regression signal, not proof of safety. Any escaped scenario involving secrets, irreversible actions or verification bypass should block promotion regardless of aggregate score.

## Rollout

### P0

- land the interfaces and tests in this change;
- use isolated worktrees for autonomous engineering paths;
- persist receipts for engineering runs;
- begin emitting JSONL telemetry from observed orchestration.

### P1

- expose autonomy metrics in Control Room/HUD;
- wire the security fixtures into agent/provider evaluation;
- add restricted process/container workspace backend;
- add OpenTelemetry exporter if local metrics justify it.

## Non-goals

- replacing Munin's orchestrator with an external framework;
- allowing autonomous promotion to `main` without existing approval/QA rules;
- treating Git worktrees as a complete security sandbox;
- sending secrets/private context to third-party observability services;
- making any paid provider mandatory.
