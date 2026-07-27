# Active Projects Portfolio

> **Source of truth for active initiatives, shared capabilities, ownership, status, dependencies, and next milestones.**
>
> Last updated: **2026-07-27**

## Operating model

| Role | Responsibility |
|---|---|
| **André** | Executive owner, final prioritization, product direction, approval, and publication decisions |
| **ChatGPT** | Strategy, portfolio governance, career operations, architecture, editorial strategy, documentation, and SITREP |
| **Claude** | Repository implementation, refactoring, structured artifacts, automation, technical documentation, tests, and code maintenance |

### Status vocabulary

- **Active** — receiving regular execution.
- **Structured** — direction exists; operating model or deliverables still need consolidation.
- **Pilot** — intentionally limited experiment with explicit validation criteria.
- **Maintenance** — minimum continuous routine, not a major build initiative.
- **Paused** — no active allocation until a restart decision.
- **Archived** — formally discontinued.

## Executive portfolio

| Priority | Initiative | Status | Primary owner | Repository / system | Next milestone |
|---|---|---|---|---|---|
| **P0** | Career Operations | Active | André + ChatGPT | North Star / career workspace | Single application pipeline and weekly operating cadence |
| **P1** | North Star OS | Structured | André + ChatGPT | To be defined | Establish portfolio governance and canonical dashboard |
| **P1** | Munin Foundation | Active | André + Claude | `MuninHQ/munin-foundation` | Deliver a usable Munin v0.1 scope |
| **P1** | André Intelligence Platform — AIP | Structured | ChatGPT + Claude | To be confirmed | Consolidate RFCs, ADRs, specifications, and component boundaries |
| **P2** | Intellectual Production | Active | André + ChatGPT | Content workspace | Publish the Drex executive white paper package |
| **P2** | International Opportunity Radar | Pilot | ChatGPT | Career workspace | Maintain only opportunities with at least 80% fit |
| **P2** | YT-LAB | Pilot | André + ChatGPT | To be defined | Publish and evaluate a three-video pilot |
| **P2** | Neo Interface | Structured | ChatGPT + Claude | Munin module | Define Neo as Munin's conversational and voice interface |
| **P3** | Executive Development and Languages | Maintenance | André + ChatGPT | North Star routines | Establish two weekly English sessions tied to interviews |
| **P3** | Financial Organization | Structured | André | Private financial workspace | Consolidate debts, liquidity, and a three-horizon plan |
| **P3** | Health and Physical Activity | Maintenance | André | Personal routine | Establish a sustainable minimum weekly routine |
| **P3** | Personal Technology Environment | Active | André + Claude | GitHub and local environments | Create a canonical technical inventory and recovery guide |
| — | Project Atlas | Archived | — | Archive | No action |

## Shared capabilities

| Capability | Status | Owner | Consumers | Canonical document | Next milestone |
|---|---|---|---|---|---|
| **Content Engine** | Active | André + ChatGPT + Claude | Career Operations, North Star, Munin, AIP, Intellectual Production, YT-LAB | `docs/product/content-engine.md` | Complete the Drex publication cycle and create the reusable backlog |

The Content Engine is not a separate product. North Star governs it as a portfolio capability; projects supply source material, and the shared editorial workflow produces approved public artifacts.

---

## P0 — Career Operations

### Objective

Secure a senior or executive role across Product, Strategy, Payments, Open Finance, financial infrastructure, innovation, digital assets, or applied AI in financial services.

### Current state

- Master CVs in Portuguese and English are available.
- Core professional narratives and case studies are organized.
- ATS keywords and target roles are defined.
- Vacancy analysis, outreach, applications, follow-ups, and interview preparation are active.
- The Content Engine supports professional positioning and can convert published work into targeted outreach and strategic conversations.

### Main risk

Excessive CV customization can consume time better spent on applications, networking, follow-ups, interviews, and high-value professional visibility.

### Operating decision

Freeze the Platinum CV as the canonical master and allow only short, targeted variants.

### Next milestone

Create one pipeline:

`Discovery → Fit score → Investigation → Application → Outreach → Interview → Result`

---

## P1 — North Star OS

### Objective

Serve as the governance and prioritization layer for professional direction, decisions, projects, capabilities, and execution.

### Current state

