# REA — sites e produtos premiados vs. Munin — 2026-10-20

Status: pesquisa / evidência. Nada aqui altera `design/tokens.json`, `docs/design/DESIGN.md` ou `AGENT_CONTRACT.md`. Adoção de qualquer item exige decisão explícita (ver *External-reference protocol* no contrato).

## 1. Escopo e método

**REA (Reverse-Engineering Analysis)** = decompor cada referência em mecanismos reutilizáveis e decidir, por mecanismo, se o Munin **Adota**, **Adapta**, **Adia** ou **Rejeita** — no mesmo formato da auditoria `openmuse-selective-adoption-2026-10.md`.

Lentes aplicadas a cada referência:

1. Job principal e público
2. Hierarquia / arquitetura de informação
3. Sistema visual (cor, tipo, superfícies)
4. Interação e input (teclado, cursor, toque)
5. Movimento (função vs. espetáculo)
6. Desempenho percebido
7. Acessibilidade / inclusão
8. Transferência para o Munin (seam concreto + restrições: local-first, custo zero, Windows, aprovações)

**Corpus** — dois grupos, como pedido:

- **Grupo A — premiados, não parecidos com o Munin** (sites de marca, experiências WebGL, apps de consumo).
- **Grupo B — parecidos com o Munin** (ferramentas de operação, produtividade, IA, command surfaces), premiados ou referências de design amplamente citadas.

### Limites da evidência (ler antes das conclusões)

- A política de rede deste ambiente bloqueou acesso direto (proxy 403 / DNS) a `awwwards.com`, `webbyawards.com`, `linear.app`, `mactech.com`. **Nenhum site foi renderizado, inspecionado no DOM ou capturado em screenshot.** A análise usa busca web, posts dos próprios autores (quando indexados) e análises secundárias, todas listadas em §7.
- Onde só há fonte secundária, o item está marcado **[sec]**. Onde há apenas a categoria do prêmio, sem descrição do mecanismo, o item está marcado **[cat]** e as transferências são hipóteses a validar com inspeção visual.
- Próximo passo para elevar a confiança: liberar esses domínios no ambiente e repetir com Playwright (snapshot + métricas de layout), já suportado pelo `browser-session` read-only.

## 2. Prêmios confirmados no corpus

| Referência | Prêmio | Grupo |
| --- | --- | --- |
| Lando Norris (OFF+BRAND) | Awwwards Site of the Year 2025 + Users' Choice | A |
| Messenger (abeto; Lucendo & Sungaila) | Awwwards Developer Site of the Year 2025 | A |
| Igloo Inc (abeto / Bureaux) | Awwwards Developer Award, SOTY 2024 [sec] | A |
| FOLLOW.ART (Vide Infra) | Webby 2026 — Best Visual Design: Function | A |
| Affinity Studio site (Canva) | Webby 2026 People's Voice — Best Visual Design: Function | A |
| Tide Guide | Apple Design Award 2026 — Visuals & Graphics [cat] | A |
| Moonlitt | Apple Design Award 2026 — Interaction [cat] | A |
| Guitar Wiz | Apple Design Award 2026 — Inclusivity [cat] | A |
| Claude Code | Webby 2026 + People's Voice — AI Features & Innovation | B |
| Linear | Sem prêmio confirmado nesta varredura; referência canônica de UI densa e dark-first; refresh de UI em 2026-03 | B |
| Raycast | Sem prêmio confirmado; referência de command palette [sec] | B |
| Superhuman | Sem prêmio confirmado; referência de velocidade/teclado [sec] | B |
| Vercel (Geist) | Sem prêmio confirmado; referência de sistema monocromático [sec] | B |
| Granola | Sem prêmio confirmado; referência de "IA que preserva o pensamento do usuário" | B |

Nota: no grupo B, a maioria dos produtos mais citados como referência de design não tem prêmio formal localizado — o critério ali é "referência dominante", não troféu. Isso é declarado para não inflar a autoridade da fonte.

## 3. Estado atual do Munin (baseline observado)

