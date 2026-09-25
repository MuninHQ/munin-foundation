# Vibe Coding Toolkit evaluation for Munin

Date: 2026-09-04
Source reviewed: `soumatheusgomes/vibe-coding-toolkit`

## Decision

Adopt the useful engineering patterns, not the toolkit wholesale.

Munin already has the stronger architectural foundation: a canonical orchestrator, explicit agent roles, evidence-bound completion gates, durable state, safety/cost constraints, and a local-first/zero-mandatory-cost policy. Adding a Claude-centric framework would duplicate these seams and conflict with Munin's vendor-neutral direction.

## Classification

| Toolkit capability | Munin status | Decision | Rationale |
| --- | --- | --- | --- |
| Plan before implementation | Already present | KEEP | `AGENTS.md` already requires inspect → assumptions → observable success → smallest coherent plan → edit → validate → review. |
| Main-agent orchestration | Already present | KEEP | Munin has `agent-orchestrator` and explicit role files. |
| Specialist subagents | Already present | IMPROVE | Preserve current roles; tighten routing around isolated context boundaries rather than adding a large overlapping cast. |
| Parallel execution waves | Partial | ADAPT | Parallelize only tasks with disjoint file sets and no dependency edge; serialize commits/reconciliation through the orchestrator. |
| Independent reviewer | Already present | KEEP | QA/reviewer roles and completion gate are native capabilities. |
| Model-tier routing | Already present conceptually | IMPROVE | Route by cost/capability while preserving local-first and zero mandatory paid inference. |
| ESLint/Biome quality gates | Missing as a dedicated lint layer | DEFER | Valuable, but introducing a new dependency without first measuring the existing warning baseline would create churn. Add incrementally after baseline capture. |
| Max-lines gate | Missing | ADOPT | Add an incremental 350-line gate for changed source files only, avoiding a disruptive repository-wide refactor. |
| Warning burndown | Missing | ADAPT | Establish a measured baseline first, then enforce no-regression and burn down deliberately. |
| Superpowers plugin | Overlaps Munin rules | IGNORE AS DEPENDENCY | Its discipline is useful, but Munin already encodes the core behavior in `AGENTS.md`; installing a Claude-specific plugin adds lock-in and duplication. |
| aia-harness | Overlaps Munin bootstrap/orchestration | DEFER | Audit only if it exposes a concrete capability Munin lacks. Do not make it a required runtime. |
| RTK token proxy | Optional optimization | DEFER | Optimization, not a current correctness bottleneck. |
| Context7 | Potentially useful | DEFER | Evaluate later as an optional documentation retrieval adapter. |
| Graphify | Potential overlap with Munin memory/knowledge | DEFER | Do not create a parallel knowledge graph before proving a missing capability. |
| agent-browser | Existing browser capability | KEEP EXISTING | Prefer Munin's current browser validation/worker paths instead of duplicating them. |

## Adopted now

### 1. Incremental 350-line quality gate

`scripts/check-changed-file-size.mjs` blocks a pull request when a changed JS/TS source file exceeds `MAX_LINES=350`.

The rule applies only to files touched by the PR. Existing oversized files are therefore technical-debt candidates, not an immediate repository-wide failure. This preserves delivery while preventing additional growth.

### 2. BUILD ALL validation gate

`.github/workflows/quality-gates.yml` runs:

1. changed-file size gate;
2. TypeScript/core build;
3. web build;
4. full Node test suite.

This turns the completion discipline already described in `AGENTS.md` into an enforceable pull-request check.

## Next measured step

Do not immediately install ESLint and attempt a repository-wide cleanup. First capture a lint/static-analysis baseline, classify findings by correctness/security/style, and then introduce a no-regression gate. This avoids spending BUILD ALL cycles on cosmetic churn while preserving the toolkit's useful warning-burndown principle.

## Parallel-wave rule for future BUILD ALL work

Parallel execution is allowed only when all of the following are true:

- each task has explicit file ownership;
- file sets are disjoint;
- there is no direct or transitive dependency between tasks;
- workers do not commit independently;
- the orchestrator reconciles and serializes commits;
- reviewers run after implementation for the wave;
- broad validation runs after reconciliation.

When task scope is uncertain, execution falls back to serial mode.

## Bottom line

The toolkit validates several patterns Munin already converged on. The highest-value delta is not importing its stack; it is making Munin's existing discipline mechanically enforceable. The first implementation therefore adds incremental file-size control and a repeatable PR quality gate without introducing a paid service, vendor-specific runtime, or new framework dependency.
