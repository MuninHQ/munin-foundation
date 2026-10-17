# Consolidado do coordenador — carrossel LinkedIn (teste, NÃO PUBLICADO)

Fluxo executado: `steve` → `lexa` → `zion`, sequencial, um subagente por vez. Lumi, Ravi, Maya e Neo não foram acionados (desnecessários para o briefing).

**Status de verificação: PARCIALMENTE VERIFICADA.** WebSearch funcionou; WebFetch e curl para support.microsoft.com e bcb.gov.br foram recusados pelo proxy do ambiente. Nenhuma fonte foi lida na íntegra.

**Publicação: não autorizada. Nada foi publicado, agendado ou enviado.**

## Carrossel final (achados de Zion aplicados)

Rodapé em todos os slides 2–10: *Método geral. Não substitui o contador.*

| # | Título | Corpo |
|---|---|---|
| 1 | A venda está na planilha. O dinheiro não bateu. E agora? | Um método em 4 passos para encontrar a diferença entre o que você vendeu e o que recebeu. |
| 2 | O valor vendido não é o valor que cai | A empresa da maquininha (credenciadora) cobra uma taxa combinada em contrato. Aluguel e antecipação também podem entrar. Os valores estão no seu contrato e no relatório dela. |
| 3 | Venda aprovada pode ser paga depois | Um depósito pode juntar várias vendas ou parcelas. Comparar venda por venda com o extrato pode enganar. |
| 4 | Passo 1 — Comece por um período curto | Confira uma semana ou quinzena por vez. Diferença recente é mais fácil de rastrear. |
| 5 | Passo 2 — Junte tudo em um arquivo, duas abas | **Vendas:** ID ou nº do pedido, valor bruto, forma de pagamento, líquido esperado (pelo contrato), data prevista. **Recebimentos:** ID, valor recebido, data efetiva. |
| 6 | Passo 3 — Escolha um código único como chave | Duas vendas de mesmo valor no mesmo dia se confundem. Use o ID/NSU (número da transação no relatório). Sem ele, use o nº do pedido. |
| 7 | Passo 4 — Traga, compare e classifique | PROCV traz o recebido para a aba de vendas — use correspondência exata (último argumento FALSO). Depósito agrupado? SOMASE soma as vendas do período. Marque cada diferença. |
| 8 | Causas a verificar primeiro | Taxa diferente da contratada · Estorno ou chargeback · Pix devolvido depois (MED) · Antecipação que mudou a data · Cancelamento ou erro de digitação |
| 9 | O método em uma frase | Período curto, duas abas, uma chave única, diferença classificada. O que sobrar sem explicação vai para a credenciadora ou o contador. |
| 10 | Salve para a próxima conferência | Comente: qual divergência aparece mais no seu negócio? |

**Legenda**

> Quando a planilha de vendas não bate com o que entrou na conta, quase sempre dá para rastrear a causa: taxa, data de liquidação, estorno, cancelamento ou erro de digitação. O difícil é saber qual.
>
> O carrossel mostra um método simples: um período curto, duas abas, um código único para cruzar as linhas e uma classificação para cada diferença. As taxas e os prazos do seu caso estão no contrato e no relatório da credenciadora, não aqui. No Google Sheets a lógica é a mesma; confira o nome da função.
>
> Salve para usar na próxima conferência. E conta nos comentários: qual divergência aparece com mais frequência aí?
>
> Este conteúdo é geral e não substitui o contador. Confirme cada caso com ele.

**Hashtags:** #ConciliacaoFinanceira #PequenasEmpresas #GestaoFinanceira

## Decisões do coordenador sobre a revisão

- Aplicados: achados 1 (correspondência exata, bloqueante), 2 (SOMASE para depósito agrupado), 3 (legenda sem frequência), 4 (passos 3/4 distintos), 5 ("causas a verificar"), 6 (arquivos separados → um arquivo), 7 (líquido esperado pelo contrato), 8 (aviso em rodapé), 9 (gancho "não bateu"), 10 (credenciadora/NSU explicados), 12 (3 hashtags).
- Ajuste próprio: a menção a PROCX (achado 11) saiu do slide 7 para caber no limite de palavras; PROCV funciona em todas as versões citadas.
- Ponto do coordenador, não verificado nesta execução: pela documentação da Microsoft que conheço, o PROCV usa correspondência aproximada quando o último argumento é omitido. Isso reforça o achado bloqueante, mas precisa ser reaberto na fonte antes de qualquer publicação.

## Fontes

Lista completa (URL, tipo, data) em `01-pesquisa-steve.md`. Usadas no texto final: [1] BCB REB 2023 (taxa de desconto, resumo de busca); [1b] Okai/Monitor Mercantil (antecipação, chargeback, fontes secundárias); [2] documento do Senado (aluguel e antecipação); [6] Canaltech (MED do Pix); [7] Stone e Cielo (método e causas, fontes comerciais); [10][11] Microsoft (PROCV, SOMASE).

## Premissas

- Público usa maquininha e/ou Pix, Excel ou Google Sheets, e concilia manualmente (hipótese, sem pesquisa que confirme).
- "O dinheiro não bateu" é hipótese de linguagem do público.
- Exemplos de causas sem fonte (cancelamento, erro de digitação) aparecem como "a verificar", sem afirmação de frequência.

## Pendências (antes de qualquer publicação)

1. Reabrir na íntegra [1], [10] e as Resoluções BCB 89/246/522 quando o acesso permitir.
2. Confirmar o comportamento padrão do PROCV e o nome da função no Google Sheets em português.
3. Diagramar e testar a leitura dos slides 5, 7 e 8 em tela de celular.
4. Pedido explícito do usuário para publicar, se e quando desejado.
