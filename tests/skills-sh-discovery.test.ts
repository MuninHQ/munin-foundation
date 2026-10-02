import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSkillsShDiscoveryReport, observeSkillsShCandidate, runSkillsShDiscovery, searchSkillsSh } from '../src/skills-sh-discovery.js';

test('skills.sh discovery normalizes public search results without installing anything', async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/api/search');
    return new Response(JSON.stringify({ skills: [{ id: 'video-edit', name: 'video-edit', source: 'genmedia-labs/skills', installs: 4200 }] }), { status: 200 });
  };
  const result = await searchSkillsSh({ query: 'video edit', limit: 3, fetcher: fetcher as typeof fetch });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'genmedia-labs/skills/video-edit');
  assert.equal(result[0].installs, 4200);
});

test('passing audits create a review candidate but observation mode blocks install execution and promotion', async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname === '/api/search') {
      return new Response(JSON.stringify({ skills: [{ id: 'find-skills', name: 'find-skills', source: 'vercel-labs/skills', installs: 25000 }] }), { status: 200 });
    }
    if (url.pathname.includes('/api/v1/skills/audit/')) {
      return new Response(JSON.stringify({ audits: [{ provider: 'Socket', status: 'pass', riskLevel: 'LOW', summary: 'No alerts' }] }), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };
  const report = await runSkillsShDiscovery({ query: 'find skills', fetcher: fetcher as typeof fetch });
  assert.equal(report.candidates, 1);
  const observation = report.observations[0];
  assert.equal(observation.mode, 'observe');
  assert.equal(observation.installAllowed, false);
  assert.equal(observation.executeAllowed, false);
  assert.equal(observation.autoPromotionAllowed, false);
  assert.equal(observation.security.allowPromotion, false);
  assert.equal(observation.benchmark.status, 'hold');
  assert.match(observation.replay.join('\n'), /installation -> BLOCKED/);
});

test('high-risk audit rejects a candidate before any execution path', () => {
  const observation = observeSkillsShCandidate(
    { id: 'owner/repo/risky', slug: 'risky', name: 'risky', source: 'owner/repo', installs: 10, url: 'https://skills.sh/owner/repo/risky' },
    { available: true, audits: [{ provider: 'Snyk', status: 'fail', riskLevel: 'HIGH', summary: 'Risk found' }] },
  );
  assert.equal(observation.status, 'reject');
  assert.equal(observation.installAllowed, false);
  assert.equal(observation.executeAllowed, false);
  assert.match(observation.reasons.join('\n'), /high or critical risk/i);
});

test('report makes the observation-only boundary explicit', async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname === '/api/search') {
      return new Response(JSON.stringify({ skills: [{ id: 'safe', name: 'safe', source: 'owner/repo', installs: 200 }] }), { status: 200 });
    }
    return new Response('', { status: 404 });
  };
  const report = await runSkillsShDiscovery({ query: 'safe skill', fetcher: fetcher as typeof fetch });
  const text = formatSkillsShDiscoveryReport(report);
  assert.match(text, /OBSERVE/);
  assert.match(text, /Automatic install: BLOCKED/);
  assert.match(text, /Automatic execution: BLOCKED/);
  assert.match(text, /Automatic promotion: BLOCKED/);
});
