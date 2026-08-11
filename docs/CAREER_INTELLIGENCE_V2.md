# Career Intelligence v2

Munin treats email as an event stream for career processes, not as a second inbox.

## Process reconstruction

Every message linked to a `JobOpportunity` becomes a signal in that process timeline. The process exposes its latest signal, inferred stage, next action, and automation confidence.

## Automation policy

High-confidence explicit events may advance a process automatically:

- application confirmation -> `applied`
- interview invitation -> `interview`
- explicit offer -> `offer`
- explicit rejection -> `rejected`

Automation must never move a process backwards. Ambiguous recruiter replies, information requests, assessments, and weak matches remain review items.

## Daily command brief

The Career brief prioritizes:

1. interviews
2. overdue follow-ups
3. ambiguous events requiring review
4. active processes with no signal/update for 7+ days

## Discovery

Job alerts are discovery inputs, not pipeline events. They remain separated from active processes until a concrete opportunity can be extracted and scored.

## Calendar / war room

Interview signals are the handoff point for calendar intelligence. A future calendar connector should attach scheduled events to the reconstructed process and generate an interview war room from company, role, recruiter, process history, and known user cases.
