# NVIDIA Nemotron 3 Ultra no Munin

Status: integração opcional, desativada por padrão

Modelo: `nvidia/nemotron-3-ultra-550b-a55b`

Endpoint hospedado: `https://integrate.api.nvidia.com/v1`

## Decisão

O Nemotron 3 Ultra entra como provider de raciocínio profundo atrás da abstração OpenAI-compatible que o Munin já possuía. Ele não substitui ChatGPT-first, Ollama, o provider determinístico, o Orchestrator nem os gates de ação.

Essa é a menor integração coerente:

- nenhum pacote ou framework novo;
- nenhum provider pago obrigatório;
- ativação e chave explícitas;
- fallback existente preservado;
- trilha de raciocínio removida antes de JSON, posts ou respostas chegarem aos consumidores;
- interpretação de comandos e teste de conexão sempre com reasoning desligado;
- modelo text-only nunca anunciado ou chamado como vision provider.

## O que foi verificado nas fontes oficiais

- O modelo foi lançado em 4 de junho de 2026, com 550B parâmetros totais e 55B ativos.
- A variante NVFP4 anuncia contexto de até 1 milhão de tokens.
- O NIM expõe `POST /v1/chat/completions` em formato OpenAI-compatible.
- O endpoint hospedado usa `https://integrate.api.nvidia.com/v1` e o identificador `nvidia/nemotron-3-ultra-550b-a55b`.
- A entrada e a saída são texto; screenshots continuam exigindo um modelo multimodal.
- O mínimo divulgado para a variante NVFP4 é 4x GB200/B200/GB300/B300 ou 8x H100. Portanto, não é um candidato para instalação local no PC de consumo usado pelo Munin.

Fontes primárias:

- [Model card no NVIDIA Build](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard)
- [Referência da API NVIDIA](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b-infer)
- [NIM Day-0 guide](https://docs.nvidia.com/nim/large-language-models/2.0.7/day-0/get-started-nemotron-3-ultra.html)
- [Página de pesquisa da NVIDIA](https://research.nvidia.com/labs/nemotron/Nemotron-3-Ultra/)

## Ativação pela interface

1. Abra `Settings`.
2. Selecione `NVIDIA Nemotron 3 Ultra`.
3. Cole uma NVIDIA API key criada em `build.nvidia.com`.
4. Escolha o orçamento de raciocínio:
   - `off`: menor consumo e melhor previsibilidade para respostas estruturadas;
   - `medium`: padrão recomendado no preset para análise, planejamento, código e revisão;
   - `full`: maior consumo de tokens, reservado para problemas realmente difíceis.
5. Salve e use `Testar conexão`.

O teste força `reasoning=off` e limita a resposta, evitando gastar a cota com uma verificação simples.

## Ativação por ambiente no Windows

```powershell
$env:MUNIN_LLM_BASE_URL = "https://integrate.api.nvidia.com/v1"
$env:MUNIN_LLM_API_KEY = "SUA_CHAVE_NVIDIA"
$env:MUNIN_LLM_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"
$env:MUNIN_LLM_REASONING_MODE = "medium"
npm run workspace
```

Não salve a chave em scripts versionados, commits, screenshots ou documentação.

## Onde ele agrega

Quando ativado, o provider existente passa a atendê-lo nos fluxos que já solicitam inteligência externa:

- planejamento e edição do Engineering Agent;
- análise semântica de vagas;
- normalização de linguagem livre, sempre sem reasoning;
- composição editorial de LinkedIn;
- demais consumidores de `completeWithLlm`.

O modelo apenas propõe texto ou estruturas. Escritas locais e ações externas continuam sob as regras determinísticas e os gates de aprovação do Munin.

## Privacidade, custo e falha

- A ativação de um endpoint externo autoriza o envio do contexto necessário ao provider configurado. Não use o perfil em conteúdo que não possa sair do PC.
- O acesso hospedado pode estar sujeito a cota de avaliação, rate limits e termos da NVIDIA. Zero custo obrigatório significa que o Munin funciona sem ele; não significa que a NVIDIA garante uso ilimitado gratuito.
- Sem chave, sem cota ou com endpoint indisponível, o caminho falha de forma explícita e o núcleo local continua funcionando.
- O Munin não baixa pesos, não inicia NIM, não instala Docker/CUDA e não tenta usar a GPU local para o Ultra.

## Critério de promoção

O Nemotron só deve virar uma preferência operacional recorrente depois de um benchmark real com tarefas do Munin comparar qualidade, latência e consumo de cota contra o fluxo ChatGPT-first e os fallbacks locais. Até lá, permanece uma opção avançada e reversível.
