import test from 'node:test';
import assert from 'node:assert/strict';
import { ResearchFabric, normalizeResearchItem, type ResearchAdapter } from '../src/research-fabric.js';
import { assertSafePublicUrl } from '../src/research-source-safety.js';
import { GitHubResearchAdapter, RssResearchAdapter, WebResearchAdapter, YouTubeResearchAdapter } from '../src/research-adapters.js';

const response = (body: string, status = 200, headers: Record<string,string> = {}) => new Response(body, {status, headers});
const publicResolver = async () => ['93.184.216.34'];

test('research fabric is fail-closed when feature flag is disabled', async () => {
  const fabric = new ResearchFabric([], false);
  await assert.rejects(() => fabric.run({operation:'search', target:'ai'}), /disabled/i);
});

test('normalizer produces bounded canonical evidence', () => {
  const item = normalizeResearchItem({source:'web', url:'https://example.com', title:'  Example   title ', content:' a   b '}, new Date('2026-09-08T12:00:00Z'));
  assert.equal(item.title, 'Example title');
  assert.equal(item.content, 'a b');
  assert.equal(item.retrievedAt, '2026-09-08T12:00:00.000Z');
  assert.match(item.id, /^web:/);
});

test('public URL safety blocks local and resolved private targets', async () => {
  await assert.rejects(() => assertSafePublicUrl('http://localhost/a', publicResolver), /local/i);
  await assert.rejects(() => assertSafePublicUrl('https://example.com', async () => ['10.0.0.4']), /private/i);
  assert.equal((await assertSafePublicUrl('https://example.com/a', publicResolver)).hostname, 'example.com');
});
test('web and RSS adapters read through bounded injected fetches', async () => {
  const fetcher = async (input: string | URL | Request) => {
    const target = String(input);
    if (target.endsWith('/feed')) return response('<rss><channel><item><title>Signal A</title><link>https://example.com/a</link><description>Detail</description><pubDate>Mon, 08 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>');
    return response('<html><head><title>Public Page</title></head><body><script>secret()</script><p>Hello world</p></body></html>');
  };
  const web = new WebResearchAdapter(fetcher as typeof fetch, publicResolver);
  const rss = new RssResearchAdapter(fetcher as typeof fetch, publicResolver);
  assert.equal((await web.execute({operation:'read', target:'https://example.com'}))[0].content, 'Public Page Hello world');
  const items = await rss.execute({operation:'read', target:'https://example.com/feed'});
  assert.equal(items[0].title, 'Signal A');
  assert.equal(items[0].url, 'https://example.com/a');
});

test('GitHub adapter reads public repository metadata without credentials', async () => {
  const fetcher = async () => Response.json({full_name:'MuninHQ/munin-foundation', html_url:'https://github.com/MuninHQ/munin-foundation', description:'Munin', stargazers_count:5, forks_count:1, language:'TypeScript', owner:{login:'MuninHQ'}});
  const items = await new GitHubResearchAdapter(fetcher as typeof fetch).execute({operation:'read', target:'https://github.com/MuninHQ/munin-foundation'});
  assert.equal(items[0].title, 'MuninHQ/munin-foundation');
  assert.equal(items[0].author, 'MuninHQ');
});

test('YouTube adapter uses fixed yt-dlp executable and no download arguments', async () => {
  const calls:Array<{file:string;args:string[]}>=[];
  const adapter = new YouTubeResearchAdapter(async (file,args) => {calls.push({file,args}); return {stdout:JSON.stringify({title:'Video',webpage_url:'https://youtu.be/x',description:'D'})};});
  const items = await adapter.execute({operation:'read', target:'https://youtu.be/x'});
  assert.equal(items[0].title, 'Video');
  assert.equal(calls[0].file, 'yt-dlp');
  assert.ok(calls[0].args.includes('--skip-download'));
});
test('router falls back after source failure and deduplicates evidence', async () => {
  const failing:ResearchAdapter={id:'web',canHandle:()=>true,execute:async()=>{throw new Error('offline');},health:async()=>({source:'web',state:'unavailable',detail:'offline',checkedAt:new Date().toISOString()})};
  const succeeding:ResearchAdapter={id:'rss',canHandle:()=>true,execute:async()=>[{source:'rss',url:'https://example.com/a',title:'A',content:'one'},{source:'rss',url:'https://example.com/a',title:'A duplicate',content:'two'}],health:async()=>({source:'rss',state:'healthy',detail:'ok',checkedAt:new Date().toISOString()})};
  const run=await new ResearchFabric([failing,succeeding],true).run({operation:'read',target:'https://example.com',sources:['web','rss']});
  assert.deepEqual(run.attempted,['web','rss']);
  assert.equal(run.errors[0].source,'web');
  assert.equal(run.evidence.length,1);
  assert.equal(run.evidence[0].source,'rss');
});
test('web adapter revalidates redirects before following them', async () => {
  const fetcher = async () => response('', 302, {location:'http://127.0.0.1/internal'});
  const web = new WebResearchAdapter(fetcher as typeof fetch, publicResolver);
  await assert.rejects(() => web.execute({operation:'read', target:'https://example.com'}), /private-network/i);
});
