# Munin Technical Blueprint

- **Version:** 0.1
- **Status:** Draft
- **Program:** Project Atlas
- **Date:** 2026-07-13
- **Scope:** North-star architecture and MVP boundaries
- **Audience:** Founders, product, research, engineering, security

## 1. Purpose

This document defines the initial technical direction for Munin without pretending that all architectural questions have already been answered.

Its purpose is to:

- preserve the long-term vision;
- constrain the first implementation;
- distinguish decisions from hypotheses;
- prevent accidental provider lock-in;
- establish privacy and explainability as architectural properties;
- create a technical foundation that can evolve without premature complexity.

Munin is not being designed as a chatbot with persistent notes. It is being investigated as a continuity layer centered on a user-controlled representation of relevant human context.

## 2. Architectural thesis

The core system is organized around five concepts:

1. **Events** describe authorized occurrences.
2. **Evidence** records what supports a claim.
3. **Human State** represents current, time-aware assertions.
4. **State transitions** explain what changed and why.
5. **Reasoning providers** consume scoped context but do not own the state.

The language model is a replaceable reasoning component. The durable asset is the user's portable and inspectable state.

## 3. Product boundary

### Munin should do

- receive authorized user input and external events;
- preserve source, time, confidence, and consent scope;
- propose state changes;
- request confirmation when needed;
- expose conflicts and uncertainty;
- support correction, export, and deletion;
- generate scoped context for reasoning;
- explain which evidence influenced an update or recommendation.

### Munin should not do

- silently turn weak inference into fact;
- ingest an entire digital life before demonstrating value;
- make irreversible actions without explicit authorization;
- depend on one LLM vendor;
- treat embeddings as the source of truth;
- use a graph database merely because the product has relationships;
- introduce distributed architecture before a measured need exists.

## 4. North-star architecture

```text
Interfaces
Web · Desktop · Mobile · Voice · API
                │
                ▼
Application Layer
Commands · Queries · Consent · Authentication
                │
                ▼
Reasoning Orchestrator
Context Builder · Provider Router · Policy Checks
                │
                ▼
Life State Engine
Event Intake · Evidence · Transition Proposals · Reconciliation
                │
        ┌───────┴────────┐
        ▼                ▼
State Store          Event Log
Current assertions   Immutable history
        │                │
        └───────┬────────┘
                ▼
PostgreSQL
Relational data · JSONB · audit · optional vectors
                │
                ▼
Adapters
Calendar · Email · Files · Browser · Future services
```

## 5. Bounded contexts

### 5.1 Identity and access

Responsibilities:

- users;
- sessions;
- devices;
- authorization;
- organization boundaries;
- encryption metadata;
- consent policies.

### 5.2 Event intake

Responsibilities:

- accept events;
- normalize source metadata;
- reject malformed or unauthorized events;
- deduplicate;
- classify sensitivity;
- create an ingestion audit record.

### 5.3 Evidence

Evidence is distinct from state.

Example:

- Evidence: “The user said on 2026-07-13 that they are looking for a job.”
- State assertion: `career.status = job_search`
- Confidence: high
- Source: direct user statement
- Validity: current until contradicted, expired, or corrected.

### 5.4 Human State

Human State is a set of assertions, not a monolithic profile.

Each assertion should minimally include:

```text
id
user_id
namespace
subject
predicate
value
status
confidence
source_type
source_id
valid_from
valid_until
sensitivity
consent_scope
created_at
updated_at
```

Candidate statuses:

- proposed;
- confirmed;
- inferred;
- disputed;
- expired;
- deleted.

### 5.5 Life State Engine

The LSE is responsible for:

- deriving candidate changes from authorized evidence;
- checking conflicts;
- checking sensitivity;
- requesting confirmation when policy requires it;
- committing transitions;
- recalculating dependent views;
- writing an explanation and audit record.

The LSE is not an LLM. It may use an LLM to extract or classify information, but state changes remain governed by explicit application rules and policies.

### 5.6 Context builder

The context builder creates the smallest sufficient context package for a task.

It must:

- respect consent and sensitivity;
- avoid whole-profile injection by default;
- rank relevance;
- include source and confidence metadata when useful;
- distinguish facts from inference;
- record what was supplied to the reasoning provider.

### 5.7 Reasoning abstraction

Application code calls a provider-neutral interface such as:

```ts
interface ReasoningProvider {
  generate(request: ReasoningRequest): Promise<ReasoningResult>;
}
```

