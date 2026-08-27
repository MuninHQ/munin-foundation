import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCareerApplicationPacket } from '../src/career-application-packet.js';
import type { JobOpportunity } from '../src/types.js';

const highFitJob: JobOpportunity = {
  id: 'job-application-1',
  company: 'Example Bank',
  role: 'Senior Product Manager, Payments',
  description: 'Lead payments and Open Finance product strategy with regulatory stakeholders and cross-functional leadership.',
  source: 'career-intake:url',
  link: 'https://example.com/jobs/1',
  status: 'discovered',
  fitScore: 88,
  matchedSignals: ['payments', 'open finance', 'product strategy'],
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T10:00:00.000Z',
};

test('application packet builds an evidence-first draft without authorizing submission', () => {
  const packet = buildCareerApplicationPacket(highFitJob, {
    career: {
      summary: 'Product leader in payments and Open Finance with cross-functional delivery experience.',
      achievements: ['Led a regulated payments launch with product, legal and engineering stakeholders.'],
      email: 'private@example.com',
      credentials: { apiKey: 'must-not-leak' },
    },
  }, { generatedAt: '2026-08-27T12:00:00.000Z' });

  assert.equal(packet.decision, 'CANDIDATAR');
  assert.equal(packet.generatedAt, '2026-08-27T12:00:00.000Z');
  assert.ok(packet.cv.atsKeywords.includes('payments'));
  assert.ok(packet.cv.atsKeywords.includes('open finance'));
  assert.ok(packet.cv.profileEvidence.length > 0);
  assert.match(packet.coverLetter.draft, /\[INSERIR:/);
  assert.equal(packet.safeguards.humanReviewRequired, true);
  assert.equal(packet.safeguards.automaticSubmission, false);
  assert.equal(packet.safeguards.externalWriteAuthorized, false);
  const serialized = JSON.stringify(packet);
  assert.doesNotMatch(serialized, /private@example\.com|must-not-leak/);
});

test('application packet exposes missing evidence and low-fit risk instead of inventing claims', () => {
  const packet = buildCareerApplicationPacket({
    ...highFitJob,
    id: 'job-application-2',
    role: 'Unspecified role',
    description: undefined,
    fitScore: 22,
    matchedSignals: [],
  }, {}, { generatedAt: '2026-08-27T12:00:00.000Z', staleContextKeys: ['job_search'] });

  assert.equal(packet.decision, 'NAO_PRIORIZAR');
  assert.ok(packet.risks.some(risk => /Descrição completa/.test(risk)));
  assert.ok(packet.risks.some(risk => /Nenhuma evidência/.test(risk)));
  assert.ok(packet.risks.some(risk => /22%/.test(risk)));
  assert.ok(packet.risks.some(risk => /job_search/.test(risk)));
});
