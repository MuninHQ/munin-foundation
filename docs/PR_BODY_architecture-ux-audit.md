## Executive Summary

O Munin cresceu por adição: cada módulo novo chegou como um servidor HTTP próprio, uma página minificada própria e uma convenção de persistência própria. O resultado era um produto que funcionava, mas parecia (e custava manutenção como) cinco protótipos grudados: 5 processos Node, 6 builds de TypeScript no startup, CORS `*` em APIs com dados pessoais, portas hardcoded no frontend, três diretórios de teste com dez testes que nunca rodavam, e escrita de estado não-atômica.

A direção adotada: consolidar a infraestrutura em um conceito de cada coisa — um servidor, um helper HTTP, um config, um padrão de persistência, um design system, uma navegação — preservando intactos os boundaries de domínio, a governança de scopes da Context Memory (`sensitive-private` continua bloqueado para consumers) e o Brand Canon v2.

Auditoria completa em `docs/ARCHITECTURE_AUDIT_2026-08.md`.

## Architecture Before / After

```text
ANTES                                          DEPOIS
:4310 api.ts                                   :4310 server.ts ─┬─ /api/* (core)
:4312 visual-assets-api.ts                                      ├─ /api/visual-assets/*
:4313 linkedin-composer-api.ts                                  ├─ /api/linkedin-composer/*
:4314 context-memory-api.ts                                     ├─ /api/context-memory/*
:4315 executive-briefing-api.ts                                 └─ /api/executive-briefing/*
5 processos · 6 tsc no launch                  1 processo · 1 tsc no launch
json/body/CORS × 5 cópias                      src/http.ts (CORS restrito a origens locais)
paths de dados em 2 convenções                 src/config.ts + MUNIN_DATA_DIR em tudo
writeFile direto (corrupção possível)          src/storage.ts writeJsonAtomic (temp+rename)
frontend chamando 4310–4315 hardcoded          URLs relativas via proxy vite
```

Os entrypoints por módulo continuam funcionando como fallback compatível; o launcher usa só o processo unificado.

## Simplifications

- 5 servidores HTTP → 1 (`src/server.ts`, dispatch por prefixo disjunto).
- 5 cópias dos helpers HTTP → `src/http.ts`.
- Portas/paths/origens espalhados → `src/config.ts`.
- 3 diretórios de teste → `tests/` (10 testes recuperados para o runner: 69 → 79).
- Navegação injetada por MutationObserver → links nativos no sidebar React (`intelligence-navigation.ts` removido).
- 9 páginas HTML minificadas de linha única → fontes legíveis (prettier) com paleta convergida por tokens.
- `WY NOT.md` (arquivo vazio, typo-duplicata de `WHY_NOT.md`) removido.

## UX Improvements

- **Design system** (`apps/web/public/munin.css`): tokens de cor, tipografia, radius e sombras compartilhados por todas as telas; paleta executiva dark única (as páginas divergiam em accents e gradientes).
- **Product bar compartilhada** (`munin-nav.js`) em todas as páginas standalone, com estado ativo — navegação cruzada entre todos os módulos, que antes não existia fora do Command Center.
- Sidebar do Command Center ganhou grupo "Modules" nativo + atalhos de teclado (Ctrl/Cmd+Shift+I/M/L/P/H/A) que antes viviam no script de injeção.
- Verificado por screenshot em todas as 11 telas com o servidor real.

## Performance

- Startup do workspace: 6 compilações sequenciais de `tsc` via npm → 1 compilação + 1 processo Node + vite. Redução direta de ~5 execuções de tsc e 4 processos residentes.
- Menos overhead por request na UI: mesma origem via proxy (sem preflights CORS cross-port).
- `vite build` agora emite as 10 páginas (antes só `index.html` — as outras 9 telas sumiam do build de produção).

## Reliability

- Toda persistência JSON usa escrita atômica (temp + rename): crash no meio de uma escrita não corrompe mais `state.json` ou qualquer store.
- `MUNIN_DATA_DIR` honrado por todos os módulos (9 ignoravam), então testes e ambientes isolados não vazam mais escrita para o repo.
- Defeito real corrigido em `resolveContext`: tokens de 2 caracteres ("B3") eram descartados e o bônus de match exato era inalcançável; referências como "atualiza B3 digital assets" agora resolvem deterministicamente.

## Security

- CORS `*` removido de todas as APIs: agora só origens locais conhecidas são refletidas. Antes, qualquer site aberto no browser podia ler dados pessoais e gravar credenciais de provider na API local.
- Rota de imagem do visual-assets valida que o path servido está contido no data dir (path traversal via estado adulterado).
- OAuth redirect derivado de config (sem URL hardcoded).
- Regra `sensitive-private` da Context Memory: intocada e verificada.
- Nenhum secret em arquivos versionados (auditado).

## Tests

- `npm run build` (tsc + vite multi-page): ✓
- `npm test`: 79/79 ✓ (era 69 executando; 10 testes recuperados)
- Smoke test manual do servidor unificado: todas as rotas de todos os módulos respondendo em :4310; CORS verificado para origem permitida e origem estranha.
- Screenshots de todas as 11 telas via Chromium headless: sem erros de console (exceto favicon 404 pré-existente), navegação e dados carregando.

## Deferred Recommendations

Deliberadamente não feitos por risco/escopo (detalhados no audit doc, seção P1/P2):

- Migrar as páginas standalone para o app React (ou shell de layout único) — a consolidação visual foi feita por tokens, mas cada página ainda tem CSS/JS próprio.
- Dividir `GET /api/workspace` (hoje devolve state + events + intelligence inteiro em toda carga).
- Decidir o destino da camada foundation (runtime/leases/outbox/resilience, ~1.200 linhas testadas sem consumidor de produto): integrar ao Assistant ou arquivar.
- SQLite: avaliado e rejeitado por ora — JSON atômico é suficiente para o volume e concorrência atuais.
- Keychain do SO para API keys; backup rotativo de `data/runtime/`.
- Remover os entrypoints standalone das APIs após um ciclo estável do servidor unificado.

## Potential Breaking Changes

- Consumidores externos que chamavam diretamente as portas 4312–4315 precisam apontar para 4310 (mesmos paths) — ou iniciar os entrypoints legados, que foram mantidos.
- Scores de `/api/intelligence/context` mudam de escala com a correção do matching (comportamento melhor, números diferentes).
- Respostas de criação de asset retornam URL relativa (`/api/...`) em vez de absoluta com porta.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SSjEB43MtBcYzSdJsHMJg1
