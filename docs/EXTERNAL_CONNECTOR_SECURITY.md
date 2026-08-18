# External connector security contract

## Current connector inventory

Munin's repository-managed OAuth connectors currently cover Gmail and Outlook for Career Inbox ingestion. The requested permissions are deliberately read-only.

| Provider | Requested data permissions | External mutation |
|---|---|---|
| Gmail / Google | `gmail.readonly`, `calendar.readonly` plus identity scopes | prohibited |
| Outlook / Microsoft Graph | `Mail.Read`, `User.Read` plus authentication/refresh scopes | prohibited |

`assertReadOnlyOAuthScopes()` is executed before OAuth authorization, token exchange and token refresh. Automated tests lock the current scope sets against accidental introduction of mail send, mailbox modify/read-write, calendar read-write or contact read-write permissions.

## Data flow

1. OAuth tokens are obtained through PKCE and stored in Munin's local runtime data directory.
2. Email sync reads message metadata/previews needed for Career classification.
3. Classified Career Inbox records are written to Munin runtime state.
4. The current connector implementation does not send, delete, archive, label, move or modify external email/calendar data.

## Consequential-action boundary

Read access may run as part of governed automation. External mutation is a separate product capability and is not implicitly authorized by a connected account, historical conversation, orchestration objective or stored OAuth token.

Any future connector write capability must have its own action-constitution classification, explicit permission/scopes, idempotency/audit strategy and user-approval boundary before it can be enabled.

## Token-at-rest residual risk

OAuth access/refresh tokens are currently stored as local runtime JSON. They are excluded from repository state but are not application-layer encrypted by Munin. This is an explicit residual risk, not a security claim.

Operational requirements:

- keep the runtime data directory out of Git/cloud publication paths;
- rely on host OS account/filesystem protection for the current v0.1 implementation;
- never emit OAuth tokens to logs, Memory Ledger, session summaries or PR evidence;
- disconnect/re-authorize the provider if local runtime credentials are suspected to be exposed.

Application-layer secure credential storage (for example OS keychain/credential vault integration) is a future hardening option and should remain provider-neutral.
