# Munin — Architecture & UX Audit (August 2026)

Auditoria completa do repositório `munin-foundation`, com implementação das
correções de baixo e médio risco na branch `claude/munin-architecture-ux-audit`.
Este documento registra o estado encontrado, as decisões tomadas e o roadmap
recomendado.

## 1. Arquitetura encontrada (antes)

O Munin cresceu por adição: cada capacidade nova (Visual Assets, Composer,
Context Memory, Executive Briefing) chegou como um **servidor HTTP próprio**,
uma **página HTML própria** e um **arquivo de runtime próprio**, sem
compartilhar infraestrutura com o que já existia.

```
ANTES                                          DEPOIS
─────────────────────────────────────          ─────────────────────────────────────
:4310 api.ts            (core)                 :4310 server.ts  ──┬─ /api/*  (core)
:4312 visual-assets-api.ts                                        ├─ /api/visual-assets/*
:4313 linkedin-composer-api.ts                                    ├─ /api/linkedin-composer/*
:4314 context-memory-api.ts                                       ├─ /api/context-memory/*
:4315 executive-briefing-api.ts                                   └─ /api/executive-briefing/*
5 processos Node · 6 builds tsc no launch      1 processo · 1 build no launch
helpers json/body/CORS × 5 cópias              src/http.ts (1 cópia, CORS restrito)
paths de dados: 2 convenções                   src/config.ts + runtimePath()
frontend com portas hardcoded 4310–4315        URLs relativas via proxy do vite
9 páginas minificadas, paletas divergentes     tokens compartilhados (munin.css)
nav injetada via MutationObserver              nav nativa + product bar comum
3 diretórios de teste (2 nunca rodavam)        tests/ único (79 testes no runner)
```

Não havia justificativa real para processos separados: todos os handlers são
stateless sobre os mesmos stores JSON, os prefixos de rota são disjuntos e tudo
roda na mesma máquina para um único usuário. A separação era acidente de
crescimento, não boundary de domínio. Os boundaries reais do sistema — domínio
(service, intelligence, linkedin-content, context-memory) vs. adapters
(llm-provider, image-provider, email-providers, oauth) — foram preservados.

## 2. Dívida técnica encontrada

Backend / persistência:

- Cinco cópias de `json()`/`body()`/`text()` com CORS `*` em APIs que servem
  dados pessoais e aceitam escrita de credenciais de provider. Qualquer página
  aberta no browser podia ler e escrever na API local.
- Nove módulos resolviam paths com `process.cwd()` e ignoravam
  `MUNIN_DATA_DIR`; os stores mais antigos honravam a variável. Testes isolavam
  metade do estado e a outra metade escrevia no diretório do repositório.
- Nenhuma escrita era atômica: um crash no meio de `writeFile` corrompia
  `state.json` sem backup.
- `resolveContext` descartava tokens de 2 caracteres ("B3") e o bônus de match
  exato era inalcançável em frasing natural — defeito mascarado porque o teste
  que o cobriria estava fora do runner.

Frontend / UX:

- `vite build` compilava apenas `index.html`; as outras nove telas
  desapareciam silenciosamente do build de produção.
- Cada página standalone era um arquivo minificado de linha única com sua
  própria paleta ligeiramente divergente (`#4ba6df` vs `#55b4ee`, gradientes
  diferentes) e URLs absolutas com porta hardcoded.
- A navegação entre módulos era injetada no sidebar React por um
  `MutationObserver` externo; as páginas standalone não tinham navegação
  cruzada nenhuma — a sensação era de protótipos independentes.

Organização:

- `test/`, `tests/` e `src/tests/` coexistiam; só `tests/` rodava. 10 testes
  compilavam e nunca executavam.
- `WY NOT.md` (vazio, typo de `WHY_NOT.md`) na raiz desde o commit inicial.
- Startup: `npm run workspace` disparava 5 scripts npm, cada um rodando seu
  próprio `tsc` — 6 compilações sequenciais para subir o ambiente.

## 3. Decisões tomadas (implementadas nesta branch)

1. **Servidor unificado** (`src/server.ts`) despachando por prefixo para os
   handlers existentes. Os entrypoints por módulo continuam funcionando
   (`npm run visual-assets-api` etc.) como fallback compatível; o launcher usa
   apenas o processo unificado.
