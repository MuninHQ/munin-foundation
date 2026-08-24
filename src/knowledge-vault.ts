import path from 'node:path';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { runtimePath } from './config.js';
import { loadContextMemory, type ContextSection } from './context-memory.js';

export type KnowledgeKind = 'note' | 'career' | 'linkedin' | 'research' | 'munin' | 'project' | 'context';
export type KnowledgeScope = 'public-professional' | 'private-operational' | 'sensitive-private';

export type KnowledgeCapture = {
  title: string;
  body: string;
  kind?: KnowledgeKind;
  tags?: string[];
  source?: string;
  scope?: KnowledgeScope;
  links?: string[];
};

export type VaultStatus = {
  root: string;
  exists: boolean;
  markdownFiles: number;
  folders: number;
  contextExports: number;
};

const folders = [
  '00 Inbox',
  '01 Career/Empresas',
  '01 Career/Vagas',
  '01 Career/Entrevistas',
  '01 Career/Pessoas',
  '01 Career/Cases',
  '02 LinkedIn Studio/Publicados',
  '02 LinkedIn Studio/Agendados',
  '02 LinkedIn Studio/Ideias',
  '02 LinkedIn Studio/Teses',
  '02 LinkedIn Studio/Fontes',
  '03 Research/IA',
  '03 Research/Digital Assets',
  '03 Research/Drex',
  '03 Research/Stablecoins',
  '03 Research/Blockchain',
  '03 Research/Financial Infrastructure',
  '04 Munin/Arquitetura',
  '04 Munin/Decisoes',
  '04 Munin/Features',
  '04 Munin/Bugs',
  '04 Munin/Changelog',
  '05 Projects',
  '90 Context Memory',
  '99 Templates',
];

export function knowledgeVaultRoot(): string {
  return path.resolve(process.env.MUNIN_OBSIDIAN_VAULT ?? runtimePath('knowledge-vault'));
}

function slug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function frontmatter(meta: Record<string, string | string[] | number | boolean | undefined>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${yamlString(item)}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${yamlString(value)}`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function folderFor(kind: KnowledgeKind): string {
  switch (kind) {
    case 'career': return '01 Career';
    case 'linkedin': return '02 LinkedIn Studio/Ideias';
    case 'research': return '03 Research';
    case 'munin': return '04 Munin';
    case 'project': return '05 Projects';
    case 'context': return '90 Context Memory';
    default: return '00 Inbox';
  }
}

async function writeIfMissing(file: string, content: string): Promise<void> {
  try { await stat(file); } catch { await writeFile(file, content, 'utf8'); }
}

export async function initKnowledgeVault(): Promise<{ root: string; createdFolders: number }> {
  const root = knowledgeVaultRoot();
  await mkdir(root, { recursive: true });
  for (const folder of folders) await mkdir(path.join(root, folder), { recursive: true });
  await mkdir(path.join(root, '.obsidian'), { recursive: true });

  await writeIfMissing(path.join(root, 'README.md'), `# Munin Knowledge Vault\n\nEste vault e a camada humana de conhecimento do Munin.\n\n- Munin Context Memory continua sendo a fonte de verdade operacional.\n- Este vault recebe notas, pesquisas e projecoes Markdown para navegacao no Obsidian.\n- Nao edite arquivos em \`90 Context Memory\` esperando que alterem automaticamente a Context Memory do Munin.\n- Conteudo sensivel nao e exportado por padrao.\n`);

  await writeIfMissing(path.join(root, '99 Templates', 'Nota.md'), `${frontmatter({ kind: 'note', status: 'active', created: '{{date}}', tags: [] })}# {{title}}\n\n## Contexto\n\n## Insight\n\n## Proxima acao\n`);
  await writeIfMissing(path.join(root, '99 Templates', 'Pesquisa.md'), `${frontmatter({ kind: 'research', status: 'active', created: '{{date}}', tags: ['research'] })}# {{title}}\n\n## Pergunta\n\n## Evidencias\n\n## Conclusao\n\n## Fontes\n`);
  await writeIfMissing(path.join(root, '99 Templates', 'Entrevista.md'), `${frontmatter({ kind: 'career', status: 'active', created: '{{date}}', tags: ['career', 'interview'] })}# {{title}}\n\n## Empresa e vaga\n\n## Pessoas\n\n## Hipoteses\n\n## Cases relevantes\n\n## Perguntas\n\n## Follow-up\n`);
  await writeIfMissing(path.join(root, '99 Templates', 'LinkedIn.md'), `${frontmatter({ kind: 'linkedin', status: 'idea', created: '{{date}}', tags: ['linkedin'] })}# {{title}}\n\n## Tese\n\n## Evidencia\n\n## Angulo\n\n## Rascunho\n\n## Fontes\n`);

  return { root, createdFolders: folders.length };
}

