export type CiFailureClass = 'transient' | 'deterministic' | 'unknown';
export type CiRecoveryAction = 'retry-job' | 'retry-failed-run' | 'fix-code' | 'human-review';

export interface CiFailureSignal {
  message: string;
  attempt: number;
  maxAttempts?: number;
}

export interface CiRecoveryDecision {
  classification: CiFailureClass;
  action: CiRecoveryAction;
  reason: string;
}

const TRANSIENT_PATTERNS = [
  /server disconnected/i,
  /remoteprotocolerror/i,
  /timeout/i,
  /temporar(?:y|ily)/i,
  /connection reset/i,
  /rate limit/i,
  /service unavailable/i,
  /502|503|504/,
];

const DETERMINISTIC_PATTERNS = [
  /assertionerror/i,
  /expected values to be strictly/i,
  /typeerror/i,
  /syntaxerror/i,
  /cannot find module/i,
  /process completed with exit code 1/i,
];

export function decideCiRecovery(signal: CiFailureSignal): CiRecoveryDecision {
  const maxAttempts = Math.max(1, Math.min(5, signal.maxAttempts ?? 2));
  const transient = TRANSIENT_PATTERNS.some(p => p.test(signal.message));
  const deterministic = DETERMINISTIC_PATTERNS.some(p => p.test(signal.message));

  if (transient && signal.attempt < maxAttempts) return { classification:'transient', action:'retry-job', reason:'Failure matches a bounded transient pattern and retry budget remains.' };
  if (transient) return { classification:'transient', action:'human-review', reason:'Transient retry budget exhausted.' };
  if (deterministic) return { classification:'deterministic', action:'fix-code', reason:'Failure indicates a reproducible code/test/configuration defect.' };
  if (signal.attempt < maxAttempts) return { classification:'unknown', action:'retry-failed-run', reason:'Unknown failure gets one bounded retry before escalation.' };
  return { classification:'unknown', action:'human-review', reason:'Unknown failure persisted beyond retry budget.' };
}
