# REA — Lovable e darkly.ai vs. Munin — 2026-10-21

Status: pesquisa / evidência. Complementa `award-winning-sites-rea-2026-10.md` com o mesmo método (lentes de engenharia reversa → Adotar / Adaptar / Adiar / Rejeitar por mecanismo). Nada aqui altera tokens, contrato de design ou telas.

## 1. Limites da evidência

- A política de rede do ambiente bloqueou `lovable.dev`, `docs.lovable.dev` e `darkly.ai` (proxy 403 / DNS). Nenhum dos dois produtos foi renderizado ou inspecionado no DOM.
- **Lovable**: há fonte primária abundante — blog oficial (Lovable 2.0), documentação oficial (histórico de versões, publicação), changelog oficial e post oficial no X. Além disso, as **instruções do servidor MCP oficial do Lovable** conectado a esta sessão descrevem o modelo de interação do produto (planos, pausas de aprovação, formulário seguro para credenciais, diffs por mensagem); são tratadas como evidência primária do comportamento do produto. Itens de terceiros estão marcados **[sec]**.
- **darkly.ai**: **evidência insuficiente para uma REA.** A única página indexada que descreve o domínio (firstsales.io) é genérica e aparenta ser gerada a partir de template (fatos como "Founded: 2010+", texto quase idêntico ao de outra marca). Não há site acessível, documentação, changelog, screenshots ou cobertura de imprensa. O "Darkly" mais documentado publicamente é outro projeto — um editor de pintura open source em `darkly.art` (`github.com/darkly-art/darkly`) — sem relação comprovada com darkly.ai. Ver §4.

## 2. Lovable

### 2.1 Contexto

Construtor de apps full-stack por IA (TypeScript + Tailwind + shadcn/ui, backend Supabase). Crescimento reportado de ~US$100M ARR (jul/2025) para ~US$400–500M (início–meio de 2026) [sec, Sacra/TechCrunch]. Não é parecido com o Munin no *job* (gerar apps), mas é muito parecido na **forma**: um agente de IA que propõe e executa mudanças consequentes em nome do usuário, com histórico, reversão e publicação. É a referência comercial mais bem-sucedida desse padrão.

### 2.2 Fichas por mecanismo

#### L1. Plan × Build — separar conversa de execução
- **Mecanismo**: o input do chat tem um seletor explícito entre **Plan** (discutir arquitetura, requisitos e design *antes* de escrever qualquer coisa; o agente lê arquivos, logs e banco, mas não altera código) e **Build** (executa). Desde 2.0 (abr/2025) o "Chat Mode Agent" responde, planeja e depura **sem mudar código**.
- **Refinamento de plano** (changelog 2026): o usuário destaca um trecho do plano e diz o que mudar; o plano revisado abre **como diff**, alternando entre "ver mudanças" e "editar".
- **Munin hoje**: `operator-chat.html` tem um único `textarea` "Digite um comando do Munin…" — não há distinção visível entre perguntar/planejar e executar. A governança existe no backend (`governed-agent-plan.ts`, `approval-executor.ts`), mas não aparece como modo na superfície de chat.
- **Decisão**: **Adotar.** Seletor *Planejar / Executar* no composer do Chat Operacional. *Planejar* é o padrão e é somente leitura por construção; *Executar* só gera propostas que entram no `ApprovalExecutor`. Revisão de plano como diff reusa o padrão diff-first já documentado em `docs/engineering/CONTEXT_EFFICIENCY.md`.

#### L2. Pausa de aprovação tipada + formulário seguro para credenciais
- **Mecanismo** (instruções do MCP oficial): quando o agente precisa usar uma ferramenta que exige aprovação, a execução **pausa** com `awaiting_input` (ferramenta + parâmetros) e espera decisão explícita. Responder com outra mensagem **rejeita** a ação pendente. Se a pausa envolve um segredo, `requires_secure_form` manda o usuário a um formulário seguro no editor — **o credencial nunca passa pela conversa**.
- **Munin hoje**: tem aprovações duráveis com idempotência e `reconcile_required` (`approval-executor.ts`) e redação de segredos (`secret-redaction.ts`). Não há regra de produto explícita de que a superfície de chat **nunca** aceita credenciais, nem que uma nova mensagem cancela a ação pendente.
- **Decisão**: **Adotar as duas regras.** (a) Uma ação pendente de aprovação mostra ferramenta + parâmetros e só avança por *Aprovar/Rejeitar* explícitos; mensagem nova = rejeição registrada, nunca aprovação implícita. (b) Credenciais nunca são pedidas nem aceitas no chat; o fluxo aponta para `settings.html` / `docs/OAUTH_SETUP.md`. Ambas reforçam regras já existentes em `AGENTS.md`.