export async function captureKnowledge(input: KnowledgeCapture): Promise<{ file: string }> {
  await initKnowledgeVault();
  const root = knowledgeVaultRoot();
  const kind = input.kind ?? 'note';
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const base = `${stamp}-${slug(input.title)}`;
  const dir = path.join(root, folderFor(kind));
  await mkdir(dir, { recursive: true });
  let file = path.join(dir, `${base}.md`);
  let suffix = 2;
  while (true) {
    try { await stat(file); file = path.join(dir, `${base}-${suffix++}.md`); } catch { break; }
  }
  const links = (input.links ?? []).map(x => `[[${x}]]`).join(' ');
  const content = `${frontmatter({
    kind,
    scope: input.scope ?? 'private-operational',
    source: input.source ?? 'munin',
    created: now.toISOString(),
    updated: now.toISOString(),
    tags: input.tags ?? [],
  })}# ${input.title}\n\n${input.body.trim()}\n${links ? `\n## Links\n\n${links}\n` : ''}`;
  await writeFile(file, content, 'utf8');
  return { file };
}

function renderContextSection(section: ContextSection): string {
  return `${frontmatter({
    kind: 'context',
    key: section.key,
    scope: section.scope,
    confidence: section.confidence,
    freshness: section.freshness,
    source: section.source,
    updated: section.updatedAt,
    version: section.version,
    generated_by: 'munin-context-memory-export',
  })}# ${section.key}\n\n> Gerado automaticamente pela Context Memory do Munin.\n\n\`\`\`json\n${JSON.stringify(section.value, null, 2)}\n\`\`\`\n`;
}

export async function exportContextToVault(options: { includeSensitive?: boolean } = {}): Promise<{ exported: string[]; skippedSensitive: string[] }> {
  await initKnowledgeVault();
  const state = await loadContextMemory();
  const dir = path.join(knowledgeVaultRoot(), '90 Context Memory');
  const exported: string[] = [];
  const skippedSensitive: string[] = [];
  for (const section of Object.values(state.sections)) {
    if (section.scope === 'sensitive-private' && !options.includeSensitive) {
      skippedSensitive.push(section.key);
      continue;
    }
    const file = path.join(dir, `${slug(section.key)}.md`);
    await writeFile(file, renderContextSection(section), 'utf8');
    exported.push(file);
  }
  const index = `${frontmatter({ kind: 'context', generated: new Date().toISOString(), count: exported.length })}# Context Memory Index\n\n${Object.values(state.sections)
    .filter(s => options.includeSensitive || s.scope !== 'sensitive-private')
    .map(s => `- [[${slug(s.key)}|${s.key}]] — ${s.scope} / ${s.freshness}`)
    .join('\n')}\n`;
  await writeFile(path.join(dir, '_index.md'), index, 'utf8');
  return { exported, skippedSensitive };
}

async function walkMarkdown(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name === '.obsidian') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

export async function searchKnowledgeVault(query: string, limit = 20): Promise<{ file: string; score: number; excerpt: string }[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const root = knowledgeVaultRoot();
  const files = await walkMarkdown(root);
  const matches: { file: string; score: number; excerpt: string }[] = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const hay = `${path.basename(file)} ${content}`.toLowerCase();
    const score = terms.reduce((n, term) => n + (hay.includes(term) ? 1 : 0), 0);
    if (!score) continue;
    const plain = content.replace(/^---[\s\S]*?---\s*/m, '').replace(/\s+/g, ' ').trim();
    matches.push({ file: path.relative(root, file), score, excerpt: plain.slice(0, 240) });
  }
  return matches.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file)).slice(0, limit);
}

export async function knowledgeVaultStatus(): Promise<VaultStatus> {
  const root = knowledgeVaultRoot();
  try { await stat(root); } catch { return { root, exists: false, markdownFiles: 0, folders: 0, contextExports: 0 }; }
  const files = await walkMarkdown(root);
  let foldersCount = 0;
  async function countDirs(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== '.obsidian') { foldersCount++; await countDirs(path.join(dir, entry.name)); }
    }
  }
  await countDirs(root);
  return {
    root,
    exists: true,
    markdownFiles: files.length,
    folders: foldersCount,
    contextExports: files.filter(f => f.includes(`${path.sep}90 Context Memory${path.sep}`) && path.basename(f) !== '_index.md').length,
  };
}
