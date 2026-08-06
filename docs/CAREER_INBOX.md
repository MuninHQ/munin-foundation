# Career Inbox — Gmail e Outlook/Hotmail

O Munin sincroniza mensagens em modo somente leitura usando as APIs oficiais do Gmail e Microsoft Graph.

## Segurança

- Tokens nunca devem ser adicionados ao Git ou ao `.bat` versionado.
- A primeira versão aceita access tokens temporários por variáveis de ambiente.
- As mensagens normalizadas são salvas somente em `data/runtime/career-inbox.json`.
- Nenhum e-mail é enviado, apagado, arquivado ou marcado como lido.

## Gmail

O token precisa do escopo `https://www.googleapis.com/auth/gmail.readonly`.

```cmd
set MUNIN_GMAIL_ACCESS_TOKEN=SEU_TOKEN_TEMPORARIO
npm run sync:email
```

## Outlook, Hotmail e Microsoft 365

O token Microsoft Graph precisa da permissão delegada `Mail.Read`.

```cmd
set MUNIN_OUTLOOK_ACCESS_TOKEN=SEU_TOKEN_TEMPORARIO
npm run sync:email
```

## Dois provedores ao mesmo tempo

```cmd
set MUNIN_GMAIL_ACCESS_TOKEN=TOKEN_GOOGLE
set MUNIN_OUTLOOK_ACCESS_TOKEN=TOKEN_MICROSOFT
npm run sync:email
```

## Resultado

A sincronização classifica mensagens como confirmação, entrevista, retorno de recrutador, solicitação de informação, rejeição, oferta, assessment, alerta de vagas ou outro. Ela tenta vincular cada mensagem às vagas já existentes no Munin usando empresa e termos do cargo.

A próxima etapa adicionará autenticação OAuth guiada e a tela Career Inbox no workspace, eliminando a necessidade de copiar tokens manualmente.
