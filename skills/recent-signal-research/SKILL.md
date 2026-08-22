---
name: recent-signal-research
description: Research recent external signals for Munin with explicit time windows source coverage primary-source verification evidence scoring and honest uncertainty.
version: 1.0.0
triggers: recent,last 30 days,last30days,ultimos 30 dias,últimos 30 dias,trend,trends,trending,tendencia,tendências,latest,recente,news,noticias,notícias,signal,sinais,community,reddit,hacker news,youtube,github,regulation,normativa,mercado
permissions: read,local-write
source: mvanhorn/last30days-skill-inspired-munin-adaptation
---
# Recent Signal Research — Munin Adaptation

Use this skill to investigate what changed recently and whether it deserves a Munin action, decision, alert, LinkedIn post, career move, or deeper research record. Apply the repository research model and current provider capabilities rather than installing or executing the upstream multi-network CLI.

## Research contract

Define the subject, geography, decision use, and exact time window before searching. Default to 30 calendar days only when the request does not supply a window. Record the cutoff dates in the result.

Separate authoritative facts from community reaction. Prefer primary sources for factual claims: regulators, legislation, official company material, standards bodies, original repositories, filings, and named first-party announcements. Use news, professional commentary, forums, and social networks to identify reaction, adoption friction, counterarguments, or emerging language, not to replace a primary source when one exists.

For every material finding, retain the source URL, source type, publication or event date, capture date, claim supported, and confidence. Track source coverage explicitly. Do not infer that a source was quiet when it was unavailable, rate-limited, unauthenticated, or not searched. Report coverage as searched-with-results, searched-without-results, unavailable, or not-attempted.

## Ranking and synthesis

Rank signals by relevance to André's active objectives, authority of evidence, recency, corroboration, novelty against Munin memory, and plausible consequence. Engagement is a secondary signal, never proof of truth or importance. Deduplicate syndication and repeated commentary that traces to the same original event.

Lead with what materially changed, why it matters, and the decision or action it may affect. Distinguish fact, interpretation, and open question. Include counterevidence when it changes the conclusion. If the evidence floor is not met, return an honest no-material-signal result instead of filling the brief with weak items.

When the research may feed LinkedIn, pass only attributable claims and differentiated angles into the editorial pipeline. Do not create urgency, novelty, or consensus that the evidence does not support.

## Cost and safety

Use existing free or already-authorized capabilities. Do not require paid APIs, scrape authenticated sessions, bypass access controls, publish externally, or install a broad third-party collector as a side effect of research. Store durable findings through Munin's existing evidence and synthesis model when the task authorizes repository-local persistence.
