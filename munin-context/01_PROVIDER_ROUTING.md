# Provider Routing

Munin should route by capability, evidence quality, privacy, cost, and required action—not brand loyalty.

## Suggested roles
### Research-first engines (e.g. Perplexity)
Best for current-web discovery, cited research, market/competitive scans, job discovery, papers, technology landscape, and GitHub discovery. Treat outputs as research inputs and verify consequential claims.

### General reasoning/workspace agents (e.g. ChatGPT-class systems)
Best for synthesis across project context, artifact creation, multimodal work, complex planning, tool orchestration, and workflows where connected apps/actions matter.

### Coding agents
Best for repository inspection, implementation, tests, diffs, and PR workflows. They must obey `/AGENTS.md` and repository validation gates.

### Local models / Ollama
Preferred where privacy, offline operation, predictable zero marginal cost, or simple deterministic work dominates. Do not silently remove this path.

## Routing heuristic
1. Can a deterministic/local path do it well? Prefer it.
2. Does the task require fresh external evidence? Use a research-capable provider.
3. Does it require repository mutation? Use an engineering-capable agent with validation.
4. Does it require connected-account action? Use only an explicitly authorized connector/provider.
5. For high-impact decisions, separate research from final synthesis and retain citations/evidence.

## Cost rule
Core Munin must remain useful when every paid cloud subscription is removed. Free promotional plans are opportunities, not architectural dependencies.

## Perplexity migration note
Perplexity can be a strong research brain and GitHub-aware research surface. It should initially augment rather than replace Munin's orchestration, local execution, durable memory, approval system, or provider abstraction. Evaluate replacement claims with repeatable A/B tasks rather than subjective impressions.
