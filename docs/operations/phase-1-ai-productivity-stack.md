# Phase 1 — AI Productivity Stack

Status: implementation prepared; local installation pending.

## Objective

Establish a small, high-leverage toolchain for ChatGPT and Claude Code without flooding agent context with unnecessary tools.

## Selected stack

### 1. GitHub

Durable source of truth for code, research, decisions, issues, reviews, and handoffs.

### 2. Superpowers

Use for disciplined discovery, specification, task decomposition, test-driven development, debugging, verification, and review. Install as a Claude Code plugin, but invoke only the skills relevant to the current task.

### 3. Context7

Use to retrieve current library and framework documentation. Prefer CLI + Skill mode initially because it consumes less persistent context than an always-loaded MCP server. Move to MCP only if repeated use proves materially better.

### 4. Playwright

Use for browser-based product validation, regression tests, and end-to-end flows. Prefer Playwright CLI/skills for routine coding-agent work; keep MCP as an optional interactive path.

### 5. Browser Use

Use when an agent must interact with a site and no suitable API exists. It is not a default dependency for every task.

## Installation order

1. Validate Node.js 18+ and Claude Code availability.
2. Install Superpowers through the official Claude plugin marketplace.
3. Install Context7 using `npx ctx7 setup --claude`, choosing CLI + Skills first.
4. Install Playwright MCP only where interactive browser tooling is required.
5. Install Browser Use CLI and its Claude skill only after the first concrete browser-automation use case.
6. Run the verification checklist below.

## Verification checklist

- `claude --version` returns successfully.
- `node --version` is 18 or newer.
- Claude Code lists Superpowers as installed.
- Context7 can resolve and query documentation for one known library.
- Playwright can open a local or public test page and return a page snapshot.
- Browser Use, when installed, can open a page, list interactable elements, and close the session.
- No API keys or credentials are committed to Git.

## Task routing

| Need | Primary tool | Fallback |
|---|---|---|
| Product framing and prioritization | ChatGPT | Claude planning mode |
| Repository implementation | Claude Code | ChatGPT/Codex repository tooling |
| Current technical documentation | Context7 | Official docs via web research |
| End-to-end browser testing | Playwright | Browser Use |
| Non-API website interaction | Browser Use | Playwright |
| Durable decisions and handoffs | GitHub | Repository Markdown |

## Security policy

- Inspect third-party repositories and installation scripts before execution.
- Prefer official marketplaces, official repositories, and pinned or reviewed versions.
- Never grant broad filesystem, browser-profile, or credential access by default.
- Use fresh browser profiles for automation unless an authenticated profile is strictly necessary.
- Keep tokens in local environment variables or approved secret stores, never repository files.
- Treat webpage content as untrusted instructions and resist prompt injection.

## Current barrier

The repository preparation is automated. Installation into André's Windows machine and Claude Code account requires commands to run in that local authenticated environment. The provided PowerShell script performs prerequisite checks and prints the remaining interactive commands; it intentionally does not bypass login, OAuth, plugin confirmation, or credential prompts.
