import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { SkillRegistry } from '../src/skills.js';
import { loadEngineeringSkillContext } from '../src/engineering-skill-context.js';

const root = process.cwd();

test('recent signal objectives select governed recency research guidance', async () => {
  const registry = new SkillRegistry(path.join(root, 'skills'));
  const matches = await registry.match('pesquise notícias e tendências dos últimos 30 dias sobre stablecoins', 5);
  assert.equal(matches.some(skill => skill.name === 'recent-signal-research'), true);
  const loaded = await registry.load('recent-signal-research');
  assert.match(loaded.instructions, /source coverage/i);
  assert.match(loaded.instructions, /primary sources/i);
  assert.match(loaded.instructions, /no-material-signal/i);
});

test('LinkedIn drafting selects editorial voice and preserves publication governance', async () => {
  const registry = new SkillRegistry(path.join(root, 'skills'));
  const matches = await registry.match('reescrever e humanizar meu próximo post do LinkedIn', 5);
  assert.equal(matches.some(skill => skill.name === 'editorial-voice'), true);
  const loaded = await registry.load('editorial-voice');
  assert.match(loaded.instructions, /never invent/i);
  assert.match(loaded.instructions, /do not add AJ/i);
  assert.match(loaded.instructions, /never bypasses approval/i);
});

test('design guidance includes critique and motion restraint without adding dependencies', async () => {
  const context = await loadEngineeringSkillContext(root, 'polish the responsive frontend design and animation', 3);
  assert.equal(context.names.includes('ui-ux-pro-max'), true);
  assert.match(context.text, /two explicit critique passes/i);
  assert.match(context.text, /Add no animation library solely for polish/i);
});

test('new adaptations remain local-only and safe for autonomous context loading', async () => {
  const registry = new SkillRegistry(path.join(root, 'skills'));
  for (const name of ['recent-signal-research', 'editorial-voice']) {
    const skill = await registry.load(name);
    assert.deepEqual(skill.permissions, ['read', 'local-write']);
    assert.equal(skill.permissions.includes('external-write'), false);
  }
});
