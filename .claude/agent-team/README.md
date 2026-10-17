# Equipe de conteúdo e produtos — protocolo do coordenador

Subagentes nativos do Claude Code em `.claude/agents/`. A sessão principal do Claude Code é o **coordenador**: lê o pedido, monta o briefing único, aciona só os agentes necessários, consolida e revisa. Os subagentes não acionam uns aos outros.

| Agente | Função | Ferramentas |
|---|---|---|
| `steve` | Pesquisa de público, problemas e ideias, com fontes | Read, Grep, Glob, WebSearch, WebFetch |
| `lexa` | Carrosséis, posts e legendas | Read, Grep, Glob |
| `lumi` | Copy de ofertas, páginas e e-mails | Read, Grep, Glob |
| `ravi` | Roteiros de vídeos curtos | Read, Grep, Glob |
| `zion` | Posicionamento, perfil e revisão crítica | Read, Grep, Glob, WebFetch |
| `maya` | Definição de produto e hipóteses comerciais | Read, Grep, Glob |
| `neo` | Fluxos aprovados → templates | Read, Grep, Glob, Write, Edit |

Nenhum agente tem Bash, ferramentas MCP de contas externas (e-mail, redes, geração de mídia) ou permissão de publicar. Somente Neo escreve arquivos, e apenas em `.claude/agent-team/templates/`.

## Fluxo do coordenador

1. Ler o pedido e preencher `BRIEFING.md` (um briefing por tarefa, compartilhado por todos os agentes).
2. Escolher o roteiro mínimo:
   - Post/carrossel: `steve` → `lexa` → revisão (`zion` ou coordenador).
   - Vídeo curto: `steve` → `ravi` (ou `lexa` → `ravi` para adaptar peça aprovada).
   - Oferta/página/e-mail: `steve` → `maya` → `lumi` → revisão.
   - Perfil/posicionamento: `zion` (com `steve` só se faltar contexto de público).
   - Fluxo aprovado pelo usuário: `neo`.
3. Passar a cada agente o briefing completo e as entregas anteriores relevantes (eles não veem a conversa).
4. Consolidar: fontes, premissas e pendências de todas as entregas aparecem no resultado final.
5. Salvar a execução em `data/runtime/content-team/<data>-<slug>/` (ignorado pelo Git, pode conter contexto privado). Só versionar exemplos fictícios ou aprovados para isso.

## Regras de execução

- **Sequencial por padrão.** No máximo **dois** subagentes simultâneos, e apenas quando as tarefas forem independentes (ex.: `steve` pesquisando enquanto `zion` analisa um perfil já fornecido).
- Não habilitar Agent Teams experimental, serviços pagos, instaladores ou novas dependências sem necessidade comprovada e aprovação do usuário.
- Pesquisa sem acesso à internet é marcada como **NÃO VERIFICADA**.
- **Publicações, envios de mensagens/e-mails, agendamentos e alterações em contas externas dependem de pedido explícito do usuário** para aquela ação específica. Aprovar um texto não autoriza publicá-lo.
- Textos em nome do André seguem `skills/editorial-voice/SKILL.md`; pesquisa de sinais recentes segue `skills/recent-signal-research/SKILL.md`; o experimento de YouTube segue `skills/yt-lab/SKILL.md` e `agents/viral-engine.md`.

## Relação com os agentes Munin existentes

`agents/*.md` descreve os papéis operacionais do runtime Munin (orchestrator, researcher, viral-engine etc.) e não é carregado pelo Claude Code. Esta equipe reaproveita as regras de evidência de `agents/researcher.md` e os gates do Viral Engine em vez de duplicá-los.

## Exemplo

`examples/2026-10-17-carrossel-linkedin-divergencias/` contém o teste de configuração com briefing fictício (pesquisa, carrossel e revisão crítica; não publicado).

## Licença

Partes das instruções foram adaptadas de [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) (MIT). Ver `THIRD_PARTY_NOTICES.md`.
