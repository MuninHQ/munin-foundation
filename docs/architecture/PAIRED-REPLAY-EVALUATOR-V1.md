# Munin paired replay evaluator v1 — 2026-10-13

**Scope:** A local, dependency-free evaluator inspired by Langfuse dataset experiments. This implementation only compares supplied redacted evidence-backed *outcome receipts*. It does not execute or modify Munin, install Langfuse or REA, send data to a cloud provider, infer AI token usage, or approve deployment.

Source pattern: [Langfuse Datasets](https://github.com/langfuse/langfuse-docs/blob/main/content/docs/evaluation/experiments/datasets.mdx). Related research: [Munin REA competitive audit PR #386](https://github.com/MuninHQ/munin-foundation/pull/386).

## Run on Windows (PowerShell) or other Node hosts

From the Munin repo after checking out the PR branch:

```powershell
node --test tests/munin-eval-compare.test.mjs
npm run eval:compare -- .\data\runtime\redacted-paired-replays.json
```

The input path above is a **local output example**, not a file included in the repository. Real receipts are not committed. Run the full `npm test` before merging or claiming Munin-level validation.

## Input shape

```json
{
  "schemaVersion": 1,
  "suite": "munin-career-regression-v1",
  "baseline": {
    "name": "main",
    "runs": [{
      "caseId": "career-01",
      "inputDigest": "<SHA256 of canonical, sanitized exact input>",
      "environmentId": "windows-local-config-v1",
      "claimedCompleted": true,
      "verifiedSuccess": true,
      "humanInterventions": 0,
      "securityViolations": 0,
      "durationMs": 1100,
      "evidenceRefs": ["local:receipt:career-01-main"]
    }]
  },
  "candidate": {
    "name": "feature-branch",
    "runs": [{
      "caseId": "career-01",
      "inputDigest": "<same digest as baseline>",
      "environmentId": "windows-local-config-v1",
      "claimedCompleted": true,
      "verifiedSuccess": true,
      "humanInterventions": 0,
      "securityViolations": 0,
      "durationMs": 950,
      "evidenceRefs": ["local:receipt:career-01-feature"]
    }]
  }
}
```

The example is intentionally partial; supply **at least ten matching cases** to receive an initial recommendation. IDs/digests/environments must match pairwise. Digest fields must contain exactly 64 hex characters, not the above placeholders. `evidenceRefs` must identify real, independently inspectable receipts; the comparator validates only their presence, not the artifacts themselves. A verified success must have independent QA evidence; a self-asserted agent status is not proof. Do not reuse a single fabricated digest across unrelated scenarios.

Optional `tokens`: `{"input": 0, "output": 0, "provenance": "reported"}` or `"estimated"`; optional `costUSD`: `{"value": 0, "provenance": "reported"}`. Full **reported** coverage is required before returning an aggregate reported total. Missing telemetry yields `null`, not zero.

## Evaluation policy

Status `regression`: any observed candidate security violation; decreased verified success; increased false-completion count; higher human-intervention count; median runtime more than 10% worse; or increased fully reported monetary cost.

Status `insufficient-evidence`: fewer than 10 matched scenarios (unless an actual regression is detected).

Status `candidate-improves`: at least ten matched scenarios, no regression, and improvement in verified success, false completion, human intervention, or at least 10% faster median execution.

Status `no-material-gain`: ten or more matched scenarios but no material gain.

All statuses are **advisory**. `automaticPromotionAllowed` is always false. The small sample threshold enables investigation, not statistical significance; review distribution, variance, external conditions and actual receipts before promotion. External services and job sites must only be exercised with permitted access, and consequential application submissions remain approval-gated. Redacted/synthetic scenario definitions live in `research/evals/career-scenarios-v1.json`. No customer, applicant or token data should be placed in Git.

## Verification status

Focused pure-JavaScript tests have been run in an isolated Node 22 environment. The connected Windows Munin machine was offline on 2026-10-13. Full Munin acceptance, real paired career executions, REA setup, and real-browser checks **have not run**. No real improvement has been measured yet.

REA is not required for source-visible Langfuse patterns: per [REA's skill guidance](https://www.skills.sh/morluto/rea/reverse-engineer-anything), ordinary complete source analysis should prefer normal repo tools. For a *specific binary-only and authorized investigation* later, follow [REA prerequisites](https://github.com/morluto/rea) and review every setup action first; Node 22.x requires at least 22.19. This PR does not run REA.
