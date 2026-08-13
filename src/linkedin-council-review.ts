import type { ExecutionProvider } from './providers.js';
import { CouncilOrchestrator, type CouncilResult, type CouncilSeat } from './council.js';
import { OllamaProvider } from './ollama-provider.js';

export interface LinkedInCouncilReviewInput {
  title: string;
  body: string;
  themes?: string[];
  sources?: string[];
}

export interface LinkedInCouncilReview {
  ready: boolean;
  review?: CouncilResult;
  error?: string;
}

export const LINKEDIN_REVIEW_COUNCIL: CouncilSeat[] = [
  { id: 'editor', title: 'Executive Editor', capability: 'review', lens: 'Evaluate clarity, executive voice, structure, originality and whether the post earns attention without clickbait.' },
  { id: 'fact-checker', title: 'Evidence Skeptic', capability: 'review', lens: 'Identify unsupported factual claims, overstatement, weak causal language and places where sources are required.' },
  { id: 'positioning', title: 'Positioning Strategist', capability: 'strategy', lens: 'Evaluate differentiation, relevance to senior product and financial infrastructure audiences, and repetition risk.' },
];

export async function reviewLinkedInDraft(
  input: LinkedInCouncilReviewInput,
  provider: ExecutionProvider = new OllamaProvider(),
): Promise<LinkedInCouncilReview> {
  if (!input.title.trim() || !input.body.trim()) return { ready: false, error: 'title and body are required' };
  try {
    const review = await new CouncilOrchestrator(provider).deliberate({
      objective: 'Review this LinkedIn draft before publication and decide whether it is ready, needs revision, or should be rejected.',
      seats: LINKEDIN_REVIEW_COUNCIL,
      context: {
        title: input.title.trim(),
        body: input.body.trim(),
        themes: input.themes ?? [],
        sources: input.sources ?? [],
        constraints: [
          'Brazilian Portuguese executive voice',
          'no invented facts',
          'no hype or clickbait',
          'avoid repeating recent themes and metaphors',
          'prefer useful product, leadership and financial infrastructure insight',
        ],
      },
    });
    return { ready: true, review };
  } catch (error) {
    return { ready: false, error: error instanceof Error ? error.message : String(error) };
  }
}