Provider adapters may support Claude, OpenAI, Gemini, or local models.

Provider-specific prompts, headers, rate limits, and response formats remain inside adapters.

### 5.8 Council

Council is a reasoning strategy, not a collection of autonomous personalities.

For complex decisions, the orchestrator may request scoped analyses from several perspectives, such as:

- career;
- finance;
- family;
- health;
- risk;
- learning.

A synthesis step combines them into one recommendation. The system must avoid presenting simulated debate as independent truth.

### 5.9 Action layer

Actions are separate from reasoning.

Every action has:

- required permissions;
- reversibility;
- risk class;
- confirmation policy;
- execution result;
- audit record.

Initial MVP actions should be internal and reversible, such as creating a proposed next action or updating a project state.

## 6. Data strategy

### 6.1 Initial database

**Proposed:** PostgreSQL as the system of record.

Rationale:

- mature relational constraints;
- transactions;
- audit-friendly structure;
- JSONB for evolving payloads;
- strong indexing and query capabilities;
- ability to add vector search without introducing a separate database immediately.

### 6.2 Event log

The first version should use an append-only event table plus transactional state updates.

This is deliberately lighter than full event sourcing.

Full event sourcing should only be adopted if replay, temporal reconstruction, or independent projections become essential and the team is prepared for the operational complexity.

### 6.3 Vectors

Embeddings are optional retrieval indexes.

They must not be treated as authoritative memory.

The source record, permissions, timestamps, and deletion semantics remain in PostgreSQL.

### 6.4 Graphs

Relationships are initially represented relationally.

A dedicated graph database is deferred until benchmarks show that the product requires graph traversal patterns that PostgreSQL cannot serve acceptably.

## 7. Proposed implementation stack

### Core language

**TypeScript**

Reason:

- shared language across backend, web, tooling, and schemas;
- strong ecosystem;
- easier early-stage team mobility.

### Backend

**NestJS**, initially as a modular monolith.

Reason:

- explicit module boundaries;
- dependency injection;
- testable service structure;
- suitable organization for a domain-heavy backend.

### Web interface

**Next.js App Router**

Use for the first internal web console and later product surfaces.

### Desktop

**Deferred.** Tauri is the leading candidate once a desktop shell is justified.

Do not build desktop before the core workflow demonstrates recurring value.

### Mobile

**Deferred.** React Native remains a candidate, but mobile architecture is not part of the first LSE validation.

### Database

**PostgreSQL**

### ORM

**Prisma proposed, not locked.**

Before implementation, run a short spike covering:

- transactions;
- JSONB;
- migrations;
- raw SQL escape hatches;
- vector extension interoperability;
- test database setup.

### Package management and monorepo

Proposed:

- `pnpm`;
- workspace-based monorepo;
- Turborepo only if task orchestration becomes useful.

Avoid adding monorepo tooling before at least two executable applications or packages need it.

### Workflow engine

**Temporal deferred.**

It becomes relevant for durable, long-running, retryable workflows. It is not necessary for the initial LSE.

### Containers

Docker Compose for local PostgreSQL and repeatable development dependencies.

The application itself may run directly on the developer machine during the first iteration.

## 8. Modular monolith first

The first production-shaped implementation should be a modular monolith.

Candidate modules:

```text
auth
users
consent
events
evidence
state
transitions
context
reasoning
projects
audit
adapters
```

This supports clear boundaries without the cost of microservices.

Extraction criteria for a future service:

- independent scaling requirement;
- separate security boundary;
- different availability profile;
- independent release cadence;
- proven organizational ownership.

## 9. Command and event flow

Example input:

> “I completed my interview with the director today.”

Flow:

1. Interface sends `RecordUserStatement`.
2. Event intake stores raw authorized input.
3. Extraction proposes `InterviewCompleted`.
4. Evidence record links the event to the original statement.
5. LSE proposes updates:
   - interview status;
   - project progress;
   - timeline entry;
   - suggested follow-up.
6. Policy checks decide which changes need confirmation.
7. Confirmed changes are committed atomically.
8. An explanation is produced:
   - what changed;
   - why;
   - source;
   - confidence.
9. A response is generated from the updated, scoped state.

## 10. API style

Initial API:

- REST for commands and standard queries;
- Server-Sent Events or WebSocket only when live updates are required;
- OpenAPI generated from the backend;
- idempotency keys for event ingestion and actions.

