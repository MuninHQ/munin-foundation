"""Local Moneyprinter entrypoint. No network, downloads or publication."""
import argparse
import json
import sys
from pathlib import Path
from pipeline import prepare
from render import assemble, import_clip, work, worker_lock
from scene_queue import SceneQueue


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    for name in ('prepare', 'run'):
        c = sub.add_parser(name)
        c.add_argument('--request', type=Path, help='UTF-8 JSON; omit to read stdin')
        c.add_argument('--output', type=Path, required=True)
        if name == 'run':
            c.add_argument('--narrator', choices=('windows', 'none'), default='windows')
    for name in ('work', 'assemble', 'status', 'retry', 'cancel', 'invalidate', 'import-clip'):
        c = sub.add_parser(name)
        c.add_argument('--run', type=Path, required=True)
        if name in ('retry', 'cancel', 'invalidate', 'import-clip'):
            c.add_argument('--job', required=True)
        if name == 'retry':
            c.add_argument('--recover', action='store_true', help='Requeue abandoned running job; worker must have stopped')
        if name == 'import-clip':
            c.add_argument('--clip', type=Path, required=True)
        if name == 'work':
            c.add_argument('--limit', type=int, default=20)
        if name == 'assemble':
            c.add_argument('--narrator', choices=('windows', 'none'), default='windows')
    args = p.parse_args()
    if args.command in ('prepare', 'run'):
        raw = args.request.read_text(encoding='utf-8-sig') if args.request else sys.stdin.read(32769)
        if len(raw) > 32768:
            raise ValueError('Request exceeds 32 KiB')
        request = json.loads(raw)
        if not isinstance(request, dict):
            raise ValueError('Request must be a JSON object')
        run = prepare(args.output, request)
        if args.command == 'prepare':
            return {'status': 'queued', 'runDir': str(run), 'humanApprovalRequired': True}
        work(run)
        return dict(assemble(run, args.narrator), runDir=str(run))
    run = args.run.resolve()
    if not (run / 'plan.json').is_file() or not (run / 'queue.sqlite').is_file():
        raise ValueError('Existing Moneyprinter run directory required')
    if args.command == 'work':
        if not 1 <= args.limit <= 20:
            raise ValueError('Worker limit must be 1-20')
        return work(run, limit=args.limit)
    if args.command == 'assemble':
        return assemble(run, args.narrator)
    if args.command == 'import-clip':
        return import_clip(run, args.job, args.clip)
    q = SceneQueue(run / 'queue.sqlite')
    if args.command == 'status':
        return {'runDir': str(run), 'jobs': q.rows()}
    with worker_lock(run):
        if args.command == 'retry':
            q.retry(args.job, args.recover)
        elif args.command == 'invalidate':
            q.invalidate(args.job)
        else:
            q.cancel(args.job)
    return {'jobs': q.rows()}


if __name__ == '__main__':
    try:
        print(json.dumps(main(), ensure_ascii=True))
    except Exception as error:
        print(json.dumps({'status': 'failed', 'error': str(error)}, ensure_ascii=True), file=sys.stderr)
        sys.exit(1)
