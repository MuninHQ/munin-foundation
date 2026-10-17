import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
  return Object.fromEntries(match[1].split('\n').map(line => {
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
