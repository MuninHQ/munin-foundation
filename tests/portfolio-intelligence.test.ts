import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessPortfolioHealth,
  parsePortfolioLastUpdated,
  parsePortfolioMarkdown,
  summarizePortfolio,
} from '../src/portfolio-intelligence.js';

const fixture = `# Projects

> Last updated: **2026-08-10**

## Executive portfolio

| Priority | Initiative | Status | Primary owner | Repository / system | Next milestone |
|---|---|---|---|---|---|
| **P0** | Career Operations | Active | André + ChatGPT | Career | One pipeline |
| **P1** | Munin Foundation | Active | André + Claude | \`MuninHQ/munin-foundation\` | v0.1 |
| **P2** | Radar | Pilot | ChatGPT | Career | Validate |

## Shared capabilities
`;

test('parses the canonical executive portfolio table', () => {
  const items = parsePortfolioMarkdown(fixture);

  assert.equal(items.length, 3);
  assert.equal(items[0].priority, 'P0');
  assert.equal(items[1].system, 'MuninHQ/munin-foundation');
  assert.equal(items[2].status, 'Pilot');
});

test('summarizes portfolio status and priority counts', () => {
  const counts = summarizePortfolio(parsePortfolioMarkdown(fixture));

  assert.deepEqual(counts, {
    total: 3,
    active: 2,
    structured: 0,
    pilot: 1,
    maintenance: 0,
    archived: 0,
    p0: 1,
    p1: 1,
    p2: 1,
    p3: 0,
  });
});

test('parses canonical portfolio last-updated date', () => {
  assert.equal(parsePortfolioLastUpdated(fixture), '2026-08-10');
});

test('returns nominal health for a healthy recent portfolio', () => {
  const health = assessPortfolioHealth(
    parsePortfolioMarkdown(fixture),
    '2026-08-10',
    new Date('2026-08-13T12:00:00Z'),
  );

  assert.equal(health.score, 100);
  assert.equal(health.status, 'nominal');
  assert.equal(health.issues.length, 0);
});

test('detects stale source and operational governance gaps', () => {
  const broken = `# Projects

> Last updated: **2026-07-01**

## Executive portfolio

| Priority | Initiative | Status | Primary owner | Repository / system | Next milestone |
|---|---|---|---|---|---|
| **P0** | Career Operations | Structured | André | Career | Pipeline |
| **P1** | Munin | Active | — | — | — |

## Shared capabilities
`;

  const items = parsePortfolioMarkdown(broken);

  const health = assessPortfolioHealth(
    items,
    parsePortfolioLastUpdated(broken),
    new Date('2026-08-13T12:00:00Z'),
  );

  assert.equal(health.status, 'critical');
  assert.ok(health.score < 60);

  const codes = health.issues.map(issue => issue.code);

  assert.ok(codes.includes('portfolio-source-stale'));
  assert.ok(codes.includes('p0-not-active'));
  assert.ok(codes.includes('missing-owner'));
  assert.ok(codes.includes('missing-system'));
  assert.ok(codes.includes('missing-next-milestone'));
});
