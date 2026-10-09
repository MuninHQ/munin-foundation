"""CPU media worker and assembler. All subprocess arguments are passed without a shell."""
import json
import os
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path
from pipeline import inside, save_json
from scene_queue import SceneQueue
from captions import layout


def execute(args, cwd, timeout=180, env=None):
    try:
        result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True,
                                encoding='utf-8', errors='replace', timeout=timeout,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(f'Media command failed: {error}') from error
    with (Path(cwd) / 'media.log').open('a', encoding='utf-8') as log:
        log.write(json.dumps({'command': args[0], 'args': args[1:], 'code': result.returncode}, ensure_ascii=False) + '\n')
        if result.returncode:
            log.write(result.stderr[-4000:] + '\n')
    if result.returncode:
        raise RuntimeError(f'{Path(args[0]).name} failed ({result.returncode}): {result.stderr[-1200:]}')
    return result.stdout


def probe(path, root):
    data = json.loads(execute(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', str(path)], root))
    if float(data.get('format', {}).get('duration', 0)) <= 0:
        raise RuntimeError('Media has no positive duration')
    return data


def video_probe(path, root):
    data = probe(path, root)
    if not any(s['codec_type'] == 'video' for s in data['streams']):
        raise RuntimeError('Artifact contains no video stream')
    return data


@contextmanager
def worker_lock(root):
    """OS-owned lock releases even if the process crashes; no stale lock deletion."""
    path = Path(root) / '.worker.lock'
    with path.open('a+b') as handle:
        handle.seek(0)
        handle.write(b'0')
        handle.flush()
        handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise RuntimeError('Another worker owns this run; wait or stop it before modifying jobs') from error
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == 'nt':
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


def load(root):
    return json.loads((Path(root) / 'plan.json').read_text(encoding='utf-8'))


def work(root, ffmpeg='ffmpeg', limit=20):
    root = Path(root).resolve()
    with worker_lock(root):
        plan, q = load(root), SceneQueue(root / 'queue.sqlite')
        w, h = plan['size']
        completed = 0
        while completed < limit:
            job = q.claim()
            if not job:
                break
            try:
                scene = job['payload']
                asset = inside(root, scene['asset'])
                # Original procedural graphics, not simulated model output.
                filters = f'drawbox=x=0:y={h//4}:w={w}:h={h//2}:color=0x153248:t=fill,drawbox=x={w//12}:y={h//4}:w=6:h={h//2}:color=0x41ddc6:t=fill,fade=t=in:st=0:d=0.4'
                execute([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
                         f'color=c=0x0b1424:s={w}x{h}:r=24:d={scene["duration"]}', '-vf', filters,
                         '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-threads', '2',
                         '-pix_fmt', 'yuv420p', str(asset)], root)
                video_probe(asset, root)
                q.finish(job['id'], artifact=scene['asset'])
                completed += 1
            except Exception as error:
                q.finish(job['id'], error=str(error)[:1600])
                raise
        return {'completedThisRun': completed, 'jobs': q.rows()}


def import_clip(root, job_id, source):
    root, source = Path(root).resolve(), Path(source).resolve()
    with worker_lock(root):
        plan, q = load(root), SceneQueue(root / 'queue.sqlite')
        scene = next((s for s in plan['scenes'] if s['id'] == job_id), None)
        row = next((r for r in q.rows() if r['id'] == job_id), None)
        if not scene or row['state'] != 'pending':
            raise ValueError('Import requires an existing pending scene; retry failed jobs first')
        if not source.is_file():
            raise ValueError('Only an existing local media file may be imported')
        if source.suffix.lower() not in ('.mp4', '.mov', '.mkv', '.webm'):
            raise ValueError('Only local MP4, MOV, MKV or WebM clips are supported; playlists are refused')
        video_probe(source, root)
        target = inside(root, scene['asset'])
        if target != source:
            shutil.copyfile(source, target)
        with q.connect() as db:
            provenance = {'asset': scene['asset'], 'origin': 'imported local clip', 'sourceName': source.name, 'licenseReviewRequired': True}
            db.execute('INSERT OR REPLACE INTO assets VALUES (?,?)', (job_id, json.dumps(provenance, ensure_ascii=False)))
            result = db.execute("UPDATE jobs SET state='done',artifact=?,updated=datetime('now') WHERE id=? AND state='pending'", (scene['asset'], job_id))
            if result.rowcount != 1:
                raise RuntimeError('Import lost queue ownership')
            q.event(db, job_id, 'done', 'imported verified local video')
        return {'id': job_id, 'artifact': str(target)}


def timecode(seconds):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def assemble(root, narrator='windows'):
    root = Path(root).resolve()
    with worker_lock(root):
        plan, q = load(root), SceneQueue(root / 'queue.sqlite')
        rows = q.rows()
        if len(rows) != len(plan['scenes']) or any(r['state'] != 'done' for r in rows):
            raise ValueError('Assembly requires every scene to be done; inspect status/retry first')
        if narrator not in ('windows', 'none'):
            raise ValueError('Only offline Windows narration or none is supported')
        imports = [r['provenance'] for r in rows if r['provenance']]
        plan['licenseLedger'] = [entry for entry in plan['licenseLedger'] if entry.get('origin') != 'imported local clip'] + imports
        plan['visualBackend'] = 'local-import-and-cpu-cards' if imports else 'cpu-cards'
        save_json(root / 'plan.json', plan)
        w, h = plan['size']
        font_source = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / 'segoeui.ttf'
        if not font_source.is_file():
            raise RuntimeError('Install-free renderer needs the existing Windows Segoe UI font')
        shutil.copyfile(font_source, root / 'font.ttf')
        parts, captions, elapsed, voices = [], [], 0.0, set()
        for number, (scene, row) in enumerate(zip(plan['scenes'], rows), 1):
            if scene['id'] != row['id']:
                raise ValueError('Queue and storyboard scene order disagree')
            asset = inside(root, row['artifact'])
            video_probe(asset, root)
            duration = scene['duration']
            speech = root / f'{scene["id"]}.txt'
            speech.write_text(scene['text'], encoding='utf-8')
            audio = root / f'{scene["id"]}.wav'
            if narrator == 'windows':
                env = dict(os.environ, MONEYPRINTER_LANGUAGE=plan['language'], MONEYPRINTER_TEXT=str(speech), MONEYPRINTER_WAV=str(audio))
                voices.add(execute(['powershell.exe', '-NoProfile', '-NonInteractive', '-File', str(Path(__file__).with_name('tts.ps1'))], root, env=env).strip())
                duration = max(4.0, float(probe(audio, root)['format']['duration']) + 0.65)
            caption_file = root / f'caption-{number:02}.txt'
            lines, size = layout(scene['text'], w, h)
            caption_file.write_text('\n'.join(lines), encoding='utf-8')
            heading = root / f'heading-{number:02}.txt'
            heading.write_text(f'{number:02} / {len(plan["scenes"]):02}', encoding='utf-8')
            filters = (f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps=24,'
                       f'tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration},setpts=PTS-STARTPTS,'
                       f'drawbox=x=20:y={h//4-20}:w={w-40}:h={h//2+40}:color=0x0b1424@0.85:t=fill,'
                       f'drawtext=fontfile=font.ttf:textfile={caption_file.name}:expansion=none:fontsize={size}:fontcolor=white:line_spacing=10:x=(w-tw)/2:y=(h-th)/2,'
                       f'drawtext=fontfile=font.ttf:textfile={heading.name}:expansion=none:fontsize=16:fontcolor=0x41ddc6:x=28:y=40')
            part = f'part-{number:02}.mp4'
            args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-protocol_whitelist', 'file,pipe', '-i', str(asset)]
            args += ['-i', str(audio)] if narrator == 'windows' else ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono']
            args += ['-vf', filters, '-af', 'apad', '-t', str(duration), '-map', '0:v:0', '-map', '1:a:0',
                     '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-threads', '2', '-pix_fmt', 'yuv420p',
                     '-c:a', 'aac', '-ar', '44100', '-ac', '1', '-b:a', '96k', part]
            execute(args, root)
            parts.append(part)
            captions.append(f'{number}\n{timecode(elapsed)} --> {timecode(elapsed+duration)}\n{scene["text"]}\n')
            elapsed += duration
        (root / 'subtitles.srt').write_text('\n'.join(captions), encoding='utf-8')
        (root / 'concat.txt').write_text('\n'.join(f"file '{part}'" for part in parts), encoding='utf-8')
        execute(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', 'concat.txt',
                 '-c', 'copy', '-movflags', '+faststart', 'draft.mp4'], root)
        final = video_probe(root / 'draft.mp4', root)
        if not any(s['codec_type'] == 'audio' for s in final['streams']):
            raise RuntimeError('Final draft has no audio stream')
        execute(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', 'draft.mp4', '-frames:v', '1', 'preview.png'], root)
        report = {'status': 'draft-generated', 'provider': 'moneyprinter-local', 'humanApprovalRequired': True,
                  'publication': 'not-performed', 'apiCost': 0, 'visualBackend': plan['visualBackend'],
                  'wanGeneration': 'not-executed', 'narrator': narrator, 'voices': sorted(voices),
                  'scriptNeedsReview': plan['scriptNeedsReview'], 'path': str(root / 'draft.mp4'),
                  'durationSeconds': float(final['format']['duration']), 'bytes': (root / 'draft.mp4').stat().st_size,
                  'streams': [{k: s.get(k) for k in ('codec_type', 'codec_name', 'width', 'height', 'sample_rate')} for s in final['streams']],
                  'jobs': [{'id': r['id'], 'state': r['state'], 'attempts': r['attempts']} for r in rows]}
        save_json(root / 'report.json', report)
        return report
