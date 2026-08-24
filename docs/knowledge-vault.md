# Munin Knowledge Vault (Obsidian)

## Objetivo

O Knowledge Vault e a camada Markdown/Obsidian do Munin para conhecimento de longo prazo, pesquisa, carreira, LinkedIn e decisoes do proprio projeto. Ele nao substitui a Context Memory: a Context Memory continua sendo a fonte de verdade operacional e aplica governanca de escopo/freshness. O vault e uma projecao legivel por humanos e agentes.

## Principios

1. Local-first: nenhum servico pago e necessario.
2. Obsidian-optional: tudo funciona como Markdown comum, mesmo sem o aplicativo aberto.
3. Sem duplicacao de autoridade: `90 Context Memory` e gerado pelo Munin.
4. Seguro por padrao: secoes `sensitive-private` nao sao exportadas sem flag explicita.
5. Portavel: o caminho pode ser configurado com `MUNIN_OBSIDIAN_VAULT`.

## Estrutura

- `00 Inbox`
- `01 Career` (Empresas, Vagas, Entrevistas, Pessoas, Cases)
- `02 LinkedIn Studio` (Publicados, Agendados, Ideias, Teses, Fontes)
- `03 Research` (IA, Digital Assets, Drex, Stablecoins, Blockchain, Financial Infrastructure)
- `04 Munin` (Arquitetura, Decisoes, Features, Bugs, Changelog)
- `05 Projects`
- `90 Context Memory`
- `99 Templates`

## Inicializacao

```powershell
npm run knowledge:vault:init
```

Por padrao o vault fica em `data/runtime/knowledge-vault`. Para usar um vault existente do Obsidian:

```powershell
$env:MUNIN_OBSIDIAN_VAULT = 'D:\Obsidian\Munin'
npm run knowledge:vault:init
```

## Sincronizar Context Memory -> Obsidian

```powershell
npm run knowledge:vault:sync
```

Conteudo `sensitive-private` e omitido. A exportacao explicita e excepcional pode ser feita com:

```powershell
npm run knowledge:vault -- export-context --include-sensitive
```

## Capturar conhecimento

```powershell
npm run knowledge:vault -- capture --title "Ideia de post" --body "Tese e evidencias" --kind linkedin --tags linkedin,ai
```

Kinds aceitos: `note`, `career`, `linkedin`, `research`, `munin`, `project`, `context`.

## Pesquisar

```powershell
npm run knowledge:vault -- search "tokenizacao B3"
```

A busca e local e nao depende da CLI do Obsidian. Isso garante que agentes e jobs do Munin consigam consumir o vault mesmo se o Obsidian nao estiver instalado.

## Status

```powershell
npm run knowledge:vault:status
```

## Obsidian

No Obsidian, escolha **Open folder as vault** e selecione o diretorio retornado pelo comando de inicializacao. Plugins nao sao necessarios para a primeira fase. Backlinks, Graph View, Properties e Templates funcionam sobre os arquivos gerados.

## Evolucao planejada

- promover capturas selecionadas para a Context Memory;
- registrar automaticamente posts publicados/agendados;
- registrar research briefs e ADRs;
- adicionar painel do vault ao HUD/Control Room;
- opcionalmente usar a Obsidian CLI quando instalada, sem tornar isso dependencia do Munin.
