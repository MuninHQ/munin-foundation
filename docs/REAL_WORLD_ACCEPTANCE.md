# Munin Real-World Acceptance

> Canonical empirical acceptance runbook for Munin after Recovery + Continuity Hardening.
>
> This document does not mark device-dependent behavior as complete. It defines how to prove it on the real Windows host and iPhone without inventing success from repository-only checks.

## Objective

Prove that the current Munin `main` works end to end in the environments that repository tests cannot fully simulate, with primary focus on:

`iPhone → LinkedIn vacancy URL/screenshot → Career intake → normalized/deduplicated record → Career/Action Inbox`

Secondary focus:

`Windows host → normal startup → Web ChatGPT Cockpit handoff → browser verification`

## Starting baseline

Before beginning acceptance, require:

- local workspace: `D:\Dev\munin-foundation-git`;
- branch: `main`;
- working tree clean;
- `HEAD == origin/main`;
- current repository build/tests green;
- no new mandatory paid provider, inference API or local-model dependency;
- screenshots, tokens and private transient data must not be committed to Git.

If the baseline changed since the latest validated SITREP, rerun the relevant deterministic gates before performing device acceptance.

## Acceptance rules

1. Evidence over assumption: do not mark a step passed unless it was exercised in the target environment.
2. A device, OAuth, credential, 2FA or public-publication action is a human boundary; prepare everything else first.
3. Do not create new code merely because an acceptance step has not yet been attempted.
4. If a step fails, reproduce and classify it before editing code: product defect, stale runtime state, environment/configuration, network/Tailscale, permission/authentication, or external-service issue.
5. Only fix code when the failure is reproducible and attributable to Munin.
6. Preserve the zero-mandatory-cost and provider-portability constraints in `AGENTS.md`.
7. Evidence containing private data should remain local/redacted. Record only sanitized outcomes in repository documentation.

# Phase A — Prepare the Windows host

## A1. Reconcile repository

Confirm:

```powershell
git fetch origin
git status
git rev-parse HEAD
git rev-parse origin/main
```

Pass when:

- branch is `main`;
- working tree is clean before acceptance changes;
- `HEAD` and `origin/main` agree, unless an intentional tested local acceptance-fix commit is being prepared.

## A2. Deterministic health

Use the repository's current operator/build/doctor commands rather than inventing replacements. Confirm at minimum:

- application builds;
- required deterministic services are healthy;
- browser operator/Playwright health is ready when the installed optional browser backend is expected;
- no mandatory blocker is reported.

Historical terminal jobs may remain visible as historical evidence. Do not classify them as a present failure without a current reproduction.

## A3. Default-runtime provider boundary

Start Munin through the normal current operator path and verify on the real host that normal startup does **not** implicitly:

- probe/start/wait for Ollama;
- require an OpenAI API key;
- activate a paid provider;
- block core deterministic flows on an inference provider.

Pass when normal deterministic operation starts without those dependencies.

# Phase B — Web ChatGPT Cockpit acceptance

On the target Windows host and actual browser session:

1. Open Munin through the normal Web operator entrypoint.
2. Exercise the ChatGPT Cockpit/Operator Bridge once.
3. Inspect the handoff before/while it opens ChatGPT.
4. Confirm the payload is bounded and sanitized.
5. Confirm it contains no Munin mobile token, OAuth credential, API key or raw secret store.
6. Confirm ChatGPT is treated as the interactive intelligence cockpit while Munin remains the durable state/execution source.

Pass when a real browser-session handoff succeeds with sanitized context and no credential leakage.

# Phase C — iPhone Mobile ChatGPT Cockpit acceptance

On the target iPhone using the real Munin mobile entrypoint:

1. Reach Munin over the intended local/Tailscale path.
2. Open the Mobile ChatGPT Cockpit/Operator Bridge.
3. Exercise one handoff using the existing ChatGPT app/browser session.
4. Inspect the handoff content sufficiently to verify it contains only the expected sanitized Munin snapshot.
5. Confirm no mobile token, OAuth credential, API key or private secret store is included.
6. Confirm navigation remains usable after returning to Munin.

Pass when the mobile handoff works on-device without credential leakage or a broken return path.

# Phase D — Career Shortcut end-to-end acceptance

This is the primary real-world acceptance path.

## D1. Install/configure the existing Shortcut contract

