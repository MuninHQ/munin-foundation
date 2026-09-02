# Adaptive Relevance Decay and Feedback Design

## Status

Approved in chat on 2026-09-02 for specification. Implementation still requires review of this written design.

## Repository baseline and reconciliation

This design is based on `origin/main` at `e80dc8c`. The sanitized operator snapshot contained zero projects, four planned P1 email actions, and one applied B3 job. That runtime snapshot describes current private operational data; it does not replace repository architecture or backlog state.

The repository already contains adaptive outcome retrieval, learned direct-versus-council routing, durable JSON outcome storage, and Agent Session Analytics foundations. `docs/architecture/adaptive-execution.md` explicitly identifies recency/decay as the next increment. The requested device-sync API, performance analytics pilot, and A/B validation are separate follow-on subprojects and are not implemented by this design.

## Objective

Make adaptive outcome retrieval respond to evidence age and explicit operator feedback without weakening Munin's safety, review, local-first, or zero-cost policies.

## Scope

This increment will:

- apply deterministic exponential time decay to relevant adaptive outcomes;
- persist explicit operator feedback on an outcome;
- use feedback as a bounded multiplier in relevance ranking;
- expose the weighted relevance evidence used by learned routing;
- preserve existing outcome records and migrate them without data loss;
- provide a local API operation for submitting feedback;
- document the behavior and configuration constants.

## Non-goals

- No device-to-device synchronization or cryptographic protocol.
- No automatic workflow adjustment based on performance analytics.
- No A/B assignment, experiment dashboard, or engagement tracking.
- No learned override of risk, reviewer, cost, provider, external-action, or local-only policies.
- No LLM, vector database, paid API, background service, or new dependency.
- No automatic inference of operator satisfaction from clicks or task outcomes.

## Architecture

The existing adaptive execution module remains authoritative. Ranking is extended through a pure scoring function rather than a second prioritization engine.

`Outcome records -> lexical relevance -> time-decay multiplier -> feedback multiplier -> stable ranking -> learned routing`

The storage boundary gains a feedback mutation while preserving the current JSON file as the durable source. The API delegates to that boundary and never edits the file directly.

## Relevance model

### Lexical score

The existing matching behavior remains the base: terms of more than two characters from task capability and objective are matched against outcome capability, objective, tags, and lesson. Outcomes with zero lexical matches remain ineligible.

### Time decay

Decay uses a 30-day half-life:

`timeWeight = 0.5 ^ (ageDays / 30)`

Rules:

- `ageDays` is calculated from an injected `now` value for deterministic tests.
- Future timestamps are clamped to age zero and receive no extra weight.
- Invalid timestamps fail closed with weight zero.
- Records are not deleted because of age.
- The half-life is a named constant, not an environment variable, until empirical evidence justifies configuration.

### Feedback

An outcome may contain one current feedback record:

```ts
type OutcomeFeedbackRating = 'helpful' | 'neutral' | 'harmful';

interface OutcomeFeedback {
  rating: OutcomeFeedbackRating;
  reason?: string;
  createdAt: string;
}
```

The multipliers are deliberately bounded:

- `helpful`: `1.25`
- `neutral` or absent: `1.0`
- `harmful`: `0.25`

Submitting new feedback replaces the current feedback value for that outcome. This is an auditable correction, not an append-only opinion history; the surrounding runtime event log records the mutation event. Reasons are trimmed and capped at 500 characters. Unknown outcome IDs and invalid ratings fail without modifying state.

### Final score and ordering

`weightedScore = lexicalScore * timeWeight * feedbackMultiplier`

Candidates are ordered by descending weighted score, then descending creation time, then stable outcome ID. Retrieval remains capped at five records. Learned routing keeps its current threshold rules, but counts only outcomes returned by the weighted relevance query.

## Explainability

Relevant outcomes returned to the adaptive engine include transient relevance metadata rather than persisting derived scores:

```ts
interface OutcomeRelevance {
  lexicalScore: number;
  ageDays: number;
  timeWeight: number;
  feedbackMultiplier: number;
  weightedScore: number;
}
```

The execution result exposes this metadata alongside each prior outcome, and orchestration rationale summarizes when decay or harmful feedback prevented stale evidence from driving a learned route. No private feedback reason is copied into provider prompts or Git.

## Storage compatibility

`adaptive-outcomes.json` advances from schema version 1 to version 2. Loading version 1 treats every record as having no feedback, then writes version 2 on the next successful mutation. Existing outcome fields and the 500-record retention limit remain unchanged.

Writes continue through `writeJsonAtomic`. A feedback update must load, validate, replace one matching record, and atomically persist the complete bounded state. Failed validation performs no write.

## Local API

Add a local-only endpoint:

`POST /api/adaptive/outcomes/:outcomeId/feedback`

Request:

```json
{
  "rating": "helpful",
  "reason": "This prior result correctly predicted the required review route."
}
```

Response returns the sanitized updated outcome. The endpoint uses existing API authentication and request-size handling. It accepts only the three ratings, rejects missing or unknown outcome IDs, and does not initiate execution, external calls, or provider activity.

## Security and policy invariants

- Feedback cannot modify task risk, reviewer requirements, orchestration safety rules, provider preferences, `localOnly`, or `maxCostPerCall`.
- High-risk, strategy, and review tasks retain authoritative routing regardless of learned evidence.
- The feature runs deterministically without Ollama or an OpenAI API key.
- Feedback reasons containing credential-shaped or secret-bearing text are rejected before persistence; accepted reasons are stored exactly after whitespace trimming.
- API errors must not reveal runtime file paths or unrelated outcome contents.

## Testing strategy

Focused tests will prove:

1. a recent outcome outranks an otherwise identical old outcome;
2. 30 days produces a time weight of `0.5`;
3. future timestamps do not gain weight and invalid timestamps are excluded;
4. helpful, neutral, absent, and harmful feedback apply their exact bounded multipliers;
5. deterministic tie-breaking is stable;
6. version 1 state loads without data loss and is upgraded on mutation;
7. valid feedback persists and replacement is deterministic;
8. invalid rating, oversized reason, secret-bearing reason, and unknown outcome leave the store unchanged;
9. harmful or stale direct failures cannot force escalation when stronger current evidence ranks ahead;
10. high-risk and reviewer routing remains unchanged;
11. the API enforces authentication and validation and performs no external call;
12. the complete repository build and test suite passes.

## Acceptance criteria

- Existing callers continue to retrieve at most five relevant outcomes.
- Ranking is deterministic for an injected clock.
- A 30-day-old record has half the temporal influence of an otherwise identical current record.
- Operator feedback is durable, bounded, replaceable, and validated.
- The routing decision exposes enough score evidence to explain which prior outcomes influenced it.
- No safety or cost guardrail can be weakened through feedback.
- No new runtime dependency or paid service is introduced.
- Documentation, tests, and canonical backlog/current-state files describe the same delivered behavior.

## Follow-on sequence

After this increment is implemented and empirically observed:

1. build the Operator Performance Analytics pilot on the relevance metadata and existing agent analytics;
2. add an opt-in deterministic A/B assignment and engagement-measurement contract;
3. specify device synchronization and end-to-end encryption as an independent threat-modeled subsystem.
