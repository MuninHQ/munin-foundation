# External connector security contract

## Current connector inventory

Munin's repository-managed OAuth connectors currently cover Gmail and Outlook for Career Inbox ingestion. The requested permissions are deliberately read-only.

| Provider | Requested data permissions | External mutation |
|---|---|---|
| Gmail / Google | `gmail.readonly`, `calendar.readonly` plus identity scopes | prohibited |
| Outlook / Microsoft Graph | `Mail.Read`, `User.Read` plus authentication/refresh scopes | prohibited |

`assertReadOnlyOAuthScopes()` is executed before OAuth authorization, token exchange and token refresh. Automated tests lock the current scope sets against accidental introduction of mail send, mailbox modify/read-write, calendar read-write or contact read-write permissions.

## Data flow

1. OAuth tokens are obtained through PKCE.
2. Munin prefers an OS-backed credential store when one is supported and available: macOS Keychain (`security`) or Linux Secret Service (`secret-tool`).
3. If secure storage is unavailable in `auto` mode, Munin falls back explicitly to local runtime JSON. `MUNIN_OAUTH_TOKEN_STORE=keychain` fails closed instead of falling back; `MUNIN_OAUTH_TOKEN_STORE=json` forces the legacy local JSON behavior.
4. Existing JSON tokens are migrated into the secure store on first successful secure-store load, after which token fields are removed from `oauth.json`; transient PKCE pending state remains local runtime JSON.
5. Email sync reads message metadata/previews needed for Career classification.
6. Classified Career Inbox records are written to Munin runtime state.
7. The current connector implementation does not send, delete, archive, label, move or modify external email/calendar data.

## Consequential-action boundary

Read access may run as part of governed automation. External mutation is a separate product capability and is not implicitly authorized by a connected account, historical conversation, orchestration objective or stored OAuth token.

Any future connector write capability must have its own action-constitution classification, explicit permission/scopes, idempotency/audit strategy and user-approval boundary before it can be enabled.

## Token-at-rest policy

The default policy is `auto-prefer-os-keychain`:

- macOS: use Keychain when the native `security` command is healthy;
- Linux: use Secret Service when `secret-tool` is healthy;
- unsupported/unavailable hosts: explicit local-runtime-JSON fallback;
- `keychain` mode: fail closed if a secure adapter is unavailable;
- `json` mode: explicitly use runtime JSON.

The runtime connection-status projection reports both configured policy and active token-storage kind. No token values are emitted in status, logs, Memory Ledger, session summaries or PR evidence.

### Residual risk

Windows has no zero-dependency credential-vault adapter in this repository yet, so `auto` currently falls back to local JSON on Windows. Host compromise can also expose credentials even when an OS keychain is used. Secure storage reduces plaintext-at-rest exposure; it does not authorize external mutation and is not a substitute for host security.

Operational requirements:

- keep the runtime data directory out of Git/cloud publication paths;
- prefer `MUNIN_OAUTH_TOKEN_STORE=keychain` on supported production hosts when fail-closed behavior is desired;
- never emit OAuth tokens to logs, Memory Ledger, session summaries or PR evidence;
- disconnect/re-authorize the provider if local runtime credentials are suspected to be exposed.
