<!-- Saída do subagente steve (Claude Code 2.1.302, execução headless), 2026-10-17. Texto na íntegra. -->

PESQUISA — Divergências entre planilha de vendas e planilha de recebimentos (pequenos negócios, Brasil)
Status: **PARCIALMENTE VERIFICADA.** O WebFetch falhou ("proxy refused the connection"), então não abri nenhuma página. Tudo abaixo vem de resumos do WebSearch. Os títulos e URLs são os que a busca devolveu. Onde o resumo não trouxe data, escrevi "data não informada". Nenhuma norma do BC foi lida no texto original.

**Pergunta e limites:** que causas fazem uma venda registrada não bater com o valor recebido, e que método simples de conferência em planilha é defensável? Escopo: Brasil, português, fontes atuais. Data de captura: 2026-10-17.

## Público
- **Fato:** 56% dos donos de micro e pequenas empresas usavam maquininha em 2021, contra 39% em 2016 (pesquisa Sebrae [3]).
- **Fato:** na pesquisa Fiserv/Sebrae SP, entre os negócios que aceitam maquininha, 98% aceitam crédito e 96% aceitam débito [4]. É um recorte de SP, não nacional.
- **Inferência:** a maioria desse público recebe por vários meios ao mesmo tempo (crédito, débito, Pix), cada um com prazo e custo diferentes. Isso explica por que a conta fecha mal.
- **Hipótese:** a maioria concilia "no olho" ou só pelo extrato bancário. Não achei pesquisa que sustente isso.

## Problemas e dores
| Causa | Classe | Fonte |
|---|---|---|
| Taxa de desconto (MDR): o estabelecimento paga ao credenciador uma taxa negociada em contrato, que considera intercâmbio, outros custos e margem. Por isso o líquido é menor que o bruto. | Fato | [1] |
| Aluguel de maquininha e pré-pagamento (antecipação) também são remuneração do credenciador. | Fato | [2] (documento do Senado) |
| Prazo de liquidação: aprovada não significa recebida. Um depósito pode juntar várias vendas ou parcelas. | Fato (blogs de adquirentes, fonte comercial) | [7] |
| Débito e pré-pago: o BC uniformizou o prazo de liquidação em "até D+2" (Resolução BCB 246, vigência 1º/04/2023). | Fato, por fonte secundária que cita o BC | [5] |
| Antecipação: pelo BCB 89 (2021), a liquidação da antecipação pode ocorrer a qualquer hora, todos os dias. Isso muda a data efetiva do dinheiro e traz custo adicional. | Fato, por fonte secundária | [1b] |
| Chargeback: a responsabilidade financeira dos participantes é limitada a 180 dias contados da autorização (Resolução BCB 522). | Fato, por fonte secundária | [1b] |
| Chargeback e estorno de cliente fazem o valor recebido ser menor ou revertido depois. | Fato | [7] |
| Pix: é instantâneo e funciona 24 horas por dia, inclusive em fins de semana e feriados, então tende a bater na data. | Fato (fonte comercial) | [7] |
| Pix: o MED (Mecanismo Especial de Devolução) pode bloquear e estornar valores recebidos. O prazo para o pagador pedir foi citado como 80 dias, mas as fontes divergem sobre a vigência. | Fato com ressalva | [6] |
| Cobranças de taxa diferentes do contratado. | Fato (fonte comercial) | [7] |
| Erros de digitação, cancelamentos, boleto e parcelado lojista. | **Hipótese** | Sem fonte aberta. Erro de digitação e cancelamento são causas lógicas, mas não as documentei. Sobre boleto e parcelado lojista não encontrei nada. |

## Linguagem do público
Não encontrei fóruns ou comentários de donos de negócio. Só vi o vocabulário dos materiais de adquirentes: "conciliação", "NSU", "valor líquido", "repasse", "antecipação", "não bate com o extrato". Isso é linguagem do setor, não observada no público. **Hipótese:** o público diz "o dinheiro não bateu", "caiu menos" e "cadê a venda".

## Objeções e tentativas atuais
- **Fato (fonte antiga, data não informada):** falhas de conciliação geram perdas a pequenos varejistas, e muitos passaram a automatizar a conferência com ferramentas de gestão [8].
- Os materiais de Stone, Cielo e Getnet oferecem conciliadores próprios [7]. Há conflito de interesse comercial.
- **Hipótese de objeção:** "não tenho tempo", "o relatório da maquininha é confuso", "meu contador cuida disso".

