import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const PORTFOLIO_SOURCE = 'PROJECTS.md';

export interface PortfolioItem {
  priority: string;
  initiative: string;
  status: string;
  owner: string;
  system: string;
  nextMilestone: string;
}

function clean(value: string): string {
  return value.trim().replace(/^\*\*(.*)\*\*$/, '$1').replace(/`([^`]+)`/g, '$1');
}

export function parsePortfolioMarkdown(markdown: string): PortfolioItem[] {
  const section = markdown.split('## Executive portfolio')[1]?.split('\n## ')[0] ?? '';
  return section.split('\n')
    .filter(line => line.trim().startsWith('|'))
    .map(line => line.split('|').slice(1, -1).map(clean))
    .filter(cells => cells.length === 6 && cells[0] !== 'Priority' && !cells[0].startsWith('---'))
    .map(([priority, initiative, status, owner, system, nextMilestone]) => ({ priority, initiative, status, owner, system, nextMilestone }));
}

export function summarizePortfolio(items: PortfolioItem[]) {
  const status = (name: string) => items.filter(item => item.status.toLowerCase() === name).length;
  const priority = (name: string) => items.filter(item => item.priority.toUpperCase() === name).length;
  return {
    total: items.length,
    active: status('active'), structured: status('structured'), pilot: status('pilot'), maintenance: status('maintenance'), archived: status('archived'),
    p0: priority('P0'), p1: priority('P1'), p2: priority('P2'), p3: priority('P3'),
  };
}

export async function loadPortfolioSnapshot(projectsPath = resolve(process.cwd(), PORTFOLIO_SOURCE)) {
  const items = parsePortfolioMarkdown(await readFile(projectsPath, 'utf8'));
  return { source: PORTFOLIO_SOURCE, generatedAt: new Date().toISOString(), items, counts: summarizePortfolio(items) };
}
