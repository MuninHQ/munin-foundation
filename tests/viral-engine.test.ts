import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AgentTelemetry, MemoryAgentTelemetrySink } from '../src/agent-telemetry.js';
import { scoreViralOpportunity, signalsFromTrustedRadar, ViralEngineStore, type ViralDimensions } from '../src/viral-engine.js';
import type { TrustedSignal } from '../src/trusted-source-radar.js';

const strong: ViralDimensions = { evergreen: 5, demand: 5, seriesDepth: 4, differentiation: 4, evidence: 4, advertiserValue: 4, copyrightRisk: 1, productionEffort: 2, factualRisk: 1 };

const evidence = (source = 'https://example.com/source') => ({
  sourceUrls: [source], verifiedClaims: ['A verified event occurred.'], originalityAngle: 'Focus on the operating consequence.', factChecked: true, confirmation: 'EVIDENCE_REVIEWED',
});

test('opportunity scoring ranks strong topics but hard-rejects unsafe ones', () => {
  const ranked = scoreViralOpportunity(strong);
  assert.equal(ranked.decision, 'PRODUCE');
  assert.ok(ranked.score >= 65);
  const unsafe = scoreViralOpportunity({ ...strong, copyrightRisk: 4 });
  assert.equal(unsafe.decision, 'REJECT');
  assert.match(unsafe.reasons.join(' '), /hard risk gate/);
});

