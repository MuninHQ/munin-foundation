import { captureKnowledge, exportContextToVault, initKnowledgeVault, knowledgeVaultStatus, searchKnowledgeVault } from './knowledge-vault.js';

function value(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'status';

  if (command === 'init') {
    console.log(JSON.stringify(await initKnowledgeVault(), null, 2));
    return;
  }
  if (command === 'status') {
    console.log(JSON.stringify(await knowledgeVaultStatus(), null, 2));
    return;
  }
  if (command === 'export-context') {
    console.log(JSON.stringify(await exportContextToVault({ includeSensitive: args.includes('--include-sensitive') }), null, 2));
    return;
  }
  if (command === 'search') {
    const query = args.slice(1).join(' ').trim();
    if (!query) throw new Error('Uso: knowledge:vault search <consulta>');
    console.log(JSON.stringify(await searchKnowledgeVault(query), null, 2));
    return;
  }
  if (command === 'capture') {
    const title = value(args, '--title');
    const body = value(args, '--body');
    if (!title || !body) throw new Error('Uso: knowledge:vault capture --title "..." --body "..." [--kind research] [--tags a,b] [--scope private-operational]');
    const kind = value(args, '--kind') as any;
    const scope = value(args, '--scope') as any;
    const tags = value(args, '--tags')?.split(',').map(x => x.trim()).filter(Boolean);
    const links = value(args, '--links')?.split(',').map(x => x.trim()).filter(Boolean);
    console.log(JSON.stringify(await captureKnowledge({ title, body, kind, scope, tags, links, source: value(args, '--source') ?? 'cli' }), null, 2));
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
