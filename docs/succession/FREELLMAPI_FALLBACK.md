# FreeLLMAPI Zero-Cost Fallback

## Role in succession

FreeLLMAPI is an optional external inference gateway for non-sensitive, low/medium-risk Munin work when primary free conversational/agent quotas are unavailable or when a high-volume preprocessing task would waste stronger-model quota.

It is not Munin's orchestrator, memory system, or final authority.

```text
Munin Provider Policy
  ├─ deterministic local
  ├─ optional Ollama/local
  ├─ primary free operator cockpit
  └─ FreeLLMAPI zero-cost external pool
       └─ upstream free providers
```

## Integration boundary

Use the local OpenAI-compatible endpoint exposed by FreeLLMAPI (normally `http://localhost:3001/v1`) through Munin's existing provider seam.

Do not fork or vendor FreeLLMAPI into Munin. Keep it as a separately installed optional local service.

The Munin adapter should eventually expose one logical provider id such as:

`freellmapi-free-pool`

Munin decides whether a task may use external inference. FreeLLMAPI decides which configured free upstream endpoint can serve that request.

## Default policy

Allowed only when all are true:

- FreeLLMAPI is explicitly enabled;
- the local gateway passes health checks;
- estimated monetary cost is zero;
- the task is non-sensitive or has been sanitized;
- the task is not a consequential final decision;
- provider ToS/usage class is acceptable for the task;
- no paid fallback may be selected implicitly.

Good initial workloads:

- job-posting triage after deterministic filtering;
- news/repository summarization;
- candidate skill classification;
- draft generation;
- context compression;
- secondary code/research review;
- Moneyprinter ideation/variants without private source material.

Do not use as the sole authority for:

- regulatory conclusions;
- financial actions;
- security-policy changes;
- merges/deployments;
- sending email/messages;
- submitting job applications;
- publishing content;
- private personal data that is not required for the task.

## Provider allowlist

Do not enable every upstream provider automatically.

Maintain a local allowlist in gitignored runtime configuration with fields such as:

```json
{
  "version": 1,
  "providers": {
    "groq": { "enabled": false, "reviewedAt": null },
    "cerebras": { "enabled": false, "reviewedAt": null },
    "mistral": { "enabled": false, "reviewedAt": null },
    "openrouter": { "enabled": false, "reviewedAt": null }
  }
}
```

All entries default to disabled until credentials, current terms, privacy behavior and free-tier constraints are reviewed.

Do not commit upstream API keys or the FreeLLMAPI unified key.

## Quota and failure behavior

- Free-tier capacity is opportunistic, not guaranteed.
- Rate limits and provider availability may change.
- If all configured free routes fail, return a durable handoff; never activate a paid route automatically.
- Record served-model/fallback metadata when available for debugging and quality evaluation.
- Token Governor may observe usage, but must not treat listed free capacity as guaranteed future capacity.

## Promotion path

### Phase 0 — documentation
This succession pack only documents the boundary. No runtime routing changes.

### Phase 1 — local shadow benchmark
On the target Windows host:

1. install FreeLLMAPI from its official release;
2. bind it to localhost only;
3. configure a minimal reviewed provider set;
4. create no paid keys or billing;
5. benchmark representative tasks against current deterministic/Ollama/provider paths;
6. record latency, success/failure, output quality, served model and fallback behavior;
7. verify secrets remain outside Git.

### Phase 2 — Munin optional adapter
Only after Phase 1 passes:

- add a thin OpenAI-compatible `ExecutionProvider`;
- mark it `mode: external`, `estimatedCostPerCall: 0`;
- keep it disabled by default;
- require an explicit external-inference policy;
- exclude sensitive/high-risk workloads;
- add deterministic tests using a fake localhost server;
- do not make network calls in the test suite.

### Phase 3 — fallback promotion
Promote from shadow to fallback only when a representative observation window proves useful quality and reliability without weakening privacy, approvals or cost policy.

## Acceptance criteria

FreeLLMAPI is accepted as a Munin fallback only if:

1. Munin runs normally when FreeLLMAPI is absent.
2. No mandatory paid dependency is introduced.
3. The gateway is localhost-only unless a separately reviewed secure transport is introduced.
4. Secrets are stored outside Git.
5. An upstream outage does not block deterministic Munin workflows.
6. A free-tier exhaustion never causes an automatic paid request.
7. Private/high-risk requests are blocked or sanitized before external inference.
8. The exact served provider/model can be audited when the gateway exposes it.
