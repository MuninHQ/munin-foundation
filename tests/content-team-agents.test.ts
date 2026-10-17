import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const agentsDir = path.join(process.cwd(), '.claude', 'agents');
const team: Record<string, string[]> = {
  steve: ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'],
  lexa: ['Read', 'Grep', 'Glob'],
  lumi: ['Read', 'Grep', 'Glob'],
  ravi: ['Read', 'Grep', 'Glob'],
  zion: ['Read', 'Grep', 'Glob', 'WebFetch'],
  maya: ['Read', 'Grep', 'Glob'],
  neo: ['Read', 'Grep', 'Glob', 'Write', 'Edit'],
};

function frontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'missing YAML frontmatter');
  return Object.fromEntries(match[1].split('\n').filter(line => /^[a-z]/i.test(line)).map(line => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
}

for (const [name, tools] of Object.entries(team)) {
  test(`content team agent ${name} has scoped tools and the shared output contract`, async () => {
    const text = await readFile(path.join(agentsDir, `${name}.md`), 'utf8');
    const meta = frontmatter(text);
    assert.equal(meta.name, name);
    assert.ok(meta.description.length > 40);
    assert.deepEqual(meta.tools.split(',').map(tool => tool.trim()), tools);
    for (const section of ['## Objetivo', '## Entradas', '## Entregável', '## Critérios de qualidade']) {
      assert.match(text, new RegExp(section));
    }
    for (const field of ['Fontes', 'Premissas', 'Pendências']) assert.match(text, new RegExp(field));
    assert.match(text, /MIT License, Copyright \(c\) 2025 AgentLand Contributors/);
  });
}

test('content team keeps the upstream MIT notice', async () => {
  const notice = await readFile(path.join(process.cwd(), '.claude', 'agent-team', 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notice, /Permission is hereby granted, free of charge/);
  assert.match(notice, /Copyright \(c\) 2025 AgentLand Contributors/);
});

const guard = path.join(process.cwd(), '.claude', 'hooks', 'neo-write-guard.mjs');

function runGuard(input: Record<string, unknown>): number | null {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ cwd: process.cwd(), ...input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() },
    encoding: 'utf8',
  });
  return result.status;
}

test('neo write guard is registered as a project PreToolUse hook', async () => {
  const settings = JSON.parse(await readFile(path.join(process.cwd(), '.claude', 'settings.json'), 'utf8'));
  const entries = settings.hooks.PreToolUse as Array<{ matcher: string; hooks: Array<{ command: string }> }>;
  assert.ok(entries.some(entry => entry.matcher === 'Write|Edit' && entry.hooks.some(hook => hook.command.includes('neo-write-guard.mjs'))));
});

test('neo write guard confines neo to templates/content-team and blocks credentials', () => {
  const inside = path.join('templates', 'content-team', 'fluxo.md');
  assert.equal(runGuard({ agent_type: 'neo', tool_input: { file_path: inside, content: 'ok' } }), 0);
  assert.equal(runGuard({ agent_type: 'neo', tool_input: { file_path: 'CLAUDE.md', content: 'ok' } }), 2);
  assert.equal(runGuard({ agent_type: 'neo', tool_input: { file_path: path.join('templates', 'content-team', '..', 'x.md'), new_string: 'ok' } }), 2);
  assert.equal(runGuard({ agent_type: 'neo', tool_input: { file_path: inside, content: 'api_key: abcd1234efgh5678' } }), 2);
  assert.equal(runGuard({ agent_type: 'neo', tool_input: { file_path: inside, content: '-----BEGIN RSA PRIVATE KEY-----' } }), 2);
});

test('neo write guard ignores the main session and other agents', () => {
  assert.equal(runGuard({ tool_input: { file_path: 'CLAUDE.md', content: 'ok' } }), 0);
  assert.equal(runGuard({ agent_type: 'lexa', tool_input: { file_path: 'CLAUDE.md', content: 'ok' } }), 0);
});