Example resources:

```text
POST /events
GET  /state/assertions
POST /state/proposals/:id/confirm
POST /state/proposals/:id/reject
GET  /state/history
POST /reason
GET  /audit
```

## 11. Security and privacy invariants

1. A person's state belongs to that person.
2. Every retained assertion has a source.
3. Sensitive data requires an explicit purpose and consent scope.
4. The user can inspect, correct, export, and delete data.
5. Reasoning providers receive only task-relevant context.
6. Provider requests and state transitions are auditable.
7. Secrets are never stored in source control.
8. High-risk and irreversible actions require confirmation.
9. Data deletion includes derived indexes and embeddings.
10. Inference is visibly different from confirmed information.

## 12. Explainability model

Every state transition should answer:

- What changed?
- What evidence caused it?
- Was it inferred or confirmed?
- How confident is the system?
- What policy allowed it?
- What dependent items changed?
- How can the user undo it?

This is operational explainability, not exposure of private model chain-of-thought.

## 13. Observability

Initial signals:

- event ingestion success and failure;
- duplicate events;
- transition proposals;
- confirmation and rejection rates;
- stale assertions;
- context package size;
- provider latency and cost;
- state correction frequency;
- action failure and rollback;
- deletion completion.

Privacy rule: logs must not contain full personal payloads by default.

## 14. Testing strategy

### Unit tests

- transition rules;
- consent checks;
- state conflict handling;
- context ranking;
- provider adapters.

### Integration tests

- event to evidence;
- evidence to proposal;
- proposal confirmation;
- transaction rollback;
- deletion propagation.

### Contract tests

- reasoning provider adapters;
- external integrations.

### Evaluation tests

- extraction accuracy;
- unsupported inference rate;
- context relevance;
- explanation usefulness;
- state update precision.

## 15. Repository strategy

Current:

```text
MuninHQ/
└── munin-foundation
```

Near-term recommendation:

```text
MuninHQ/
├── munin-foundation
└── munin-core
```

Do not create many repositories yet.

`munin-core` should initially be a monorepo containing:

```text
apps/
  api/
  web/
packages/
  domain/
  contracts/
  reasoning/
  config/
  testing/
infra/
  local/
```

Create separate repositories only when boundaries become organizationally real.

## 16. MVP — LSE v0.1

The first software milestone proves one closed loop:

```text
User statement
→ authorized event
→ evidence
→ proposed state transition
→ confirmation
→ committed state
→ explanation
→ updated response
```

### Required capabilities

- one local user;
- manual text input;
- event persistence;
- assertion persistence;
- transition proposal;
- confirm or reject;
- state history;
- provider-neutral extraction interface;
- deterministic fallback for basic events;
- explanation view;
- export to JSON;
- delete all local data.

### Explicitly excluded

- voice;
- Gmail;
- Calendar;
- WhatsApp;
- autonomous actions;
- mobile;
- desktop packaging;
- graph visualization;
- multiple Council perspectives;
- full event sourcing;
- microservices;
- cloud deployment.

## 17. Project Atlas decision sequence

Before coding:

1. Accept or revise this blueprint.
2. Approve the Engineering Constitution.
3. Approve the minimum Human State schema.
4. Define the first ten event types.
5. Define confirmation policies.
6. Define the first evaluation dataset.
7. Create `munin-core`.
8. Scaffold only the MVP modules.

## 18. Open decisions

- Prisma versus a lighter SQL layer;
- authentication approach after single-user MVP;
- encryption model for local and cloud storage;
- schema strategy for assertion values;
- event extraction thresholds;
- whether the first MVP uses a hosted LLM or local model;
- exact export format;
- retention and deletion guarantees;
- whether user confirmation is per assertion or per transition set.

## 19. Architecture fitness functions

The architecture is healthy when:

- a new LLM provider can be added without changing domain code;
- every assertion can be traced to evidence;
- a user correction is reflected consistently;
- deletion removes derived data;
- no external provider becomes the source of truth;
- the MVP runs locally from a documented setup;
- domain tests run without network access;
- adding a new event type does not require rewriting unrelated modules.

## 20. Current recommendation

Proceed with a modular TypeScript monolith backed by PostgreSQL.

Build only the LSE closed loop.

Defer desktop, mobile, workflow orchestration, graph databases, and broad integrations until the central thesis demonstrates measurable value.
