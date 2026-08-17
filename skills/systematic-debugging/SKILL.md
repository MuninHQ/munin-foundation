---
name: systematic-debugging
description: Diagnose failures from evidence and root cause before applying bounded repairs.
version: 1.0.0
triggers: debug,erro,error,failing,falha,fix,corrigir,repair
permissions: read,local-write
source: munin-local-superpowers-inspired
---
# Systematic Debugging

Treat the observed failure as evidence, not as the root cause. Reproduce or isolate the failure, read the nearest error output and relevant code path, and state a concrete causal hypothesis before changing code. Prefer the smallest experiment that can falsify that hypothesis. Trace data and control flow backward when the visible error is downstream from the defect.

Apply one coherent repair at a time. Validate the original failing case first, then run broader regression tests. If the same failure fingerprint survives bounded repair attempts, stop blind retries and re-plan from fresh evidence. Never hide errors, relax tests, or add catch-all behavior merely to make validation green.
