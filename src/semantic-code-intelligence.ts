import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SemanticBackend = 'serena' | 'native';
export type SemanticCapability = 'symbols' | 'references' | 'diagnostics' | 'symbol-editing';
export type SemanticHealth = {
  backend: SemanticBackend;
  available: boolean;
  command?: string;
  capabilities: SemanticCapability[];
  detail?: string;
};

export type SemanticPromotionDecision = {
  recommended: SemanticBackend;
  promoteSerena: boolean;
  reasons: string[];
};

export function semanticCodeIntelligencePolicy() {
  return {
    authoritativeSource: 'repository' as const,
    preferredSemanticBackend: 'serena' as const,
    fallback: 'native' as const,
    integrationMode: 'optional-local-mcp' as const,
    requiredCapabilities: ['symbols', 'references', 'diagnostics'] as const,
    paidDependencyRequired: false,
    cloudRequired: false,
    externalWriteRequired: false,
    autoInstallAllowed: false,
    rationale: 'Serena may enrich symbol-level navigation, references and diagnostics, while repository files and Git remain authoritative and native inspection remains the fail-open fallback.',
  };
}

export async function semanticBackendHealth(
  backend: SemanticBackend,
  repositoryRoot = process.cwd(),
): Promise<SemanticHealth> {
  if (backend === 'native') {
    return {
      backend,
      available: true,
      capabilities: [],
      detail: 'Native Git/file inspection remains available but does not claim symbol/reference semantics.',
    };
  }

  const command = process.platform === 'win32' ? 'serena.exe' : 'serena';
  try {
    const result = await execFileAsync(command, ['project', 'health-check'], {
      cwd: repositoryRoot,
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    return {
      backend,
      available: true,
      command,
      capabilities: ['symbols', 'references', 'diagnostics', 'symbol-editing'],
      detail: `${String(result.stdout ?? '')}\n${String(result.stderr ?? '')}`.trim().slice(0, 1500),
    };
  } catch (error: any) {
    return {
      backend,
      available: false,
      command,
      capabilities: [],
      detail: `${String(error?.stdout ?? '')}\n${String(error?.stderr ?? error?.message ?? error)}`.trim().slice(0, 1500),
    };
  }
}

export function decideSemanticPromotion(serena: SemanticHealth): SemanticPromotionDecision {
  const required = semanticCodeIntelligencePolicy().requiredCapabilities;
  const reasons: string[] = [];
  if (!serena.available) reasons.push('Serena CLI/project health check unavailable.');
  for (const capability of required) {
    if (!serena.capabilities.includes(capability)) reasons.push(`Missing required semantic capability: ${capability}.`);
  }
  const promoteSerena = serena.available && reasons.length === 0;
  return {
    recommended: promoteSerena ? 'serena' : 'native',
    promoteSerena,
    reasons: promoteSerena ? ['Local Serena health and required semantic capability contract are satisfied.'] : reasons,
  };
}