Evidência coletada no repositório em `49c47b8`:

- O CSS servido é `apps/web/public/munin.css` (Vite resolve `/munin.css` a partir de `public/`). Existem cópias obsoletas e divergentes em `apps/web/munin.css` e `apps/web/munin-nav.js` que não são servidas — fonte de confusão para agentes (esta própria análise leu a cópia errada na primeira versão).
- `apps/web/index.html` empilha três folhas globais: `munin.css`, `munin-workspace.css`, `nordic-theme.css` (preview). Os valores de `public/munin.css :root` não correspondem a `design/tokens.json` (ex.: raios 7/10/14 px vs. tokens 4/8/12/16; `--accent:#5ca9d6` vs. `intelligence #3B82F6`; superfícies `#05080d/#0a1018` vs. `#07090D/#0D1117`).
- Tipografia abaixo de `font.size.xs` (12 px) em elementos de leitura: `.munin-status` 9 px, `.munin-hud-return` 9 px, rótulos da navegação mobile 9 px, `--text-small` 11 px (links da barra, "Tools"), detalhes da paleta 11 px, cabeçalho da paleta e rótulo "Ação rápida" 10 px. (`.eyebrow` já é sobrescrito para 12 px por `munin-workspace.css`.)
- Movimento e preferências: `public/munin.css` **já** trata `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast`, e há um toggle "Animações" na barra. Nenhum gap de movimento foi encontrado no shell compartilhado.
- `munin-nav.js` já tem paleta de comandos (`Ctrl/⌘+K`, `<dialog>`, busca), mas ela só **navega** entre telas — não executa ações, não mostra atalhos, não tem ranking por recência.
- `node scripts/design-drift-checker.mjs design/drift.config.json` (observe): 95 arquivos, 1658 achados — `rawColorLiteral` 1513, `inlineVisualStyle` 54, `largeBlurShadow` 37, `largeRadius` 28, `fontFamilyLiteral` 26.

## 4. Fichas REA

### Grupo A — premiados, não parecidos

#### A1. Lando Norris — SOTY 2025
- **Mecanismo** [sec]: hero com formas reativas ao cursor que derivam da linguagem gráfica do capacete; paleta curta (4 cores) com um acento neon de alto contraste; IA dividida em dois eixos claros — *On Track* (resultados) vs. *Off Track* (cultura); conteúdo modular.
- **O melhor para o Munin**: (a) **uma identidade gráfica derivada de um artefato próprio** — no Munin, o corvo/runa já registrados em `docs/brand/` deveriam gerar o motivo gráfico, em vez de gradientes genéricos; (b) **bipartição de IA nítida** — o HUD poderia separar *Agora* (estado operacional) de *Contexto* (memória, histórico), como On/Off Track; (c) **paleta curta com um único acento** — reforça o princípio 5 (baixo ruído cromático).
- **Rejeitar**: formas reativas ao cursor como ornamento contínuo (viola princípio 6 e não existe em toque).

#### A2. Messenger (abeto) — Developer SOTY 2025
- **Mecanismo** [sec]: jogo em navegador, Three.js/WebGL, modelado em Houdini/Blender; um mundo pequeno e contido, com uma tarefa única e repetível (entregar correspondência).
- **O melhor para o Munin**: a metáfora de **"um mundo pequeno com uma tarefa clara"** — cada módulo do Munin deveria ter um verbo primário (o Action Inbox = *decidir*, o Radar = *triar*). Prova também que performance web de ponta é alcançável sem serviço pago — compatível com custo zero.
- **Rejeitar**: WebGL/3D como interface operacional. Custo de GPU, acessibilidade e Windows de baixo desempenho não se justificam numa command surface.

#### A3. Igloo Inc — Developer Award 2024 [sec]
- **Mecanismo**: navegação de portfólio por scroll contínuo e "user-friendly" (case study Awwwards, 2024-09).
- **O melhor para o Munin**: **scroll como linha do tempo** — útil para o *timeline* do Second Brain / session log (eventos em sequência contínua, com âncoras).
- **Adiar**: scroll-jacking. Nunca sequestrar o scroll nativo em telas de trabalho.

