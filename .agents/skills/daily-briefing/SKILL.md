---
name: daily-briefing
description: Build the user's daily high-signal briefing from current web and YouTube sources, with practical Munin opportunities and professional content angles. Use for the recurring daily briefing.
---

# Daily Briefing

Read private preferences from `data/runtime/succession/operator-profile.local.md` and prior briefing state from `data/runtime/succession/briefing-state.json` when available.

## Evidence gate

Every selected item must satisfy all applicable checks:

- include an exact deep-link URL to the source; homepage/root-domain links are not acceptable evidence;
- include the source title/publisher and publication date;
- distinguish publication date from the actual event/effective date when different;
- verify the main factual claim against at least one primary source whenever an official release, documentation page, repository/release, regulator, company announcement, or specification exists;
- do not rely on search-result snippets, generic trend claims, undated summaries, or an AI-generated source label;
- for YouTube, include the exact video URL, video title, channel and upload date, then corroborate material technical/product claims against documentation, a repository/release, or another primary source where practical;
- default freshness window is the last 7 days. An older item may be included only when it has a current decision/deadline/effective-date consequence, and must be labeled `ONGOING/DEADLINE`;
- if fewer than five items pass the evidence gate, return fewer than five and explicitly state that quality was preferred over filling the quota.

## Procedure

1. Discover current developments from authoritative web sources and recent YouTube material.
2. Prioritize AI/agents/tools, financial services/payments/Open Finance, digital assets/tokenization, career-relevant developments, and broadly useful technology.
3. Deduplicate against persisted prior items before selecting.
4. For each accepted item include:
   - headline;
   - NEW or ONGOING/DEADLINE;
   - event/effective date when relevant;
   - publication date;
   - concise verified summary;
   - why it matters;
   - exact source title and deep-link URL(s);
   - whether a YouTube source was used.
5. End with practical Munin opportunities and up to two non-repetitive professional-content angles.
6. Before recommending a Munin improvement, read relevant canonical project state to avoid presenting an already-existing capability as new. If repository evidence is insufficient, label the idea as a candidate for comparison rather than an implementation recommendation.
7. In unattended scheduled runs, do not invoke `munin-build-all`; propose qualified improvements only.

Persist only non-sensitive deduplication identifiers and timestamps locally. Do not commit briefing history.
