# Munin Coordenador (mod do Claude Code)

O Munin governa; o mod observa, apresenta e encaminha. O status vem do runtime canônico, a execução passa pelo `ExecutionEngine` sob o Provider Registry, a política pela Action Constitution e a continuidade pelo Memory Ledger. Nenhuma chamada a modelo é feita para contar, consultar ou reportar status.

## Peças

- `src/coordinator.ts`: status canônico (`buildCoordinatorStatus`), SITREP determinístico com três próximos passos (`coordinatorSitrep`) e delegação delimitada (`delegateTask`), com ledger em `data/runtime/coordinator/delegations.json`.
- `src/coordinator-cli.ts`: CLI `status|sitrep [--json]` e `delegate`; saída 0 ok, 2 recusado/bloqueado/indisponível, 1 erro inesperado. Script npm: `npm run coordinator -- <comando>`.
- `tests/coordinator.test.ts`: testes do núcleo em runtime temporário.
- `integrations/claude-code/`: marketplace local `munin-local` e o mod `munin-coordenador` (painel, linha de status, comandos e testes do mod).

## Comandos no Claude Code

- `/munin`: abre o painel (fontes, aprovações, trabalho, delegações, projetos, atenção e disponibilidade do Habblaud).
- `/munin-sitrep`: resumo e três próximos passos a partir do runtime canônico.
- `/munin-delegar [--tier deterministic|local|economy|strong] [--justificar "por quê"] <objetivo>`: delega uma tarefa delimitada.
- `/munin-atualizar`: relê o status agora.

## Regras da delegação

- Só autorização humana: origem `composer` ou `bridge` no mod, `--authorized-via composer|bridge|cli` na CLI. Sessões pares, plugins, agendamentos e SDK são recusados.
- Objetivos consequenciais ou com efeito externo (enviar, publicar, candidatar, pagar, apagar, deploy, e-mail, LinkedIn etc.) são recusados antes de qualquer execução; a Action Constitution continua sendo a autoridade.
- Determinístico primeiro. `local` exige Ollama pronto; `economy`/`strong` exigem provedor externo de custo zero registrado; `strong` exige justificativa de 20+ caracteres. Executor indisponível é reportado como bloqueado, nunca substituído em silêncio.
- No máximo 2 delegações simultâneas (ledger com lock); execuções presas além de 30 min são marcadas como interrompidas.
- O coordenador nunca aprova nem altera aprovações pendentes.

## Instalar (local, reversível)

```
npm run build:core
claude plugin marketplace add D:\Dev\munin-foundation-git\integrations\claude-code --scope user
claude plugin install munin-coordenador@munin-local --scope user
```

Testar sem instalar: `claude --plugin-dir D:\Dev\munin-foundation-git\integrations\claude-code\munin-coordenador`.

## Desfazer

```
claude plugin uninstall munin-coordenador@munin-local --scope user
claude plugin marketplace remove munin-local
```

## Validação

- `npm run build:core && node --test dist/tests/coordinator.test.js`, depois `npm test`.
- `claude plugin validate integrations/claude-code` e `claude plugin test integrations/claude-code/munin-coordenador`.
- Smoke de delegação sempre em runtime isolado (`MUNIN_DATA_DIR` temporário).