## Método de planilha (da busca em fontes comerciais [7] mais as funções confirmadas)
1. Trabalhar por período curto (semana ou quinzena).
2. Colunas na planilha de vendas: ID/NSU ou número do pedido, valor bruto, forma de pagamento, taxa esperada, líquido esperado, data prevista. A chave deve ser o ID, não só valor e data.
3. Na planilha de recebimentos: ID, valor líquido recebido, data efetiva.
4. Cruzar pelo ID, comparar líquido esperado com recebido e data prevista com efetiva, e classificar as diferenças.
5. Somar parcelas ou vendas do período quando o depósito vier agrupado.
6. **Funções confirmadas na documentação oficial da Microsoft (resultado da busca):**
   - PROCV, PROCX e SOMASE existem [9][10][11].
   - O PROCX não existe no Excel 2016 e 2019. Nesses casos, usar PROCV [9].
   - A Microsoft recomenda PROCX no Microsoft 365 [9].
   - O resumo da busca dizia que o PROCV "retorna correspondência aproximada por padrão", mas isso veio de site de terceiros. Para o carrossel, mencionar correspondência exata (quarto argumento FALSO) é boa prática, mas **não verificado**.
7. No Google Sheets, o XLOOKUP (nome em inglês) foi confirmado só por terceiros, com suporte desde agosto de 2022 [12]. O nome "PROCX" no Sheets em português **não foi verificado**.
8. SOMASES, CONT.SES e SOMARPRODUTO: não confirmei em fonte oficial. Evitar ou checar antes.

## Ideias e ângulos priorizados
1. **"Bruto não é líquido":** a maior parte da diferença tem explicação (taxa, aluguel, antecipação). Justificativa: é o ponto mais bem sustentado [1][2]. Risco: não dar percentuais.
2. **"Venda aprovada não é dinheiro na conta":** comparar data prevista com data efetiva. Justificativa: [7] e [5]. Risco: prazos variam por contrato e produto.
3. **"Uma chave única (ID/NSU) para cruzar":** a conferência deixa de ser por valor e data. Justificativa: [7]. Risco: o ID só existe se a maquininha ou o relatório fornecer, então avisar isso.
4. **"Sobrou na venda, faltou no recebimento: o que olhar":** checklist de causas (taxa, prazo, estorno, cancelamento, digitação, Pix devolvido). Justificativa: cobre o CTA de comentar qual aparece mais. Risco: cancelamento e digitação estão sem fonte, então tratar como causas genéricas.
5. **"Quando chamar o contador ou a credenciadora":** limita o escopo e respeita a restrição de não substituir o contador. Risco: baixo.

## Afirmações
**Seguras (com redação cuidadosa):**
- A taxa de desconto é negociada em contrato e reduz o valor recebido.
- Aluguel de maquininha e antecipação são custos possíveis.
- Venda aprovada pode ser paga depois, e um depósito pode juntar várias vendas.
- Chargeback e estorno podem reverter ou reduzir o recebimento.
- Conferir por identificador comum é melhor do que só por valor e data.
- PROCV e PROCX existem no Excel, e o PROCX não existe no Excel 2016 e 2019.

**Evitar:**
- Qualquer percentual de MDR ou taxa. O teto de 0,5% de intercâmbio no débito é custo entre credenciador e emissor, não a taxa do lojista [5].
- Qualquer prazo como regra geral. "D+2" no débito é o que a fonte secundária atribui ao BC e não está confirmado no texto da norma. Os prazos do crédito não foram encontrados. Um documento do Senado cita média de cerca de 20 dias, sem regra vigente [2].
- Afirmar que Pix "nunca diverge": existe o MED, e a vigência do "MED 2.0" não está confirmada.
- "Estatística de quanto os negócios perdem por falta de conciliação": não há fonte.
- Dizer que SOMASES, CONT.SES ou o XLOOKUP em português no Sheets existem sem checar.

