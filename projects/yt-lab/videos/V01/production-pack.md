# YT-LAB V01 — Production Pack

## Working title

**O que acontece nos segundos depois que você faz um Pix?**

Alternative titles:

1. **Seu Pix não “viaja” como você imagina**
2. **O caminho invisível de um Pix, explicado**
3. **Como o Pix move dinheiro entre bancos em segundos**

## Core promise

Show, step by step, what happens from the moment a user confirms a Pix until the receiving institution credits the beneficiary, separating:

- user authentication;
- key lookup through the DICT when a key is used;
- payment initiation;
- messaging between institutions;
- settlement through the SPI;
- debit and credit in the institutions’ dedicated settlement accounts;
- confirmation to both ends.

## Audience question

> Como o banco consegue tirar dinheiro de uma conta e colocar em outra instituição, em segundos, a qualquer hora?

## Editorial angle

The Pix experience looks like a simple app interaction, but behind it is a regulated, centralized settlement infrastructure operated by the Banco Central, connected to many direct and indirect participants.

The original contribution of this video is a clear layered model:

```text
CAMADA 1 — VOCÊ E O APP
Autenticação e confirmação

CAMADA 2 — ENDEREÇAMENTO
A chave ajuda a localizar os dados da conta no DICT

CAMADA 3 — INSTITUIÇÕES
Banco pagador e banco recebedor validam e trocam mensagens

CAMADA 4 — LIQUIDAÇÃO
O SPI transfere o valor entre Contas PI em liquidação bruta em tempo real

CAMADA 5 — CONFIRMAÇÃO
A instituição recebedora credita o cliente e as pontas recebem o resultado
```

## Fact boundaries

This episode must not claim that:

- the DICT stores or moves money;
- every Pix necessarily uses a key;
- funds are settled later in a batch;
- settlement can create a negative balance in a Conta PI;
- a completed payment can simply be cancelled by the sender;
- Pix traffic runs openly over the public internet;
- every participant connects to the SPI directly.

## Evidence pack

### Primary sources

1. Banco Central — Sobre o Pix
   - The BC manages the centralized DICT and the centralized SPI.
   - SPI operates continuously.
   - https://www.bcb.gov.br/estabilidadefinanceira/pix-sobre

2. Banco Central — Sistema de Pagamentos Instantâneos
   - SPI is the unique centralized infrastructure for settlement between different institutions.
   - It uses real-time gross settlement, transaction by transaction.
   - Settled transactions are irrevocable.
   - Settlement uses dedicated Contas PI held by direct participants at the BCB.
   - Negative balances are not permitted.
   - https://www.bcb.gov.br/estabilidadefinanceira/sistemapagamentosinstantaneos

3. Banco Central — Participantes do Pix
   - Participants can access settlement directly or indirectly.
   - DICT access can also be direct or indirect according to participant type.
   - https://www.bcb.gov.br/estabilidadefinanceira/participantespix

4. Banco Central — Como usar o Pix / Segurança
   - Transactions are initiated in the secure environment of the user’s institution.
   - Information traffic is encrypted over the RSFN, separated from the public internet.
   - https://www.bcb.gov.br/estabilidadefinanceira/pagamentosinstantaneos/comousaropix

5. Banco Central — Normas sobre o Pix
   - Official manuals cover initiation, flows, timing, DICT and interfaces.
   - https://www.bcb.gov.br/estabilidadefinanceira/pix-normas

### Currency note

Before publication, re-open all primary sources and verify that no current manual update changes terminology or operational detail. Avoid hardcoding regulation-version numbers into narration unless essential.

## Claim ledger

| ID | Claim | Source | Confidence | Script use |
|---|---|---|---|---|
| C01 | Pix transfers are available around the clock and generally complete in seconds. | BCB Pix pages | High | Opening context |
| C02 | The DICT is a centralized addressing directory managed by the BCB. | BCB Sobre o Pix | High | Key lookup section |
| C03 | The DICT helps identify account information; it does not settle money. | BCB DICT/SPI architecture | High | Myth correction |
| C04 | SPI is the centralized settlement infrastructure for payments between different institutions. | BCB SPI | High | Main reveal |
| C05 | SPI uses real-time gross settlement, transaction by transaction. | BCB SPI | High | Settlement explanation |
| C06 | Settlement occurs through Contas PI maintained at the BCB by direct participants. | BCB SPI | High | Diagram |
| C07 | Contas PI cannot go negative. | BCB SPI | High | Liquidity note |
| C08 | Some institutions participate indirectly through a direct participant or special settlement participant. | BCB Participants | High | Simplification caveat |
| C09 | Pix transaction information travels encrypted through the RSFN, separated from the public internet. | BCB security guidance | High | Security section |
| C10 | Once settled, the transaction is irrevocable at the settlement layer; fraud/devolution mechanisms are separate processes. | BCB SPI and security pages | High | Closing nuance |