- Strategic direction is defined.
- Career, Munin, AIP, research, intellectual production, and personal development are conceptually connected.
- Operational commands such as `SITREP`, `INCREP`, and `EXECUTE` are part of the intended model.
- Shared capabilities, beginning with the Content Engine, are now represented separately from projects.

### Main risk

North Star, Munin, AIP, and Neo have overlapping responsibilities.

### Boundary decision

- **North Star OS:** governance, priorities, portfolio, shared capabilities, and executive dashboard.
- **Munin:** intelligence product, user interface, context, and operational experience.
- **AIP:** architecture, domain model, protocols, and reusable technical foundation.
- **Neo:** Munin's conversational and voice interface.
- **Content Engine:** shared editorial operating capability, not a standalone platform.

### Next milestone

Define the canonical dashboard, project schema, capability schema, and decision workflow.

---

## P1 — Munin Foundation

### Objective

Build a contextual intelligence system for research, continuity, organization, and decision support.

### Repository

`MuninHQ/munin-foundation`

### Current state

- Repository and initial structure exist.
- Vision, product, research, decision, terminology, and journal areas are defined.
- GitHub is now part of the consolidated working model with Claude.
- Validated Munin lessons may feed the Content Engine, but hypotheses must never be presented publicly as delivered capabilities.

### Main risk

The scope may expand faster than delivery of a genuinely useful product.

### v0.1 target

1. Project portfolio dashboard.
2. Persistent context and memory model.
3. `SITREP` and `EXECUTE` workflows.
4. Career operations center.
5. Repository state visibility.

### Next milestone

Create an accepted Munin v0.1 product specification and implementation plan.

---

## P1 — André Intelligence Platform (AIP)

### Objective

Provide the technical and domain architecture that supports the personal intelligence ecosystem.

### Current state

- Python domain structure exists for capabilities, context, events, knowledge, and profile.
- Previous validation recorded 28 passing tests and clean linting.
- The architecture is more mature than the current product definition.
- Accepted architectural lessons may be transformed into public educational content through the Content Engine.

### Documentation backlog

- RFC-001
- RFC-002
- RFC-003
- SPEC-001
- BUILD-001
- ADR-0001
- ADR-0002
- ADR-0003
- ADR-0004

### Main risk

Building a sophisticated architecture without a narrow usable product.

### Next milestone

Consolidate the documents above and map every component to Munin v0.1.

---

## P2 — Intellectual Production

### Objective

Build professional authority through original analysis, executive communication, and systematic reuse of knowledge.

### Current flagship

White paper covering Drex, stablecoins, blockchain, tokenization, regulation, and financial infrastructure.

### Operating capability

Intellectual Production uses the shared **Content Engine**, defined in `docs/product/content-engine.md`.

Editorial pipeline:

`Idea → Research → Draft → Review → Approved → Scheduled → Published → Repurposed`

Supported outputs include:

- LinkedIn posts and articles.
- Carousels.
- White papers.
- Executive briefs and one-pagers.
- Presentations and talk outlines.
- Strategic comments, analytical reposts, and outreach messages.

### Ownership

- **André:** editorial owner, final approval, and publication.
- **ChatGPT:** positioning, editorial strategy, calendar, synthesis, drafting support, and executive review.
- **Claude:** structured artifacts, repository organization, templates, transformations, automation, and version maintenance.

No content may be published automatically without André's explicit approval.

### Remaining work on the flagship

- Reduce density.
- Improve diagrams and visual storytelling.
- Strengthen the AI chapter.
- Rewrite the conclusion with a stronger executive position.
- Produce the final PDF, LinkedIn post, carousel, executive brief, and outreach message.
- Create a backlog of follow-on publications derived from the same research.

### Metrics

- Approved publications and lead time.
- Percentage of flagship assets repurposed.
- Qualified engagement and substantive conversations.
- New relevant connections.
- Conversations with recruiters, hiring leaders, founders, executives, and domain experts.
- Interviews, collaborations, speaking invitations, or opportunities influenced by content.

### Next milestone

Complete the Drex executive package as the first full Content Engine cycle:

1. Final white paper.
2. Executive LinkedIn post.
3. Carousel.
4. Executive brief or one-pager.
5. Targeted outreach message.
6. Publication and performance record.
7. Reusable follow-on content backlog.

---

