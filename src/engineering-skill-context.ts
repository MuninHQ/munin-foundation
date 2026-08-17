import path from 'node:path';
import { SkillRegistry, type LoadedSkill } from './skills.js';

export interface EngineeringSkillContext {
  names: string[];
  text: string;
  skippedElevated: string[];
}

function safeForAutonomousEngineering(skill: LoadedSkill): boolean {
  return !skill.permissions.includes('external-write');
}

export async function loadEngineeringSkillContext(
  repositoryRoot: string,
  objective: string,
  limit = 3,
): Promise<EngineeringSkillContext> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new Error('Engineering skill limit must be an integer between 1 and 5.');
  const registry = new SkillRegistry(path.join(repositoryRoot, 'skills'));
  const metadata = await registry.match(objective, Math.min(5, limit + 2));
  const loaded: LoadedSkill[] = [];
  const skippedElevated: string[] = [];

  for (const candidate of metadata) {
    const skill = await registry.load(candidate.name);
    if (!safeForAutonomousEngineering(skill)) {
      skippedElevated.push(skill.name);
      continue;
    }
    loaded.push(skill);
    if (loaded.length >= limit) break;
  }

  let budget = 12_000;
  const blocks: string[] = [];
  for (const skill of loaded) {
    if (budget <= 0) break;
    const header = `SKILL: ${skill.name} v${skill.version}\nSOURCE: ${skill.source}\nPERMISSIONS: ${skill.permissions.join(',') || 'none'}\n`;
    const body = skill.instructions.slice(0, Math.max(0, budget - header.length));
    blocks.push(`${header}${body}`);
    budget -= header.length + body.length;
  }

  return { names: loaded.map(skill => skill.name), text: blocks.join('\n\n---\n\n'), skippedElevated };
}
