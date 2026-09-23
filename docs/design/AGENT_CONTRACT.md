# Munin Design Agent Contract

Version: 1.0.0-observe

This contract applies to any human or AI agent creating, reviewing or modifying Munin user interfaces.

## Required preflight

Before UI work:

1. Read `docs/design/DESIGN.md`.
2. Read `design/tokens.json`.
3. Inspect the target screen and existing neighboring components/styles.
4. Run or review `npm run design:drift` when the environment permits it.

## Contract

Agents MUST:

- preserve the existing screen unless the task explicitly authorizes a visual change;
- reuse existing components and semantic tokens when suitable;
- treat state colors semantically: red/critical, amber/attention, blue/intelligence, green/healthy, gray/neutral;
- keep consequential actions compatible with Munin approval, audit and safety rules;
- retain keyboard/focus/accessibility semantics when editing interaction code;
- report design drift found outside the requested scope rather than silently repairing it;
- make canonical design-system changes explicit and reviewable;
- keep external design-system research attributable as research, not as canonical Munin truth.

Agents MUST NOT:

- mass-restyle existing screens from this contract alone;
- auto-replace raw values merely because the drift checker reports them;
- add a new design framework, font service or paid dependency solely to conform to this contract;
- copy an external product or brand wholesale;
- silently modify `design/tokens.json`, this contract or the constitution as a side effect of feature work;
- promote externally discovered design rules or generated skills automatically;
- change observation mode to warning/enforcement without explicit approval.

## Missing-token protocol

If a requested UI requires a value not represented by the token set:

1. Prefer an existing token if the difference is not semantically meaningful.
2. If the difference is meaningful, use the smallest local value necessary for the requested change and flag it in the handoff.
3. Propose a canonical token separately with rationale and examples.
4. Do not mutate the canonical token set silently.

## External-reference protocol

External products, screenshots, `DESIGN.md` files and extracted design systems are evidence sources only. Agents may identify useful patterns, but adoption requires an explicit Munin decision. Skill Promotion Gate candidates remain proposals during observation and cannot execute or promote themselves.

## Drift-checker semantics

The checker is diagnostic. In observation mode:

- findings are telemetry;
- exit status remains successful for design findings;
- source files are never rewritten;
- existing screens are never migrated automatically;
- CI should publish/report findings without blocking the merge.

A tooling failure (invalid configuration, unreadable path, malformed token file) is different from design drift and may still fail the tooling command because no trustworthy observation was produced.

## Handoff requirements

For UI-affecting work, report:

- surfaces changed;
- tokens/components reused or introduced;
- drift findings attributable to the change;
- accessibility implications;
- any proposed constitution/token changes;
- whether validation was executed or remains unavailable.
