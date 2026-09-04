# BUILD ALL finalization checklist

The production BUILD ALL path is considered complete when all of the following are true:

- production planner emits bounded tasks with explicit `Files` and `Depends-on`;
- safe wave planner prevents file/dependency conflicts and falls back to serial for unknown scope;
- engineering workers execute from the reconciled base and cannot independently move source `main`;
- orchestrator reconciles worker commits serially and fails closed on conflicts;
- final verifier validates the integrated head independently with canonical tests and evidence;
- local CLI exposes `munin build-all <objective>`;
- Host Worker accepts a typed `build-all` job with a bounded objective;
- GitHub Host Inbox can enqueue short-lived remote `build-all` intents;
- replay, target, objective, and output-redaction protections remain active;
- CI, quality gates, and changed-file-size gates pass before merge.

This document marks the intended end state of the Vibe Coding Toolkit adoption track: useful orchestration and quality patterns are native Munin capabilities, without a mandatory Claude-specific or paid runtime dependency.
