<!-- Saída do subagente zion em modo revisão crítica (Claude Code 2.1.302, execução headless), 2026-10-17. Texto na íntegra. -->

**ANÁLISE DE POSICIONAMENTO | REVISÃO CRÍTICA — carrossel-linkedin-divergencias**

**Dados usados (e lacunas)**
- Usei o briefing, a pesquisa do Steve e o carrossel da Lexa, todos colados no pedido.
- Tentei abrir a Microsoft (PROCV) e o boxe do BCB [1] com WebFetch. Os dois falharam com "proxy refused the connection".
- Por isso, as pendências 1 (item 1 da tabela), 3 e 14 seguem **não verificadas na fonte**. Resolvo cada uma com redação que não depende da verificação.

## 1. Aderência ao briefing
Atende:
- Há 10 slides (faixa de 8 a 10).
- O tom é prático e em português do Brasil.
- Não há números, taxas, prazos, logos ou voz do André.
- O aviso do contador está presente.
- O CTA (salvar e comentar) está presente.
- Não há afirmação de publicação.

Desvios:
- **Planilhas ou abas.** O briefing fala em "planilha de vendas" e "planilha de recebimentos". A peça diz "duas abas" e não trata do caso de arquivos separados.
- **Causas citadas.** O briefing lista parcelamento, Pix e cancelamento. O parcelamento aparece só de passagem (slide 3) e não entra no método.
- **Escopo do gancho.** O briefing inclui venda que "não aparece" e valor ou data diferentes. O gancho ("caiu menos") cobre só uma dessas situações.

## 2. Precisão factual
- **Slide 2 (MDR, aluguel, antecipação):** a redação é cautelosa e coerente com [1] e [2]. A fonte [1] não foi aberta, então o texto fica no nível genérico "taxa combinada em contrato". Não vejo risco enquanto não houver número.
- **Slide 3:** coerente com [7]. É fonte comercial usada só para mecânica, o que é aceitável.
- **Slide 7:** PROCV e PROCX existem [9][10]. "No Excel 365, também PROCX" está correto, mas incompleto. O que está confirmado é que o PROCX não existe no Excel 2016 e 2019.
- **Slide 8, "Pix devolvido depois (MED)":** é fato com ressalva. A peça não cita prazo nem versão, o que está certo. Mantenha assim.
- **Slide 8, "Antecipação que mudou a data":** coerente com BCB 89, via fonte secundária. O texto não depende da norma.
- **Slide 8, "cancelamento e erro de digitação":** é hipótese sem fonte, mas é causa lógica e genérica. Pode ficar com rótulo (achado 5).
- **Legenda, "é comum" e "Em geral há uma explicação":** não têm fonte. O Steve marcou como hipótese que o público concilia "no olho", e não achou estatística. É generalização sem base (achado 3).

## 3. Promessas exageradas
- "Achar onde a venda e o recebimento não batem" (capa e promessa) é forte para um método que depende de ID. O ID pode não existir.
- "Método em 4 passos" é coerente em número, mas os passos 3 e 4 se sobrepõem (achado 4).
- Nada promete economia, recuperação de dinheiro ou precisão contábil. Está seguro nesse ponto.

## 4. Clareza para o público
- Passos 3 e 4 têm títulos quase iguais ("Cruze por um código único" e "Cruze, compare e classifique").
- A pergunta "como cruzo?" tem resposta só no slide 7. O depósito agrupado (slide 3) fica sem solução no método.
- O termo "credenciadora" aparece sem explicação. Para o dono de loja, pode ser "a empresa da maquininha".
- "NSU" aparece no slide 6 sem definição.
- Os slides 5, 8 e 10 estão densos para celular.

## 5. Riscos
- **Legal e de reputação:** baixos. A peça não dá número, prazo nem recomendação tributária.
- **Técnico:** PROCV com correspondência aproximada em ID gera cruzamentos errados sem aviso. Isso é grave para quem tem "conhecimento básico". O Steve não conseguiu confirmar o padrão do PROCV, então a peça deve orientar sem citar o padrão.
- **Fonte comercial:** a base do método é Stone e Cielo. Não há promoção de produto na peça, o que está certo.

## 6. Achados

