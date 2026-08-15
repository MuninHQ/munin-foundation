# Docling PoC for Munin

## Decision scope

Docling is evaluated as an **optional local document-normalization adapter**, not a mandatory Munin runtime dependency. Munin remains usable when Docling is absent.

## Why it fits

Official Docling documentation describes a unified `DoclingDocument` representation and local conversion for PDF, DOCX, XLSX, PPTX, HTML, images, Markdown and additional formats. Current CLI supports Markdown, JSON and chunked JSONL-style outputs and exposes explicit flags to disable remote services and external plugins.

Primary references:
- https://github.com/docling-project/docling
- https://github.com/docling-project/docling/blob/main/docs/usage/supported_formats.md
- https://github.com/docling-project/docling/blob/main/docs/reference/cli.md
- https://docling-project.github.io/docling/reference/document_converter/

## Munin boundary

`source artifact -> Docling CLI (local) -> normalized outputs -> Munin provenance/chunk/memory/research adapters`

The source artifact is never replaced. Every normalized result retains its source path and conversion timestamp.

## Security defaults

The Munin adapter invokes local `docling convert` with:
- `--no-enable-remote-services`
- `--no-allow-external-plugins`
- explicit output directory under the caller-controlled/local runtime path

Network-backed conversion is intentionally outside this PoC.

## Benchmark matrix remaining

Run on Windows with representative local samples:
1. PDF with text + table
2. scanned/image-heavy PDF
3. DOCX
4. PPTX
5. XLSX
6. email/image sample when available

Measure conversion time, peak practical resource use, table/layout preservation, provenance quality and output usefulness for retrieval. Compare against Munin's current direct/raw ingestion where applicable.

## Adoption gate

Adopt Docling as the preferred normalization adapter only if the local benchmark demonstrates materially better structured output without unacceptable resource or operational complexity. Otherwise retain the adapter as optional/fallback or reject it cleanly.
