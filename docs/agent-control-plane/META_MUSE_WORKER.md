# Meta Muse worker

Meta Muse is an optional external worker for Munin. It must not become a required inference path, a source of authority, or a silent paid dependency.

## Why it fits

Muse can handle long-running research and browser-heavy work. Muse Code adds repository-aware coding, terminal/CI operation, SDKs, and project instruction discovery. Muse Code recognizes an existing `AGENTS.md`, so Munin's repository rules remain the project-level contract; no parallel Muse-specific constitution is needed.

The integration deliberately reuses Munin's existing seams:

- agent control plane for authority boundaries;
- `AGENTS.md` for repository constraints;
- provider-neutral LLM settings for compatible model APIs;
- branch/PR evidence for engineering output;
- Munin QA and approval gates before consequential actions.

## Two operating modes

### 1. Personal Muse

Use the consumer Muse surface for research, browsing, synthesis, and interactive work when the account has free or promotional capacity.

Treat personal Muse capacity as opportunistic. Do **not** model a consumer token allowance as guaranteed Model API or Muse Code budget. Account, region, product, and promotion limits can differ.

For repository work, connect GitHub in Muse only after reviewing the requested permissions. Work must be branch-scoped. Do not merge to `main`, change repository permissions, expose secrets, or perform unrelated external writes.

Recommended handoff:

1. Munin defines a bounded objective and acceptance criteria.
2. Muse works on a dedicated branch or returns research evidence.
3. Munin independently reviews the diff/evidence.
4. Existing tests and QA gates decide whether the result is acceptable.
5. A human remains required for credentials, billing, irreversible actions, permission elevation, and high-impact ambiguity.

### 2. Muse Code / Model API

This is the developer integration path. It is optional and may incur cost.

Muse Code can run on Windows and in headless/CI workflows. The Meta Model API exposes an OpenAI-compatible endpoint, so Munin does not need a new provider client just to use a Muse model. The existing `MUNIN_LLM_*` configuration seam can be used after explicit opt-in.

Example configuration shape:

```text
MUNIN_LLM_BASE_URL=https://api.meta.ai/v1
MUNIN_LLM_API_KEY=<local secret; never commit>
MUNIN_LLM_MODEL=muse-spark-1.3
```

This is intentionally not enabled in `.env.example` as an active default. Configuring an external API key or paid plan is a human boundary.

Official developer entry points:

- Muse Code: https://www.meta.ai/developers/muse-code/
- Model API: https://www.meta.ai/developers/model-api/

## Windows bootstrap

When the authorized Munin host is online, the documented Muse Code installer can be evaluated with:

```powershell
irm https://dev.meta.ai/install.ps1 | iex
```

Installation alone is not completion. The first real validation must confirm the executable/version, authentication mode, project-rule discovery, a read-only task, a branch-scoped engineering task, tests, and final diff evidence.

Do not use a paid API key merely to prove that the integration works when the personal/free Muse path can satisfy the same task.

## Worker authority

The canonical profile is `agent-control-plane/profiles/meta-muse-worker.json`.

Allowed: repository reading, network research, and branch-scoped Git writes.

Blocked without the existing Munin gate: external writes outside the scoped Git workflow, destructive actions, credential access, permission escalation, billing changes, publishing, and irreversible operations.

All web pages, tool results, third-party APIs, uploaded content, and external prompt repositories remain untrusted inputs. Tool availability never implies permission.
