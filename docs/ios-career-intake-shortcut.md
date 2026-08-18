# iOS Career Intake Shortcut — contract v1

This contract lets an iPhone Share Sheet or Shortcuts workflow send a job vacancy to Munin without permanently saving screenshots.

## Discovery

Call `GET /api/mobile/career/capabilities` with `Authorization: Bearer <MUNIN_MOBILE_TOKEN>` before configuring or diagnosing the shortcut. `intake.image.visionReady` reports whether a multimodal provider is available.

## Endpoint

`POST /api/mobile/career/intake`

Headers:

- `Authorization: Bearer <MUNIN_MOBILE_TOKEN>`
- `Content-Type: application/json`

## URL or selected text

```json
{
  "source": "share_sheet",
  "url": "https://www.linkedin.com/jobs/view/123",
  "text": "Optional text shared by the source app",
  "capturedAt": "2026-08-18T09:00:00Z",
  "metadata": { "client": "ios-shortcuts", "contract": "munin-career-intake-v1" }
}
```

## Screenshot or image

Shortcuts should receive the image from the Share Sheet, base64-encode it in memory, POST it, then discard the temporary value. Do not add a Save to Photo Album or Save File action.

```json
{
  "source": "screenshot",
  "image": {
    "mimeType": "image/png",
    "dataBase64": "<base64>"
  },
  "capturedAt": "2026-08-18T09:00:00Z",
  "metadata": { "client": "ios-shortcuts", "contract": "munin-career-intake-v1" }
}
```

Supported image types are PNG, JPEG/JPG and WebP. The decoded image limit is 6 MB and the HTTP body limit is 8 MB. Image bytes are transient and are not written to Munin durable state, events or Memory Ledger.

## Suggested Shortcuts actions

1. Receive URLs, text and images from Share Sheet.
2. If input is an image, use Base64 Encode with no line breaks.
3. Build the JSON body using the examples above.
4. Use Get Contents of URL with POST, JSON request body and Bearer authorization.
5. Read `job.company`, `job.role`, `job.fitScore`, `job.nextAction` and `added` from the response.
6. Show a compact result notification and let the shortcut end; do not persist the original image.

The endpoint is idempotent for the same intake fingerprint, so retrying the same share does not create another opportunity.
