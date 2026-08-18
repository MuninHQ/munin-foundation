# Local Video Evaluation — MiniMax H3 — 2026-08-18

## Decision

Integrate a provider-neutral, disabled-by-default local video capability, but **do not make MiniMax H3 a default Munin route** until the actual Windows host is benchmarked and the model license/territory is explicitly accepted for the intended use.

Munin does not automatically download H3 weights.

## Current upstream evidence

MiniMax H3 was released as an omni-modal generation system supporting text/image/video/audio context and synchronized video/audio generation. The official model repository advertises generation up to 2K and up to 15 seconds, but those product-level capabilities do not imply that every local open-weight workflow or quantization runs at 2K on consumer hardware.

The official Hugging Face repository is very large: the repository listing is approximately 288 GB in total, with FL2VA and Ref2VA partitions each around 144 GB. That alone makes silent/automatic installation unacceptable for Munin.

DiffSynth-Studio publishes MiniMax H3 inference examples, including NF4 quantized and low-VRAM paths. Its MiniMax H3 documentation demonstrates an NF4 example at 832×480 and states a minimum 7 GB VRAM with memory management for that example. This is a useful compatibility signal, not a performance guarantee for the Munin host.

## License gate

MiniMax H3 is not under a generic MIT/Apache model-weight license. It uses the **MiniMax H3 Community License Agreement** with territory/use/commercial conditions and an acceptable-use policy. The official license also contains additional commercial terms and restrictions.

Consequences for Munin:

- model installation must remain opt-in;
- the user must review/accept the current upstream license before local weight use;
- Munin should not redistribute weights;
- a generic `media.local-video` seam must remain backend-neutral so H3 can be replaced without product changes.

## Munin integration

Implemented capability: `media.local-video`.

Properties:

- disabled by default;
- no automatic model downloads;
- no paid service required by the seam;
- backend is configurable (`diffsynth`, `comfyui`, `custom`);
- runner must be an explicitly configured absolute local executable;
- JSON request is sent over stdin and JSON/result returned over stdout;
- no shell interpolation is used;
- health/plan operations work without invoking a model;
- generation fails closed if local video is disabled or no runner is configured;
- policy explicitly reports that empirical host benchmark is required.

Environment contract:

```text
MUNIN_LOCAL_VIDEO_ENABLED=0
MUNIN_LOCAL_VIDEO_BACKEND=diffsynth
MUNIN_LOCAL_VIDEO_RUNNER=
```

## Default test profile

The capability's conservative planning defaults are intentionally close to current DiffSynth H3 example territory rather than the marketing maximum:

- width: 832
- height: 480
- frames: 124
- seed: 0

These are planning defaults only. A backend runner may support other safe parameters.

## Host benchmark required before promotion

Run on the actual Munin desktop after deliberate model/backend installation and record:

1. GPU model and VRAM;
2. system RAM;
3. backend/version and exact model/quantization;
4. cold start/load time;
5. generation time for the default test profile;
6. peak VRAM/RAM;
7. output duration/FPS/resolution;
8. subjective motion consistency;
9. prompt adherence;
10. audio synchronization where applicable;
11. failure/recovery behavior;
12. disk footprint.

Promotion criterion: local video may become a normal optional route only after the host benchmark is acceptable. It should still not become a mandatory dependency of Munin Foundation.

## Alternative backends

ComfyUI remains a viable local runner target because it provides a local API/queue model and broad video-model support. DiffSynth-Studio remains the preferred direct H3 evaluation path because it publishes H3-specific inference/low-VRAM examples. The Munin seam intentionally does not force either choice.

## Primary sources reviewed

- `MiniMax-AI/MiniMax-H3` official GitHub repository.
- `MiniMaxAI/MiniMax-H3` official Hugging Face model card and license.
- `modelscope/DiffSynth-Studio` MiniMax-H3 documentation/examples.
- `Comfy-Org/ComfyUI` official repository.
