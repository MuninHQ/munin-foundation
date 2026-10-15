# Munin Offer Architect v1

Offer Architect turns a raw product/service idea into a governed offer hypothesis. The core is deterministic and has no paid-model or paid-research dependency.

## Goals

- Make the Value Equation explicit: dream outcome × perceived likelihood ÷ time delay × effort/sacrifice.
- Map pain, current attempts, objections, constraints, core deliverables, bonuses, guarantee and scarcity.
- Prevent unsupported marketing claims from silently becoming facts.
- Produce validation experiments and competitor/alternative research queries.
- Expose the same engine to side-income/opportunity workflows.

## Evidence Gate

Every meaningful claim is one of:

- `PROVEN`: linked evidence exists. Source quality still needs human judgment.
- `ASSUMPTION`: useful working hypothesis, never presented as fact.
- `TEST`: a claim that must be validated before factual use.
- `INVALID`: contradicted or structurally unsupported. Unsupported scarcity is blocked here.
A claim requested as `PROVEN` without a valid evidence ID is automatically downgraded to `TEST`.

Guarantees without evidence are `TEST`. Scarcity/urgency without verifiable evidence is `INVALID`.

`publishSafe` is intentionally strict: every gated claim must be `PROVEN`, and scarcity must be evidenced.

## Quality Gate

The engine checks:

1. customer/pain/outcome clarity;
2. Value Equation shape;
3. differentiation or real alternative context;
4. objection coverage by purposeful bonuses;
5. proof;
6. supportable risk reversal;
7. honest claims and scarcity.

Readiness is `READY_TO_TEST`, `NEEDS_EVIDENCE`, or `BLOCKED`. This is not a guarantee of commercial success.

## Interfaces

- Web: `/offer-architect.html`
- API: `POST /api/offer-architect/analyze`
- Opportunity adapter: `POST /api/offer-architect/opportunity`
- CLI: `npm run offer:architect -- <offer-input.json>`
## Zero-cost research hook

The v1 engine does not buy data or call paid APIs. It produces research queries and accepts alternative/competitor observations supplied by any existing free research path. A later research worker can execute those queries without changing the offer engine.

## Side-income integration

`assessOfferBackedOpportunity()` converts the Offer Architect quality/evidence output into the existing opportunity gate. An offer with no proven evidence is therefore forced into clarification rather than being promoted as a high-confidence opportunity.

## Operating rule

Do not manufacture guarantees, scarcity, proof, or price certainty. Price/packaging remains explicitly labeled `ASSUMPTION` until real buyer behavior or transaction evidence supports it.
