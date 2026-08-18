# Career Intake — iOS Share Sheet

Status: repository-side contract complete. Native-device installation/acceptance remains empirical user validation.

## Goal

Send a LinkedIn/job URL, selected text or a screenshot from the iOS Share Sheet directly to Munin without permanently saving the screenshot as a new photo/file.

## Prerequisites

- Munin mobile/remote endpoint reachable through the governed local/Tailscale path.
- `MUNIN_MOBILE_TOKEN` configured on the Munin host.
- The Shortcut stores the token only in the local Shortcut action; never put the token in a URL or commit it to Git.
- Screenshot/image analysis additionally requires a configured multimodal provider. URL/text intake works without Vision extraction.

## Stable API contract

Discover current capability metadata from:

```text
GET /api/mobile/career/capabilities
Authorization: Bearer <MUNIN_MOBILE_TOKEN>
```

Intake endpoint:

```text
POST /api/mobile/career/intake
Authorization: Bearer <MUNIN_MOBILE_TOKEN>
Content-Type: application/json
```

The current contract identifier is `munin-career-intake-v1` and accepts URL, text and image inputs.

## Shortcut — URL or selected text

Create an iOS Shortcut named **Enviar vaga ao Munin** and enable **Show in Share Sheet**.

1. Receive `URLs` and `Text` from Share Sheet.
1. If the input is a URL, build JSON:

```json
{
  "source": "share_sheet",
  "url": "<Shortcut Input>",
  "capturedAt": "<Current Date ISO 8601>"
}
```

1. If the input is text, build JSON:

```json
{
  "source": "share_sheet",
  "text": "<Shortcut Input>",
  "capturedAt": "<Current Date ISO 8601>"
}
```

1. Use **Get Contents of URL**:
   - Method: `POST`
   - URL: `http://<tailscale-host>:4310/api/mobile/career/intake` when the governed mobile API is intentionally reachable on the Tailscale interface, or the equivalent reverse-proxied mobile endpoint.
   - Header `Authorization`: `Bearer <token>`
   - Header `Content-Type`: `application/json`
   - Request Body: JSON.
1. Show the returned company/role/fit result with **Show Result**.

Prefer the web proxy/remote launcher contract when available; do not expose port `4310` to the public internet.

## Shortcut — screenshot/image

Add `Images` to accepted Share Sheet input types.

1. Receive the image directly from Share Sheet. Do **not** add a “Save to Photos” action.
1. Convert image to JPEG or PNG if necessary.
1. Base64 encode the image.
1. Build JSON:

```json
{
  "source": "screenshot",
  "image": {
    "mimeType": "image/jpeg",
    "filename": "linkedin-vaga.jpg",
    "dataBase64": "<Base64 Encoded Image>"
  },
  "capturedAt": "<Current Date ISO 8601>"
}
```

1. POST to `/api/mobile/career/intake` with the same Bearer authorization.
1. Display the normalized result.

The server uses the image as transient input for Vision extraction and intentionally excludes the binary payload from durable career-memory records.

## Web fallback

When a Shortcut is not installed, open:

```text
/career-intake.html
```

The page accepts:

- LinkedIn/public job URL;
- pasted description;
- selected image file;
- drag/drop screenshot;
- screenshot pasted with `Ctrl/Cmd+V`.

The web flow analyzes first and only writes to the Career pipeline after explicit confirmation.

## Acceptance checklist

Repository-side acceptance:

- [x] stable capability discovery;
- [x] Bearer-authenticated mobile intake endpoint;
- [x] URL/text/image/share-sheet source support;
- [x] transient base64 Vision path;
- [x] normalization, fit scoring and deduplication;
- [x] web fallback with analysis-before-commit;
- [x] documented iOS Shortcut steps.

Device-side acceptance (human/device evidence):

- [ ] install Shortcut on the target iPhone;
- [ ] share one LinkedIn URL and confirm result;
- [ ] share one screenshot without saving it to Photos and confirm Vision extraction;
- [ ] verify no unwanted persistent image remains after the flow.

Device-side checks do not block the repository implementation from remaining complete; they are empirical acceptance evidence for the specific phone/runtime configuration.
