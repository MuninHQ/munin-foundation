"""Local durable scene jobs. SQLite transactions fence state changes."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


class SceneQueue:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, payload TEXT NOT NULL, state TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0, artifact TEXT, error TEXT, updated TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (
                    at TEXT NOT NULL, job TEXT NOT NULL, state TEXT NOT NULL, detail TEXT);
                CREATE TABLE IF NOT EXISTS assets (
                    job TEXT PRIMARY KEY, provenance TEXT NOT NULL);
            ''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def event(self, db, job, state, detail=''):
        db.execute('INSERT INTO events VALUES (?,?,?,?)', (now(), job, state, detail))

    def add(self, job, payload):
        with self.connect() as db:
            result = db.execute('INSERT OR IGNORE INTO jobs (id,payload,state,updated) VALUES (?,?,?,?)',
                                (job, json.dumps(payload, ensure_ascii=False), 'pending', now()))
            if result.rowcount:
                self.event(db, job, 'pending')

    def claim(self):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute("SELECT * FROM jobs WHERE state='pending' ORDER BY id LIMIT 1").fetchone()
            if not row:
                return None
            db.execute("UPDATE jobs SET state='running',attempts=attempts+1,updated=? WHERE id=?", (now(), row['id']))
            self.event(db, row['id'], 'running')
            item = dict(row)
            item.update(state='running', attempts=row['attempts'] + 1, payload=json.loads(row['payload']))
            return item

    def finish(self, job, artifact=None, error=None):
        state = 'failed' if error else 'done'
        if not error and not artifact:
            raise ValueError('Successful scene requires an artifact')
        with self.connect() as db:
            result = db.execute("UPDATE jobs SET state=?,artifact=?,error=?,updated=? WHERE id=? AND state='running'",
                                (state, artifact, error, now(), job))
            if result.rowcount != 1:
                raise ValueError('Scene is not running; result rejected')
            self.event(db, job, state, error or artifact)

    def retry(self, job, recover=False):
        states = ('failed', 'running') if recover else ('failed',)
        with self.connect() as db:
            row = db.execute('SELECT state FROM jobs WHERE id=?', (job,)).fetchone()
            if not row or row['state'] not in states:
                raise ValueError('Only failed jobs may retry; abandoned running jobs require explicit recovery')
            db.execute("UPDATE jobs SET state='pending',error=NULL,artifact=NULL,updated=? WHERE id=?", (now(), job))
            self.event(db, job, 'pending', 'explicit recovery' if recover else 'retry')

    def cancel(self, job):
        with self.connect() as db:
            result = db.execute("UPDATE jobs SET state='cancelled',updated=? WHERE id=? AND state IN ('pending','failed')", (now(), job))
            if result.rowcount != 1:
                raise ValueError('Only pending or failed jobs may be cancelled; stop a running worker first')
            self.event(db, job, 'cancelled')

    def invalidate(self, job):
        with self.connect() as db:
            result = db.execute("UPDATE jobs SET state='pending',artifact=NULL,error=NULL,updated=? WHERE id=? AND state='done'", (now(), job))
            if result.rowcount != 1:
                raise ValueError('Explicit invalidation requires a completed job')
            db.execute('DELETE FROM assets WHERE job=?', (job,))
            self.event(db, job, 'pending', 'completed artifact explicitly invalidated')

    def rows(self):
        with self.connect() as db:
            rows = [dict(row) for row in db.execute('SELECT jobs.*,assets.provenance FROM jobs LEFT JOIN assets ON assets.job=jobs.id ORDER BY jobs.id')]
            for row in rows:
                row['provenance'] = json.loads(row['provenance']) if row['provenance'] else None
            return rows
