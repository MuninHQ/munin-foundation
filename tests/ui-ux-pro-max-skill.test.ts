import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { SkillRegistry } from '../src/skills.js';
import { loadEngineeringSkillContext } from '../src/engineering-skill-context.js';

test('ui ux objectives select the Munin UI UX skill', async () => {
  const registry = new SkillRegistry(path.join(process.cwd(), 'skills'));
  const matches = await registry.match('redesign the mobile dashboard UI with responsive layout and accessibility fixes', 5);
  assert.equal(matches.some(skill => skill.name === 'ui-ux-pro-max'), true);
});

test('engineering context loads UI UX guidance for frontend work', async () => {
  const context = await loadEngineeringSkillContext(
    process.cwd(),
    'build responsive React dashboard components and improve accessibility of the mobile interface',
    3,
  );
  assert.equal(context.names.includes('ui-ux-pro-max'), true);
  assert.match(context.text, /Munin visual direction/);
  assert.match(context.text, /BRAND_CANON\.md/);
});

test('unrelated backend objective does not match the UI UX skill', async () => {
  const registry = new SkillRegistry(path.join(process.cwd(), 'skills'));
  const matches = await registry.match('repair postgres lease fencing and transactional outbox recovery', 5);
  assert.equal(matches.some(skill => skill.name === 'ui-ux-pro-max'), false);
});
