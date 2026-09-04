import type { IncomingMessage, ServerResponse } from 'node:http';
import { AgentTelemetry, JsonlAgentTelemetrySink } from './agent-telemetry.js';
import { json, readJsonBody, requireText, stringList } from './http.js';
import { trustedSourceRadar } from './trusted-source-radar.js';
import { ViralEngineStore, type ViralChannel, type ViralDimensions, type ViralSource } from './viral-engine.js';

const telemetry = new AgentTelemetry(new JsonlAgentTelemetrySink());
const engine = new ViralEngineStore(undefined, telemetry);

const body = (request: IncomingMessage) => readJsonBody(request, 500_000);
const number = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} is required and must be numeric.`);
  return parsed;
};
const dimensions = (input: Record<string, unknown>): ViralDimensions => ({
  evergreen: number(input.evergreen, 'evergreen'), demand: number(input.demand, 'demand'), seriesDepth: number(input.seriesDepth, 'seriesDepth'),
  differentiation: number(input.differentiation, 'differentiation'), evidence: number(input.evidence, 'evidence'), advertiserValue: number(input.advertiserValue, 'advertiserValue'),
  copyrightRisk: number(input.copyrightRisk, 'copyrightRisk'), productionEffort: number(input.productionEffort, 'productionEffort'), factualRisk: number(input.factualRisk, 'factualRisk'),
});
const source = (value: unknown): ViralSource => value === 'youtube' || value === 'pexels' || value === 'trusted-radar' ? value : 'manual';
const channel = (value: unknown): ViralChannel => value === 'youtube-short' || value === 'instagram-reel' || value === 'linkedin' ? value : 'youtube-long';

export async function handleViralEngineApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'OPTIONS') return json(request, response, 204, {});
  const url = new URL(request.url ?? '/', 'http://localhost');
  try {
    if (request.method === 'GET' && url.pathname === '/api/viral-engine') return json(request, response, 200, await engine.snapshot());
    if (request.method === 'POST' && url.pathname === '/api/viral-engine/discover') {
      const input = await body(request); const radar = await trustedSourceRadar(input.refresh === true);
      const result = await engine.ingestTrusted(radar.signals);
      await telemetry.flush(); return json(request, response, 201, { ...result, sourceMode: radar.signals.length ? 'trusted-radar' : 'unavailable', snapshot: await engine.snapshot() });
    }
    if (request.method === 'POST' && url.pathname === '/api/viral-engine/signals') {
      const input = await body(request); const topic = await engine.ingest({
        title: requireText(input.title, 'title'), summary: typeof input.summary === 'string' ? input.summary : undefined,
        cluster: requireText(input.cluster, 'cluster'), audienceQuestion: requireText(input.audienceQuestion, 'audienceQuestion'),
        source: source(input.source), sourceUrl: typeof input.sourceUrl === 'string' && input.sourceUrl.trim() ? input.sourceUrl.trim() : undefined,
        dimensions: dimensions(input),
      });
      await telemetry.flush(); return json(request, response, 201, topic);
    }
    const evidence = url.pathname.match(/^\/api\/viral-engine\/topics\/([^/]+)\/evidence$/);
    if (request.method === 'POST' && evidence) {
      const input = await body(request); const topic = await engine.prepareEvidence(evidence[1], {
        sourceUrls: stringList(input.sourceUrls), verifiedClaims: stringList(input.verifiedClaims), originalityAngle: requireText(input.originalityAngle, 'originalityAngle'),
        visualSourceNotes: stringList(input.visualSourceNotes), prohibitedClaims: stringList(input.prohibitedClaims), factChecked: input.factChecked === true,
        confirmation: requireText(input.confirmation, 'confirmation'), channel: channel(input.channel),
      });
      await telemetry.flush(); return json(request, response, 200, topic);
    }
    const produce = url.pathname.match(/^\/api\/viral-engine\/topics\/([^/]+)\/produce$/);
    if (request.method === 'POST' && produce) {
      const input = await body(request); const job = await engine.queueProduction(produce[1], requireText(input.confirmation, 'confirmation'));
      await telemetry.flush(); return json(request, response, 201, { job, publicationBoundary: 'manual-only', next: 'Open Content Studio and execute the governed production handoff.' });
    }
    const published = url.pathname.match(/^\/api\/viral-engine\/topics\/([^/]+)\/published$/);
    if (request.method === 'POST' && published) {
      const input = await body(request); const topic = await engine.markPublished(published[1], {
        url: requireText(input.url, 'url'), finalRenderReviewed: input.finalRenderReviewed === true, titleAndThumbnailApproved: input.titleAndThumbnailApproved === true,
        descriptionReviewed: input.descriptionReviewed === true, licenseNotes: stringList(input.licenseNotes), confirmation: requireText(input.confirmation, 'confirmation'),
      });
      await telemetry.flush(); return json(request, response, 200, topic);
    }
    const metrics = url.pathname.match(/^\/api\/viral-engine\/topics\/([^/]+)\/metrics$/);
    if (request.method === 'POST' && metrics) {
      const input = await body(request); const topic = await engine.recordMetrics(metrics[1], {
        ageHours: number(input.ageHours, 'ageHours'), impressions: number(input.impressions, 'impressions'), views: number(input.views, 'views'),
        clickThroughRate: number(input.clickThroughRate, 'clickThroughRate'), first30sRetention: number(input.first30sRetention, 'first30sRetention'), averagePercentageViewed: number(input.averagePercentageViewed, 'averagePercentageViewed'),
        returningViewers: number(input.returningViewers, 'returningViewers'), subscribers: number(input.subscribers, 'subscribers'), productionMinutes: number(input.productionMinutes, 'productionMinutes'), cashCostBrl: number(input.cashCostBrl, 'cashCostBrl'),
      });
      await telemetry.flush(); return json(request, response, 200, topic);
    }
    return json(request, response, 404, { error: 'Not found' });
  } catch (error) {
    await telemetry.flush(); return json(request, response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

export const viralEngine = engine;
