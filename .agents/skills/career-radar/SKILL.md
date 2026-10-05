---
name: career-radar
description: Run the user's governed job-opportunity radar using private local career criteria, deduplicate prior results, and rank only strong-fit openings. Use for recurring vacancy searches or job-fit analysis.
---

# Career Radar

Load private career criteria from `data/runtime/succession/operator-profile.local.md` and local seen/applied state from `data/runtime/succession/career-radar-state.json`.

## Search

- Search current openings from employer career sites and reputable job platforms.
- Include both domestic and international/remote opportunities when allowed by the private profile.
- Re-surface an older posting only when it is genuinely open again; mark it `REOPENED/REAPPEARED`.
- Never infer geographic eligibility or compensation when the evidence does not support it.

## Evaluation

For each candidate compute an explainable fit based on seniority, domain, responsibilities, geography, employment model, language and material constraints from the private profile.

Return only high-fit opportunities with APPLY NOW / REVIEW / SKIP, company, role, direct application link, fit score, strongest evidence, gaps/risks, recommended next action, and whether it is NEW or REOPENED/REAPPEARED.

Never apply, message a recruiter, or submit personal data automatically. Persist seen identifiers locally for deduplication and keep private criteria out of Git.
