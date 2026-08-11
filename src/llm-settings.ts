import { readFile, unlink } from 'node:fs/promises';
import { runtimePath } from './config.js';
import { writeJsonAtomic } from './storage.js';

export type LlmProviderType = 'openai-compatible' | 'anthropic';

export type LlmSettings = {
  enabled: boolean;
  provider: LlmProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt: string;
};

export type PublicLlmSettings = Omit<LlmSettings, 'apiKey'> & { hasApiKey: boolean; apiKeyHint?: string };

const file = () => runtimePath('llm-settings.json');
const empty = (): LlmSettings => ({ enabled: false, provider: 'openai-compatible', baseUrl: '', apiKey: '', model: '', updatedAt: new Date(0).toISOString() });

export async function loadLlmSettings(): Promise<LlmSettings> {
  try {
    const parsed = JSON.parse(await readFile(file(), 'utf8')) as Partial<LlmSettings>;
    return {
      enabled: parsed.enabled === true,
      provider: parsed.provider === 'anthropic' ? 'anthropic' : 'openai-compatible',
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return empty();
  }
}

export function publicLlmSettings(settings: LlmSettings): PublicLlmSettings {
  const apiKeyHint = settings.apiKey ? `${settings.apiKey.slice(0, 3)}…${settings.apiKey.slice(-4)}` : undefined;
  const { apiKey: _apiKey, ...safe } = settings;
  return { ...safe, hasApiKey: Boolean(settings.apiKey), apiKeyHint };
}

export async function saveLlmSettings(input: { enabled?: boolean; provider?: LlmProviderType; baseUrl?: string; apiKey?: string; model?: string }): Promise<PublicLlmSettings> {
  const current = await loadLlmSettings();
  const next: LlmSettings = {
    enabled: input.enabled ?? current.enabled,
    provider: input.provider ?? current.provider,
    baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl.trim(),
    apiKey: input.apiKey === undefined || input.apiKey === '' ? current.apiKey : input.apiKey.trim(),
    model: input.model === undefined ? current.model : input.model.trim(),
    updatedAt: new Date().toISOString(),
  };
  if (next.enabled && (!next.baseUrl || !next.apiKey || !next.model)) throw new Error('Base URL, API key e modelo são obrigatórios para ativar o provider.');
  if (next.baseUrl) {
    try { new URL(next.baseUrl); } catch { throw new Error('Base URL inválida.'); }
  }
  await writeJsonAtomic(file(), next);
  return publicLlmSettings(next);
}

export async function deleteLlmSettings(): Promise<PublicLlmSettings> {
  try { await unlink(file()); } catch { /* already absent */ }
  return publicLlmSettings(empty());
}
