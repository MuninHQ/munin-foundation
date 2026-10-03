# Codex Web Zero Risk

This route is a manual handoff, not browser automation and not a way to evade limits.

Allowed actions are: build a bounded sanitized packet, copy it, optionally open a configured HTTP(S) destination in a visible tab, and record that it was prepared. The operator personally pastes, reviews, sends, and decides whether to use the response.

Forbidden actions are: injecting or sending prompts, reading or manipulating DOM, scraping, reading responses, automatic response ingestion, cookie or session access, background browser control, quota or restriction evasion, and treating ChatGPT subscription access as API entitlement.

The packet includes only the objective, constraints, compact Build State, selected bounded context, and response contract. Redaction runs before the cap. Runtime stores, credentials, private memory databases, and broad repository contents are excluded.

Launcher state is passive: `available`, `unavailable`, or `unknown`. When absent, preparation remains operational in `copy-only` mode and nothing is installed or connected. The API intentionally exposes no response-ingestion route.
