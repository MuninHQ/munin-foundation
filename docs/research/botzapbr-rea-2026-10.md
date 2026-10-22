# REA — BotZapBR (botzapbr.site) vs. Munin — 2026-10-22

Status: pesquisa / evidência. Mesmo método de `award-winning-sites-rea-2026-10.md` e `lovable-darkly-rea-2026-10.md` (lentes de engenharia reversa → Adotar / Adaptar / Adiar / Rejeitar por mecanismo). Nada aqui altera código, tokens ou telas.

## 1. Limites da evidência

- A política de rede do ambiente bloqueou `botzapbr.site` (proxy 403 no CONNECT; WebFetch sem DNS). O site **não** foi renderizado nem inspecionado no DOM, rede ou JS.
- Toda a evidência vem de **resultados de busca que indexam as próprias páginas do fornecedor** (`/` e `/jarvis`). Marcado **[vend]**. Não foram encontradas resenhas independentes, CNPJ, termos de uso, política de privacidade ou documentação técnica.
- Itens marcados **[inf]** são inferência de engenharia a partir do tipo de produto e do preço, não fatos observados.
- Há vários produtos homônimos sem vínculo comprovado (BotZap/facebook `botzap.br`, `botzap.chat`, `botzappro.com.br`, `centralbotzap.com.br`, `zapbot.*`). **Nenhum deles entra nesta análise.**

## 2. O que é (fatos [vend])

| Item | Evidência |
| --- | --- |
| Marca / produto | **BotZapBR**; produto principal **CyberBot** — "Automação Inteligente para WhatsApp" |
| Proposta | Painel único com **respostas automáticas, campanhas, agendamento e cobrança via PIX** |
| Aquisição | **Teste grátis sem cartão**; escolha de plano após o teste |
| Planos | Mensal **R$ 14,99** · Trimestral **R$ 29,99** (marcado "mais popular") · Anual **R$ 79,99** (≈ R$ 6,67/mês) |
| Upsell | **Jarvis** — "assistente da BotZapBR que leva a automação do seu WhatsApp para o computador"; **R$ 49,90, pagamento único via PIX, acesso vitalício**, download na área do cliente |
| Bundle | Plano anual inclui **"Jarvis vitalício de brinde"** |

## 3. Engenharia reversa do modelo [inf]

- **Canal técnico**: a faixa de preço (R$ 15/mês) é incompatível com o custo por conversa da WhatsApp Business Platform (Cloud API oficial). O mais provável é automação via **sessão do WhatsApp Web pareada por QR code** (bibliotecas não oficiais do tipo Baileys / whatsapp-web.js). Consequência: risco de **banimento do número** em envios em massa ("campanhas") e dependência de mudanças no protocolo do WhatsApp. Não confirmado — o site não pôde ser inspecionado.
- **Modelo de receita**: isca de preço baixo + teste sem cartão → ancoragem no trimestral ("mais popular") → anual empurrado por bônus vitalício (Jarvis). Clássico *decoy pricing* de três colunas.
- **Pagamento via PIX** sem cartão recorrente sugere renovação manual, não assinatura automática.
- **Jarvis "para o computador"** indica um cliente desktop distribuído como download; nenhuma informação sobre assinatura de código, SO suportado ou permissões.

## 4. Fichas por mecanismo

#### B1. Teste grátis sem cartão → valor antes do compromisso
- **Mecanismo**: o usuário vê o produto funcionando antes de qualquer pagamento.
- **Munin hoje**: local-first e sem cadastro; o equivalente é o primeiro uso sem configuração. O chat vazio já ganhou sugestões (Lovable L6).
- **Decisão**: **Manter.** Não há funil a adotar.

#### B2. Cobrança PIX dentro da conversa
- **Mecanismo**: o bot gera/entrega cobrança PIX no próprio fluxo do WhatsApp.
- **Munin hoje**: pagamento é objetivo consequente — `src/coordinator.ts` nunca delega `pag(ar|amento)`, `whatsapp`, `mensagem`; a Action Constitution exige aprovação.
- **Decisão**: **Rejeitar** como automação. No máximo, **Adiar** um rascunho de mensagem com chave/QR PIX que passa pelo `ApprovalExecutor` como qualquer envio externo.

