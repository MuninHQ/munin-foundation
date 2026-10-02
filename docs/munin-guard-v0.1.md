# Munin Guard v0.1

**Governance gate for AI agents, skills, MCP servers, plugins and automations.**

Munin Guard turns the governance controls already used inside Munin into a product-shaped, read-only CLI. It evaluates a declared capability before adoption and returns one of three decisions:

- **PASS** — current evidence clears the capability, security and promotion gates.
- **REVIEW** — evidence is incomplete or a policy threshold requires human review.
- **BLOCK** — a blocking security or cost-policy condition is present.

Munin Guard v0.1 does **not** execute the target, install packages, mutate external systems or auto-promote a capability.

## What it checks

The first release combines existing Munin controls for:

- immutable source pinning;
- license evidence;
- risky command and secret-access patterns;
- broad permissions and wildcard network access;
- recurring or metered cost;
- maintenance confidence;
- capability duplication;
- minimum evidence for promotion.

## Quick demo

```bash
npm run guard -- examples/munin-guard/safe-agent.json
npm run guard -- examples/munin-guard/risky-agent.json
npm run guard -- examples/munin-guard/safe-agent.json --json
```

The CLI exit codes are intentional for CI/CD use:

- `0`: PASS
- `2`: REVIEW
- `3`: BLOCK
- `1`: invalid input or runtime error

## Manifest

```json
{
  "id": "vendor:agent-name",
  "name": "Agent Name",
  "kind": "agent",
  "source": "https://github.com/vendor/agent",
  "pinnedRevision": "full-commit-or-immutable-release",
  "license": "MIT",
  "networkDomains": ["api.example.com"],
  "permissions": ["read project files"],
  "maintenanceScore": 0.9,
  "duplicationScore": 0.1,
  "evidence": [
    "source reviewed",
    "license verified",
    "revision pinned",
    "bounded permissions"
  ]
}
```

Supported `kind` values: `skill`, `mcp`, `agent`, `plugin`, `automation`, `repository`.

## Product boundary

v0.1 is deliberately a **governance gate**, not a malware scanner and not a guarantee that third-party code is safe. It scores declared evidence using Munin's existing policy controls. Future versions can add artifact fetching, dependency/SBOM analysis, organization policies, signed audit history and CI integrations without weakening the current fail-closed boundary.

## Why this is separate from Munin

Munin remains the broader personal/agent operating system. Guard is the first extractable surface: small enough to explain, demo and eventually publish independently, while still using the governance primitives proven inside Munin.