#### A4. FOLLOW.ART — Webby 2026, Best Visual Design: Function
- **Mecanismo** [cat]: a categoria premia especificamente *design visual a serviço da função*, não estética pura.
- **O melhor para o Munin**: é a categoria cujo critério coincide com o princípio 1 da constituição ("hierarquia antes de decoração"). Serve como **benchmark de avaliação**: toda proposta visual do Munin deveria responder "qual função isto melhora?". Inspeção visual pendente.

#### A5. Affinity Studio site (Canva) — Webby People's Voice 2026
- **Mecanismo** [cat]: site de produto de ferramenta criativa profissional, escolhido pelo voto público.
- **O melhor para o Munin**: ferramenta profissional densa pode ser apresentada de forma que o público geral entenda — relevante para a futura página pública/portfólio do Munin, não para o HUD. Inspeção pendente.

#### A6. Tide Guide — ADA 2026, Visuals & Graphics [cat]
- **Hipótese de transferência**: app cujo produto é **dado temporal em gráfico e tabela**. É o análogo mais próximo, no grupo A, das telas de métricas do Munin (`token-efficiency.html`, briefing executivo). Avaliar: gráfico + tabela lado a lado para o mesmo dado; leitura em um olhar.

#### A7. Moonlitt — ADA 2026, Interaction [cat]
- **Hipótese de transferência**: rastreador de ciclo (fase da lua) premiado por interação — padrão de **um controle direto sobre o tempo** (arrastar para frente/trás). Possível aplicação: "replay" do estado do Control Room ao longo do dia. Validar antes de propor.

#### A8. Guitar Wiz — ADA 2026, Inclusivity [cat]
- **Transferência**: lembrete de que inclusão é um eixo premiado por si só. O Munin já respeita reduced-motion/contraste, mas ainda tem textos de 9–11 px em status, navegação e paleta (§3) — o achado de maior retorno deste grupo é **de acessibilidade, não estético**.

### Grupo B — parecidos com o Munin

