"""Deterministic editorial preparation. Never calls an API or invents research."""
import json
import os
import re
import tempfile
import uuid
from pathlib import Path
from scene_queue import SceneQueue

SIZES = {'9:16': (360, 640), '16:9': (640, 360), '1:1': (480, 480)}


def inside(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if path == root or root not in path.parents:
        raise ValueError('Artifact path must stay inside the run directory')
    return path


def save_json(path, data):
    path = Path(path)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, prefix=path.name + '.', suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def prepare(output, request):
    topic = request.get('topic', '')
    script = request.get('script', '') or ''
    aspect = request.get('aspectRatio', '9:16')
    language = request.get('language', 'pt-BR')
    if not isinstance(topic, str) or not topic.strip() or len(topic) > 200:
        raise ValueError('topic must contain 1-200 characters')
    if not isinstance(script, str) or len(script) > 4000:
        raise ValueError('script must contain at most 4000 characters')
    if aspect not in SIZES or language not in ('pt-BR', 'en-US'):
        raise ValueError('Unsupported aspectRatio or language')
    if request.get('provider') not in (None, 'custom', 'moneyprinterturbo'):
        raise ValueError('Unsupported provider')
    needs_review = not script.strip()
    if needs_review:
        script = f'Vamos explorar: {topic.strip()}. Qual é a pergunta central? Reúna evidências antes de concluir.'
    script = re.sub(r'[\x00-\x08\x0b-\x1f]', '', script.strip())
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', script) if s.strip()]
    texts = []
    for sentence in sentences:
        # Keep cards readable; split long sentences on word boundaries.
        current = ''
        for word in sentence.split():
            if len(word) > 40:
                raise ValueError('Script contains a word too long for a readable caption')
            if len(current) + len(word) + 1 > 150:
                texts.append(current)
                current = ''
            current = (current + ' ' + word).strip()
        if current:
            texts.append(current)
    if not texts or len(texts) > 20:
        raise ValueError('Script must produce 1-20 short scenes')
    run = Path(output).resolve() / ('run-' + uuid.uuid4().hex[:12])
    run.mkdir(parents=True, exist_ok=False)
    scenes = []
    for i, text in enumerate(texts):
        role = 'hook' if i == 0 else 'closing' if i == len(texts) - 1 else 'body'
        scenes.append({'id': f'scene-{i+1:02d}', 'role': role, 'text': text,
                       'duration': max(4.0, len(text.split()) / 2.1 + 1),
                       'prompt': f'Original minimalist editorial animation illustrating this scene concept: {text} Scene {i+1}: {role}. Smooth slow camera, dark navy background, turquoise and warm amber accents, no visible text, no logo, no watermark.',
                       'editorialContext': text, 'asset': f'scene-{i+1:02d}.mp4'})
    plan = {'version': 1, 'topic': topic.strip(), 'script': script, 'language': language,
            'aspectRatio': aspect, 'size': SIZES[aspect], 'fps': 24, 'scenes': scenes,
            'scriptNeedsReview': needs_review, 'scriptOrigin': 'editorial-scaffold' if needs_review else 'supplied-script',
            'humanApprovalRequired': True, 'apiCost': 0, 'visualBackend': 'cpu-cards',
            'licenseLedger': [{'asset': 'cpu-cards', 'origin': 'original procedural graphics', 'thirdPartyFootage': False},
                              {'asset': 'offline-tts', 'origin': 'installed Windows voice; review applicable voice usage terms before publication'}]}
    save_json(run / 'plan.json', plan)
    (run / 'script.txt').write_text(script, encoding='utf-8')
    (run / 'storyboard.md').write_text('\n\n'.join(f"## {s['id']} · {s['role']}\n{s['text']}\n\nVisual: {s['prompt']}" for s in scenes), encoding='utf-8')
    save_json(run / 'prompts.json', [{'id': s['id'], 'prompt': s['prompt'], 'editorialContext': s['text']} for s in scenes])
    save_json(run / 'wangp-handoff.json', {
        'status': 'prepared-not-submitted', 'transport': 'stdio', 'apiVersion': 1,
        'server': {'command': 'python', 'args': ['wgp.py', '--mcp', '--output-dir', str(run / 'wan-output')], 'cwd': 'SELECT_REVIEWED_WAN2GP_INSTALLATION'},
        'discovery': [{'tool': 'wangp_models', 'arguments': {'query': 'LTX', 'filters': {'main_output': 'video'}}},
                      {'tool': 'wangp_model', 'argumentsTemplate': {'model_type': 'DISCOVERED_MODEL_ID', 'view': 'schema'}},
                      {'tool': 'wangp_model', 'argumentsTemplate': {'model_type': 'DISCOVERED_MODEL_ID', 'view': 'defaults'}}],
        'instructions': 'Discover tools/schema for the installed MCP version. Review local weight availability and free VRAM before generation. Copy discovered defaults and replace only prompt and validated scene settings. No automatic downloads. Resolve editorialContext into a specific visual prompt before submission.',
        'jobs': [{'localJobId': s['id'], 'tool': 'wangp_generate', 'argumentsTemplate': {'source': {'model_type': 'DISCOVERED_MODEL_ID', 'prompt': s['prompt']}, 'wait': False}} for s in scenes],
        'poll': {'tool': 'wangp_get_job', 'argumentsTemplate': {'job_id': 'RETURNED_JOB_ID'}},
        'cancel': {'tool': 'wangp_cancel_job', 'argumentsTemplate': {'job_id': 'RETURNED_JOB_ID'}},
        'return': 'Import each local video with CLI import-clip; paths and actual video streams are validated.'})
    q = SceneQueue(run / 'queue.sqlite')
    for scene in scenes:
        q.add(scene['id'], scene)
    return run
