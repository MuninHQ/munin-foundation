# Munin Succession Pack

## Purpose

Keep the user's daily operating system functional when ChatGPT Plus, any other subscription, or any single model becomes unavailable.

Munin is the durable system of record. Conversational AI products are interchangeable operator cockpits.

## Target architecture

```text
                         User
                          |
         +----------------+----------------+
         |                                 |
  Free conversational UI            Antigravity / agent IDE
  research + personal use          code + browser + terminal
         |                                 |
         +---------------+-----------------+
                         |
                       Munin
       durable state / rules / skills / evidence
                         |
             +-----------+-----------+
             |                       |
        local runtime            optional local AI
      private context/state       Ollama/Open WebUI
```

## What this pack adds

- `.agents/rules/portable-operator.md`: provider/cost/privacy invariants.
- `.agents/skills/munin-build-all/`: BUILD ALL execution protocol.
- `.agents/skills/munin-sitrep/`: canonical project status protocol.
- `.agents/skills/daily-briefing/`: current-news + YouTube briefing.
- `.agents/skills/career-radar/`: job discovery and deduplication.
- `.agents/skills/regulatory-radar/`: official-source change monitor.
- `.agents/skills/linkedin-weekly-review/`: analytics-based weekly review.
- `PRIVATE_CONTEXT_TEMPLATE.md`: schema for local-only operator context.
- `ANTIGRAVITY_BOOTSTRAP.md`: Windows setup/activation.
- `SCHEDULED_TASKS.md`: migration commands for recurring tasks.
- `scripts/bootstrap-antigravity-successor.ps1`: safe local bootstrap helper.

## Privacy model

This repository may be public. Personal context must never be committed.

Private successor data lives only under:

`data/runtime/succession/`

That path is already covered by the repository's `data/runtime/` ignore rule.

## Portability principle

New knowledge should be promoted into one of four durable forms:

1. repository rule — invariant or constraint;
2. skill — reusable multi-step procedure;
3. canonical Munin state — project/execution truth;
4. local private successor context — user-specific values and preferences.

Do not use chat history as the only copy of important context.
