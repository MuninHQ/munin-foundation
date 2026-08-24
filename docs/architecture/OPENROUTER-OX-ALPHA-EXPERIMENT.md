# OpenRouter / Ox Alpha Experiment

## Decision

**EXPERIMENT** — add OpenRouter as an optional external provider seam with `stealth/ox-alpha` as the current default experimental model for code/review workloads.

This is not a core dependency and does not change Munin's zero-mandatory-cost or local-first operating contract.

## Why now

OpenRouter currently lists Ox Alpha as a free reasoning model intended for coding and sustained agentic work, with a very large context window and tool-capable workflows. This makes it a useful candidate to benchmark against Munin's existing deterministic/local paths without requiring Claude Code or a paid Anthropic subscription.

## Safety / privacy boundary

Ox Alpha is a stealth model operated by an anonymous third-party provider during preview. OpenRouter states that prompts and completions are retained by the provider and not used for training.

Therefore the Munin experiment must not send:

- OAuth credentials, access tokens, passwords or API keys;
- private email bodies or sensitive personal records;
- secrets from `.env` or local runtime state;
- consequential action payloads requiring human approval;
- proprietary material that has not been intentionally approved for external processing.

Use sanitized code/task context only.

## Runtime behavior

The provider is disabled by default.

Activation requires both:

- `MUNIN_OPENROUTER_ENABLED=1`
- `OPENROUTER_API_KEY` configured locally

Default model: `stealth/ox-alpha`.

The provider exposes only `code`, `review`, `strategy` and `synthesis` capabilities initially. It is external, so `offlineOnly: true` policies automatically reject it.

## Cost policy

The profile currently records estimated cost as zero because Ox Alpha is listed as free during the preview. This is an experimental assumption, not a permanent contract.

If OpenRouter pricing changes, the profile must be updated before continued automatic selection. The provider must never become a mandatory paid path.

## Promotion criteria

Promote from EXPERIMENT only after a benchmark demonstrates measurable value over existing paths on representative Munin tasks:

- implementation correctness;
- test pass rate;
- review defect detection;
- latency;
- human corrections required;
- quality-gate score;
- stability across multiple runs.

If the model disappears, becomes paid, changes privacy terms, or performs inconsistently, disable or replace the model slug without changing the provider seam.