Use the currently documented/stable iOS Share Sheet/Shortcut contract for **Enviar vaga ao Munin**. Do not invent a parallel endpoint or duplicate Career intake path.

The human may be required to install/import the Shortcut and grant the minimum required iOS permissions.

Before the first real submission, verify the destination points to the currently running Munin mobile/API host and uses the existing supported authentication mechanism without exposing secrets in screenshots or Git.

## D2. Real vacancy input

Using a real LinkedIn vacancy:

1. obtain/share the vacancy URL;
2. include a screenshot only where the current Shortcut/intake contract calls for one;
3. invoke **Enviar vaga ao Munin** from the iPhone Share Sheet/Shortcut;
4. allow the existing Career intake pipeline to process the payload;
5. do not manually create a duplicate record to force success.

## D3. Pipeline verification

Verify the real submission traverses the existing Career pipeline and results in the expected durable state. Evidence should establish, as applicable to the current implementation:

- intake accepted;
- source URL retained/normalized as intended;
- screenshot/vision data treated as transient according to policy;
- no unwanted screenshot copy persisted by Munin when the contract says it should remain transient;
- normalization completed;
- deduplication behavior is correct;
- Career record/intelligence is created or updated through the existing path;
- resulting actionable signal is visible in the intended Career/Action Inbox surface;
- no secret/private transient image is committed to Git.

Repeat the same vacancy once only if needed to prove deduplication. A correct dedupe result must not create a second independent opportunity merely because the Shortcut was triggered twice.

## D4. Failure handling

If submission fails, capture sanitized evidence and classify before changing code:

- iOS Shortcut configuration/permission;
- Tailscale/network/reachability;
- mobile authentication;
- request/payload contract;
- transient screenshot processing;
- Career normalization/deduplication;
- Action Inbox projection;
- UI-only visibility issue.

Fix only reproducible Munin defects, then rerun the narrow failed path and the relevant deterministic tests.

# Phase E — Mailbox boundary

`Email Intelligence needs a mailbox connection` is not a code defect by itself.

Only proceed when the human chooses to connect/authorize a mailbox. Preserve the existing OAuth/security rules and never place credentials in Git or agent handoffs.

After authorization, verify the currently supported read-only email intelligence flow rather than expanding scope during acceptance.

# Phase F — Explicitly non-critical / deferred

The following are outside the critical path for this milestone unless a separate objective promotes them:

- MiniMax H3 installation/license acceptance/benchmark;
- exact master brand asset provisioning;
- public LinkedIn publication;
- paid provider activation;
- new agent/model runtime adoption.

Do not block Career/iPhone/Windows acceptance on these items.

# Evidence record

For each attempted phase, record only sanitized evidence in `ops/SESSION_LOG.md` or the current canonical operational record:

- date/time;
- commit tested;
- target environment/device class;
- step attempted;
- pass/fail;
- sanitized failure class/root cause if applicable;
- code/test commit produced if a real defect was fixed;
- remaining human boundary.

Do not commit screenshots containing private vacancy/user data solely as acceptance proof.

# Completion criteria

The Real-World Acceptance milestone is complete when all critical items below are empirically passed:

- [ ] Windows host normal startup works without mandatory Ollama/OpenAI API/paid-provider dependency.
- [ ] Web ChatGPT Cockpit real-browser handoff succeeds and is sanitized.
- [ ] iPhone Mobile ChatGPT Cockpit handoff succeeds and is sanitized.
- [ ] **Enviar vaga ao Munin** is installed/configured on the target iPhone.
- [ ] A real LinkedIn vacancy URL/screenshot is accepted through the Shortcut.
- [ ] Career intake/normalization/deduplication behaves correctly for that real submission.
- [ ] Expected Career/Action Inbox state appears through the existing product path.
- [ ] No unwanted transient screenshot or secret is persisted/committed.
- [ ] Any reproducible Munin defect discovered during acceptance is fixed, tested and verified on the affected real path.

Mailbox connection, MiniMax H3, exact brand assets and public LinkedIn publication are not required to close this milestone unless explicitly promoted into scope.

# Agent execution contract

An engineering agent should execute every safe machine-side step autonomously and stop only at a genuine human/device boundary. At that boundary, provide the human with the **single next concrete action** required, then use the returned evidence to continue the same acceptance run.

Do not replace empirical device validation with a claim based only on unit tests, repository inspection or simulated requests.
