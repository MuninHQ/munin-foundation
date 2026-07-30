# Governed Cycle Runner

`run-governed-cycle.ps1` starts one non-interactive, read-only Claude Code planning cycle from the repository root.

## Purpose

The runner packages the validated operating model into one command:

1. inspect evidence;
2. create a scoped plan;
3. delegate independent governor review;
4. revise findings;
5. repeat up to the configured limit;
6. return either an execution-ready plan or explicit blockers.

It does not authorize repository writes or protected actions.

## Usage

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-governed-cycle.ps1 `
  -Objective "Prepare an execution-ready plan to resolve repository health findings" `
  -MaxReviews 3
```

## Artifacts

Each run writes local, ignored evidence under:

```text
.munin-runs/<timestamp>/
├── prompt.txt
└── result.json
```

## Safety model

The runner starts Claude Code in `plan` permission mode by default and explicitly prohibits:

- file modifications;
- branch, tag, or settings changes;
- CI and GitHub mutations;
- credential changes;
- merge, deploy, publish, deletion, or spending.

A later execution runner must be a separate script with narrower scope, branch-only writes, explicit validation, and protected-action gates.

## Prerequisites

- Claude Code available on `PATH`;
- Munin Workspace agents and skills installed with `install-munin-workspace.ps1`;
- authenticated Claude Code session;
- execution from a Git repository.

## Acceptance check

A successful dry run must:

- produce both artifact files;
- exit with code zero;
- contain a governor verdict;
- contain three approval buckets;
- contain validation commands and acceptance criteria;
- leave `git status --short` unchanged.