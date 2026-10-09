import json
import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


class PipelineTests(unittest.TestCase):
    def test_json_write_failure_preserves_previous_plan(self):
        from pipeline import save_json
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'plan.json'
            save_json(path, {'version': 1})
            with patch('os.replace', side_effect=OSError('simulated interrupted replacement')):
                with self.assertRaises(OSError):
                    save_json(path, {'version': 2})
            self.assertEqual(json.loads(path.read_text())['version'], 1)
            self.assertEqual(len(list(Path(temp).iterdir())), 1)

    def test_completed_artifact_can_be_explicitly_invalidated(self):
        from scene_queue import SceneQueue
        with tempfile.TemporaryDirectory() as temp:
            q = SceneQueue(Path(temp) / 'queue.sqlite')
            q.add('scene-01', {'text': 'A'})
            q.claim()
            q.finish('scene-01', artifact='missing.mp4')
            self.assertTrue(hasattr(q, 'invalidate'), 'completed jobs need explicit invalidation')
            q.invalidate('scene-01')
            self.assertEqual(q.claim()['attempts'], 2)

    def test_import_state_has_atomic_provenance(self):
        from pipeline import prepare
        from scene_queue import SceneQueue
        from render import import_clip
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            run = prepare(Path(temp), {'topic': 'Teste', 'script': 'Uma cena.'})
            clip = Path(temp) / 'clip.mp4'
            clip.write_bytes(b'fixture')
            with patch('render.video_probe', return_value={}), patch('render.save_json', side_effect=OSError('write failed')):
                import_clip(run, 'scene-01', clip)
            row = SceneQueue(run / 'queue.sqlite').rows()[0]
            self.assertEqual(row['state'], 'done')
            self.assertEqual(row['provenance']['sourceName'], 'clip.mp4')

    def test_caption_layout_fits_wide_glyphs(self):
        self.assertTrue(Path(__file__).with_name('captions.py').exists(), 'pixel-fitting caption layout is missing')
        from captions import layout, measure
        for w,h in ((360,640),(480,480),(640,360)):
            lines,size = layout('WWW ' * 37, w,h)
            self.assertTrue(all(measure(line,size) <= w-64 for line in lines))
            self.assertLessEqual(len(lines)*(size*1.5+10),h-140)

    def test_parallel_claims_do_not_duplicate_jobs(self):
        from scene_queue import SceneQueue
        with tempfile.TemporaryDirectory() as temp:
            db = Path(temp) / 'queue.sqlite'
            q = SceneQueue(db)
            for i in range(8):
                q.add(f'scene-{i:02}', {'text': str(i)})
            with ThreadPoolExecutor(max_workers=4) as pool:
                jobs = list(pool.map(lambda _: SceneQueue(db).claim(), range(12)))
            ids = [j['id'] for j in jobs if j]
            self.assertEqual(len(ids), 8)
            self.assertEqual(len(set(ids)), 8)

    def test_assembly_rejects_incomplete_jobs_and_recovery_is_explicit(self):
        from pipeline import prepare
        from render import assemble
        from scene_queue import SceneQueue
        with tempfile.TemporaryDirectory() as temp:
            run = prepare(Path(temp), {'topic': 'Teste', 'script': 'Uma cena.'})
            q = SceneQueue(run / 'queue.sqlite')
            q.claim()
            with self.assertRaises(ValueError):
                assemble(run)
            with self.assertRaises(ValueError):
                q.retry('scene-01')
            q.retry('scene-01', recover=True)
            self.assertEqual(q.rows()[0]['state'], 'pending')

    def test_renderer_failure_persists_job_error(self):
        self.assertTrue(Path(__file__).with_name('render.py').exists(), 'renderer is not implemented')
        from pipeline import prepare
        from render import work
        from scene_queue import SceneQueue
        with tempfile.TemporaryDirectory() as temp:
            run = prepare(Path(temp), {'topic': 'Test', 'script': 'Uma cena.'})
            with self.assertRaises(RuntimeError):
                work(run, ffmpeg='missing-moneyprinter-ffmpeg')
            row = SceneQueue(run / 'queue.sqlite').rows()[0]
            self.assertEqual(row['state'], 'failed')
            self.assertTrue(row['error'])

    def test_worker_exclusion_and_corrupt_import(self):
        self.assertTrue(Path(__file__).with_name('render.py').exists(), 'renderer is not implemented')
        from pipeline import prepare
        from render import worker_lock, import_clip
        with tempfile.TemporaryDirectory() as temp:
            run = prepare(Path(temp), {'topic': 'Test', 'script': 'Uma cena.'})
            with worker_lock(run):
                with self.assertRaises(RuntimeError):
                    with worker_lock(run):
                        pass
            bad = Path(temp) / 'bad.mp4'
            bad.write_text('not a video')
            with self.assertRaises(RuntimeError):
                import_clip(run, 'scene-01', bad)

    def test_prepare_requires_module_and_produces_local_artifacts(self):
        self.assertTrue(Path(__file__).with_name('pipeline.py').exists(), 'local pipeline is not implemented')
        from pipeline import prepare, inside
        with tempfile.TemporaryDirectory() as temp:
            run = prepare(Path(temp), {'topic': 'Ideias', 'script': 'Capture uma ideia. Escolha uma ação. Faça um pequeno teste.'})
            plan = json.loads((run / 'plan.json').read_text(encoding='utf-8'))
            self.assertEqual(len(plan['scenes']), 3)
            self.assertFalse(plan['scriptNeedsReview'])
            self.assertTrue(plan['humanApprovalRequired'])
            self.assertTrue((run / 'storyboard.md').exists())
            self.assertTrue((run / 'wangp-handoff.json').exists())
            self.assertEqual(plan['apiCost'], 0)
            with self.assertRaises(ValueError):
                inside(run, '../escape.mp4')

    def test_queue_claim_retry_cancel_and_restart(self):
        self.assertTrue(Path(__file__).with_name('scene_queue.py').exists(), 'durable queue is not implemented')
        from scene_queue import SceneQueue
        with tempfile.TemporaryDirectory() as temp:
            db = Path(temp) / 'queue.sqlite'
            q = SceneQueue(db)
            q.add('scene-01', {'text': 'A'})
            q.add('scene-01', {'text': 'A'})
            first = q.claim()
            self.assertEqual(first['id'], 'scene-01')
            self.assertIsNone(SceneQueue(db).claim())
            q.finish(first['id'], error='render failed')
            q.retry(first['id'])
            self.assertEqual(q.claim()['attempts'], 2)
            q.finish(first['id'], artifact='scene-01.mp4')
            self.assertIsNone(q.claim())
            q.add('scene-02', {'text': 'B'})
            q.cancel('scene-02')
            self.assertEqual([r['state'] for r in SceneQueue(db).rows()], ['done', 'cancelled'])
            self.assertIsNone(q.claim())

    def test_bad_requests_fail_closed(self):
        self.assertTrue(Path(__file__).with_name('pipeline.py').exists(), 'validation is not implemented')
        from pipeline import prepare
        with tempfile.TemporaryDirectory() as temp:
            for bad in [{'topic': ''}, {'topic': 'x', 'aspectRatio': '4:0'}, {'topic': 'x', 'script': 'x' * 4001}]:
                with self.assertRaises(ValueError):
                    prepare(Path(temp), bad)
            run = prepare(Path(temp), {'topic': 'x'})
            self.assertTrue(json.loads((run / 'plan.json').read_text())['scriptNeedsReview'])


if __name__ == '__main__':
    unittest.main()
