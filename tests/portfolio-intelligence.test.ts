import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePortfolioMarkdown, summarizePortfolio } from '../src/portfolio-intelligence.js';

const fixture = `# Projects

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
