#!/usr/bin/env node
// Project PreToolUse guard (.claude/settings.json). Applies only to the neo subagent
// (hook input agent_type === 'neo'): writes only inside templates/content-team/ and never
// with content that looks like a credential. Exit 2 blocks the tool call.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk|rk)-[A-Za-z0-9_-]{20,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/,
  /\b(?:password|passwd|senha|api[_-]?key|secret|token)\s*[:=]\s*['"]?[^\s'"<>]{8,}/i,
];

export function checkNeoWrite(input, projectDir) {
  if (input.agent_type !== 'neo') return null;
  const toolInput = input.tool_input ?? {};
  const filePath = toolInput.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) return 'neo-write-guard: file_path ausente.';
  const root = path.resolve(projectDir);
  const allowed = path.join(root, 'templates', 'content-team');
  const target = path.resolve(input.cwd ?? root, filePath);
  const relative = path.relative(allowed, target);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    return `neo-write-guard: Neo só pode escrever em templates/content-team/ (recebido: ${filePath}). Proponha a alteração ao coordenador.`;
  }
  const text = [toolInput.content, toolInput.new_string].filter(value => typeof value === 'string').join('\n');
  if (SECRET_PATTERNS.some(pattern => pattern.test(text))) {
    return 'neo-write-guard: o conteúdo parece conter um segredo ou credencial. Remova-o ou troque por um campo <entre sinais>.';
  }
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stderr.write('neo-write-guard: entrada inválida; escrita bloqueada.\n');
    process.exit(2);
  }
  const reason = checkNeoWrite(input, process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd());
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
