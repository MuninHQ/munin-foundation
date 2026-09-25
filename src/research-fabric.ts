export type ResearchSourceId = 'web' | 'rss' | 'github' | 'youtube';
export type ResearchOperation = 'read' | 'search';

export interface ResearchRequest {
  operation: ResearchOperation;
  target: string;
  sources?: ResearchSourceId[];
  limit?: number;
}

export interface RawResearchItem {
  source: ResearchSourceId;
  title?: string;
  url: string;
  content?: string;
  author?: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ResearchEvidence extends RawResearchItem {
  id: string;
  title: string;
  content: string;
  retrievedAt: string;
  confidence: number;
}

export interface ResearchHealth {
  source: ResearchSourceId;
  state: 'healthy' | 'degraded' | 'unavailable';
  detail: string;
  checkedAt: string;
}
export interface ResearchAdapter {
  id: ResearchSourceId;
  canHandle(request: ResearchRequest): boolean;
  execute(request: ResearchRequest): Promise<RawResearchItem[]>;
  health(): Promise<ResearchHealth>;
}

export interface ResearchRun {
  evidence: ResearchEvidence[];
  attempted: ResearchSourceId[];
  errors: Array<{source: ResearchSourceId; error: string}>;
}

export function researchFabricEnabled(env: NodeJS.ProcessEnv = process.env) {
  return /^(1|true|yes|on)$/i.test(env.MUNIN_RESEARCH_FABRIC_V1 ?? '');
}

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeResearchItem(item: RawResearchItem, now = new Date()): ResearchEvidence {
  const title = cleanText(item.title || item.url).slice(0, 240);
  const content = cleanText(item.content).slice(0, 24_000);
  const key = `${item.source}|${item.url}|${title}`;
  return {
    ...item,
    id: `${item.source}:${Buffer.from(key).toString('base64url').slice(0, 28)}`,
    title,
    content,
    retrievedAt: now.toISOString(),
    confidence: item.source === 'github' ? 0.95 : item.source === 'rss' ? 0.9 : 0.8,
  };
}
export class ResearchFabric {
  constructor(
    private readonly adapters: ResearchAdapter[],
    private readonly enabled = researchFabricEnabled(),
  ) {}

  async run(request: ResearchRequest): Promise<ResearchRun> {
    if (!this.enabled) throw new Error('Research Fabric v1 is disabled. Set MUNIN_RESEARCH_FABRIC_V1=1 to enable it.');
    const wanted = request.sources ?? this.adapters.map(adapter => adapter.id);
    const attempted: ResearchSourceId[] = [];
    const errors: ResearchRun['errors'] = [];
    const evidence: ResearchEvidence[] = [];
    const limit = Math.max(1, Math.min(request.limit ?? 10, 50));
    for (const source of wanted) {
      const adapter = this.adapters.find(candidate => candidate.id === source);
      if (!adapter || !adapter.canHandle(request)) continue;
      attempted.push(source);
      try {
        const items = await adapter.execute(request);
        evidence.push(...items.map(item => normalizeResearchItem(item)));
        if (evidence.length >= limit) break;
      } catch (error) {
        errors.push({source, error: error instanceof Error ? error.message : String(error)});
      }
    }
    const seen = new Set<string>();
    return {evidence: evidence.filter(item => !seen.has(item.url) && seen.add(item.url)).slice(0, limit), attempted, errors};
  }

  async doctor(): Promise<ResearchHealth[]> {
    return Promise.all(this.adapters.map(adapter => adapter.health()));
  }
}
