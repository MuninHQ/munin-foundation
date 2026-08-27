# GitHub Ecosystem Scan — 2026-08-27

Scope: review the daily, weekly and monthly GitHub Trending windows and promote only ideas that close a demonstrated Munin gap without adding cost, provider lock-in, unsafe scraping or a second competing product core.

## Decision summary

Two ideas earned implementation:

1. an evidence-first career application packet, adapted natively from the workflow demonstrated by `MadsLorentzen/ai-job-search`;
2. stronger agent isolation, adversarial policy checks, durable receipts and observability, completed from Munin's queued safety branch and hardened using patterns also visible in `Tencent/AI-Infra-Guard` and Apache Maka.

No new runtime dependency was added. Munin's existing orchestrator, Memory Ledger, Knowledge Vault, governed Playwright path and Flow Viewer remain canonical.

## Trending snapshot

The snapshot was observed on 2026-08-27 and will change as GitHub recalculates momentum.

| Candidate | Momentum observed | Relevant idea | Decision |
|---|---:|---|---|
| `MadsLorentzen/ai-job-search` | +1,300 daily | job capture → fit → tailored CV/letter → review → interview | **Adapt application packet natively**; reject LinkedIn guest scraping |
| `tt-a1i/archify` | +1,035 daily | typed architecture IR, validation and interactive export | **Track/benchmark later**; current Flow Viewer already covers the immediate need |
| `volcengine/OpenViking` | +4,211 weekly | filesystem-oriented context database for agents | **No replacement**; overlaps Memory Ledger/Knowledge Vault and adds AGPL/provider burden |
| `akitaonrails/ai-memory` | +2,073 weekly | Markdown source, SQLite/FTS and cross-agent handoff | **No replacement**; useful reference, but overlaps governed Munin memory and Windows is experimental |
| `apache/maka` | +1,769 weekly | local agent workspace with append-only tool/model/permission logs | **Adapt safety pattern only**; early product, model connection required and macOS-first release |
| `TencentCloud/TencentDB-Agent-Memory` | +15,253 monthly | team memory, skills, wiki, code graph and ACL | **No replacement**; materially heavier than Munin's current local-first need |
| `Tencent/AI-Infra-Guard` | +1,247 Python weekly | agent/skill/MCP and prompt-injection security scans | **Adapt deterministic local subset**; do not require its Python/Go/Docker/LLM stack |
| `tinyhumansai/openhuman` | active daily trend | complete local personal-assistant product | **No adoption**; whole-product duplication and heavy Rust/Node/Tauri toolchain |

## Implemented: governed Career Application Packets

Munin now persists bounded job-description text during Career Intake and can build a deterministic packet for each non-terminal opportunity above the fit gate. The packet contains:

- decision and fit score;
- ATS terms extracted from the actual role description;
- matching facts from governed career context, excluding credential/contact/sensitive fields;
- evidence prompts for CV tailoring rather than fabricated bullets;
- a cover-letter scaffold with explicit placeholders;
- STAR interview prompts and questions for the company;
- risks, provenance and stale-context warnings;
- mandatory human review, with automatic submission and external writes disabled.

The Career Command surface exposes the packet directly. This captures the useful workflow idea from `ai-job-search` without making Claude Code, Bun, LaTeX or automated LinkedIn scraping mandatory.

## Implemented: agent safety and observability

The queued Munin safety branch was integrated and then hardened:

- detached Git worktree execution workspace;
- guarded shell-free process boundary plus optional strict Docker isolation;
- Windows-safe npm/npx execution through `node.exe` and validated CLI entrypoints;
- adversarial security benchmark and HUD/API readiness projection;
- durable orchestration traces, metrics, telemetry and replay receipts;
- recursive secret redaction across telemetry, receipts and provider traces;
- HTML escaping for provider/sandbox values displayed in the HUD;
- cached sandbox readiness detection so the HUD does not run `docker info` every 30 seconds.

Control Room executions now emit local JSONL telemetry and durable receipts. Observability failures remain non-fatal and do not authorize replay or consequential actions.

## Explicit rejections

- **LinkedIn guest scraping:** not imported. It is brittle and can violate platform terms; Munin keeps user-provided URL/text/screenshot intake and transient extraction.
- **Free-provider gateways and rotating credentials:** not promoted. “Free” endpoints with unclear provenance or churn weaken reliability and credential safety.
- **A second orchestrator or personal-assistant core:** Maka and OpenHuman do not replace Munin's product-specific state, blocker classification and QA loop.
- **A second memory platform:** OpenViking, ai-memory and TencentDB Agent Memory do not replace the existing governed memory layers without a benchmark proving a material gap.
- **A second browser stack:** browser-use/browser-harness-style projects remain benchmark inputs only; Munin keeps the governed read-only Playwright path.

## Re-evaluation triggers

- Archify materially improves exact architecture export or validation beyond the current Flow Viewer.
- A memory candidate proves better retrieval/continuity on Munin's benchmark without weakening Windows support, privacy or portability.
- A security candidate provides a zero-cost deterministic scanner that materially outperforms the native adversarial gate.
- A new product requirement cannot be met cleanly through existing provider-neutral seams.

## Primary sources

- GitHub Trending: <https://github.com/trending?since=daily>, <https://github.com/trending?since=weekly>, <https://github.com/trending?since=monthly>
- Archify: <https://github.com/tt-a1i/archify>
- AI Job Search: <https://github.com/MadsLorentzen/ai-job-search>
- Apache Maka: <https://github.com/apache/maka>
- OpenViking: <https://github.com/volcengine/OpenViking>
- ai-memory: <https://github.com/akitaonrails/ai-memory>
- TencentDB Agent Memory: <https://github.com/TencentCloud/TencentDB-Agent-Memory>
- AI-Infra-Guard: <https://github.com/Tencent/AI-Infra-Guard>
- OpenHuman: <https://github.com/tinyhumansai/openhuman>
