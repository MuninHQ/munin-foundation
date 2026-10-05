---
name: daily-briefing
description: Build the user's daily high-signal briefing from current web and YouTube sources, with practical Munin opportunities and professional content angles. Use for the recurring daily briefing.
---

# Daily Briefing

Read private preferences from `data/runtime/succession/operator-profile.local.md` and prior briefing state from `data/runtime/succession/briefing-state.json` when available.

## Procedure

1. Discover current developments from authoritative web sources and recent YouTube material.
2. Prioritize AI/agents/tools, financial services/payments/Open Finance, digital assets/tokenization, career-relevant developments, and broadly useful technology.
3. Prefer primary sources. For YouTube claims, validate material claims against documentation, repositories, releases, or another primary source where practical.
4. Deduplicate against persisted prior items before selecting.
5. Return exactly five high-value items unless source quality is insufficient; never fill space with weak news.
6. For each item include: headline, concise summary, why it matters, source link, and whether it is news/video/primary documentation.
7. End with practical Munin opportunities and up to two non-repetitive professional-content angles.
8. When a Munin improvement has strong benefit/cost and is safely implementable, hand it to the `munin-build-all` skill rather than silently modifying code inside the research task.

Persist only non-sensitive deduplication identifiers and timestamps locally. Do not commit briefing history.
