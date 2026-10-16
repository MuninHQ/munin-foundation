# FreeLLMAPI como provider opcional do Munin

[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) (MIT) é um roteador local que junta os free tiers de vários provedores (Google AI Studio, Groq, Cerebras, Mistral, OpenRouter `:free`, Cloudflare, NVIDIA, HuggingFace…) atrás de um único endpoint OpenAI-compatible em `http://localhost:3001/v1`. Quando um provedor bate rate limit, ele cai para o próximo.

Ele é um serviço **separado**, instalado fora deste repositório. O Munin não ganha dependência nova nem código novo: usa o slot OpenAI-compatible que já existe (`MUNIN_LLM_*` ou **Settings → Provider in-process**).

## Validação antes de instalar

**Duplicação.** O Munin não tem gateway/agregador de LLM. Hoje existem: `deterministic-local` (sempre ligado), Ollama (opt-in, `MUNIN_OLLAMA_ENABLED=1`) e um único provider OpenAI-compatible/Anthropic configurável (`src/llm-settings.ts`, `src/llm-provider.ts`). O FreeLLMAPI entra **dentro** desse slot único; não substitui o Ollama nem o modo determinístico, e o fallback continua o mesmo (`callBestProvider`).

Conflitos práticos a evitar:

- Não use o "custom provider" do FreeLLMAPI apontando para o Ollama **e** o fallback Ollama do Munin ao mesmo tempo — é o mesmo modelo por dois caminhos. Escolha um.
- Se já houver um provider configurado em **Settings → Provider in-process** (ex.: preset NVIDIA Nemotron), ele tem prioridade sobre as variáveis de ambiente. Troque-o pelo FreeLLMAPI em vez de manter os dois; a NVIDIA pode ser adicionada como chave *dentro* do FreeLLMAPI.
- Porta 3001: confira se nada mais usa (`netstat -ano | findstr :3001`).

**Custo.**

| Item | Cobra? |
|---|---|
| Roteador FreeLLMAPI (código, desktop, Docker) | Não. MIT. |
| "Premium" (catálogo ao vivo, US$19/ano ou US$49) | Só se você ativar. Não é necessário; a versão grátis recebe o catálogo com ~30 dias de atraso. |
| Chamadas aos provedores | Não, **desde que cada chave venha de uma conta sem cobrança habilitada**. |

O único risco real de cobrança está nas chaves que você cadastra. Regras:

1. Crie as chaves em contas **sem cartão / sem billing**: Google AI Studio sem projeto com faturamento, Groq/Cerebras/Mistral no plano free, OpenRouter **sem créditos comprados** (sem saldo, só modelos `:free` respondem).
2. Não reutilize chaves de contas pagas que você já tenha (OpenAI, Anthropic, OpenRouter com saldo, GCP com billing).
3. Não ative **Premium** no dashboard.
4. Free tiers mudam sem aviso; se um provedor passar a exigir cartão, não adicione cartão — remova a chave.

## Privacidade

O FreeLLMAPI roda em `localhost`, mas **encaminha os prompts para provedores na nuvem**. O status do Munin mostra `deployment: local` para qualquer URL `localhost`, o que neste caso não significa que o dado fica no PC. Free tiers podem usar prompts para treino (Google AI Studio free, por exemplo). Não envie contexto `sensitive-private` por esse caminho; para isso, use Ollama ou o modo determinístico.

## Instalação (Windows)

Opção recomendada: instalador `.exe` em [Releases](https://github.com/tashfeenahmed/freellmapi/releases/latest). Ele roda na bandeja e guarda os dados em `%APPDATA%\FreeLLMAPI\`.

Alternativa por código-fonte (Node 20.18+):

```cmd
git clone https://github.com/tashfeenahmed/freellmapi.git %USERPROFILE%\freellmapi
cd %USERPROFILE%\freellmapi
npm ci
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
:: cole o valor em ENCRYPTION_KEY= no .env e adicione a linha HOST=127.0.0.1
npm run build -w server && npm run build -w client
npm start -w server
```

`HOST=127.0.0.1` impede que o roteador fique exposto na rede local (o padrão escuta em todas as interfaces). Não exponha à internet: não há autenticação multiusuário.

## Configuração

1. Abra `http://localhost:3001` e crie a conta local.
2. **Keys**: adicione as chaves gratuitas (comece por Google AI Studio, Groq e Cerebras: as mais rápidas e generosas).
3. Copie a chave unificada `freellmapi-…` do cabeçalho da página **Keys**.
4. No Munin, use **Settings → Provider in-process** (provider OpenAI-compatible, Base URL `http://localhost:3001/v1`, modelo `auto`) ou:

```cmd
set MUNIN_LLM_BASE_URL=http://localhost:3001/v1
set MUNIN_LLM_API_KEY=freellmapi-SUA_CHAVE
set MUNIN_LLM_MODEL=auto
npm run workspace
```

5. Teste em **Settings → Provider in-process → Testar conexão**. Um `503` significa que nenhuma chave de provedor foi cadastrada ainda; um `401`, chave unificada errada.

## Melhor uso

- `model=auto` para o dia a dia; `auto:fast` para normalização de comandos (o uso principal do LLM no Munin, respostas curtas); `auto:smart` ou um perfil de "coding chain" para planejamento de engenharia.
- Tarefas pesadas cedo no dia (UTC): os melhores modelos têm as menores cotas diárias e o roteador desce para modelos menores conforme elas acabam; as cotas reiniciam à meia-noite UTC (21h em Brasília).
- Mantenha `MUNIN_OLLAMA_ENABLED=1` se tiver Ollama: quando todos os free tiers estiverem esgotados ou offline, o Munin cai para o modelo local.
- Acompanhe uso por provedor em **Analytics** e saúde das chaves em **Keys**.
- Não é para produção (sem SLA). Para algo que precise de confiabilidade, use um provider pago com contrato, conscientemente.

## Desinstalar

Remova o app (*Settings → Apps* no Windows) ou a pasta clonada, depois apague `%APPDATA%\FreeLLMAPI\`. No Munin, limpe **Settings → Provider in-process** ou as variáveis `MUNIN_LLM_*`.
