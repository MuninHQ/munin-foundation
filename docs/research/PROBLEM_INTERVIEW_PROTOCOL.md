# Munin Problem Interview Protocol

This protocol supports GitHub issue #3. It reduces collection and synthesis work, but it does **not** replace the five real interviews required by the issue.

## Interview target

Interview five professionals who actively balance several of these at once: career, family, learning, projects and multiple digital tools.

Prefer different operating contexts rather than five people from the same team or role.

## 20–30 minute structure

### 1. Reconstruct a recent real episode

Ask for the last time they had to resume an important task after a gap, switch device/tool, or return to a project after several days.

Useful prompts:

- What were you trying to continue?
- What did you have to find or remember before you could act?
- Which apps, notes, chats or people did you check?
- What information did you have to explain again?
- What went wrong or became stale?

Avoid asking whether they "want an AI assistant" before observing behavior.

### 2. Current workaround

Capture the actual workflow: notes, bookmarks, chat history, calendar, task manager, email search, spreadsheets, memory, coworkers, screenshots or other tools.

Ask what is annoying enough that they have built a workaround for it.

### 3. Trust boundary

Ask what a persistent-context system must **never** do automatically. Probe correction, provenance, sensitive data, account access, external writes and stale assumptions.

### 4. Adoption conditions

Only after the behavioral discussion, describe the narrow concept: a system that keeps durable context across sessions and surfaces the next relevant action while showing provenance and allowing correction.

Ask what would need to be true for them to try it and what would make them stop using it.

## Evidence rules

Record observations rather than conclusions. "Uses three apps to reconstruct a client thread" is evidence; "needs Munin" is interpretation.

Do not store secrets, credentials, health data or unnecessary personal identifiers. Participant may be a pseudonymous label such as `P01`.

## Capture format

Create a JSON file per interview using this shape:

```json
{
  "id": "P01",
  "participant": "P01",
  "roleContext": "Product leader balancing work, family and study",
  "conductedAt": "2026-08-19T12:00:00-03:00",
  "observedBehaviors": ["..."],
  "currentWorkarounds": ["..."],
  "repeatedContextExamples": ["..."],
  "trustConcerns": ["..."],
  "adoptionConditions": ["..."],
  "strongestPain": "...",
  "wouldAdoptPersistentContext": "yes",
  "notes": "optional"
}
```

Import it locally with:

```text
npm run research:problem-interviews -- add path/to/interview.json
```

Get the current synthesis with:

```text
npm run research:problem-interviews -- report
```

The store is local under `data/runtime/research/problem-interviews.json`. Reaching five records means the issue's interview-count requirement has evidence available for review; it does not by itself prove Munin's product thesis.
