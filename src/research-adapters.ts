import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import type { RawResearchItem, ResearchAdapter, ResearchHealth, ResearchRequest } from './research-fabric.js';
import { assertSafePublicUrl, type HostResolver, systemHostResolver } from './research-source-safety.js';

const execFile = promisify(execFileCallback);
export type FetchLike = typeof fetch;
const MAX_RESPONSE_BYTES = 2_000_000;

function decode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchText(target: string, fetcher: FetchLike, resolver: HostResolver, accept: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let current = target;
    for (let redirect = 0; redirect <= 3; redirect++) {
      await assertSafePublicUrl(current, resolver);
      const response = await fetcher(current, {headers:{'user-agent':'Munin/0.1 Research Fabric','accept':accept}, signal:controller.signal, redirect:'manual'});
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirect === 3) throw new Error('Unsafe or excessive research redirect.');
        current = new URL(location, current).toString();
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > MAX_RESPONSE_BYTES) throw new Error('Research response exceeds size limit.');
      const text = await response.text();
      if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error('Research response exceeds size limit.');
      return text;
    }
    throw new Error('Research redirect limit exceeded.');
  } finally { clearTimeout(timeout); }
}

function healthy(source: ResearchHealth['source'], detail: string): ResearchHealth {
  return {source, state:'healthy', detail, checkedAt:new Date().toISOString()};
}
function unavailable(source: ResearchHealth['source'], error: unknown): ResearchHealth {
  return {source, state:'unavailable', detail:error instanceof Error ? error.message : String(error), checkedAt:new Date().toISOString()};
}
export class WebResearchAdapter implements ResearchAdapter {
  readonly id = 'web' as const;
  constructor(private readonly fetcher: FetchLike = fetch, private readonly resolver: HostResolver = systemHostResolver) {}
  canHandle(request: ResearchRequest) { return request.operation === 'read' && /^https?:\/\//i.test(request.target); }
  async execute(request: ResearchRequest): Promise<RawResearchItem[]> {
    const html = await fetchText(request.target, this.fetcher, this.resolver, 'text/html,text/plain;q=0.9');
    const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? request.target);
    const body = decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' '));
    return [{source:this.id, title, url:request.target, content:body}];
  }
  async health() { return healthy(this.id, 'Read-only public HTTP(S) adapter ready; private networks blocked.'); }
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decode(match?.[1] ?? '');
}

export class RssResearchAdapter implements ResearchAdapter {
  readonly id = 'rss' as const;
  constructor(private readonly fetcher: FetchLike = fetch, private readonly resolver: HostResolver = systemHostResolver) {}
  canHandle(request: ResearchRequest) { return request.operation === 'read' && /^https?:\/\//i.test(request.target); }
  async execute(request: ResearchRequest): Promise<RawResearchItem[]> {
    const xml = await fetchText(request.target, this.fetcher, this.resolver, 'application/rss+xml,application/atom+xml,text/xml');
    const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi), ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(item => item[0]);
    return blocks.slice(0, Math.min(request.limit ?? 20, 50)).map(block => {
      const rawLink = tag(block, 'link') || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || request.target;
      const url = new URL(rawLink, request.target).toString();
      return {source:this.id, title:tag(block,'title'), url, content:tag(block,'description') || tag(block,'summary') || tag(block,'content'), author:tag(block,'author') || tag(block,'creator'), publishedAt:tag(block,'pubDate') || tag(block,'published') || tag(block,'updated') || undefined};
    }).filter(item => item.title);
  }
  async health() { return healthy(this.id, 'RSS/Atom parser ready with bounded read-only fetches.'); }
}
function githubRepo(target: string) {
  try {
    const url = new URL(target);
    if (url.hostname.toLowerCase() !== 'github.com') return undefined;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    return owner && repo ? `${owner}/${repo.replace(/\.git$/i, '')}` : undefined;
  } catch { return undefined; }
}

