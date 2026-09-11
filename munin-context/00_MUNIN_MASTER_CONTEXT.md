# Munin Portable Context — Master

## Purpose
This directory is the provider-neutral bootstrap context for any capable AI agent operating on Munin. It exists to reduce vendor lock-in: ChatGPT, Perplexity, Claude, Gemini, local models, coding agents, and future providers should be able to recover the project's operating model from the repository rather than from a proprietary chat history.

## Canonical principle
Munin itself is the durable system of record. Provider chat memory is convenience, never a dependency.

## Mission
Build a local-first personal intelligence and operations system that can research, remember, reason, orchestrate tools/models, and assist with real work while preserving safety, auditability, portability, and zero mandatory inference cost.

## Bootstrap order
1. Read `/AGENTS.md`.
2. Read this file and the remaining files in `/munin-context/`.
3. Inspect current repository implementation before proposing changes.
4. Run the repository Second Brain PRE-TASK recall when execution access exists.
5. Perform the smallest coherent evidence-bound change.
6. Validate and run the POST-TASK memory commit when execution access exists.

## Provider-neutral rules
- Never assume the current AI provider is permanent.
- Prefer open/documented formats and repository-held context.
- Do not make core functionality depend on a paid subscription or API.
- Use the best available model/tool for a task through optional adapters.
- Research engines are sources of evidence, not canonical memory.
- Never place credentials, tokens, private raw messages, or sensitive personal data in this context pack.

## BUILD ALL meaning
When explicitly authorized to BUILD ALL, proceed autonomously through all safe, reversible, in-scope work that can be completed with available tools. Do not stop merely to ask permission for ordinary reversible steps. Stop at genuine human boundaries: credentials, irreversible/high-impact actions, unavailable device access, or materially ambiguous product decisions. If one workstream is blocked, continue independent safe workstreams.

BUILD ALL never overrides safety, approval gates, evidence requirements, repository hygiene, or the completion gate in `/AGENTS.md`.

## Portability objective
A new provider should be able to answer: what Munin is, how it operates, what constraints are non-negotiable, what is currently being worked on, and how to continue safely—without requiring access to historical ChatGPT conversations.
