# Token Governor — Shadow Mode

Munin's Token Governor observes context volume and produces conservative model-tier and reasoning-effort recommendations. It does not apply those recommendations.

## Operator command

```powershell
npm run token-governor:status
```

The JSON report exposes:

- the number of observations and oversized outputs;
- heuristic original, retained, and avoidable context-token estimates;
- the estimated savings ratio;
- recommendation counts by `economy|premium` and `low|medium|high`;
- `appliedChanges`, which must remain `0` in shadow mode.

`estimatedSavedTokens` means potential context reduction under Munin's deterministic summary. It is not a provider tokenizer measurement and must not be presented as realized billing savings.

## Compression behavior

Outputs below the configured threshold remain unchanged. Large outputs retain a bounded prefix, diagnostic lines, a bounded suffix, and an omission marker. Diagnostics include errors, failures, warnings, stack/trace markers, test summaries, durations, diffs, and exit statuses. The full provider result remains the input to existing review and durable task state; the summary is observation metadata only.

The heuristic token estimate is `ceil(Unicode code points / 4)`. It is intentionally dependency-free and provider-neutral.

## Safety and privacy

- The Provider Registry remains the sole routing authority.
- Recommendations always record `applied: false`.
- Governor/store failure cannot fail the governed task.
- Secret-shaped strings are redacted before JSONL or orchestration-trace persistence.
- Candidate-skill text is inert data. The Governor has no skill discovery, loading, execution, or promotion API.
- No paid service, external tokenizer, WSL runtime, or new package is required.

## Configuration

Programmatic callers may tune `largeOutputChars`, `maxSummaryChars`, `prefixChars`, and `suffixChars`. Invalid values fall back to bounded defaults. There is no configuration that enables automatic routing, model switching, reasoning-effort switching, or skill promotion.

## Promotion gate

Promotion from shadow mode requires:

1. A representative window of real tool and terminal observations.
2. Material estimated savings without secret leakage.
3. Human review confirming failure and terminal-status evidence survives summaries.
4. No regression in task quality, completion, provider policy, or safety gates.
5. Provider-specific tokenizer calibration before billing-grade claims.
6. Explicit approval defining which downstream consumers may use compressed context.
7. Separate explicit approval for any automatic model/effort routing.
8. Continued human review through the Skill Promotion Gate for every candidate skill.

Until all gates pass, Munin reports recommendations and estimated opportunity only.
