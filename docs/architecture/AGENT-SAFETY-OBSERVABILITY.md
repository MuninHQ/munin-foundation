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

Repository isolation is combined with a process boundary. `NativeGuardedSandbox` is the compatibility default: it executes an allowlist without a command shell, strips credential-shaped environment values and bounds time/output. `DockerHardSandbox` is the optional strict backend with network disabled, capabilities dropped, a read-only root filesystem and resource limits.

Guarded mode is not complete operating-system isolation. Hard mode must fail closed when Docker is unavailable and must pass empirical validation on the actual Windows host before promotion as the default. See `EXECUTION-SANDBOX.md`.

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

Sensitive prompt bodies, OAuth credentials, tokens and private message contents must not be emitted into telemetry. String and nested metadata redaction is applied before a sink receives an event.

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

## Rollout status

### Delivered

- isolated worktree and process-sandbox contracts with deterministic tests;
- existing autonomous engineering worktree isolation preserved;
- local JSONL telemetry and durable replay receipts on Control Room executions;
- orchestration traces, metrics, security score and sandbox strength exposed to HUD/API;
- deterministic security fixtures wired to Munin's native policy evaluator;
- secret redaction across telemetry, receipts and provider traces.

### Evidence-gated follow-ons

- make hard Docker isolation the default only after the actual host passes the strict suite;
- evaluate real optional providers against the security fixtures before promotion;
- add OpenTelemetry exporter if local metrics justify it.

## Non-goals

- replacing Munin's orchestrator with an external framework;
- allowing autonomous promotion to `main` without existing approval/QA rules;
- treating Git worktrees as a complete security sandbox;
- sending secrets/private context to third-party observability services;
- making any paid provider mandatory.