#### B3. Campanhas e agendamento de mensagens
- **Mecanismo**: disparo em massa + mensagens programadas.
- **Munin hoje**: WhatsApp está em *Explicitly excluded* no `MUNIN-TECHNICAL-BLUEPRINT-v0.1.md` §16; envio em massa conflita com aprovação por ação e com o risco de ban [inf].
- **Decisão**: **Rejeitar.** O padrão útil — *agendar um envio já aprovado* — já é coberto pela fila de aprovação do LinkedIn Publisher / Content Studio.

#### B4. Respostas automáticas
- **Mecanismo**: regras/IA respondem sem humano.
- **Decisão**: **Rejeitar a autonomia; Adaptar como rascunho.** Se o canal WhatsApp um dia sair da lista de exclusão, o Munin sugere a resposta e o operador aprova — nunca responde sozinho. Canal precisaria ser a API oficial ou exportação local, nunca sessão Web não oficial.

#### B5. Preço em três colunas com âncora "mais popular" e bônus vitalício
- **Mecanismo**: *decoy pricing* e bônus para empurrar o plano anual.
- **Decisão**: **Rejeitar.** Munin não tem planos pagos (custo zero obrigatório). Registrado apenas como padrão de mercado.

#### B6. Upsell desktop vitalício (Jarvis)
- **Mecanismo**: estende o produto web para um assistente no PC, vendido à parte.
- **Munin hoje**: já é um operador local Windows-first; o "Jarvis" é, em essência, o que o Munin já é.
- **Decisão**: **Manter.** Confirma a direção local/desktop; nada a importar.

## 5. Matriz de adoção

| # | Padrão | Decisão | Motivo |
| --- | --- | --- | --- |
| 1 | Teste sem cartão (B1) | Manter | Munin já é gratuito/local |
| 2 | PIX no fluxo (B2) | Rejeitar / Adiar rascunho aprovado | Pagamento é consequente |
| 3 | Campanhas em massa (B3) | Rejeitar | Aprovação por ação + risco de ban [inf] |
| 4 | Resposta automática (B4) | Adaptar como rascunho | Só com aprovação e canal oficial |
| 5 | Preço decoy + bônus (B5) | Rejeitar | Sem planos pagos |
| 6 | Assistente desktop (B6) | Manter | Já é o modelo do Munin |

**Conclusão**: BotZapBR é uma ferramenta de automação de vendas por WhatsApp de baixo custo, otimizada para volume e autonomia — o oposto do eixo do Munin (aprovação, auditoria, custo zero). Nenhum mecanismo merece adoção direta; o valor da REA é **confirmar as exclusões** já registradas.

## 6. Avaliação de risco para quem considerar comprar [inf, salvo indicado]

- Sem CNPJ, termos ou privacidade encontrados nos resultados indexados.
- Provável uso de API não oficial → risco de banimento do número.
- Acesso a mensagens de clientes por terceiro sem política de dados visível (LGPD).
- "Vitalício" depende da continuidade de um fornecedor sem identificação pública.

## 7. Para destravar uma REA completa

Liberar `botzapbr.site` no ambiente para inspeção read-only via Playwright (DOM, scripts, rede, termos, rodapé) ou fornecer screenshots/links de termos. Com isso, os itens [inf] viram evidência primária.

## 8. Fontes

- BotZapBR — Automação Inteligente para WhatsApp [vend]: https://botzapbr.site/
- Jarvis — assistente da BotZapBR [vend]: https://botzapbr.site/jarvis
- Homônimos não relacionados (excluídos): https://www.facebook.com/botzap.br · https://www.botzap.chat/ · https://botzappro.com.br/ · https://centralbotzap.com.br/ · https://zapbot.app.br/
