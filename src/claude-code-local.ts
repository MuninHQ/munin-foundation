import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Claude-first reasoning layer: answers free-form questions through the owner's local Claude Code
// (subscription, no API key). Claude gets no tools, no session, no MCP and no user settings: it only reads
// the sanitized snapshot it is given and replies with text. Any failure returns undefined so callers fall back.

export interface ClaudeRunOptions { input: string; timeoutMs: number; cwd: string }
export type ClaudeRunner = (args: string[], opts: ClaudeRunOptions) => Promise<{ stdout: string }>;
type Env = Record<string, string | undefined>;
export interface ClaudeCodeDeps { runner?: ClaudeRunner; env?: Env }

const TIMEOUT_MS = 90_000;
const MAX_ANSWER = 16_000;
const MAX_STDOUT = 1_000_000;
const SECRET_KEY = /token|secret|password|passwd|api.?key|authorization|cookie|credential|e-?mail|body|snippet|phone/i;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

const SYSTEM_PROMPT = [
  'Você é Huginn, a camada de raciocínio do Munin, o sistema pessoal de inteligência de André Jardim.',
  'Responda em português do Brasil, de forma direta e executiva, com no máximo alguns parágrafos curtos ou uma lista.',
  'Você não tem ferramentas: não leia arquivos, não execute comandos e não escreva chamadas de ferramenta. Responda apenas com texto.',
  'Use somente o snapshot fornecido e o seu conhecimento geral. Se faltar informação no snapshot, diga o que falta em vez de inventar.',
  'Você não executa mudanças. Quando a resposta pedir uma ação no Munin, sugira o comando local exato (por exemplo "criar ação: …").',
].join('\n');

export function claudeArgs(): string[] {
  return ['-p', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--setting-sources', '', '--system-prompt', SYSTEM_PROMPT];
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.replace(EMAIL, '[email]').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) return value.slice(0, 8).map(v => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) if (!SECRET_KEY.test(key)) out[key] = sanitize(v, depth + 1);
    return out;
  }
  return undefined;
}

export function buildClaudePrompt(question: string, snapshot: unknown): string {
  return ['PERGUNTA DO OPERADOR:', question.trim().slice(0, 4000), '', 'SNAPSHOT DO MUNIN (sanitizado, sem credenciais):', JSON.stringify(sanitize(snapshot), null, 2)].join('\n');
}

function executable(env: Env): string {
  if (env.MUNIN_CLAUDE_CODE_BIN) return env.MUNIN_CLAUDE_CODE_BIN;
  // On Windows the npm "claude" shim is a .cmd that needs a shell; call the packaged binary directly instead.
  const npmExe = env.APPDATA ? join(env.APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe') : '';
  return process.platform === 'win32' && npmExe && existsSync(npmExe) ? npmExe : 'claude';
}

function isolatedCwd(): string {
  const dir = join(tmpdir(), 'munin-claude');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function spawnRunner(env: Env): ClaudeRunner {
  return (args, opts) => new Promise((resolve, reject) => {
    const child = spawn(executable(env), args, { cwd: opts.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    let stdout = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('claude timed out')); }, opts.timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { if (stdout.length < MAX_STDOUT) stdout += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve({ stdout }) : reject(new Error(`claude exited with ${code}`)); });
    child.stdin.end(opts.input);
  });
}

// node --test sets NODE_TEST_CONTEXT: suites never spend the owner's subscription unless they opt in explicitly.
const disabled = (env: Env) => /^(off|0|false|no)$/i.test(env.MUNIN_CLAUDE_CODE ?? '') || (Boolean(env.NODE_TEST_CONTEXT) && env.MUNIN_CLAUDE_CODE !== 'on');

export async function askClaudeCode(question: string, snapshot: unknown, deps: ClaudeCodeDeps = {}): Promise<string | undefined> {
  const env = deps.env ?? process.env;
  if (disabled(env) || !question.trim()) return undefined;
  const runner = deps.runner ?? spawnRunner(env);
  try {
    const { stdout } = await runner(claudeArgs(), { input: buildClaudePrompt(question, snapshot), timeoutMs: TIMEOUT_MS, cwd: isolatedCwd() });
    const parsed = JSON.parse(stdout) as { is_error?: boolean; result?: unknown };
    const answer = typeof parsed.result === 'string' ? parsed.result.trim() : '';
    return parsed.is_error || !answer ? undefined : answer.slice(0, MAX_ANSWER);
  } catch {
    return undefined;
  }
}

export async function claudeCodeStatus(deps: ClaudeCodeDeps = {}): Promise<{ available: boolean; version?: string; disabled?: boolean }> {
  const env = deps.env ?? process.env;
  if (disabled(env)) return { available: false, disabled: true };
  try {
    const { stdout } = await (deps.runner ?? spawnRunner(env))(['--version'], { input: '', timeoutMs: 10_000, cwd: isolatedCwd() });
    const version = stdout.trim().split(/\r?\n/)[0];
    return version ? { available: true, version } : { available: false };
  } catch {
    return { available: false };
  }
}
