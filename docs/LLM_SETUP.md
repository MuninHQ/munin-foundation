# Munin LLM Provider (optional)

O Munin funciona sem LLM externo. A camada generativa só é usada quando o interpretador local não consegue mapear um pedido.

## Variáveis locais

Defina antes de iniciar o workspace:

```cmd
set MUNIN_LLM_BASE_URL=https://SEU-ENDPOINT/v1
set MUNIN_LLM_API_KEY=SUA_CHAVE
set MUNIN_LLM_MODEL=SEU_MODELO
set MUNIN_LLM_REASONING_MODE=off
npm run workspace
```

O provider deve expor uma API compatível com `POST /chat/completions` e aceitar `model` + `messages`.

`MUNIN_LLM_REASONING_MODE` aceita `off`, `medium` ou `full`. Hoje esse ajuste é aplicado ao perfil conhecido do NVIDIA Nemotron 3 Ultra; outros providers preservam seu comportamento atual.

## NVIDIA Nemotron 3 Ultra

O Munin inclui um preset opcional em **Settings → NVIDIA Nemotron 3 Ultra**. Ele configura o endpoint OpenAI-compatible oficial da NVIDIA:

- Base URL: `https://integrate.api.nvidia.com/v1`
- Modelo: `nvidia/nemotron-3-ultra-550b-a55b`
- API key: criada separadamente em `build.nvidia.com`

A API hospedada usa cota e termos próprios da NVIDIA. O Munin não assume gratuidade permanente, não cria cobrança e não ativa esse caminho sozinho. Veja [NEMOTRON_3_ULTRA.md](./NEMOTRON_3_ULTRA.md) para arquitetura, limites de hardware e validação.

## Segurança

- A chave fica apenas no ambiente do processo e nunca deve ser commitada.
- Ao habilitar um endpoint externo, prompts e contexto das tarefas que usam IA podem sair do PC para o provider selecionado.
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
