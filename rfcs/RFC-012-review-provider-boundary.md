# RFC-012 — Review and Provider Boundary

## Status

Accepted for M9.2 implementation.

## Context

M9.1 introduced persistent execution plans, dependency-aware tasks, agent routing and telemetry. The executor still produced results internally, which would make a future external model integration tightly coupled to the runtime.

## Decision

Munin defines a provider-neutral execution contract and a deterministic review gate.

### Provider contract

A provider receives a structured request containing the task, objective, capability, expected output and dependency context. It returns:

- output;
- provider identifier;
- optional model identifier;
- provider metadata.

The runtime depends only on this interface. The default implementation remains local and deterministic.

### Review gate

Every provider result is reviewed before a task can become `DONE`. The initial gate evaluates:

- presence of output;
- minimum useful detail;
- alignment with the expected deliverable.

Review results are persisted with a score, acceptance decision and criterion-level explanations. A rejected output marks the task as `FAILED`; dependent tasks become `BLOCKED`.

### Provenance and telemetry

Tasks retain provider identity and metadata. Runtime telemetry reports:

- work by provider;
- average review score;
- quality-gate rejections.

## Safety properties

- No provider receives credentials through this contract.
- No provider receives permission to perform external side effects.
- Provider outputs cannot bypass the quality gate.
- The default provider remains deterministic and offline.
- Review decisions are inspectable and reproducible.

## Non-goals

M9.2 does not:

- call OpenAI, Anthropic or another hosted model;
- manage secrets;
- implement retries or provider fallback;
- allow providers to modify repositories, send messages or publish content;
- claim semantic truth validation.

## Consequences

Future provider adapters can be introduced without changing scheduling, planning or persistence contracts. Quality controls can evolve independently from providers while retaining an auditable execution record.
