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

export type PortfolioIssueSeverity = 'low' | 'medium' | 'high';
export type PortfolioHealthStatus = 'nominal' | 'attention' | 'critical';

export interface PortfolioHealthIssue {
  code: string;
  severity: PortfolioIssueSeverity;
  initiative?: string;
  message: string;
}

export interface PortfolioHealth {
  score: number;
  status: PortfolioHealthStatus;
  sourceAgeDays?: number;
  issues: PortfolioHealthIssue[];
}

function clean(value: string): string {
  return value
    .trim()
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function missing(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized
    || normalized === '-'
    || normalized === '—'
    || normalized === 'n/a'
    || normalized === 'to be defined'
    || normalized === 'to be confirmed';
}

export function parsePortfolioMarkdown(markdown: string): PortfolioItem[] {
  const section = markdown.split('## Executive portfolio')[1]?.split('\n## ')[0] ?? '';

  return section
    .split('\n')
    .filter(line => line.trim().startsWith('|'))
    .map(line => line.split('|').slice(1, -1).map(clean))
    .filter(cells =>
      cells.length === 6
      && cells[0] !== 'Priority'
      && !cells[0].startsWith('---')
    )
    .map(([priority, initiative, status, owner, system, nextMilestone]) => ({
      priority,
      initiative,
      status,
      owner,
      system,
      nextMilestone,
    }));
}

export function parsePortfolioLastUpdated(markdown: string): string | undefined {
  const match = markdown.match(/Last updated:\s*\*{0,2}(\d{4}-\d{2}-\d{2})\*{0,2}/i);
  return match?.[1];
}

export function summarizePortfolio(items: PortfolioItem[]) {
  const status = (name: string) =>
    items.filter(item => item.status.toLowerCase() === name).length;

  const priority = (name: string) =>
    items.filter(item => item.priority.toUpperCase() === name).length;

  return {
    total: items.length,
    active: status('active'),
    structured: status('structured'),
    pilot: status('pilot'),
    maintenance: status('maintenance'),
    archived: status('archived'),
    p0: priority('P0'),
    p1: priority('P1'),
    p2: priority('P2'),
    p3: priority('P3'),
  };
}

export function assessPortfolioHealth(
  items: PortfolioItem[],
  lastUpdated?: string,
  now = new Date(),
): PortfolioHealth {
  const issues: PortfolioHealthIssue[] = [];
  let sourceAgeDays: number | undefined;

  if (lastUpdated) {
    const sourceDate = new Date(`${lastUpdated}T00:00:00Z`);

    if (!Number.isNaN(sourceDate.getTime())) {
      sourceAgeDays = Math.max(
        0,
        Math.floor((now.getTime() - sourceDate.getTime()) / 86_400_000),
      );

      if (sourceAgeDays > 14) {
        issues.push({
          code: 'portfolio-source-stale',
          severity: 'high',
          message: `PROJECTS.md não é atualizado há ${sourceAgeDays} dias.`,
        });
      } else if (sourceAgeDays > 7) {
        issues.push({
          code: 'portfolio-source-aging',
          severity: 'medium',
          message: `PROJECTS.md não é atualizado há ${sourceAgeDays} dias.`,
        });
      }
    }
  } else {
    issues.push({
      code: 'portfolio-source-date-missing',
      severity: 'medium',
      message: 'PROJECTS.md não informa a data da última atualização.',
    });
  }

  for (const item of items) {
    const priority = item.priority.toUpperCase();
    const status = item.status.toLowerCase();
    const operational = ['active', 'structured', 'pilot'].includes(status);

    if (priority === 'P0' && status !== 'active') {
      issues.push({
        code: 'p0-not-active',
        severity: 'high',
        initiative: item.initiative,
        message: `${item.initiative} é P0, mas está como ${item.status}.`,
      });
    }

    if (operational && missing(item.nextMilestone)) {
      issues.push({
        code: 'missing-next-milestone',
        severity: 'high',
        initiative: item.initiative,
        message: `${item.initiative} não possui próximo milestone definido.`,
      });
    }

    if (operational && missing(item.owner)) {
      issues.push({
        code: 'missing-owner',
        severity: 'high',
        initiative: item.initiative,
        message: `${item.initiative} não possui owner definido.`,
      });
    }

    if (operational && missing(item.system)) {
      issues.push({
        code: 'missing-system',
        severity: 'medium',
        initiative: item.initiative,
        message: `${item.initiative} não possui sistema/repositório canônico definido.`,
      });
    }

    if (
      status === 'archived'
      && (priority === 'P0' || priority === 'P1')
    ) {
      issues.push({
        code: 'archived-high-priority',
        severity: 'medium',
        initiative: item.initiative,
        message: `${item.initiative} está arquivado, mas continua marcado como ${priority}.`,
      });
    }
  }

  const penalty = issues.reduce((total, issue) => {
    if (issue.severity === 'high') return total + 20;
    if (issue.severity === 'medium') return total + 10;
    return total + 5;
  }, 0);

  const score = Math.max(0, 100 - penalty);

  const status: PortfolioHealthStatus =
    score >= 85
      ? 'nominal'
      : score >= 60
        ? 'attention'
        : 'critical';

  return {
    score,
    status,
    sourceAgeDays,
    issues,
  };
}

export async function loadPortfolioSnapshot(
  projectsPath = resolve(process.cwd(), PORTFOLIO_SOURCE),
) {
  const markdown = await readFile(projectsPath, 'utf8');
  const items = parsePortfolioMarkdown(markdown);
  const lastUpdated = parsePortfolioLastUpdated(markdown);

  return {
    source: PORTFOLIO_SOURCE,
    generatedAt: new Date().toISOString(),
    lastUpdated,
    items,
    counts: summarizePortfolio(items),
    health: assessPortfolioHealth(items, lastUpdated),
  };
}