#### L3. Versão automática por mudança, reversão e marcadores
- **Mecanismo** (docs oficiais): toda mudança cria uma versão — não existe botão salvar. O usuário pode pré-visualizar uma versão anterior, reverter ou voltar a um ponto e tentar outra instrução. **A reversão restaura apenas código e redeploya funções; não reverte dados do banco** — e a documentação diz isso explicitamente. Aba *Bookmarks* marca versões estáveis.
- **Munin hoje**: o evidence ledger (hash encadeado) e o session log registram o que aconteceu, e os worktrees Git governados isolam mudanças de código. Não há uma superfície de "linha do tempo de mudanças com reverter" para o operador, nem a declaração explícita do que uma reversão **não** desfaz.
- **Decisão**: **Adaptar.** Na timeline do Control Room, cada efeito aplicado mostra *reversível / não reversível* e, quando reversível, o que exatamente volta. A franqueza da doc do Lovable ("não reverte dados") vira regra de copy: **toda ação consequente diz antes o que não pode ser desfeito.** Marcadores de "estado estável" são baratos e úteis para Build State.

#### L4. Rascunho × publicado
- **Mecanismo** (docs oficiais): projeto nasce como rascunho visível só ao dono e convidados; publicar faz deploy de um **snapshot**; edições posteriores ficam no rascunho até nova publicação — "visitantes nunca veem trabalho pela metade".
- **Munin hoje**: LinkedIn Publisher / Content Studio já separam composição de envio, com aprovação.
- **Decisão**: **Manter + reforçar visualmente.** Padronizar o rótulo de estado *Rascunho · Aprovado · Publicado* com os `.munin-status-*` existentes em todas as telas que publicam algo para fora.

#### L5. Revisão de segurança no fluxo de publicação
- **Mecanismo** (blog oficial 2.0): Security Scan aparece **dentro do fluxo de publicar** (para projetos com Supabase), sinalizando vulnerabilidades antes do deploy.
- **Munin hoje**: `security-reviewer` existe no registro de agentes de governança; `docs/EXTERNAL_CONNECTOR_SECURITY.md` define regras.
- **Decisão**: **Adaptar.** A checagem já existe como agente; o ganho do Lovable é **colocá-la no ponto de decisão**: o cartão de aprovação de uma ação externa mostra o veredito do `security-reviewer` (e do `cost-guardian`) ao lado de *Aprovar*.

#### L6. A home é o produto — prompt antes de cadastro, sugestões no estado vazio
- **Mecanismo** [sec, Supademo; saasui.design]: a página inicial é um campo "Ask Lovable" central; prompts sugeridos mostram o que é possível sem tutorial; o workspace abre já com resultado gerado, evitando projeto vazio; perguntas de segmentação vêm **depois** do primeiro valor.
- **Munin hoje**: o Chat Operacional abre vazio, sem sugestões. O Munin é local e pessoal — não há cadastro a adiar.
- **Decisão**: **Adotar a parte de estado vazio.** 3–5 sugestões contextuais no chat vazio (ex.: "O que precisa da minha atenção hoje?", "Resumir o Radar", "Analisar uma vaga"), derivadas das telas existentes. **Rejeitar** o resto (funil de cadastro, gradiente de hero de marketing) — não se aplica a uma command surface local.

#### L7. Conhecimento persistente e design system por workspace
- **Mecanismo** (MCP oficial + X oficial, ago/2026): *project knowledge* e *workspace knowledge* guardam instruções persistentes; design systems por workspace garantem tipografia, cor, espaçamento e componentes consistentes em todo app gerado — e o usuário pode descrever a marca ou subir diretrizes.
- **Munin hoje**: já tem o equivalente mais forte — Second Brain / Knowledge Vault / Control Room como memória canônica e `design/tokens.json` + `DESIGN.md` como contrato.
- **Decisão**: **Manter.** Confirma a direção da ADR-0008 (tokens como fonte única). Não criar store paralelo.

#### L8. Diff por mensagem do agente
- **Mecanismo** (MCP oficial): cada resposta do agente tem um diff consultável (`get_diff` por `message_id`) e um histórico de edições navegável.
- **Decisão**: **Adotar como critério**: toda resposta do Munin que mudou estado deve linkar o recibo/diff correspondente (execution receipt / evidence ledger). Reusa o que existe.

