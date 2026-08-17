---
name: test-driven-development
description: Use test-first development for behavior changes and regression fixes with evidence-backed red green refactor cycles.
version: 1.0.0
triggers: test,tdd,regression,bug,feature,implementar,corrigir
permissions: read,local-write
source: munin-local-superpowers-inspired
---
# Test-Driven Development

For behavior changes, start by identifying the smallest externally observable contract. Add or update a focused test that would fail without the intended behavior. Confirm the failure is caused by the missing behavior rather than a broken fixture. Implement the smallest coherent production change that makes the test pass, then run the relevant focused tests and the repository validation suite. Refactor only while tests remain green.

Do not weaken assertions, delete failing coverage, add test-only production branches, or replace meaningful behavior checks with mocks just to obtain a green build. For a regression, preserve a test that reproduces the original failure so the fix remains protected.
