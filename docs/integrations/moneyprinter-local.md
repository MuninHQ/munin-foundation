# Moneyprinter local MVP

This is a small offline implementation, separate from MoneyPrinterTurbo and Wan2GP. It connects through Munin's existing `media.content-video` runner interface. No package, model, service, startup task or persistent environment setting is installed or changed. It does not publish.

## Requirements and verified host

Windows, Python 3.10+, Node 20+, FFmpeg/ffprobe on PATH and an installed System.Speech voice matching pt-BR or en-US. The verified host has Ryzen 5 7600, about 32 GB RAM, RTX 3060 Ti 8192 MiB VRAM and existing FFmpeg 8.1.2. NVIDIA reported only 1187 MiB free VRAM during inspection. The MVP uses CPU only, two encoder threads, 360x640 portrait, 24 fps, and one worker per run. No GPU runtime was installed or tested.

## Local CLI

From the Munin repository:

```powershell
python scripts/moneyprinter-local/cli.py run --request request.json --output D:/Videos/Moneyprinter
```

The output path may be any explicitly selected directory; a unique `run-*` subdirectory is created without overwriting existing runs. Example request:

```json
{
  "topic": "Tire uma ideia do papel",
  "script": "Sua ideia não precisa nascer perfeita. Escolha uma ação pequena para testar hoje. Observe o que funcionou.",
  "language": "pt-BR",
  "aspectRatio": "9:16"
}
```

A supplied script is split into 1-20 readable scenes, with hook/body/closing roles, visual prompts and narration. Topic-only preparation produces an editorial scaffold marked `scriptNeedsReview`; it does not invent researched claims or call a language model. `scriptNeedsReview=false` only means a script was supplied, not that its facts or publication were approved. Human review is always required. Limits: 200-character topic, 4000-character script, 150-character cards. Only pt-BR/en-US and 9:16/16:9/1:1 are supported.

Each run contains `script.txt`, `storyboard.md`, `prompts.json`, `plan.json`, SQLite scene jobs and transition events, local clips, voice WAVs, timed SRT, burned-in captions, `draft.mp4`, preview, command log and a probe-based report. Windows synthetic narration is offline; review voice terms and all factual/asset claims before publication. `--narrator none` produces an explicitly silent audio track when speech is not desired. Missing speech support fails instead of silently changing voice/provider.

## Decoupled jobs and recovery

```powershell
python scripts/moneyprinter-local/cli.py prepare --request request.json --output D:/Videos/Moneyprinter
python scripts/moneyprinter-local/cli.py status --run D:/Videos/Moneyprinter/run-ID
python scripts/moneyprinter-local/cli.py work --run D:/Videos/Moneyprinter/run-ID --limit 1
python scripts/moneyprinter-local/cli.py assemble --run D:/Videos/Moneyprinter/run-ID
python scripts/moneyprinter-local/cli.py retry --run D:/Videos/Moneyprinter/run-ID --job scene-01
python scripts/moneyprinter-local/cli.py cancel --run D:/Videos/Moneyprinter/run-ID --job scene-02
python scripts/moneyprinter-local/cli.py invalidate --run D:/Videos/Moneyprinter/run-ID --job scene-01
```

Queue states are pending/running/done/failed/cancelled. Failures are persisted; retry is explicit. A worker interrupted after claiming leaves a running job. Once its process has stopped, `retry --recover` may requeue that job. An OS-owned exclusive lock prevents workers/import/retry/invalidation from racing and releases automatically on process exit. Pending/failed jobs can be cancelled; stop an active worker before recovery. Assembly requires every storyboard scene to be done, so cancelled scenes need a new prepared plan. Completed jobs are skipped on resume; use explicit `invalidate` to requeue a completed scene with a missing/corrupt clip or replace a procedural scene with an imported video. Import provenance and job completion share one SQLite transaction; assembly derives the exportable license ledger from that durable record.

## Optional Munin integration

For the current PowerShell session only, after reviewing the adapter:

```powershell
$env:MUNIN_CONTENT_VIDEO_ENABLED = '1'
$env:MUNIN_CONTENT_VIDEO_RUNNER = 'D:/Dev/munin-foundation-git/scripts/moneyprinter-local-runner.mjs'
```

Start the intended Munin process from that same shell so it inherits the settings. Existing running processes keep their configuration. `MUNIN_MONEYPRINTER_PYTHON` may select an existing Python executable; `MUNIN_MONEYPRINTER_OUTPUT` sets the default output root; `MUNIN_MONEYPRINTER_NARRATOR` is `windows` or `none`. Without an explicit output directory, runtime goes under ignored `data/runtime/moneyprinter-local`. The adapter accepts existing MoneyPrinterTurbo-labelled requests only as a compatibility envelope and returns its real provider `moneyprinter-local`. No default provider or registry is changed. Unset the session variables or close the shell to revert.

The integration test invokes the actual existing capability with this runner, verifies an MP4 and resumes completed jobs. It does not promote any provider or start the server.

## Wan2GP/MCP handoff — prepared, not validated against a live server

`wangp-handoff.json` exports a stdio server recipe, model discovery, schema/default retrieval, per-scene generation templates, polling and cancellation. Model IDs and defaults are deliberately unresolved until discovery against a reviewed local installation. Merge actual defaults, validate resolution/frame settings, and ensure weights are already present before submission. The file is a handoff contract, not an executable ready-to-submit queue or a connected MCP client. Inspect `tools/list` for the installed API version; the template targets the documented v1 names.

Import a completed, reviewed local clip into a pending scene:

```powershell
python scripts/moneyprinter-local/cli.py import-clip --run D:/Videos/Moneyprinter/run-ID --job scene-01 --clip D:/WanOutput/clip.mp4
```

Only existing MP4/MOV/MKV/WebM files with a valid video stream and positive duration are accepted. Playlists and network media protocols are refused. Assembly normalizes dimensions/fps, overlays captions, uses its own narration and trims/pads visual clips. Imports add an explicit asset-license review entry. Do not run the CPU worker for scenes intended for Wan imports until their clips have been imported.

Upstream contracts inspected on 2026-10-01: [WanGP Agent Skill](https://github.com/deepbeepmeep/Wan2GP/blob/main/wangp-agent/SKILL.md), [MCP server implementation](https://github.com/deepbeepmeep/Wan2GP/blob/main/shared/mcp_server.py). No Wan2GP weights or runtime were downloaded and no real model generation occurred in this MVP validation.

## Validation and rollback

```powershell
python scripts/moneyprinter-local/test_pipeline.py
npm test
```

Source additions are independent files: this runbook, implementation plan, the `scripts/moneyprinter-local` directory, Node runner and `tests/moneyprinter-local.test.ts`. Existing code and package configuration are unchanged. No commits, pushes or publication are needed to use it. To retire it, remove the opt-in settings and archive the generated run directories; source additions can be removed independently after review. There are no installed services or hidden recurring jobs.

This MVP proves local preparation, queue, synthetic narration and FFmpeg assembly. It does not establish content-market fit, monetization, video-model quality or throughput. Its default procedural cards are a production fallback, not evidence of AI video generation.
