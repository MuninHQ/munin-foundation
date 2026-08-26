# Agent Convergence Hardening

## Decision

Munin should increase autonomous reliability by strengthening contracts and verification before adding more agent frameworks.

## Canonical flow

`objective → spec contract → architecture/policy gate → plan/tasks → mission context packet → isolated workspace/sandbox → pre-tool tripwire → tool → post-tool tripwire → independent evaluation → tests → agentic security coverage → spec/code convergence → receipt/trace → memory promotion → promotion gate`

## Added seams

- **Spec Convergence Gate**: requirements and acceptance criteria must have explicit evidence; implementation tags that do not map to a requirement fail the gate.
- **Scripted Agent Test Fixtures**: deterministic provider/tool/sandbox/human-approval doubles for testing agent loops without paid models.
- **Tool Tripwires**: preflight blocks secrets, non-zero cost without approval and consequential actions; postflight requires evidence and blocks secret leakage or unexpected side effects.
- **Mission Context Packets**: bounded context per phase instead of full-history prompt dumping.
- **Agentic Risk Coverage**: security tests can be mapped to stable threat classes and report coverage gaps.
- **OTel-compatible Trace Envelope**: local tracing remains authoritative while adopting portable trace/span IDs and GenAI-style attributes.

## Guardrails

- No new paid dependency.
- No new model-provider dependency.
- Existing Action Constitution and human boundaries remain authoritative.
- OTel export remains off by default; this change only standardizes the local envelope.
- Security labels are a coverage model, not a claim of formal OWASP certification.
- Spec convergence does not replace tests; it verifies intention/evidence alignment in addition to execution correctness.

## Promotion criteria

A material autonomous engineering task should not be promotion-ready when any requirement lacks evidence, implementation is outside the approved spec, a tool tripwire fails, required security risk classes are uncovered, or independent verification is absent.