2. **`src/http.ts`**: única implementação de resposta JSON, parsing de body,
   validação e CORS. CORS agora só reflete origens locais conhecidas
   (`127.0.0.1`/`localhost` nas portas web e API).
3. **`src/config.ts`**: portas, paths e origens em um lugar; tudo honra
   `MUNIN_DATA_DIR`, `MUNIN_API_PORT`, `MUNIN_WEB_PORT`.
4. **`src/storage.ts`**: `writeJsonAtomic` (temp + rename) aplicado a todos os
   stores. Corrupção parcial por crash deixou de ser possível.
5. **Design system** (`apps/web/public/munin.css`): tokens de cor, tipografia,
   radius e a product bar compartilhada. Páginas de módulo convergiram para a
   paleta do Command Center; regras base duplicadas removidas.
6. **Navegação unificada**: product bar (`munin-nav.js`) em todas as páginas
   standalone; links nativos + atalhos de teclado no sidebar React; hack de
   MutationObserver removido.
7. **Build multi-page** no vite e URLs de API relativas em todas as telas.
8. **Testes consolidados** em `tests/` (79 testes executando; antes 69).
9. Página de imagem do visual-assets valida que o path servido está dentro do
   data dir (defesa contra path traversal por estado adulterado).

## 4. Persistência: inventário de `data/runtime/`

| Arquivo | Escrito por | Lido por | Observação |
| --- | --- | --- | --- |
| `state.json` | store.ts | service, intelligence, api, briefing, linkedin-content | entidade central (projects/actions/jobs/research) |
| `events.jsonl` | store.ts (append) | timeline, sitrep, dashboard | event log, append-only |
| `career-inbox.json` | career-inbox.ts | api, briefing | mensagens classificadas |
| `career-watch-folder.json` | watch-folder.ts | api | config + log da pasta observada |
| `oauth.json` | oauth.ts | email-providers | tokens Gmail/Outlook |
| `llm-settings.json` | llm-settings.ts | llm-provider | contém API key (plaintext, gitignored) |
| `image-settings.json` | image-settings.ts | image-provider, visual-intelligence | idem |
| `context-memory.json` | context-memory.ts | context-memory-api, briefing, consumers | memória governada por scopes |
| `linkedin-content.json` | linkedin-content.ts | api, visual-assets, composer | posts + referências visuais + visual profile |
| `linkedin-images/` + `assets.json` | image-provider.ts | api | imagens geradas |
| `linkedin-history-images/` | linkedin-content.ts | visual-assets | referências enviadas |
| `visual-intelligence.json` | visual-intelligence.ts | visual-assets-api | análises de imagem |
| `trusted-source-radar.json` | trusted-source-radar.ts | composer | cache 30 min de fontes |
| `assistant-memory.json` | assistant-memory.ts | assistant, llm-provider | últimas 30 turns |
| `runtime/*` (plans, leases, outbox) | runtime.ts, leases, outbox | CLI runtime | camada foundation |

**Veredicto sobre JSON vs SQLite**: JSON continua suficiente. Volumes são
pequenos (centenas de registros), single-user, single-writer por arquivo, e as
escritas agora são atômicas. Não há queries relacionais que o modelo atual não
atenda. SQLite só se justifica quando (a) `events.jsonl` crescer a ponto de
tornar o replay caro, ou (b) surgir concorrência real de escrita entre
processos — nenhum dos dois é verdade hoje. Duplicação conceitual observada:
`career`/`job_search` existem tanto em `state.json` quanto como seções da
Context Memory; a governança de scopes justifica a separação (a Context Memory
é fonte de contexto autorizado, não de estado operacional), mas vale vigiar
para não divergirem.

## 5. Módulos

**Permanecem como estão** — domínio com fronteira clara:
`service` (workspace core), `intelligence`, `sitrep`/`dashboard`,
`career-inbox` + `career-capture` + `watch-folder`, `context-memory`
(governança de scopes preservada; `sensitive-private` continua bloqueado para
consumers), `linkedin-content`, `linkedin-composer` + `trusted-source-radar` +
`brand-canon` (Brand Canon v2 intocado), `visual-intelligence`, adapters
(`oauth`, `email-providers`, `llm-provider`, `image-provider`).

**Consolidados nesta branch**: os 5 servidores HTTP → 1; helpers HTTP → 1;
paths/config → 1; diretórios de teste → 1.

