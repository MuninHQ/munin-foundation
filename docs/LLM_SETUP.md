# Munin LLM Provider (optional)

O Munin funciona sem LLM externo. A camada generativa só é usada quando o interpretador local não consegue mapear um pedido.

## Variáveis locais

Defina antes de iniciar o workspace:

```cmd
set MUNIN_LLM_BASE_URL=https://SEU-ENDPOINT/v1
set MUNIN_LLM_API_KEY=SUA_CHAVE
set MUNIN_LLM_MODEL=SEU_MODELO
npm run workspace
```

O provider deve expor uma API compatível com `POST /chat/completions` e aceitar `model` + `messages`.

## Segurança

- A chave fica apenas no ambiente do processo e nunca deve ser commitada.
- O LLM não executa operações diretamente.
- Ele apenas normaliza linguagem livre em um comando aceito pela camada determinística do Munin.
- O executor local continua responsável por criar/alterar registros.
- Se o provider falhar, o Munin volta automaticamente ao modo local.

## Exemplo de fluxo

Pedido livre:

```text
preciso lembrar de cobrar a recrutadora daquela vaga amanhã, coloca como urgente
```

O LLM pode normalizar para:

```text
criar follow-up P0
```

O comando normalizado é então processado pelo executor local usando o contexto da conversa.
