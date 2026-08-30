# Free Claude Code (FCC) as Munin AI Gateway

Munin can optionally route governed execution tasks through a locally running Free Claude Code proxy while keeping Ollama and deterministic local execution as safe fallbacks.

## Architecture

`Munin -> ProviderRegistry -> FCC localhost proxy -> configured FCC provider/model`

FCC is treated as an **external** provider in Munin policy even though its proxy runs on localhost, because the selected model may be hosted by NVIDIA NIM, OpenRouter, Groq, Gemini, Kimi, or another remote provider.

The integration uses FCC's OpenAI-compatible Responses API at `http://127.0.0.1:8082/v1/responses` by default.

## Safety and cost policy

- FCC is disabled by default (`MUNIN_FCC_ENABLED=0`).
- External routing still requires the caller to opt in with `--allow-external`.
- `FCC_ESTIMATED_COST_PER_CALL` participates in Munin's existing cost guardrail.
- Keep the estimate at `0` only when the configured FCC model/provider is genuinely free for the active account.
- No API keys for NVIDIA, OpenRouter, Groq, Gemini, or other upstream providers are stored by Munin. Those remain managed by FCC.
- FCC proxy authentication is read from `FCC_AUTH_TOKEN`; no secret is committed to the repository.

## Configuration

1. Install and start FCC separately. On Windows, use the official FCC installer and open **Free Claude Code** from the Start menu.
2. Configure at least one model/provider in FCC Admin and validate it there.
3. Copy `.env.example` to `.env` if needed and set:

```env
MUNIN_FCC_ENABLED=1
FCC_BASE_URL=http://127.0.0.1:8082/v1
FCC_AUTH_TOKEN=freecc
FCC_MODEL=open_router/openrouter/free
FCC_ESTIMATED_COST_PER_CALL=0
```

Choose `FCC_MODEL` from the model catalog exposed by the running FCC instance. The model above is only an example of a free-routing catalog entry; availability can change.

## Validation

```powershell
npm run provider-policy -- health fcc
npm run provider-policy -- list
npm run provider-policy -- evaluate code --allow-external --max-cost=0 --prefer=fcc-gateway,ollama-local
```

The last command is a dry policy evaluation. It should select `fcc-gateway` only when FCC is enabled, external execution is explicitly allowed, and the configured cost estimate satisfies the requested maximum.

Run the full repository validation before merging:

```powershell
npm test
```

## Recommended routing

For the zero-cost operating mode, prefer this order when external execution is allowed:

1. `fcc-gateway` when it is configured to a verified free model.
2. `ollama-local` for local inference and privacy-sensitive work.
3. `deterministic-local` for deterministic fallback behavior.

For offline/privacy-only work, do not use `--allow-external`; FCC will be rejected automatically by policy.

## Why FCC is a gateway, not a hard dependency

Munin does not vendor or embed Free Claude Code. The FCC process remains independently installable and upgradeable. This keeps Munin functional when FCC is absent, avoids coupling the core runtime to a fast-moving third-party project, and preserves the existing provider policy/resilience layer as the control point.