test('Raven through Forge creates a durable, governed production handoff', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-'));
  const sink = new MemoryAgentTelemetrySink(); const telemetry = new AgentTelemetry(sink);
  const engine = new ViralEngineStore(path.join(dir, 'state.json'), telemetry);
  try {
    const topic = await engine.ingest({ title: 'A payment company that never had the money', summary: 'Verified filing signal.', cluster: 'Business failures', audienceQuestion: 'How did the controls fail?', source: 'manual', sourceUrl: 'https://example.com/filing', dimensions: strong });
    assert.equal(topic.decision, 'PRODUCE');
    await assert.rejects(() => engine.queueProduction(topic.id, 'TOPIC_APPROVED_FOR_PRODUCTION'), /evidence/i);
    const blocked = await engine.snapshot();
    assert.equal(blocked.topics[0]?.stage, 'blocked');
    assert.equal(blocked.events[0]?.agentId, 'viral-forge');
    const prepared = await engine.prepareEvidence(topic.id, { sourceUrls: ['https://example.com/filing'], verifiedClaims: ['The filing reported a verified accounting shortfall.'], originalityAngle: 'Explain the control chain rather than retell the scandal.', visualSourceNotes: ['Use public-domain documents and original diagrams.'], factChecked: true, confirmation: 'EVIDENCE_REVIEWED', channel: 'youtube-long' });
    assert.equal(prepared.stage, 'architected');
    assert.equal(prepared.architecture?.sections.length, 4);
    const job = await engine.queueProduction(topic.id, 'TOPIC_APPROVED_FOR_PRODUCTION');
    assert.equal(job.handoff.providerPolicy, 'zero-cost-first');
    assert.equal(job.handoff.capability, 'media.content-video');
    assert.equal(job.handoff.aspectRatio, '16:9');
    assert.equal(job.handoff.modelRouting, 'munin-provider-policy');
    assert.equal(job.handoff.assetPolicy.licenseLedgerRequired, true);
    assert.equal(job.handoff.assetPolicy.youtubeReuseAllowed, false);
    const reloaded = new ViralEngineStore(path.join(dir, 'state.json'));
    const snapshot = await reloaded.snapshot();
    assert.equal(snapshot.productionJobs.length, 1);
    assert.equal(snapshot.policy.automaticPublishing, false);
    assert.equal(snapshot.experiment.publicationBoundary, 'manual-only');
    assert.equal(snapshot.executiveQueue[0]?.state, 'ready');
    await telemetry.flush();
    assert.ok(sink.events.some(event => event.agentId === 'viral-raven'));
    assert.ok(sink.events.some(event => event.agentId === 'viral-loki'));
    assert.ok(sink.events.some(event => event.agentId === 'viral-skald'));
    assert.ok(sink.events.some(event => event.agentId === 'viral-forge'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('publication is manual-only and Odin changes one bottleneck at a time', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-')); const engine = new ViralEngineStore(path.join(dir, 'state.json'));
  try {
    const topic = await engine.ingest({ title: 'Infrastructure case study', cluster: 'Infrastructure', audienceQuestion: 'What changes next?', source: 'manual', dimensions: strong });
    await engine.prepareEvidence(topic.id, evidence());
    await engine.queueProduction(topic.id, 'TOPIC_APPROVED_FOR_PRODUCTION');
    await assert.rejects(() => engine.markPublished(topic.id, { url: 'https://youtube.com/watch?v=x', finalRenderReviewed: true, titleAndThumbnailApproved: true, descriptionReviewed: true, licenseNotes: ['original'], confirmation: 'wrong' }), /Manual publication confirmation/);
    await engine.markPublished(topic.id, { url: 'https://youtube.com/watch?v=x', finalRenderReviewed: true, titleAndThumbnailApproved: true, descriptionReviewed: true, licenseNotes: ['Original diagrams; stock license recorded.'], confirmation: 'I_PUBLISHED_THIS_MANUALLY' });
    const measured = await engine.recordMetrics(topic.id, { ageHours: 48, impressions: 1_000, views: 25, clickThroughRate: 2.5, first30sRetention: 70, averagePercentageViewed: 48, returningViewers: 5, subscribers: 2, productionMinutes: 180, cashCostBrl: 0 });
    assert.equal(measured.learning?.bottleneck, 'packaging');
    assert.equal(measured.learning?.decision, 'ITERATE');
    const snapshot = await engine.snapshot();
    assert.equal(snapshot.resources.budgetRemainingBrl, 500);
    assert.equal(snapshot.resources.humanMinutesRecorded, 180);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('trusted radar freshness provenance survives ingestion and stale signals cannot enter production', async () => {
  const trusted: TrustedSignal = {
    id: 'bis:stale', sourceId: 'bis', sourceName: 'Bank for International Settlements', title: 'Stablecoin settlement framework changes', url: 'https://example.com/bis',
    publishedAt: '2026-07-01T00:00:00.000Z', summary: 'A source-backed framework update.', relevance: 90, themes: ['Stablecoins'], fetchedAt: '2026-09-04T12:00:00.000Z', freshnessDays: 65, dateVerified: true,
  };
  const converted = signalsFromTrustedRadar([trusted])[0];
  assert.equal(converted?.freshnessDays, 65);
  assert.equal(converted?.dateVerified, true);
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-')); const engine = new ViralEngineStore(path.join(dir, 'state.json'));
  try {
    const result = await engine.ingestTrusted([trusted]); const topic = result.topics[0]!;
    await engine.prepareEvidence(topic.id, evidence(trusted.url));
    await assert.rejects(() => engine.queueProduction(topic.id, 'TOPIC_APPROVED_FOR_PRODUCTION'), /stale \(65 days/);
    const snapshot = await engine.snapshot(); const queued = snapshot.executiveQueue.find(item => item.topicId === topic.id);
    assert.equal(queued?.freshness, 'stale');
    assert.match(queued?.nextAction ?? '', /Refresh the source signal/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('near-duplicate topics are held before production while distinct approved work remains queueable', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'munin-viral-')); const engine = new ViralEngineStore(path.join(dir, 'state.json'));
  try {
    const first = await engine.ingest({ title: 'Stablecoin settlement changes bank liquidity', cluster: 'Stablecoins', audienceQuestion: 'What changes for treasury teams?', source: 'manual', sourceUrl: 'https://example.com/one', dimensions: strong });
    await engine.prepareEvidence(first.id, evidence('https://example.com/one'));
    await engine.queueProduction(first.id, 'TOPIC_APPROVED_FOR_PRODUCTION');
    const duplicate = await engine.ingest({ title: 'Stablecoin settlement changes liquidity for banks', cluster: 'Stablecoins', audienceQuestion: 'What changes for bank treasury teams?', source: 'manual', sourceUrl: 'https://example.com/two', dimensions: strong });
    await engine.prepareEvidence(duplicate.id, evidence('https://example.com/two'));
    await assert.rejects(() => engine.queueProduction(duplicate.id, 'TOPIC_APPROVED_FOR_PRODUCTION'), /substantially overlaps/);
    const snapshot = await engine.snapshot(); const held = snapshot.executiveQueue.find(item => item.topicId === duplicate.id);
    assert.equal(held?.state, 'blocked');
    assert.ok((held?.repetitionRisk ?? 0) >= 0.62);
    assert.match(held?.nextAction ?? '', /Differentiate the thesis/);
    assert.equal(snapshot.productionJobs.length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
