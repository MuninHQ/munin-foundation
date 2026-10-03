# Money Printer Local Render Pipeline v1

This pipeline adapts useful architecture patterns observed in external video-production tooling without importing an external application or copying unlicensed source code.

## Contract

The canonical deterministic path is:

`script → beats → assets → voice → captions → overlays → render → thumbnail → review`

`media.content-video` produces a versioned `money-printer-local-v1` render manifest. A configured local runner may consume it, but Munin does not install FFmpeg, Remotion, transcription models, TTS models or video-generation weights automatically.

## Zero-cost and safety boundary

- core contract requires no paid API;
- local assets and free-license assets must retain provenance;
- transcription must use a separately configured local backend;
- FFmpeg is the preferred compositor;
- Remotion is optional for richer transparent overlays and is not a mandatory dependency;
- generated/local-video backends remain separate from editing/compositing;
- public posting is never part of the render command;
- a human review stage is mandatory before publication.

## Overlay model

The manifest reserves one isolated overlay stage for timed captions, CTA, definition cards and bullet panels. The overlay renderer can be replaced independently from the source-media compositor.

This avoids coupling Money Printer to one video generator and lets a future renderer be benchmarked through Munin's normal capability/promotion gates.

## Host acceptance still required

Repository code can define and test the manifest, but actual render acceptance requires the target Windows host with reviewed local executables installed. Validate the chosen FFmpeg/optional Remotion/transcription stack on representative 16:9 and 9:16 projects before promotion.
