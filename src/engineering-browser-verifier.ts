import { inspectBrowserReadOnly, validateBrowserInspectionUrl, type BrowserBackend } from './browser-operator.js';

export interface EngineeringVerificationResult {
  status: 'PASS' | 'RETRY' | 'BLOCKED';
  summary: string;
  blocker?: string;
  fingerprint?: string;
  evidence?: string;
}

export interface EngineeringMissionVerifier {
  verify(): Promise<EngineeringVerificationResult>;
}

export class ReadOnlyBrowserEngineeringVerifier implements EngineeringMissionVerifier {
  readonly url: string;

  constructor(
    url: string,
    private readonly backend: BrowserBackend = 'playwright-cli',
  ) {
    this.url = validateBrowserInspectionUrl(url);
    if (backend !== 'playwright-cli') throw new Error('Engineering browser verification currently supports Playwright CLI only.');
  }

  async verify(): Promise<EngineeringVerificationResult> {
    const result = await inspectBrowserReadOnly(this.url, this.backend);
    if (!result.available) {
      return {
        status: 'BLOCKED',
        summary: 'Browser verification backend is unavailable.',
        blocker: result.detail ?? 'Playwright CLI inspection is unavailable.',
        fingerprint: 'browser:playwright-unavailable',
      };
    }
    const snapshot = result.snapshot?.trim() ?? '';
    if (!snapshot) {
      return {
        status: 'RETRY',
        summary: 'Browser inspection returned no structured snapshot.',
        fingerprint: 'browser:empty-snapshot',
      };
    }
    return {
      status: 'PASS',
      summary: `Read-only browser verification succeeded for ${result.url}.`,
      evidence: snapshot.slice(0, 12_000),
    };
  }
}
