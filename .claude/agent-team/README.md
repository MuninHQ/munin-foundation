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

Nenhum agente tem Bash, ferramentas MCP de contas externas (e-mail, redes, geração de mídia) ou permissão de publicar. Somente Neo escreve arquivos, e apenas em `templates/content-team/`; isso é imposto pelo hook `PreToolUse` do projeto (`.claude/settings.json` → `.claude/hooks/neo-write-guard.mjs`, ativo só quando `agent_type` é `neo`) (bloqueia caminhos fora da pasta e conteúdo com aparência de segredo), não só pelas instruções.

## Fluxo do coordenador

1. Ler o pedido e preencher `BRIEFING.md` (um briefing por tarefa, compartilhado por todos os agentes).
2. Escolher o roteiro mínimo:
   - Post/carrossel: `steve` → `lexa` → revisão (`zion` ou coordenador).
   - Vídeo curto: `steve` → `ravi` (ou `lexa` → `ravi` para adaptar peça aprovada).
   - Oferta/página/e-mail: `steve` → `maya` → `lumi` → revisão.
   - Perfil/posicionamento: `zion` (com `steve` só se faltar contexto de público).
   - Fluxo aprovado pelo usuário: `neo`.
3. Passar a cada agente o briefing completo e as entregas anteriores relevantes (eles não veem a conversa). Ao restringir ações, proibir explicitamente só o que é proibido (publicar, enviar, escrever); não escrever "não rode nada", que leva agentes a deixar de ler skills de referência.
4. Consolidar: fontes, premissas e pendências de todas as entregas aparecem no resultado final.
5. Salvar a execução em `data/runtime/content-team/<data>-<slug>/` (ignorado pelo Git, pode conter contexto privado). Só versionar exemplos fictícios ou aprovados para isso. Templates ficam fora de `.claude/` porque o Claude Code trata essa pasta como sensível e pede aprovação a cada escrita.

## Regras de execução

- **Sequencial por padrão.** No máximo **dois** subagentes simultâneos, e apenas quando as tarefas forem independentes (ex.: `steve` pesquisando enquanto `zion` analisa um perfil já fornecido).
- Não habilitar Agent Teams experimental, serviços pagos, instaladores ou novas dependências sem necessidade comprovada e aprovação do usuário.
- Pesquisa sem acesso à internet é marcada como **NÃO VERIFICADA**.
- **Publicações, envios de mensagens/e-mails, agendamentos e alterações em contas externas dependem de pedido explícito do usuário** para aquela ação específica. Aprovar um texto não autoriza publicá-lo.
- Textos em nome do André seguem `skills/editorial-voice/SKILL.md`; pesquisa de sinais recentes segue `skills/recent-signal-research/SKILL.md`; o experimento de YouTube segue `skills/yt-lab/SKILL.md` e `agents/viral-engine.md`.

## Memória

Não há memória própria por agente (campo `memory` dos subagentes). `AGENTS.md` exige usar o estado canônico do Munin em vez de memórias paralelas: aprendizados duráveis da equipe entram via `npm run second-brain:commit`, e fluxos aprovados viram templates do Neo.

## Relação com os agentes Munin existentes

`agents/*.md` descreve os papéis operacionais do runtime Munin (orchestrator, researcher, viral-engine etc.) e não é carregado pelo Claude Code. Esta equipe reaproveita as regras de evidência de `agents/researcher.md` e os gates do Viral Engine em vez de duplicá-los.

## Exemplo

`examples/2026-10-17-carrossel-linkedin-divergencias/` contém o teste de configuração com briefing fictício (pesquisa, carrossel e revisão crítica; não publicado).

## Comparação com open-dots

[Anil-matcha/open-dots](https://github.com/Anil-matcha/open-dots) (examinado em 2026-10-17, commit do mesmo dia) também roda sobre o Claude Code. O repositório não tem arquivo de licença, então nada foi copiado; só ideias foram avaliadas.

| Ideia do open-dots | Decisão aqui |
|---|---|
| Aprovação imposta por hook antes da ação, não por instrução | Adotada: guarda de escrita do Neo em `.claude/settings.json` |
| Segredos removidos ao salvar notas | Adotada como bloqueio: o hook recusa conteúdo com aparência de credencial |
| Agentes nomeados com instruções, modelo e modo de aprovação | Já coberto pelos subagentes nativos (`tools`, `model`) |
| Notas persistentes por agente (`MEMORY.md`) | Não adotada: conflita com a regra de memória canônica do `AGENTS.md` |
| Exportar/importar agentes, agendamentos, Telegram, sandboxes | Fora do escopo; os arquivos `.md` já são portáveis pelo Git |

## Licença

Partes das instruções foram adaptadas de [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) (MIT). Ver `THIRD_PARTY_NOTICES.md`.
