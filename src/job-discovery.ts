import type { CareerEmail } from './career-inbox.js';
import type { JobOpportunity, JobStatus } from './types.js';
import { careerLinkFromText, safeCareerLink } from './career-job-links.js';

export interface JobDiscovery {
  id: string; sourceMessageId: string; title: string; company?: string; score: number;
  signals: string[]; duplicateJobId?: string; duplicateStatus?: JobStatus; receivedAt: string;
  link?: string; availability: 'unverified'; resurfaced: boolean;
}
const signals = ['payments','open finance','open banking','digital assets','blockchain','stablecoin','artificial intelligence','ai','product','fintech','financial infrastructure','identity','strategy','leadership'];
function norm(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function titleFrom(message: CareerEmail) {
  return message.detectedRole?.trim() || message.subject.replace(/^(fw|fwd|enc)\s*:\s*/i, '').replace(/^(job alert|new jobs|vagas para voc[eê])\s*[:\-]?\s*/i, '').trim() || message.subject;
}
export function extractJobDiscoveries(messages: CareerEmail[], jobs: JobOpportunity[]): JobDiscovery[] {
  const newest = [...messages].filter(m => m.category === 'job_alert').sort((a,b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  const seen = new Set<string>();
  const items: JobDiscovery[] = [];
  for (const message of newest) {
    const title = titleFrom(message);
    const company = message.detectedCompany?.trim();
    const link = careerLinkFromText(`${message.snippet} ${message.subject}`);
    const identity = link ? `url:${link}` : company ? `${norm(company)}:${norm(title)}` : `message:${message.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const text = ` ${norm(`${message.subject} ${message.snippet}`)} `;
    const matched = signals.filter(signal => text.includes(` ${signal} `));
    // A title alone is never evidence that the user applied at this company.
    const duplicate = jobs.find(job =>
      (link && safeCareerLink(job.link) === link) ||
      (company && norm(company) === norm(job.company) && norm(title) === norm(job.role)));
    const resurfaced = Boolean(duplicate && ['closed','rejected'].includes(duplicate.status) && Date.parse(message.receivedAt) > Date.parse(duplicate.updatedAt));
    items.push({id:`disc-${message.id}`, sourceMessageId:message.id, title, company,
      score:Math.min(100,45 + matched.length * 7), signals:matched, duplicateJobId:duplicate?.id,
      duplicateStatus:duplicate?.status, receivedAt:message.receivedAt, link, availability:'unverified', resurfaced});
  }
  return items.sort((a,b) => b.score-a.score || Date.parse(b.receivedAt)-Date.parse(a.receivedAt));
}
