---
name: regulatory-radar
description: Monitor official Brazilian financial-regulatory sources for material changes, compare against prior local state, and notify only on validated new developments. Use for the recurring regulatory radar.
---

# Regulatory Radar

Read scope preferences from the local private successor context. Use primary official sources for binding or supervisory claims.

## Procedure

1. Check official BCB, CVM, Receita Federal, COAF, Diário Oficial and Open Finance Brasil sources relevant to the configured scope.
2. Compare publication identifiers/content against `data/runtime/succession/regulatory-radar-state.json`.
3. Validate scope, publication date, effective date, transition rules, amendments and revocations from the primary act.
4. Separate binding rule, guidance, consultation and supervisory signal.
5. Notify only for new, material, validated change. If nothing material changed, produce no alert.
6. For an alert include source, dates, affected actors, operational impact, urgency, required action, uncertainties and a short editorial draft if configured.
7. Never treat newsletters, snippets, social posts or search summaries as normative proof.

Persist only source identifiers, hashes, timestamps and non-sensitive comparison state locally.
