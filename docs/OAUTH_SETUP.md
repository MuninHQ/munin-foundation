# Munin OAuth Setup

The Career Inbox uses local OAuth and read-only permissions. Tokens are stored only in `data/runtime/oauth.json`, which must remain outside Git.

## Gmail

1. In Google Cloud Console, create or select a project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen for External use and add your Google account as a test user.
4. Create an OAuth Client ID of type Web application.
5. Add the redirect URI `http://127.0.0.1:4310/api/oauth/callback`.
6. Before starting Munin, set:

```cmd
set MUNIN_GOOGLE_CLIENT_ID=your-client-id
set MUNIN_GOOGLE_CLIENT_SECRET=your-client-secret
```

The requested Gmail scope is `gmail.readonly`. Munin cannot send, delete, archive or mark messages as read.

## Outlook / Hotmail / Microsoft 365

1. Open Microsoft Entra admin center and create an App registration.
2. Select accounts in any organizational directory and personal Microsoft accounts.
3. Add the Web redirect URI `http://127.0.0.1:4310/api/oauth/callback`.
4. Add delegated Microsoft Graph permissions `User.Read` and `Mail.Read`.
5. Create a client secret if the registration requires one.
6. Before starting Munin, set:

```cmd
set MUNIN_MICROSOFT_CLIENT_ID=your-application-client-id
set MUNIN_MICROSOFT_CLIENT_SECRET=your-client-secret
```

## Open the inbox

Start Munin and open:

```text
http://127.0.0.1:5173/career-inbox.html
```

The page displays whether each provider is configured and connected. Click **Connect**, authorize the read-only access, then click **Sync now**.

## Security

- Never put client secrets in a `.bat` committed to Git.
- `data/runtime/oauth.json` contains sensitive refresh tokens. Back it up only to an encrypted location.
- Disconnecting an account removes the local token. You may also revoke Munin from the Google or Microsoft account security page.
