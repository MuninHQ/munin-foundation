# AIP → Munin v0.1 Consolidation Map

Status: accepted consolidation map for the current Munin v0.1 phase.

## Decision

AIP is no longer treated as a parallel product/runtime. Its useful architecture concepts are absorbed into Munin Foundation. Munin is the product and execution environment; the repository architecture is the reusable technical foundation.

This removes the historical ambiguity between “AIP” and “Munin” without deleting useful research artifacts.

## Canonical v0.1 capability map

| Historical AIP concern | Munin v0.1 canonical implementation | Status |
| --- | --- | --- |
| Human/context state | `src/context-memory.ts`, `src/memory-ledger.ts`, `src/continuity-context.ts` | adopted |
| Goal/objective execution | `src/agent-orchestrator.ts`, `src/control-room-orchestrator.ts`, autonomous loop/runtime modules | adopted |
| Capability routing | provider policy, orchestration runtime core, runtime capability registry | adopted |
| Evidence and research | Research Engine, External Intelligence capability, repository intelligence | adopted |
| Review/quality | QA Verifier, independent engineering review, review gates | adopted |
| Career domain | Career OS, Career Intelligence, Career Mobile/Quick Intake | adopted |
| Content/publication | Content Engine, LinkedIn Studio/Composer/Publisher | adopted |
| Durable events | canonical session log, Memory Ledger, workspace events | adopted |
| User-facing shell | Munin web/mobile/Control Room | adopted |
| Voice/conversational interface | Neo remains an optional Munin interface module | deferred interface |

## Document disposition

### Historical RFC-0001 / RFC-0002 / RFC-0003

These early “why / human state / life state” documents remain historical framing. They are not implementation specifications. Where they conflict with the current product contract, `docs/product/munin-v0.1-spec.md`, `docs/product/munin-v0.1-build.md`, `ops/CURRENT_STATE.md`, accepted ADRs and executable tests win.

### RFC-004 through RFC-012

Their useful product/domain boundaries are represented in current modules:

- Command Center → Control Room + web Command Center.
- Context Engine → Context Memory + Memory Ledger.
- Operating SITREP → service SITREP + consolidated Operator SITREP.
- Career OS → Career Intelligence/Inbox/Intake.
- Research Engine → research state + external/repository intelligence providers.
- Dashboard → current web shell and executive briefing surfaces.
- Foundation hardening → unified server, atomic storage, policy gates, recovery primitives.
- Agent runtime → current multi-agent orchestrator and production adapters.
- Review/provider boundary → independent QA + provider-neutral policy/seams.

They are retained as provenance, not maintained as competing source-of-truth specifications.

## SPEC / BUILD consolidation

The historical AIP SPEC/BUILD backlog is satisfied by the current canonical pair:

- `docs/product/munin-v0.1-spec.md` — accepted product/trust/capability contract.
- `docs/product/munin-v0.1-build.md` — accepted implementation/acceptance sequence.

New architecture requirements should amend those documents or create a scoped Munin RFC/ADR; do not create a second AIP specification tree.

## ADR consolidation

Accepted implementation decisions belong in `decisions/` or `docs/architecture/ADR-*` and must reference a Munin capability/constraint. Historical AIP ADR numbering has no independent authority.

Current authoritative decisions include, among others:

- provider portability and bounded execution;
- safe reversible autonomy until a real human boundary;
- durable repo-backed Control Room state;
- independent QA before completion;
- privacy-scoped context consumption;
- manual explicit approval for consequential external publication;
- local-first and zero-additional-cost preference where viable.

## Component boundary rule

A technical component belongs in the active architecture only if it maps to one or more current Munin capabilities and has either an executable consumer or an accepted near-term integration path. Otherwise it is research/archive material.

## Result

There is no remaining “AIP implementation backlog” separate from Munin v0.1. Future AIP references should be read as historical architecture lineage or as shorthand for Munin's reusable technical foundation, not as a parallel project to build.
