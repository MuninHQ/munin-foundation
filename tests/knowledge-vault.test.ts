import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { captureKnowledge, initKnowledgeVault, knowledgeVaultStatus, searchKnowledgeVault } from '../src/knowledge-vault.js';

test('knowledge vault initializes an Obsidian-compatible local structure', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'munin-vault-'));
  const previous = process.env.MUNIN_OBSIDIAN_VAULT;
  process.env.MUNIN_OBSIDIAN_VAULT = temp;
  try {
    const initialized = await initKnowledgeVault();
    assert.equal(initialized.root, temp);
    const readme = await readFile(path.join(temp, 'README.md'), 'utf8');
    assert.match(readme, /Munin Knowledge Vault/);
    const status = await knowledgeVaultStatus();
    assert.equal(status.exists, true);
    assert.ok(status.folders >= 20);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OBSIDIAN_VAULT;
    else process.env.MUNIN_OBSIDIAN_VAULT = previous;
    await rm(temp, { recursive: true, force: true });
  }
});

test('knowledge vault captures and searches Markdown notes', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'munin-vault-'));
  const previous = process.env.MUNIN_OBSIDIAN_VAULT;
  process.env.MUNIN_OBSIDIAN_VAULT = temp;
  try {
    const captured = await captureKnowledge({
      title: 'Tokenizacao na B3',
      body: 'Pesquisa sobre ativos digitais, infraestrutura e tokenizacao.',
      kind: 'research',
      tags: ['digital-assets', 'b3'],
      links: ['Drex', 'Stablecoins'],
    });
    assert.match(captured.file, /03 Research/);
    const content = await readFile(captured.file, 'utf8');
    assert.match(content, /\[\[Drex\]\]/);
    const results = await searchKnowledgeVault('tokenizacao ativos digitais');
    assert.ok(results.length >= 1);
    assert.match(results[0].excerpt, /Tokenizacao na B3/);
  } finally {
    if (previous === undefined) delete process.env.MUNIN_OBSIDIAN_VAULT;
    else process.env.MUNIN_OBSIDIAN_VAULT = previous;
    await rm(temp, { recursive: true, force: true });
  }
});
