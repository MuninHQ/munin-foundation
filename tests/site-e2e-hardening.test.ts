import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (file:string) => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');

test('manual email sync is bounded by worker freshness and quota fallback', async () => {
  const [manual, api] = await Promise.all([source('src/email-manual-sync.ts'), source('src/api.ts')]);
  assert.match(manual, /MANUAL_SYNC_COOLDOWN_MS = 60 \* 60_000/);
  assert.match(manual, /provider-rate-limit/);
  assert.match(manual, /recent-worker-sync/);
  assert.match(api, /manualSyncCareerInbox\(\)/);
});

test('calendar service-disabled is represented as data instead of a broken page', async () => {
  const [calendar, api, ui] = await Promise.all([source('src/calendar-intelligence.ts'), source('src/career-intelligence-api.ts'), source('apps/web/career-command.html')]);
  assert.match(calendar, /reason:'service-disabled'/);
  assert.match(calendar, /SERVICE_DISABLED|accessNotConfigured/);
  assert.match(api, /fetchInterviewCalendarSnapshot\(\)/);
  assert.doesNotMatch(ui, /load\(\)\.then\(\(\)=>syncAll\(\)\)/);
});

test('BIS radar uses a live RSS endpoint', async () => {
  const radar = await source('src/trusted-source-radar.ts');
  assert.match(radar, /https:\/\/www\.bis\.org\/doclist\/all_pressrels\.rss/);
  assert.doesNotMatch(radar, /rss_all_categories\.rss/);
});

test('visual runtime uses real request events and lazy GPU loading', async () => {
  const [app, runtime, ambient] = await Promise.all([source('apps/web/src/App.tsx'), source('apps/web/src/munin-ui/VisualRuntime.tsx'), source('apps/web/src/munin-ui/BootAmbient.tsx')]);
  assert.match(app, /emitMuninState\(classifyMuninRequest/);
  assert.match(app, /emitMuninState\('done'/);
  assert.match(runtime, /MUNIN_STATE_EVENT/);
  assert.match(runtime, /setRuntimeState\(detail\.state\)/);
  assert.match(ambient, /await import\('three'\)/);
  assert.doesNotMatch(ambient, /import \* as THREE from 'three'/);
});
test('visual runtime uses real operation events and lazy-loads cinematic Three.js', async () => {
  const [events, runtime, app, boot] = await Promise.all([
    source('apps/web/src/munin-ui/runtime-events.ts'),
    source('apps/web/src/munin-ui/VisualRuntime.tsx'),
    source('apps/web/src/App.tsx'),
    source('apps/web/src/munin-ui/BootAmbient.tsx'),
  ]);
  assert.match(events, /MUNIN_STATE_EVENT = 'munin:state'/);
  assert.match(events, /career-inbox\\\/sync\|intelligence/);
  assert.match(runtime, /runtimeState \?\? domState/);
  assert.match(app, /emitMuninState\(classifyMuninRequest/);
  assert.doesNotMatch(boot, /import \* as THREE from 'three'/);
  assert.match(boot, /await import\('three'\)/);
});
