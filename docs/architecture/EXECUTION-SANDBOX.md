# Execution Sandbox (P2)

Munin separates repository isolation from process isolation.

## Default mode: guarded

`GitWorktreeExecutionWorkspace` always isolates repository mutations in a detached Git worktree. Commands are additionally routed through `NativeGuardedSandbox`, which uses `execFile` without a shell, allows only Node/npm/npx/Git executables, strips credential-shaped environment variables, bounds execution time and output, and records the sandbox backend/strength in workspace results. On Windows, npm/npx shims resolve to validated JavaScript CLI entrypoints and execute through `node.exe`; no command shell is enabled.

This is a safety boundary, but it is **not** hard operating-system isolation.

## Hard mode: Docker

Set `MUNIN_EXECUTION_SANDBOX=strict` to require Docker-backed isolation. Strict mode fails closed if Docker is unavailable. `auto` may use Docker when available; guarded remains the compatibility default until the host has been empirically validated.

The Docker backend runs with:

- network disabled;
- all Linux capabilities dropped;
- `no-new-privileges`;
- read-only container root filesystem;
- bounded `/tmp` tmpfs;
- PID, memory and CPU limits;
- only the isolated worktree bind-mounted at `/workspace`;
- only a minimal non-secret environment forwarded.

The default image is `node:22-bookworm-slim` and can be overridden with `MUNIN_SANDBOX_IMAGE`.

## Promotion rule

Hard sandboxing should be promoted as the default only after the actual Windows host passes the full build/test suite under `MUNIN_EXECUTION_SANDBOX=strict`. Munin must never report `hard` isolation when it is actually running the guarded native backend.

## Remaining boundary

Container isolation does not authorize external writes, secret access, destructive actions or publication. Those remain governed by the Action Constitution and human approval gates.