## P2 — International Opportunity Radar

### Objective

Test remote international roles paid in USD, EUR, or GBP and open to candidates based in Brazil.

### Guardrail

Only pursue roles with at least **80% fit** and strong alignment with fintech, payments, banking infrastructure, identity, digital assets, or AI.

### Main risk

Expanding the opportunity universe enough to dilute the core Brazil-based career operation.

### Next milestone

Maintain a deliberately small, high-fit experimental pipeline.

---

## P2 — YT-LAB

### Objective

Validate a faceless, AI-assisted, evergreen YouTube channel without depending on André's image, voice, or personal brand.

### Constraints

- Initial budget: up to R$ 500.
- Weekly effort: up to five hours.
- Low copyright exposure.
- Repeatable production model.

### Current state

Strategy and validation criteria exist; consistent production has not started. The Content Engine may supply approved research and scripts, but YT-LAB remains a separate channel experiment with its own success and shutdown criteria.

### Next milestone

Publish three videos in one format and assess retention, click-through rate, production time, cost, and repeatability.

---

## P2 — Neo Interface

### Objective

Provide a voice and conversational interface for Munin.

### Product decision

Neo is **not** a separate platform. It is a Munin interface module.

### Intended characteristics

- Wake phrase: “Wake up, Neo”.
- Male voice and lightly sarcastic tone.
- Access to personal and professional context.
- Simple conversational interaction.

### Next milestone

Define the interface contract between Neo and Munin services.

---

## P3 — Executive Development and Languages

### Objective

Develop international executive communication, English at C1 level, and professional Spanish.

### Operating model

Treat this as direct support for active career opportunities rather than an isolated study project. Approved content can also be adapted into English to support executive communication practice and international positioning.

### Next milestone

Establish two weekly English sessions focused on interviews, executive vocabulary, and professional pitch practice.

---

## P3 — Financial Organization

### Objective

Resolve financial restrictions, protect liquidity, and resume long-term wealth creation.

### Current state

Known topics include outstanding debts, liquidity reserves, CPF restrictions, and a future property objective.

### Next milestone

Build a private plan across three horizons:

1. Liquidity and resilience.
2. Debt and restriction resolution.
3. Wealth rebuilding and property planning.

> Financial details should remain in a private workspace and must not be committed to this public repository or used as public content.

---

## P3 — Health and Physical Activity

### Objective

Return to regular physical activity after an extended sedentary period.

### Operating principle

Use a small, sustainable routine rather than creating another complex optimization project.

### Next milestone

Establish a minimum weekly routine combining walking and basic strength work, with appropriate professional guidance where necessary.

---

## P3 — Personal Technology Environment

### Objective

Maintain a reliable environment for development, AI tools, GitHub, automation, remote access, and recovery.

### Scope

- GitHub organizations and repositories.
- Local environments under `D:\Dev`.
- Claude and ChatGPT workflows.
- Lovable and other external tools.
- Mobile access.
- Backups and recovery procedures.

### Next milestone

Create a canonical inventory of machines, repositories, services, environments, backups, and recovery procedures.

---

## Archived — Project Atlas

Project Atlas is formally archived because it competed with Career Operations, North Star, and Munin without sufficient strategic justification.

Restart requires an explicit decision, owner, scope, and resource allocation.

---

## Portfolio rules

1. P0 work takes precedence over all build initiatives.
2. North Star governs the portfolio and shared capabilities; it does not duplicate Munin product functionality.
3. Munin v0.1 must remain narrow and usable.
4. AIP components require a direct mapping to an accepted Munin use case.
5. Neo remains a Munin module.
6. The Content Engine remains a shared operating capability, not a standalone product.
7. Public content requires André's explicit approval and a confidentiality review.
8. Pilot projects need explicit success and shutdown criteria.
9. Sensitive personal information must remain outside public repositories.
10. Every active initiative and capability must have an owner, next milestone, and current status.
11. Update this document whenever a material priority, boundary, status, capability, or milestone changes.

## SITREP cadence

A project or capability SITREP should report:

- Current status.
- Changes since the previous report.
- Completed work.
- Blockers and risks.
- Decisions required.
- Next milestone.
- Owner and target date, when applicable.
- For the Content Engine: pipeline inventory, publications, repurposing, qualified engagement, and strategic outcomes.
