# MoneyPrinterTurbo adapter

Munin integrates MoneyPrinterTurbo as an optional local draft-video renderer. It remains outside the TypeScript process and is never installed, enabled, or allowed to publish automatically by Munin.

## Why this boundary

- MoneyPrinterTurbo is MIT-licensed and supports Windows, a pure CLI workflow, portrait video, custom scripts, free Edge TTS, and local or royalty-free stock assets.
- Its Python/FFmpeg dependency tree is substantial, so vendoring it into Munin would duplicate runtime concerns and weaken upgrades.
- Some providers and media sources require credentials or usage-based payment. Munin does not configure those paths automatically.

## Host setup

Install and review MoneyPrinterTurbo separately. Keep `upload_post_auto_upload = false` in its `config.toml`; the adapter refuses to run otherwise.

Set the following host environment variables:

```text
MUNIN_RUNTIME_CAPABILITIES=1
MUNIN_CONTENT_VIDEO_ENABLED=1
MUNIN_CONTENT_VIDEO_RUNNER=D:\Dev\munin-foundation-git\scripts\moneyprinterturbo-runner.mjs
MUNIN_MPT_HOME=D:\Dev\MoneyPrinterTurbo
```

If `uv` is not on `PATH`, set `MUNIN_MPT_UV` to its absolute executable path. The runner sends one UTF-8 batch manifest to the upstream CLI and returns the generated draft metadata to Munin. Publication remains a separate, human-approved action.

For zero-mandatory-cost use, provide a reviewed script from Munin, use Edge TTS, and select local or free stock assets. Do not enable paid text-to-video providers by default.