## Fontes
| [n] | Título | URL | Tipo | Publicação | Sustenta |
|---|---|---|---|---|---|
| 1 | BCB, Relatório de Economia Bancária 2023, boxe | https://www.bcb.gov.br/content/publicacoes/boxe_relatorio_de_economia_bancaria/reb2023b3p.pdf | Primária (BC) | 2023 | Definição de MDR. Só vi o resumo da busca e não abri o PDF |
| 1b | Monitor Mercantil, BC amplia responsabilidade das bandeiras | https://monitormercantil.com.br/bc-amplia-responsabilidade-das-bandeiras-de-cartao-em-caso-de-falhas-nas-transacoes/ | Imprensa | Data não informada | BCB 522 (180 dias). O BCB 89 vem de Okai: https://okai.com.br/noticia/2021-04-23/banco-central-moderniza-as-normas-sobre-arranjos-de-pagamentos |
| 2 | Documento do Senado | https://legis.senado.leg.br/sdleg-getter/documento/download/7c3cf996-5391-46cc-b123-bd88b084f45f | Documento legislativo | Data não informada | Remuneração do credenciador |
| 3 | Sebrae, Uso de maquininhas 2021 | https://datasebrae.com.br/wp-content/uploads/2020/06/Uso-maquininhas-2021.pdf | Primária (Sebrae) | 2021 | 56% usam maquininha |
| 4 | Fiserv/Sebrae SP | https://datasebrae.com.br/wp-content/uploads/2023/10/Meios-de-pagamento-em-pequenos-negocios-de-SP-Fiserv-SebraeSP.pdf | Pesquisa | 2023 | 98% crédito e 96% débito (SP) |
| 5 | Okai (nota do BC, 26/09/2022) | https://okai.com.br/noticia/2022-09-26/banco-central-aprimora-regulacao-sobre-tarifa-de-intercambio-tic-e-prazo-de-liquidacao-de-operacoes-para-cartoes-de-debito-e-pre-pagos | Secundária | 2022-09-26 | Resolução 246 e prazo de liquidação do débito |
| 6 | Canaltech, MED | https://canaltech.com.br/apps/pix-o-que-e-o-mecanismo-especial-de-devolucao-med/ | Imprensa | Data não informada | MED. Vigência do "MED 2.0" em https://finsidersbrasil.com.br/?p=371654, sem data clara |
| 7 | Stone, Conciliação de cartão de crédito | https://conteudo.stone.com.br/conciliacao-de-cartao-de-credito/ | Comercial | Data não informada | Método e causas. Cielo: https://blog.cielo.com.br/financas/conciliacao-financeira-de-cartoes/ |
| 8 | Monitor Mercantil, quatro em cada 10 pequenos negócios | https://monitormercantil.com.br/quatro-em-cada-10-pequenos-neg-cios-j-usam-m-quina-de-cart-o/ | Imprensa | Antiga, sem data | Perdas por falha de conciliação |
| 9 | Microsoft, Função PROCX | https://support.microsoft.com/pt-br/Excel/functions/xlookup-function | Primária | Data não informada | Não existe no Excel 2016 e 2019 |
| 10 | Microsoft, Função PROCV | https://support.microsoft.com/pt-br/Excel/functions/vlookup-function | Primária | Data não informada | PROCV existe |
| 11 | Microsoft, Função SOMASE | https://support.microsoft.com/pt-br/Excel/functions/sumif-function | Primária | Data não informada | SOMASE existe |
| 12 | 9to5Google, Sheets XLOOKUP | https://9to5google.com/2022/08/25/google-sheets-xlookup/ | Imprensa | 2022-08-25 | XLOOKUP no Sheets |

Captura de todas: 2026-10-17, apenas via WebSearch.

**Cobertura**
- Buscado com resultado: MDR, intercâmbio, débito, chargeback, Pix/MED, método de conciliação, PROCV/PROCX/SOMASE, uso de maquininha.
- Buscado sem resultado: prazo de liquidação do crédito, parcelado lojista, boleto, linguagem do público em fóruns, guia do Sebrae sobre conciliação, doc oficial do Google Sheets, SOMASES/CONT.SES/SOMARPRODUTO oficiais.
- Indisponível: abertura de páginas (WebFetch).
- Não tentado: contratos e tabelas das credenciadoras, Resoluções BCB 89, 246 e 522 no texto original.

**Premissas:** o público usa maquininha e Pix e concilia manualmente. As fontes comerciais são usadas só para método, não para fatos regulatórios.

**Pendências**
- Reabrir os links 1, 5, 9 e as resoluções do BC quando o acesso permitir.
- Confirmar o comportamento padrão do PROCV e o nome PROCX no Sheets.
- Decidir se Zion exige fonte para "erro de digitação" e "cancelamento". Sugestão: tratar como causas gerais, sem estatística.

**Recomendação para a Lexa:** manter o carrossel sem números, prazos ou taxas. Avisar que esses valores estão no contrato e no relatório da credenciadora. Usar fórmulas só com PROCV ou PROCX, ou descrever o passo sem fórmula. Incluir o aviso de que o carrossel não substitui o contador.