#### B1. Claude Code — Webby 2026, AI Features & Innovation
- **Mecanismo**: agente em terminal; texto como interface primária; permissões explícitas por ação; o usuário vê o plano e os diffs antes de aceitar.
- **O melhor para o Munin**: o padrão **"proposta → diff → aprovação"** como linguagem visual de primeira classe. O Munin já tem diff-first review e approval boundary (`CONTEXT_EFFICIENCY.md`, ApprovalExecutor) — falta torná-los o **componente visual padrão** de toda ação consequente (mesmo layout em Action Inbox, LinkedIn Publisher, Email Intelligence).
- **Manter**: o Munin já é Claude-first (#394); não duplicar runtime.

#### B2. Linear — refresh 2026-03 (fonte primária: changelog + blog)
- **Mecanismo**: sidebar de navegação **mais escura** para que a área de conteúdo domine; tabs compactas em vez de largura total; headers, navegação e view controls **idênticos** entre projetos, issues, reviews e documentos; menos ícones; bordas e separadores suavizados [sec]. Em 2024, geração de tema migrou de HSL para LCH [sec].
- **O melhor para o Munin** (maior correspondência com a constituição):
  1. **Recessão do chrome** — dimmer em `.munin-primary` / sidebar; conteúdo com maior luminância relativa. Aplica o princípio "conteúdo primário dominante".
  2. **Um único header/toolbar canônico** para todas as telas de `apps/web` — hoje cada página injeta estilos próprios (54 `inlineVisualStyle`).
  3. **Temas gerados em espaço perceptual (OKLCH)** a partir dos tokens, em vez de 1513 literais — via CSS nativo, sem dependência nova.
- **Rejeitar**: copiar a paleta ou a marca do Linear (contrato proíbe cópia).

#### B3. Raycast [sec]
- **Mecanismo**: tudo é um comando; *type-to-filter* funciona em todos os níveis (submenus, listas de ações); divulgação progressiva; atalhos visíveis.
- **O melhor para o Munin**: evoluir a paleta existente (`munin-nav.js`) de **navegador de telas** para **executor de ações**: (a) segunda coluna de ações por item (`Enter` abre, `⌘Enter` executa a ação primária), (b) mesmo filtro nos submenus, (c) atalhos exibidos ao lado de cada comando. Ações consequentes continuam passando pelo approval gate — a paleta só *propõe*.
- **Rejeitar**: loja de extensões e IA paga (conflita com custo zero).

#### B4. Superhuman [sec]
- **Mecanismo**: alvo de resposta < 100 ms; **UI otimista** (arquivar atualiza a tela na hora, toast com *desfazer*, foco vai ao próximo item, sincroniza em background); navegação J/K; paleta ensina os atalhos.
- **O melhor para o Munin**: UI otimista **somente para ações reversíveis e locais** (marcar como lido, triar radar, arquivar card). Para ações consequentes, o Munin mantém o padrão oposto — confirmar antes, por design. Explicitar isso como regra: *otimista ⇔ reversível e local*.
- **Adotar**: J/K + `E` (arquivar) + `Z` (desfazer) no Action Inbox e no Career Inbox.

#### B5. Vercel / Geist [sec]
- **Mecanismo**: base quase monocromática; cor reservada para status; bordas como sombra de 1 px; status como pílulas com fundo tingido.
- **O melhor para o Munin**: confirma a direção da constituição (cor semântica, não decorativa). O Munin já tem `.munin-status-*` com pílula + ponto — **adaptar** subindo o tamanho de 9 px para `font.size.xs` (12 px) e mapeando para os tokens `semantic.*`.
- **Rejeitar**: base clara como padrão (Munin é dark-first).

#### B6. Granola
- **Mecanismo**: notas do usuário são a âncora; a IA completa e estrutura **em cima** do que o usuário escreveu, sem bot na reunião; o usuário permanece no controle.
- **O melhor para o Munin**: **distinção visual entre conteúdo do usuário e conteúdo gerado** — essencial no Context Memory, Executive Briefing e Content Studio. Proposta: tratamento tipográfico distinto (peso/cor `text.secondary` + marcador "gerado") para texto produzido por modelo, mantendo o texto do usuário em `text.primary`. Reforça auditabilidade e proveniência (já existentes no evidence ledger).

## 5. Síntese — matriz de adoção

| # | Padrão (origem) | Decisão | Seam no Munin | Custo / risco |
| --- | --- | --- | --- | --- |
| 1 | Piso tipográfico de 12 px (`font.size.xs`) em status, navegação e paleta (A8, B5) | **Adotar — prioridade 1** | `apps/web/public/munin.css` | Baixo; corrige acessibilidade sem mudar identidade |
| 2 | Chrome que recua: nav mais escura, conteúdo domina (B2) | **Adotar** | `public/munin.css` `.munin-primary`, sidebar | Baixo; reversível |
| 3 | Header/toolbar canônico único em todas as telas (B2) | **Adotar** | `munin-nav.js` + `munin-ui/` | Médio; tela a tela, sem mass-restyle |
| 4 | Paleta de comandos executa ações + mostra atalhos (B3, B4) | **Adotar** | `apps/web/public/munin-nav.js` | Médio; ações consequentes via approval gate |
| 5 | J/K/E/Z + UI otimista apenas para ações reversíveis locais (B4) | **Adaptar** | Action Inbox, Career Inbox | Médio; regra explícita *otimista ⇔ reversível* |
| 6 | Componente "proposta → diff → aprovar" padronizado (B1) | **Adotar** | ApprovalExecutor UI, Action Inbox | Médio; reusa abstrações existentes |
| 7 | Marcação visual usuário vs. gerado por IA (B6) | **Adotar** | Context Memory, Briefing, Content Studio | Baixo–médio |
| 8 | Ligar `munin.css :root` aos `design/tokens.json`; tema em OKLCH (B2, B5) | **Adaptar — requer ADR** | `design/tokens.json` → CSS vars | Alto impacto; mudança canônica, precisa revisão explícita |
| 9 | Bipartição de IA *Agora* / *Contexto* no HUD (A1) | **Adaptar** | `hud.html`, `hud-mobile.html` | Médio; validar com uso real |
| 10 | Um verbo primário por módulo (A2) | **Adotar como critério de review** | Docs de produto | Nenhum código |
| 11 | Motivo gráfico derivado do corvo/runa (A1) | **Adiar** | `docs/brand/` | Depende de decisão de marca |
| 12 | Timeline contínua por scroll, sem scroll-jacking (A3) | **Adiar** | Second Brain timeline | Depende da tela de timeline |
| 13 | Gráfico + tabela pareados para dado temporal (A6) | **Adiar até inspeção** | `token-efficiency.html`, briefing | Hipótese [cat] |
| 14 | WebGL/3D, cursor reativo, scroll-jacking (A1–A3) | **Rejeitar** | — | Viola princípios 2 e 6, custo de GPU, acessibilidade |
| 15 | Extensões/IA pagas, base clara (B3, B5) | **Rejeitar** | — | Viola custo zero / dark-first |

## 6. Próximos passos propostos (nenhum executado)

1. **PR pequeno de acessibilidade** (item 1): piso de 12 px em `public/munin.css` (status, HUD, nav mobile, links da barra, paleta). Sem tocar tokens canônicos.
2. **Paleta de ações** (item 4): estender `commands` em `public/munin-nav.js` com `{action, shortcut, consequential}`; ações `consequential` abrem o fluxo de aprovação existente, nunca executam direto. Teste em `tests/web-navigation.test.ts`.
3. **ADR de tokens** (item 8): proposta separada para ligar `munin.css :root` a `design/tokens.json` e reduzir os 1513 literais — revisão explícita obrigatória pelo contrato.
4. **Repetir a REA com inspeção real**: liberar `awwwards.com`, `webbyawards.com`, `linear.app`, `apple.com` no ambiente e capturar snapshots via sessão Playwright read-only, convertendo os itens [sec]/[cat] em evidência primária.

## 7. Fontes

- Awwwards — Annual Awards winners: https://www.awwwards.com/annual-awards/winners
- Awwwards — Sites of the Year: https://www.awwwards.com/websites/sites_of_the_year/
- Awwwards — Igloo Inc case study: https://awwwards.com/igloo-inc-case-study.html
- DesignRush — Lando Norris website design: https://designrush.com/best-designs/websites/lando-norris-website-design
- Messenger (video game) — Wikipedia: https://en.wikipedia.org/wiki/Messenger_(video_game)
- Utsubo — Best Three.js websites 2026: https://www.utsubo.com/blog/best-threejs-websites-2026
- Webby — 2026 winners press release: https://www.webbyawards.com/press/press-releases/30th-annual-webby-awards-announce-2026-winners/
- Webby — Best Visual Design: Function: https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-function
- Clay Global — Webby 2026: https://clay.global/blog/webby-2026
- Apple Newsroom — 2026 Apple Design Awards: https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/
- MacStories — 2026 ADA winners: https://www.macstories.net/news/2026-apple-design-awards-winners-announced/
- Linear — Behind the latest design refresh: https://linear.app/now/behind-the-latest-design-refresh
- Linear — UI refresh changelog 2026-03-12: https://linear.app/changelog/2026-03-12-ui-refresh
- Linear — How we redesigned the Linear UI: https://linear.app/now/how-we-redesigned-the-linear-ui
- Plushcap — Linear 2026-03 summary: https://www.plushcap.com/companies/linear/blog/summaries/2026/03
- rmoff — A love letter to Raycast: https://rmoff.net/2025/12/18/a-love-letter-to-raycast/
- Blake Crosley — Superhuman design guide: https://blakecrosley.com/guides/design/superhuman
- Vercel — Geist: https://vercel.com/geist
- Granola — Series A post: https://jobs.granola.so/blog/series-a