| # | Nível | Achado | Correção |
|---|---|---|---|
| 1 | **Bloqueante** | O slide 7 manda usar PROCV sem avisar sobre correspondência exata. Se o usuário não usar o 4º argumento FALSO, o resultado pode estar errado e o usuário não percebe. Não consegui verificar o comportamento padrão. | Incluir "correspondência exata (4º argumento FALSO)" como instrução, sem afirmar o padrão. Isso é seguro porque exata é o comportamento que o método exige. Aviso a validar antes da publicação, quando o acesso permitir (pendência do Steve). |
| 2 | **Importante** | O slide 3 apresenta o depósito agrupado como problema, e o método não resolve isso. O Steve listou o passo "somar parcelas ou vendas quando o depósito vier agrupado". Esse passo sumiu. | Incluir no slide 7 a soma do período com SOMASE [11] e comparação com o depósito. |
| 3 | **Importante** | Legenda: "é comum" e "Em geral há uma explicação" sem fonte. | Reescrever sem frequência: "Quando a planilha de vendas não bate com o que entrou na conta, quase sempre dá para rastrear a causa". Ou, mais seguro, "costuma ter explicação rastreável". |
| 4 | **Importante** | Passos 3 e 4 duplicam "cruze". | Passo 3 passa a ser "Escolha a chave". Passo 4 passa a ser "Traga, compare e classifique". |
| 5 | **Importante** | Slide 8 mistura causas com fonte e causas sem fonte. | Rotular como "Causas a verificar" (e não "causas comuns"). Isso responde à pendência 4. Não usar "comuns", que seria uma afirmação de frequência. |
| 6 | **Importante** | "Duas abas" ignora o caso dos arquivos separados, que é o do briefing. PROCV entre arquivos é mais frágil. | Slide 5: "duas abas (ou copie as duas planilhas para o mesmo arquivo)". |
| 7 | **Importante** | Slide 5 pede "taxa esperada" e "líquido esperado" sem dizer de onde vêm. | Explicar que vêm do contrato ou do relatório da credenciadora, ou usar "líquido esperado (conforme contrato)". |
| 8 | **Importante** | Slide 10 acumula CTA e aviso. O aviso fica pequeno ou o CTA fica diluído. | Dividir: CTA no slide 10 e aviso em rodapé fixo em todos os slides, mais frase completa no último. Assim fica dentro de 10 slides. |
| 9 | Opcional | Gancho "caiu menos" cobre só uma das divergências. | Manter o gancho 1 como principal, mas com variação: "A venda está na planilha. O dinheiro não bateu. E agora?". "Não bateu" cobre valor, data e ausência. Continua hipótese de linguagem. |
| 10 | Opcional | Termo "credenciadora" e sigla NSU sem explicação. | Slide 2: "empresa da maquininha (credenciadora)". Slide 6: "ID ou NSU (número da transação no relatório)". |
| 11 | Opcional | "Excel 365" incompleto. | "PROCX (no Microsoft 365; não existe no Excel 2016 e 2019)". |
| 12 | Opcional | Hashtags: "#ConciliacaoFinanceira" e "#Planilhas" são amplas. | Sem dado de alcance, não trocar. Manter ou reduzir para 3. |

## 7. Respostas às pendências da Lexa
1. **Itens 1, 13, 14 e 19.**
   - Item 1: aceitável como "taxa combinada em contrato", sem número. Seguir marcado como "só resumo lido".
   - Item 13: não citar Sheets. Dizer no slide 7 que as fórmulas são do Excel.
   - Item 14: não confirmei (WebFetch falhou). Usar a instrução sem afirmar o padrão.
   - Item 19: manter como hipótese rotulada (achado 5).
2. **PROCV no slide 7 sem mencionar o Sheets:** sim, pode. O briefing diz "Excel/Google Sheets". Acrescentar uma linha neutra: "No Google Sheets, a lógica é a mesma, mas confira o nome da função". Não afirmar nome em português, porque não foi verificado.
3. **Fonte [1] na íntegra:** não consegui abrir (proxy). O texto dos slides usa só a ideia geral. Reabrir antes de publicar.
4. **Rótulo para cancelamento e erro de digitação:** sim, mas "Causas a verificar", não "comuns" (achado 5).
5. **Slide 10:** dividir CTA e aviso (achado 8).
6. **Publicação:** confirmo. Nada foi publicado, agendado ou enviado por mim. A decisão continua com o coordenador e o usuário.