## Draft script v1

### 0:00–0:25 — Cold open

Você abre o aplicativo, escolhe uma chave, digita o valor e toca em confirmar.

Dois ou três segundos depois, o dinheiro aparece em outro banco.

Parece que o seu aplicativo simplesmente mandou um arquivo para o aplicativo da outra pessoa. Mas o que aconteceu de verdade envolveu autenticação, um diretório central, mensagens entre instituições e uma liquidação feita em contas mantidas no Banco Central.

Hoje nós vamos acompanhar um Pix por dentro.

### 0:25–1:10 — The false mental model

Quando alguém diz “mandei dinheiro para você”, a imagem mais intuitiva é a de uma quantia viajando de uma conta para outra.

Só que dinheiro bancário não atravessa a rede como uma nota digital. O que muda são registros: o seu banco reduz o saldo que deve a você, o banco da outra pessoa aumenta o saldo que deve a ela, e as duas instituições precisam acertar essa transferência entre si.

O Pix foi desenhado para fazer esse acerto quase imediatamente.

### 1:10–2:00 — Layer 1: authentication and initiation

Tudo começa dentro do ambiente seguro da sua instituição.

Antes de aceitar a ordem, o aplicativo autentica você com senha, biometria, reconhecimento facial ou outro mecanismo definido pelo banco. Depois, a instituição verifica dados básicos da conta, limites, regras de segurança e sinais de risco.

Confirmar no aplicativo não significa que o dinheiro já chegou. Significa que você autorizou a instituição a iniciar o pagamento.

### 2:00–2:55 — Layer 2: DICT addressing

Se você usou uma chave Pix, entra em cena o DICT: o Diretório de Identificadores de Contas Transacionais.

Ele funciona como uma camada de endereçamento. A chave ajuda a instituição pagadora a encontrar as informações necessárias da conta recebedora.

O ponto importante é este: o DICT não guarda o seu dinheiro e não faz a liquidação. Ele ajuda a responder “para qual instituição e para qual conta este pagamento deve seguir?”.

Também é possível iniciar um Pix sem chave, usando dados da conta. Por isso, chave e Pix não são a mesma coisa.

### 2:55–4:05 — Layer 3: institutions validate the payment

Com o destino identificado, a instituição pagadora monta a mensagem do pagamento e envia a instrução pela infraestrutura do sistema financeiro.

A instituição recebedora precisa ser alcançada de acordo com sua forma de participação. Algumas instituições liquidam diretamente no sistema central. Outras operam de forma indireta por meio de um participante direto ou de um liquidante especial.

Para o usuário, essa diferença é invisível. Para a arquitetura, ela define o caminho operacional da transação.

### 4:05–5:35 — Layer 4: SPI settlement

Agora vem a parte que realmente movimenta valor entre as instituições.

O SPI, Sistema de Pagamentos Instantâneos, é a infraestrutura centralizada de liquidação operada pelo Banco Central.

Ele funciona em liquidação bruta em tempo real. “Bruta” significa que cada transação é processada individualmente, em vez de esperar um lote para compensar várias operações depois. “Em tempo real” significa que a liquidação acontece durante o próprio fluxo do pagamento.

Os participantes diretos mantêm no Banco Central contas específicas chamadas Contas PI.

Quando o Pix é liquidado, o SPI debita a Conta PI do lado pagador e credita a Conta PI do lado recebedor. O sistema não permite saldo negativo nessas contas. A instituição precisa ter recursos disponíveis ou acesso à estrutura adequada para concluir a operação.

### 5:35–6:30 — Layer 5: credit and confirmation

Depois da liquidação, a instituição recebedora tem a confirmação de que o valor foi transferido entre as instituições.

Ela então credita o saldo do cliente recebedor e devolve a confirmação pelo fluxo. O aplicativo de quem pagou mostra a conclusão. O aplicativo de quem recebeu atualiza o saldo.

