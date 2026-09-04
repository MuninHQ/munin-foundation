# BUILD ALL entrypoints

Production BUILD ALL is available through the local Munin CLI and the governed Host Worker bridge.

## Local CLI

```bash
munin build-all "<objective>"
```

The command runs the production planner, safe wave decomposition, base-aware engineering, serial Git reconciliation, and independent final verification. Non-DONE outcomes return a non-zero process exit code.

## GitHub Host Inbox / remote worker

A short-lived `host-intent.json` on the `munin-host-inbox` branch may request:

```json
{
  "version": 1,
  "id": "build-example",
  "type": "build-all",
  "repo": "MuninHQ/munin-foundation",
  "branch": "main",
  "objective": "implement the requested bounded repository change",
  "createdAt": "<ISO timestamp>",
  "expiresAt": "<ISO timestamp within 15 minutes>"
}
```

The inbox validates the repository target, objective, lifetime, replay state, and the general Host Job policy before enqueueing. BUILD ALL objectives are required and limited to 2000 characters.

The Host Worker executes BUILD ALL locally through the same `ProductionBuildAllRuntime`. Workers do not receive authority to move `main`; engineering still uses isolated worker commits, orchestrator-owned reconciliation, and independent final verification.

## Safety boundary

BUILD ALL does not mean unconditional success. Planner, engineering, reconciliation, or verification failures stop the run. The command returns DONE only when the integrated head passes independent verification with evidence.