## 8. Versão corrigida (só o que muda)

**[1] Capa (variação do gancho, opcional)**
- Título: A venda está na planilha. O dinheiro não bateu. E agora?

**[2] Bruto não é líquido**
- Corpo: A empresa da maquininha (credenciadora) cobra uma taxa combinada em contrato. Aluguel da maquininha e antecipação também podem entrar. Os valores estão no seu contrato e no relatório da credenciadora.

**[3] Aprovada não é recebida**
- Sem mudança.

**[5] Passo 2**
- Título: Monte duas abas, cada uma com o seu papel
- Corpo: Se estiverem em arquivos separados, copie tudo para o mesmo arquivo.
  - Vendas: ID ou nº do pedido, valor bruto, forma de pagamento, líquido esperado (conforme contrato), data prevista.
  - Recebimentos: ID, líquido recebido, data efetiva.
- Observação de leiaute: tirar "taxa esperada" se o espaço apertar. O líquido esperado já a embute.

**[6] Passo 3**
- Título: Escolha um código único como chave
- Corpo: Duas vendas de mesmo valor no mesmo dia se confundem. Use o ID ou NSU (número da transação no relatório), se existir. Se não existir, use o nº do pedido.

**[7] Passo 4**
- Título: Traga, compare e classifique
- Corpo: Use PROCV (ou PROCX no Microsoft 365; não existe no Excel 2016 e 2019) para trazer o recebido para a aba de vendas. No PROCV, escolha correspondência exata (4º argumento FALSO). Compare líquido e data. Se o depósito vier agrupado, some as vendas do período com SOMASE e compare com ele. Marque cada diferença.
- Observação: para o Google Sheets, a lógica é a mesma, mas confira o nome da função. A Lexa deve encurtar o texto para caber (limite de ~40 palavras, ver abaixo).
- Versão enxuta, se precisar:
  - "PROCV traz o recebido para a aba de vendas (use correspondência exata: 4º argumento FALSO)."
  - "Depósito agrupado: SOMASE soma as vendas do período."
  - "Compare líquido e data. Marque cada diferença."

**[8] Causas a verificar**
- Título: Causas a verificar primeiro
- Itens:
  - Taxa diferente da contratada.
  - Estorno ou chargeback.
  - Pix devolvido depois (MED).
  - Antecipação que mudou a data.
  - Cancelamento ou erro de digitação na planilha.

**[9] Síntese**
- Corpo: Período curto, duas abas, uma chave única, diferença classificada. O que sobrar sem explicação vai para a credenciadora ou o contador.

**[10] CTA**
- Título: Salve para a próxima conferência
- Corpo: Comente: qual divergência aparece mais no seu negócio?
- Rodapé (também nos slides 2 a 9, em corpo menor): Método geral. Não substitui o contador.

**Legenda (parágrafo 1 muda; o resto fica)**
> Quando a planilha de vendas não bate com o que entrou na conta, quase sempre dá para rastrear a causa: taxa, data de liquidação, estorno, cancelamento ou erro de digitação. O difícil é saber qual.

O restante da legenda fica como está (inclui "As taxas e os prazos do seu caso estão no contrato e no relatório da credenciadora, não aqui", que é seguro, e o aviso final).

**Fontes:** [1] BCB REB 2023 (não aberta); [2] Senado; [6] Canaltech; [7] Stone/Cielo; [9][10][11] Microsoft (existência das funções, via resumo de busca); [1b] Okai/Monitor Mercantil.

**Premissas:** o público usa Excel e conhece o básico de planilha. "Não bateu" é hipótese de linguagem. A recomendação do 4º argumento FALSO é boa prática de uso, mas o comportamento padrão do PROCV continua não verificado por mim.

**Pendências antes de qualquer publicação (decisão do coordenador/usuário):**
- Reabrir [1], [9], [10] e as resoluções do BC quando o acesso permitir.
- Confirmar o nome da função equivalente no Google Sheets em português, se quiserem citá-lo.
- Testar o leiaute dos slides 5, 7 e 8 no celular.
- Registrar que a publicação **não está autorizada**.

Não editei nenhum arquivo nem publiquei nada.
