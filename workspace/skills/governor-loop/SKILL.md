# Governor Loop

Use this skill when a plan must be independently reviewed and revised until it is ready for execution.

## Loop
1. Orchestrator produces a complete plan with evidence, commands, acceptance criteria, and approval buckets.
2. Governor independently verifies the plan against repository state and source evidence.
3. If verdict is amber or red, the orchestrator must address every finding explicitly.
4. The revised plan is sent as a fresh complete message, never as a placeholder or delta-only note.
5. Repeat until the governor returns green or green-with-conditions, or until the configured review limit is reached.
6. Unresolved strategic items are routed to the founder-representative.

## Quality rules
- Do not trust prior counts when they can be rechecked.
- Preserve dissent and unresolved findings in the final handoff.
- A green verdict requires executable validation commands and measurable acceptance criteria.
- Reaching the review limit is not success; report the remaining blockers.

## Protected actions
Never merge, deploy, publish, delete remote refs, change branch protections, alter credentials, or spend money inside the loop.