### 2.3 Rejeitado
- Créditos/consumo pago por mensagem e backend em nuvem obrigatório (Supabase) — conflitam com custo zero e local-first.
- Multiplayer/workspaces de equipe — fora do escopo de um sistema pessoal.
- Estética de marketing (hero com gradiente) — conflita com princípios 4–6 da constituição.

## 3. Matriz de adoção (Lovable)

| # | Padrão | Decisão | Seam no Munin | Custo / risco |
| --- | --- | --- | --- | --- |
| 1 | Seletor *Planejar / Executar* no chat; Planejar = somente leitura (L1) | **Adotar — prioridade 1** | `apps/web/operator-chat.html`, `/api/assistant` | Médio; reusa governança existente |
| 2 | Mensagem nova rejeita ação pendente; credencial nunca no chat (L2) | **Adotar — prioridade 1** | assistant + `approval-executor.ts` | Baixo; endurece regras já existentes |
| 3 | Sugestões no estado vazio do chat (L6) | **Adotar** | `operator-chat.html` | Baixo |
| 4 | Toda ação consequente declara o que **não** pode ser desfeito (L3) | **Adotar como regra de copy** | cartões de aprovação | Baixo |
| 5 | Veredito de `security-reviewer`/`cost-guardian` no cartão de aprovação (L5) | **Adaptar** | Action Inbox, HUD approvals | Médio |
| 6 | Timeline de efeitos com reversível/não reversível + marcadores estáveis (L3) | **Adaptar** | Control Room timeline, evidence ledger | Médio |
| 7 | Plano revisado como diff (L1) | **Adiar** | depende do item 1 | Médio |
| 8 | Status *Rascunho · Aprovado · Publicado* padronizado (L4) | **Manter + padronizar** | LinkedIn Publisher, Content Studio | Baixo |
| 9 | Link de recibo/diff em toda resposta que mudou estado (L8) | **Adotar como critério** | assistant | Baixo |
| 10 | Knowledge/design system por workspace (L7) | **Manter (já existe)** | Second Brain, tokens | — |
| 11 | Créditos pagos, nuvem obrigatória, multiplayer, hero de marketing | **Rejeitar** | — | Viola custo zero / local-first / constituição |

## 4. darkly.ai — resultado

- **Sem REA possível com a evidência disponível.** Não foi possível confirmar o que é darkly.ai: o domínio está bloqueado neste ambiente e a única descrição indexada é de baixa confiabilidade. Registrar mecanismos a partir dela seria inventar.
- **Para destravar**: (a) liberar `darkly.ai` no ambiente para inspeção read-only com Playwright, ou (b) fornecer screenshots / link de demo / documentação. Com isso, a ficha segue o mesmo formato da §2.
- **Se a referência pretendida for o Darkly editor (darkly.art)**: é open source (`github.com/darkly-art/darkly`), multiplataforma (Windows/macOS/Linux) e gratuito — alinhado com Windows-first e custo zero do Munin; pode ser analisado a partir do código-fonte assim que confirmado.

## 5. Fontes

- Lovable — Lovable 2.0 (blog oficial): https://lovable.dev/es/blog/lovable-2-0
- AlternativeTo — Lovable 2.0: https://alternativeto.net/news/2025/4/lovable-launches-major-update-2-0-with-multiplayer-new-chat-agent-updated-design-and-more/
- Lovable — Changelog oficial: https://docs.lovable.dev/changelog
- Lovable — Histórico de versões (docs oficiais): https://docs.lovable.dev/features/projects/history
- Lovable — Visão geral de projetos (docs oficiais): https://docs.lovable.dev/features/projects/overview
- Lovable no X — design systems em todos os planos pagos: https://x.com/Lovable/status/2090079350783926355
- Axonbuild — nomenclatura de modos [sec]: https://axonbuild.com/blog/lovable-agent-mode
- Supademo — onboarding do Lovable [sec]: https://supademo.com/content/plg-onboarding-gallery/lovable
- SaaS UI — landing do Lovable [sec]: https://www.saasui.design/pattern/landing/lovable
- Sacra — Lovable [sec]: https://sacra.com/c/lovable
- FirstSales — Darkly review (baixa confiabilidade): https://firstsales.io/brand-review/darkly/
- Darkly editor: https://darkly.art/ · https://github.com/darkly-art/darkly
