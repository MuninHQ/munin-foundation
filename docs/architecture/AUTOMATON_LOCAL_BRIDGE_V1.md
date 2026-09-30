# Automaton Local Bridge v1

## Decision

Munin and Automaton remain separate repositories and runtimes.
Munin is the control plane: goals, context, policy, approvals, memory and UX.
Automaton is an optional local execution fabric: bounded workers, local inference and evidence review.

The integration uses Munin's Runtime Capability Seam under the capability:
`execution.automaton-local`.

## Guardrails

- Loopback HTTP only: `127.0.0.1`, `localhost` or `::1`.
- No paid dependency is required.
- No external side effects are authorized by the bridge.
- Task submission is disabled by default.
- Health and status checks are read-only.
- Automaton/JEV policy remains authoritative inside Automaton.
- The bridge fails closed when configuration is invalid.

## Configuration

The Munin runtime capability seam must be enabled normally.
Automaton submit requires both explicit flags:

- `MUNIN_AUTOMATON_ENABLED=1`
- `MUNIN_AUTOMATON_SUBMIT=1`

Optional endpoint override:

- `MUNIN_AUTOMATON_URL=http://127.0.0.1:3210`

A submit adds a `[MUNIN:<executionId>]` correlation marker.
Munin can later resolve the Automaton goal, task status and task result using the returned inbox task ID.

## Promotion rule

v1 is not a default execution route.
Keep it opt-in until repeated local smoke tests prove bounded completion,
correct evidence handling and acceptable latency on the host.
JEV stays shadow-only until its judgments are benchmarked against Munin's existing review gates.
