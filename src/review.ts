export interface ReviewCriterion {
  id: string;
  passed: boolean;
  message: string;
}

export interface ReviewReport {
  score: number;
  accepted: boolean;
  criteria: ReviewCriterion[];
}

export function reviewOutput(expectedOutput: string, output: string): ReviewReport {
  const normalized = output.trim();
  const criteria: ReviewCriterion[] = [
    {
      id: 'non-empty',
      passed: normalized.length > 0,
      message: normalized.length > 0 ? 'Output is present.' : 'Output is empty.',
    },
    {
      id: 'minimum-detail',
      passed: normalized.length >= 12,
      message: normalized.length >= 12 ? 'Output has minimum detail.' : 'Output is too short.',
    },
    {
      id: 'expected-output-alignment',
      passed: normalized.toLowerCase().includes(expectedOutput.toLowerCase()),
      message: normalized.toLowerCase().includes(expectedOutput.toLowerCase())
        ? 'Output references the expected deliverable.'
        : `Output does not reference expected deliverable: ${expectedOutput}`,
    },
  ];
  const score = Math.round((criteria.filter(item => item.passed).length / criteria.length) * 100);
  return { score, accepted: score >= 70, criteria };
}