export class GitHubResearchAdapter implements ResearchAdapter {
  readonly id = 'github' as const;
  constructor(private readonly fetcher: FetchLike = fetch) {}
  canHandle(request: ResearchRequest) { return request.operation === 'search' || Boolean(githubRepo(request.target)); }
  async execute(request: ResearchRequest): Promise<RawResearchItem[]> {
    const endpoint = request.operation === 'search'
      ? `https://api.github.com/search/repositories?q=${encodeURIComponent(request.target)}&per_page=${Math.min(request.limit ?? 10, 30)}`
      : `https://api.github.com/repos/${githubRepo(request.target)}`;
    const response = await this.fetcher(endpoint, {headers:{'user-agent':'Munin/0.1 Research Fabric','accept':'application/vnd.github+json'}});
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const records = request.operation === 'search' ? ((payload.items as Record<string, unknown>[] | undefined) ?? []) : [payload];
    return records.map(record => ({
      source:this.id,
      title:String(record.full_name ?? record.name ?? request.target),
      url:String(record.html_url ?? request.target),
      content:String(record.description ?? ''),
      author:typeof record.owner === 'object' && record.owner ? String((record.owner as Record<string,unknown>).login ?? '') : undefined,
      metadata:{stars:record.stargazers_count, forks:record.forks_count, language:record.language, updatedAt:record.updated_at},
    }));
  }
  async health() {
    try {
      const response = await this.fetcher('https://api.github.com/rate_limit', {headers:{'user-agent':'Munin/0.1 Research Fabric'}});
      return response.ok ? healthy(this.id, 'Public GitHub API available; anonymous rate limits apply.') : unavailable(this.id, `GitHub HTTP ${response.status}`);
    } catch (error) { return unavailable(this.id, error); }
  }
}
export type CommandRunner = (file: string, args: string[]) => Promise<{stdout: string}>;
const defaultRunner: CommandRunner = async (file, args) => {
  const result = await execFile(file, args, {timeout:15_000, maxBuffer:2_000_000, windowsHide:true});
  return {stdout:result.stdout};
};

export class YouTubeResearchAdapter implements ResearchAdapter {
  readonly id = 'youtube' as const;
  constructor(private readonly runner: CommandRunner = defaultRunner) {}
  canHandle(request: ResearchRequest) { return request.operation === 'search' || /(?:youtube\.com|youtu\.be)/i.test(request.target); }
  async execute(request: ResearchRequest): Promise<RawResearchItem[]> {
    const target = request.operation === 'search' ? `ytsearch${Math.min(request.limit ?? 10, 20)}:${request.target}` : request.target;
    const {stdout} = await this.runner('yt-dlp', ['--dump-single-json','--skip-download','--no-warnings',target]);
    const payload = JSON.parse(stdout) as Record<string, unknown>;
    const records = Array.isArray(payload.entries) ? payload.entries as Record<string, unknown>[] : [payload];
    return records.filter(Boolean).map(record => ({
      source:this.id,
      title:String(record.title ?? request.target),
      url:String(record.webpage_url ?? record.original_url ?? request.target),
      content:String(record.description ?? ''),
      author:String(record.uploader ?? record.channel ?? ''),
      publishedAt:typeof record.timestamp === 'number' ? new Date(record.timestamp * 1000).toISOString() : undefined,
      metadata:{duration:record.duration, views:record.view_count, channelId:record.channel_id},
    }));
  }
  async health() {
    try {
      const {stdout} = await this.runner('yt-dlp', ['--version']);
      return healthy(this.id, `yt-dlp ${stdout.trim()} available; no downloads performed.`);
    } catch (error) { return unavailable(this.id, `yt-dlp unavailable: ${error instanceof Error ? error.message : String(error)}`); }
  }
}

export function createWave1ResearchAdapters() {
  return [new WebResearchAdapter(), new RssResearchAdapter(), new GitHubResearchAdapter(), new YouTubeResearchAdapter()] satisfies ResearchAdapter[];
}