É essa combinação de mensagens, validações e liquidação imediata que transforma uma ação no celular em dinheiro disponível em outra instituição.

### 6:30–7:25 — Security and irreversibility nuance

As mensagens do Pix não ficam simplesmente circulando de forma aberta pela internet. As instituições operam com requisitos de segurança, criptografia, certificados e comunicação pela Rede do Sistema Financeiro Nacional.

E há outra diferença importante: depois que uma transação foi liquidada, ela é irrevogável na infraestrutura de liquidação. Isso não quer dizer que fraudes não possam ser investigadas ou que não existam mecanismos de devolução. Significa que o pagador não consegue tratar um Pix concluído como se fosse um e-mail que pode ser apagado antes de chegar.

### 7:25–8:00 — Closing

Então, da próxima vez que um Pix cair em segundos, lembre-se das cinco camadas invisíveis: autenticação, endereçamento, comunicação entre instituições, liquidação no SPI e confirmação.

O aplicativo é apenas a porta de entrada. A velocidade vem de toda uma infraestrutura desenhada para funcionar vinte e quatro horas por dia.

No próximo vídeo, vamos mostrar por que uma compra no cartão pode aparecer como aprovada mesmo antes de o lojista receber o dinheiro.

## Visual plan

| Segment | Visual | Asset rule |
|---|---|---|
| Cold open | Phone UI abstraction; timer; two generic bank nodes | Original motion graphic; no real bank UI |
| False model | Animated bank ledgers replacing flying coins | Original diagram |
| Authentication | Generic biometric/password icons | Original or open licensed icons |
| DICT | Key → directory → account routing map | Original diagram |
| Institution layer | Direct and indirect participant paths | Original diagram based on BCB architecture |
| SPI | Two Contas PI and central settlement rail | Original diagram |
| Confirmation | Status messages returning to both apps | Original animation |
| Security | Encrypted line within isolated financial network | Original diagram; do not imply exact physical topology |
| Closing | Five-layer stack recap | Original infographic |

## Thumbnail hypotheses

### A — “POR ONDE O PIX PASSA?”

- Large phone confirmation on left.
- Hidden multi-layer system on right.
- Pix-like visual language without copying restricted UI.
- Maximum four words.

### B — “3 SEGUNDOS. 5 SISTEMAS.”

- Large timer.
- Five illuminated layers.
- Strong contrast, minimal elements.

### C — “O CAMINHO DO PIX”

- Arrow from one phone to another crossing a central infrastructure node.
- Avoid clutter and tiny labels.

## Description draft

O que acontece entre o toque em “confirmar” e o dinheiro aparecer em outro banco? Neste vídeo, acompanhamos um Pix pelas camadas de autenticação, endereçamento, comunicação e liquidação que operam por trás dos aplicativos.

Este conteúdo é educacional e não constitui aconselhamento financeiro. Diagramas são representações simplificadas construídas a partir de documentação pública do Banco Central do Brasil.

Fontes principais:
- Banco Central do Brasil — Pix
- Banco Central do Brasil — Sistema de Pagamentos Instantâneos
- Banco Central do Brasil — Participantes e normas do Pix

## Production constraints

- Target narration: 1,050–1,250 words after final revision.
- Target duration: 7–9 minutes.
- Maximum production time: 5 hours in the week.
- Maximum incremental spend for V01: R$50.
- No copyrighted news footage.
- No copied bank-app screen recordings unless created from an owned account, redacted and essential; generic reconstruction is preferred.
- No AI-generated realistic depiction of a real institution or event without disclosure.
- Voice must not imitate a real person.

## Publication-readiness checklist

- [x] Niche alignment
- [x] Topic score above threshold
- [x] Primary evidence pack
- [x] Claim ledger
- [x] Original angle
- [x] Script draft
- [x] Visual plan
- [x] Thumbnail hypotheses
- [x] Description draft
- [ ] Final factual review against current BCB manuals
- [ ] Narration generated and manually reviewed
- [ ] Visual assets produced with provenance recorded
- [ ] Edit completed
- [ ] Audio levels and subtitles reviewed
- [ ] AI disclosure decision documented
- [ ] Thumbnail selected
- [ ] Human publication approval

Current gate: **READY FOR ASSET PRODUCTION — NOT APPROVED FOR PUBLICATION**
