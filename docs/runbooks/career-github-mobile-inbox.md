# Career mobile approval with private GitHub inbox (v1)

This is a small **offline-PC transport bridge**, not a second Munin orchestrator. The private repository `MuninHQ/munin-core` holds reviewable job links and **human decisions** in Issues. `MuninHQ/munin-foundation` stays public and contains code and tests only; **never commit real job/personal records here**.

## Status and permissions

- Private issue template installed at [Nova vaga no Munin](https://github.com/MuninHQ/munin-core/issues/new?template=vaga-munin.md).
- An Issue must begin with `<!-- munin-career-intake:v1 -->`, have title `[VAGA] ...`, and one field per line: `**URL:**`, `**Empresa:**`, `**Cargo:**`, `**Decisao:**` and `**Analise:**`.
- `review`: captured, waiting for analysis or user decision. `approved`: user wants **preparation for application**. `discarded`: skip or close a locally discovered/investigating opportunity.
- Approval here **never submits an application**, sends a message, changes an external account, or authorizes acting outside the Career store. Applied/interview records are not downgraded by inbox decisions.
- No CV, full personal profile, screenshots, password, token, or identity information should be stored in Issues. Share an external vacancy URL and a concise, non-sensitive assessment only. GitHub repository is private but visible to authorized collaborators.

## iPhone path while PC is powered off

1. In LinkedIn, use **Compartilhar** and pass the vacancy link to the ChatGPT app (or copy it into the chat). A screenshot can be uploaded to ChatGPT if the vacancy has no accessible URL; the screenshot must *not* be posted to GitHub.
2. Ask ChatGPT to assess the vacancy against the user's professional profile and distinguish verified requirements from missing evidence.
3. After **explicit user approval of that specific vacancy**, create a GitHub Issue in `MuninHQ/munin-core` using the contract above and `Decisao: approved`. Otherwise use `review` or `discarded`. ChatGPT's GitHub connector can write the Issue when connected and authorized. The device need not reach the Windows PC.
4. Manual fallback: use the private repository's new-issue template; authenticate to GitHub on iPhone and submit only the fields above.

**Optional iOS Shortcut** `Enviar vaga ao Munin` (manual device setup): set it to appear in the Share Sheet for URLs and text; receive Shortcut Input, extract the URL, build the prompt `Avalie esta vaga para meu perfil e só registre no GitHub privado MuninHQ/munin-core depois da minha aprovação: [URL]`; copy the text to clipboard and open ChatGPT, then paste and submit. This first version does not claim hands-free injection into a ChatGPT conversation, and requires no GitHub personal access token on the iPhone. The already-existing local Munin Shortcut can remain unchanged.

## Synchronization when the Windows host returns

The opted-in reader only calls GitHub's **private Issues API** and imports records through existing `ingestCareerItem`; normal URL deduplication and provenance continue to apply.

1. Create a **fine-grained GitHub token** scoped only to `MuninHQ/munin-core`, permission **Issues: read-only**. Supply it **only** through the Windows runtime environment as `MUNIN_CAREER_GITHUB_TOKEN`; never paste it into ChatGPT, Issues, commit history or logs. Confirm the organization permits that access.
2. On an updated Munin checkout, run `npm run career:github:sync` for one-shot verification. Or set `MUNIN_CAREER_GITHUB_SYNC=1` for the existing Host Worker (it checks at most every five minutes while that worker is running).
3. Check the Career Inbox/Mobile view: new opportunities are `discovered`; user-approved ones become `investigating` with next action **prepare application, explicit confirmation required**. Re-running the reader must not duplicate a URL or repeat an approval transition.
4. Unset the opt-in or revoke the token to stop sync. A GitHub outage is reported without stopping other Host Worker jobs.

The GitHub bridge only works if the Host Worker is launched and the runtime secret is configured. A powered-off PC never executes Windows-side work.

## Why Joplin and n8n are references, not new dependencies

[Joplin's synchronization design](https://github.com/laurent22/joplin/blob/dev/readme/dev/spec/sync.md) separates a local authoritative store from a remote synchronization target. We reuse the *concept* of upload/rehydration and conflict avoidance. For the Munin Career domain, URL deduplication and source-local continuity are already available; no Joplin library or cross-device database is necessary.

[n8n's Wait pattern](https://docs.n8n.io/build/flow-logic/wait.md) retains execution context until a webhook/event resumes it. We reuse the narrower review-to-approved transition, retaining the already-governed Munin Career lifecycle. No n8n server, new paid dependency, or blind resumption of external actions.

### Verification gate

Unit contract tests and a synthetic GitHub API sync test are provided. A full `npm test`, successful GitHub permission check, real iPhone Share Sheet, real offline-to-online round-trip and REA/Joplin Desktop experiment require accessible runtime/device evidence. Do **not** claim they passed until exercised. The real screenshot remains transient.