**Camada "foundation" (runtime/leases/outbox/resilience/recovery/side-effects/
alert-exporters/providers/provider-policy)**: ~1.200 linhas bem testadas de
execução multi-agente com leases, fencing e outbox, alcançáveis apenas via
`munin runtime *` no CLI e pelo `provider-policy` CLI. Nenhuma rota de API nem
tela usa essa camada hoje. **Não foi removida** (é a fundação declarada do
projeto e tem testes sólidos), mas é a maior massa de código sem consumidor de
produto. Decisão recomendada em P2: ou o Executive Assistant passa a executar
planos por ela, ou ela migra para `archive/`.

**Candidatos a remoção eventual**: `lovable-import` (one-shot de migração já
executado — manter até confirmar que não haverá novo import), entrypoints
standalone das APIs por módulo (remover após um ciclo de uso do servidor
unificado).

## 6. Segurança

- CORS `*` → origens locais explícitas (corrigido).
- API keys ficam em `data/runtime/*.json` (gitignored) e nunca saem pela API
  (`publicLlmSettings`/`publicImageSettings` mascaram). Aceitável para app
  local single-user; keychain do SO seria upgrade P2.
- Servir imagens agora valida containment do path no data dir (corrigido).
- Regra `sensitive-private`: preservada — `contextForConsumer` continua
  bloqueando o scope em qualquer consumer e `queryContextMemory` não o inclui
  por default. Nenhuma mudança nesse contrato.
- Nenhum secret encontrado em arquivos versionados.

## 7. Roadmap recomendado

**P0 — feito nesta branch**: servidor unificado; CORS restrito; escrita
atômica; `MUNIN_DATA_DIR` consistente; build multi-page; testes no runner;
design tokens + navegação unificada; startup com build único.

**P1 — próximo ciclo, risco moderado**:
- Migrar o conteúdo restante dos `<style>` por página para classes do
  `munin.css` (hoje as páginas ainda carregam CSS próprio, já tokenizado).
- Extrair os `<script>` inline das páginas para módulos TS compartilhando um
  cliente de API único (`request()` já existe no React; duplicado em cada página).
- `GET /api/workspace` devolve tudo (state + events + intelligence completa);
  dividir em endpoints por seção ou adicionar cache com invalidação por evento.
- Logging uniforme no servidor (hoje só `console.log` de boot); um middleware
  de log de request com duração resolveria observabilidade local.
- Remover os entrypoints standalone das APIs por módulo após um ciclo estável.

**P2 — quando houver sinal de necessidade**:
- Decidir o destino da camada foundation (integrar ao Assistant ou arquivar).
- SQLite apenas se `events.jsonl` crescer ou surgir escrita concorrente.
- Keychain do SO para API keys.
- Snapshot/backup rotativo de `data/runtime/` (hoje: sem backups além do git
  ignore — um `munin backup` que zipa o diretório seria barato).

## 8. Riscos

- **Servidor unificado**: um crash derruba todos os módulos (antes, um por
  processo). Mitigação: handlers já isolam erros por request; o launcher
  reinicia com um comando; supervisão por processo não se justifica local.
- **Convergência de paleta**: páginas foram tokenizadas por substituição de
  cores; diferenças visuais sutis intencionais podem ter sido normalizadas.
  Verificado por screenshot em todas as telas — nada quebrado.
- **`resolveContext` mudou de semântica** (tokens curtos passam a contar,
  bônus por cobertura de label). Melhora buscas reais ("B3"), mas altera
  scores retornados por `/api/intelligence/context`.
- **Entrypoints legados**: mantidos mas não mais exercitados pelo launcher;
  podem apodrecer silenciosamente — por isso a recomendação P1 de removê-los
  após um ciclo.

## 9. Critério final

*"Um novo Staff Engineer entenderia o sistema em 30 minutos?"* — Agora o
caminho de leitura é: `scripts/launch.mjs` → `src/server.ts` → 5 handlers →
stores em `data/runtime/` (tabela acima). Config em um arquivo, HTTP em um
arquivo, persistência em um padrão. A exceção que ainda custa tempo de
entendimento é a camada foundation sem consumidor — documentada acima como
decisão pendente.

*"O Munin parece um único produto?"* — As dez telas compartilham paleta,
tipografia, product bar e origem de API. A distância restante para "um único
produto" é a migração das páginas standalone para o app React (ou ao menos para
um shell comum de layout), listada em P1.
