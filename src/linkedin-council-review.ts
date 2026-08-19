import type { ExecutionProvider } from './providers.js';
import { CouncilOrchestrator, type CouncilResult, type CouncilSeat } from './council.js';
import { OllamaProvider } from './ollama-provider.js';
import { andreBrandProfile, brandPromptContext, evaluateBrandCandidate } from './personal-brand-intelligence.js';

export interface LinkedInCouncilReviewInput {
  title: string;
  body: string;
  themes?: string[];
  sources?: string[];
  recentTitles?: string[];
}

export interface LinkedInCouncilReview {
  ready: boolean;
  brandEvaluation?: ReturnType<typeof evaluateBrandCandidate>;
  review?: CouncilResult;
  error?: string;
}

export const LINKEDIN_REVIEW_COUNCIL: CouncilSeat[] = [
  { id: 'editor', title: 'Executive Editor', capability: 'review', lens: 'Evaluate clarity, executive voice, structure, originality and whether the post earns attention without clickbait.' },
  { id: 'fact-checker', title: 'Evidence Skeptic', capability: 'review', lens: 'Identify unsupported factual claims, overstatement, weak causal language and places where sources are required.' },
  { id: 'positioning', title: 'Positioning Strategist', capability: 'strategy', lens: 'Evaluate differentiation, relevance to senior product and financial infrastructure audiences, and repetition risk.' },
  { id: 'thesis-guardian', title: 'Owned Thesis Guardian', capability: 'strategy', lens: 'Verify that the draft advances an owned point of view, connects technology to production/product/infrastructure/governance, and does not become generic AI-generated thought leadership.' },
];

export async function reviewLinkedInDraft(
  input: LinkedInCouncilReviewInput,
  provider: ExecutionProvider = new OllamaProvider(),
): Promise<LinkedInCouncilReview> {
  if (!input.title.trim() || !input.body.trim()) return { ready: false, error: 'title and body are required' };
  const brandEvaluation=evaluateBrandCandidate({topic:input.title,angle:input.body,source:input.sources?.length?input.sources.join(', '):undefined,recentTitles:input.recentTitles},andreBrandProfile);
  try {
    const review = await new CouncilOrchestrator(provider).deliberate({
      objective: 'Review this LinkedIn draft before publication and decide whether it is ready, needs revision, or should be rejected.',
      seats: LINKEDIN_REVIEW_COUNCIL,
      context: {
        title: input.title.trim(),
        body: input.body.trim(),
        themes: input.themes ?? [],
        sources: input.sources ?? [],
        brandStrategy: brandPromptContext(),
        brandEvaluation,
        constraints: [
          'Brazilian Portuguese executive voice',
          'no invented facts',
          'no hype or clickbait',
          'avoid repeating recent themes and metaphors',
          'prefer useful product, leadership and financial infrastructure insight',
          'news is evidence, not the post itself: advance or challenge an owned thesis',
          'protect the bridge positioning between incumbent financial infrastructure and emerging technology',
        ],
      },
    });
    return { ready: true, brandEvaluation, review };
  } catch (error) {
    return { ready: false, brandEvaluation, error: error instanceof Error ? error.message : String(error) };
  }
}
