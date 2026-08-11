(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const api = window.MuninClient?.request ?? (async (path, options) => {
    const response = await fetch(path, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  });
  const safe = value => String(value ?? '—').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  const started = Date.now();
  const storeKey = 'munin-hud-v2';
  const state = Object.assign(
    { sessions: 0, opens: {}, hourly: {}, panels: {}, voice: false, fx: true, lastHeadline: '' },
    JSON.parse(localStorage.getItem(storeKey) || '{}'),
  );
  const save = () => localStorage.setItem(storeKey, JSON.stringify(state));
  state.sessions += 1;
  save();

  const MODULES = [
    { id: 'briefing', name: 'Briefing', eyebrow: 'OPERATE', href: '/executive-briefing.html', angle: -90, unit: 'prior' },
    { id: 'intel', name: 'Intelligence', eyebrow: 'OPERATE', href: '/intelligence.html', angle: -43, unit: 'insights' },
    { id: 'career', name: 'Career OS', eyebrow: 'CAREER', href: '/?section=Career', angle: 5, unit: 'pipeline' },
    { id: 'research', name: 'Research', eyebrow: 'RESEARCH', href: '/?section=Research', angle: 52, unit: 'items' },
    { id: 'projects', name: 'Projects', eyebrow: 'OPERATE', href: '/?section=Projects', angle: 128, unit: 'active' },
    { id: 'linkedin', name: 'LinkedIn', eyebrow: 'STUDIO', href: '/linkedin.html', angle: 180, unit: 'studio' },
    { id: 'memory', name: 'Context', eyebrow: 'MEMORY', href: '/context-memory.html', angle: 225, unit: 'sections' },
  ];
  const CROSS = [
    ['briefing', 'career'], ['briefing', 'memory'], ['intel', 'career'], ['career', 'research'],
    ['career', 'projects'], ['memory', 'linkedin'], ['projects', 'research'],
  ];

  const nodeEls = {};
  const svg = $('hud-links');
  const readout = $('hud-readout');
  let geom = { cx: 0, cy: 0, R: 0 };
  let paths = [];
  let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  let fps = 60;
  let frames = 0;
  let lastFps = performance.now();
  let latencies = [];

  for (const module of MODULES) {
    const node = document.createElement('a');
    node.className = 'hud-node';
    node.href = module.href;
    node.dataset.node = module.id;
    node.innerHTML = `<span class="target"><i></i><i></i><i></i><i></i></span><small>${module.eyebrow}</small><b>${module.name}</b><span data-metric>—</span><span class="node-unit">${module.unit}</span>`;
    node.addEventListener('click', () => recordOpen(module.id));
    node.addEventListener('mouseenter', () => { light(module.id, true); showReadout(module); });
    node.addEventListener('mouseleave', () => { light(module.id, false); readout.classList.remove('show'); });
    document.body.appendChild(node);
    nodeEls[module.id] = node;
  }

  function recordOpen(id) {
    state.opens[id] = (state.opens[id] || 0) + 1;
    const hour = new Date().getHours();
    state.hourly[id] = state.hourly[id] || Array(24).fill(0);
    state.hourly[id][hour] += 1;
    save();
    renderAdaptive();
  }

  function layout() {
    const stage = $('hud-stage').getBoundingClientRect();
    geom.cx = stage.left + stage.width / 2;
    geom.cy = stage.top + stage.height / 2 - 8;
    geom.R = Math.min(stage.width, stage.height) * 0.39;
    for (const module of MODULES) {
      const radians = module.angle * Math.PI / 180;
      const pull = Math.min(0.12, (state.opens[module.id] || 0) * 0.008);
      module.x = geom.cx + Math.cos(radians) * geom.R * 1.35 * (1 - pull);
      module.y = geom.cy + Math.sin(radians) * geom.R * (1 - pull);
      const node = nodeEls[module.id];
      node.style.left = module.x + 'px';
      node.style.top = module.y + 'px';
      node.style.transform = 'translate(-50%,-50%)';
    }
    const label = $('hud-core-label');
    label.style.left = '50%';
    label.style.top = `calc(50% + ${Math.min(stage.width, stage.height) * 0.24}px)`;
    drawLinks();
    restorePanels();
  }

  function curve(a, b, sag = 0.08) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return `M ${a.x} ${a.y} Q ${mx - dy * sag} ${my + dx * sag} ${b.x} ${b.y}`;
  }

  function drawLinks() {
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    svg.innerHTML = '';
    paths = [];
    const make = (d, alpha, key) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', `rgba(53,200,232,${alpha})`);
      path.setAttribute('stroke-width', '1');
      path.dataset.key = key;
      path.dataset.alpha = alpha;
      svg.appendChild(path);
      paths.push(path);
    };
    for (const module of MODULES) make(curve({ x: geom.cx, y: geom.cy }, module), 0.15, `core-${module.id}`);
    for (const [a, b] of CROSS) make(curve(MODULES.find(x => x.id === a), MODULES.find(x => x.id === b), 0.15), 0.07, `${a}-${b}`);
  }

  function light(id, on) {
    for (const path of paths) {
      const involved = path.dataset.key.includes(id);
      const alpha = on ? (involved ? 0.62 : 0.035) : path.dataset.alpha;
      path.setAttribute('stroke', `rgba(127,228,255,${alpha})`);
    }
    for (const [nodeId, node] of Object.entries(nodeEls)) {
      const related = nodeId === id || CROSS.some(([a, b]) => (a === id && b === nodeId) || (b === id && a === nodeId));
      node.classList.toggle('lit', on && related);
    }
  }

  function showReadout(module) {
    readout.textContent = `> MODULE ${module.id.toUpperCase()}\n> acessos: ${state.opens[module.id] || 0}\n> status: OPERACIONAL`;
    readout.style.left = `${module.x + 60}px`;
    readout.style.top = `${module.y - 18}px`;
    readout.classList.add('show');
  }

  function metric(id, value, alert = false) {
    const node = nodeEls[id];
    if (!node) return;
    node.querySelector('[data-metric]').textContent = value;
    node.classList.toggle('alert', alert);
  }

  function tick() {
    const d = new Date();
    $('hud-time').textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('hud-date').textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const seconds = Math.floor((Date.now() - started) / 1000);
    $('hud-session').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function calendar() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const total = new Date(y, m + 1, 0).getDate();
    const first = new Date(y, m, 1).getDay();
    let html = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<span class="hdr">${x}</span>`).join('');
    for (let i = 0; i < first; i += 1) html += '<span></span>';
    for (let day = 1; day <= total; day += 1) html += `<span class="${day === d.getDate() ? 'today' : ''}">${day}</span>`;
    $('hud-calendar').innerHTML = html;
  }

  setInterval(tick, 1000);
  tick();
  calendar();

  function speak(text) {
    if (!state.voice || !('speechSynthesis' in window) || !text) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.02;
      utterance.pitch = 0.88;
      const voice = speechSynthesis.getVoices().find(x => x.lang.startsWith('pt'));
      if (voice) utterance.voice = voice;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch { }
  }

  function renderToggles() {
    $('hud-voice').textContent = state.voice ? 'VOZ ON' : 'VOZ OFF';
    $('hud-voice').classList.toggle('on', state.voice);
    $('hud-fx-toggle').textContent = state.fx ? 'AMBIENT ON' : 'AMBIENT OFF';
    $('hud-fx-toggle').classList.toggle('on', state.fx);
    document.body.classList.toggle('fx-off', !state.fx);
  }
  $('hud-voice').onclick = () => { state.voice = !state.voice; save(); renderToggles(); if (state.voice) speak('Voz do Munin ativada.'); };
  $('hud-fx-toggle').onclick = () => { state.fx = !state.fx; save(); renderToggles(); };
  renderToggles();

  function renderAdaptive() {
    const hour = new Date().getHours();
    let best = '';
    let score = 0;
    for (const [id, hours] of Object.entries(state.hourly)) {
      const value = (hours[hour] || 0) * 2 + (hours[(hour + 23) % 24] || 0) + (hours[(hour + 1) % 24] || 0);
      if (value > score) { score = value; best = id; }
    }
    $('hud-adaptive').textContent = best && score > 1 ? `ADAPTIVE · ${best.toUpperCase()} PROVÁVEL` : 'ADAPTIVE · OBSERVANDO';
    $('hud-predictive').textContent = best && score > 1 ? `Neste horário, ${MODULES.find(m => m.id === best)?.name} é seu destino mais provável.` : 'Observando padrões de uso por horário e frequência.';
    $('hud-usage').innerHTML = Object.entries(state.opens).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => `<div class="usage-row"><span>${safe(MODULES.find(m => m.id === id)?.name || id)}</span><b>${n}</b></div>`).join('');
  }
  renderAdaptive();

  async function load() {
    const start = performance.now();
    try {
      const [ws, brief, ctx, assets, sources] = await Promise.all([
        api('/api/workspace'), api('/api/executive-briefing'), api('/api/context-memory').catch(() => null),
        api('/api/visual-assets').catch(() => null), api('/api/linkedin-composer/sources').catch(() => null),
      ]);
      const ms = Math.round(performance.now() - start);
      latencies.push(ms);
      latencies = latencies.slice(-30);
      $('hud-api').textContent = `${ms} ms`;
      $('hud-api-meter').style.width = `${Math.max(8, 100 - Math.min(92, ms))}%`;
      $('hud-status').textContent = 'DADOS AO VIVO';
      const headline = brief.headline || 'Nenhum sinal crítico agora.';
      $('hud-headline').textContent = headline;
      $('hud-core-sub').textContent = `${brief.priorities?.length ?? 0} PRIORIDADES ATIVAS`;
      if (state.lastHeadline && headline !== state.lastHeadline && ((brief.signals?.length ?? 0) > 0 || (brief.career?.unhandledCritical ?? 0) > 0)) speak(headline);
      state.lastHeadline = headline;
      save();
      const feed = [
        ...(brief.priorities || []).slice(0, 4).map(x => `<div class="hud-feed-item"><div><strong>${safe(x.type)}</strong> · ${safe(x.title)}</div></div>`),
        ...(brief.signals || []).slice(0, 2).map(x => `<div class="hud-feed-item"><div>${safe(x.message)}</div></div>`),
      ];
      $('hud-feed').innerHTML = feed.join('') || '<div class="hud-feed-item"><div>Sistema estável. Nenhum sinal crítico.</div></div>';
      const jobs = (brief.career?.topOpportunities || []).slice(0, 5);
      $('hud-career').innerHTML = jobs.map(j => `<div class="hud-career-row"><div><strong>${safe(j.company)} — ${safe(j.role)}</strong><br>${safe(j.status)}${j.nextAction ? ' · ' + safe(j.nextAction) : ''}</div><b>${safe(j.score)}</b></div>`).join('') || '<div class="hud-career-row"><div>Pipeline sem oportunidades prioritárias.</div></div>';
      metric('briefing', brief.priorities?.length ?? 0, (brief.career?.unhandledCritical ?? 0) > 0);
      metric('intel', ws.intelligence?.insights?.length ?? 0);
      metric('career', ws.state?.jobs?.length ?? 0, (brief.career?.followUpsDue ?? 0) > 0);
      metric('memory', ctx?.summary?.sections ?? 0);
      metric('linkedin', assets?.posts?.length ?? sources?.signals?.length ?? 'LIVE');
      metric('projects', ws.state?.projects?.length ?? 0);
      metric('research', ws.state?.research?.length ?? 0);
      drawLinks();
    } catch (error) {
      $('hud-status').textContent = 'API OFFLINE';
      $('hud-api').textContent = 'offline';
      $('hud-headline').textContent = error instanceof Error ? error.message : String(error);
    }
  }

  async function health() {
    const start = performance.now();
    try {
      await api('/api/health');
      const ms = Math.round(performance.now() - start);
      $('hud-api').textContent = `${ms} ms`;
      $('hud-api-meter').style.width = `${Math.max(8, 100 - Math.min(92, ms))}%`;
    } catch {
      $('hud-api').textContent = 'offline';
      $('hud-api-meter').style.width = '0%';
      $('hud-status').textContent = 'API OFFLINE';
    }
  }

  async function syncMail() {
    try {
      const result = await api('/api/career-inbox/sync', { method: 'POST' });
      $('hud-mail-sync').textContent = result.needsConnection ? 'aguardando conexão' : `${result.added ?? 0} novos`;
      if (!result.needsConnection && (result.added ?? 0) > 0) {
        toast(`${result.added} novos sinais de carreira`);
        speak(`${result.added} novos sinais de carreira detectados.`);
        await load();
      }
    } catch { $('hud-mail-sync').textContent = 'erro'; }
  }

  function toast(text) {
    const element = $('hud-toast');
    element.textContent = text;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 2800);
  }

  const iris = $('hud-iris');
  const ictx = iris.getContext('2d');
  const fx = $('hud-fx');
  const fctx = fx.getContext('2d');
  const wave = $('hud-wave');
  const wctx = wave.getContext('2d');
  let particles = [];
  let sparks = [];
  const samples = Array(140).fill(0);
  const t0 = performance.now();

  function sizeCanvas(canvas) {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.getContext('2d').setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function sizeWave() {
    wave.width = wave.clientWidth * devicePixelRatio;
    wave.height = wave.clientHeight * devicePixelRatio;
    wctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function initParticles() {
    particles = Array.from({ length: 70 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, r: 0.5 + Math.random() * 1.1 }));
  }

  function drawIris(now) {
    ictx.clearRect(0, 0, innerWidth, innerHeight);
    const t = (now - t0) / 1000;
    const stage = $('hud-stage');
    const R = Math.min(Math.min(stage.clientWidth, stage.clientHeight) * 0.24, 145);
    const dx = mouse.x - geom.cx;
    const dy = mouse.y - geom.cy;
    const dist = Math.hypot(dx, dy);
    const near = Math.max(0, 1 - dist / (R * 5));
    const speed = 1 + near * 1.5;
    const ring = (r, a0, a1, width, alpha, rotation) => {
      ictx.beginPath();
      ictx.arc(geom.cx, geom.cy, r, a0 + rotation, a1 + rotation);
      ictx.strokeStyle = `rgba(53,200,232,${alpha})`;
      ictx.lineWidth = width;
      ictx.stroke();
    };
    for (let i = 0; i < 52; i += 1) {
      const angle = i / 52 * Math.PI * 2 + t * 0.05 * speed;
      const r1 = R * 0.98;
      const r2 = R * (i % 5 === 0 ? 1.07 : 1.03);
      ictx.beginPath();
      ictx.moveTo(geom.cx + Math.cos(angle) * r1, geom.cy + Math.sin(angle) * r1);
      ictx.lineTo(geom.cx + Math.cos(angle) * r2, geom.cy + Math.sin(angle) * r2);
      ictx.strokeStyle = `rgba(53,200,232,${i % 5 === 0 ? 0.5 : 0.2})`;
      ictx.stroke();
    }
    ring(R * 0.9, 0, Math.PI * 2, 1, 0.2, 0);
    ring(R * 0.9, 0, Math.PI * 0.72, 2.2, 0.82, t * 0.7 * speed);
    ring(R * 0.72, 0, Math.PI * 2, 1, 0.15, 0);
    ring(R * 0.72, 0, Math.PI * 1.15, 1.7, 0.58, -t * 0.45 * speed);
    ring(R * 0.54, 0, Math.PI * 2, 4, 0.08, 0);
    ring(R * 0.54, 0, Math.PI * 0.48, 2, 0.7, t * 1.05 * speed);
    const gaze = Math.min(8, dist / 45);
    const gx = geom.cx + (dx / (dist || 1)) * gaze;
    const gy = geom.cy + (dy / (dist || 1)) * gaze;
    const gradient = ictx.createRadialGradient(gx, gy, 2, gx, gy, R * 0.52);
    gradient.addColorStop(0, 'rgba(165,235,255,.72)');
    gradient.addColorStop(0.35, 'rgba(53,180,226,.28)');
    gradient.addColorStop(1, 'rgba(53,180,226,0)');
    ictx.fillStyle = gradient;
    ictx.beginPath();
    ictx.arc(gx, gy, R * 0.52, 0, Math.PI * 2);
    ictx.fill();
    ictx.fillStyle = 'rgba(220,248,255,.9)';
    ictx.font = '600 18px ui-sans-serif,system-ui';
    ictx.textAlign = 'center';
    ictx.textBaseline = 'middle';
    ictx.fillText('MUNIN', gx, gy);
  }

  function spawnSpark() {
    if (!paths.length || sparks.length > 18) return;
    const path = paths[Math.floor(Math.random() * paths.length)];
    sparks.push({ path, t: 0, speed: 0.004 + Math.random() * 0.004 });
  }
  setInterval(spawnSpark, 260);

  function drawFx() {
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!state.fx) return;
    for (const particle of particles) {
      const dm = Math.hypot(particle.x - mouse.x, particle.y - mouse.y);
      if (dm < 150 && dm > 1) {
        particle.vx += (mouse.x - particle.x) / dm * 0.008;
        particle.vy += (mouse.y - particle.y) / dm * 0.008;
      }
      particle.vx *= 0.988; particle.vy *= 0.988;
      particle.x += particle.vx; particle.y += particle.vy;
      if (particle.x < 0) particle.x = innerWidth;
      if (particle.x > innerWidth) particle.x = 0;
      if (particle.y < 0) particle.y = innerHeight;
      if (particle.y > innerHeight) particle.y = 0;
      fctx.fillStyle = 'rgba(110,200,235,.42)';
      fctx.beginPath(); fctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2); fctx.fill();
    }
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i], b = particles[j], dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > 90 || Math.abs(dy) > 90) continue;
        const distance = Math.hypot(dx, dy);
        if (distance < 90) {
          fctx.strokeStyle = `rgba(53,200,232,${(1 - distance / 90) * 0.09})`;
          fctx.beginPath(); fctx.moveTo(a.x, a.y); fctx.lineTo(b.x, b.y); fctx.stroke();
        }
      }
    }
    sparks = sparks.filter(s => s.t <= 1);
    for (const spark of sparks) {
      spark.t += spark.speed;
      const length = spark.path.getTotalLength();
      const point = spark.path.getPointAtLength(spark.t * length);
      const gradient = fctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 6);
      gradient.addColorStop(0, 'rgba(160,235,255,.9)');
      gradient.addColorStop(1, 'rgba(160,235,255,0)');
      fctx.fillStyle = gradient;
      fctx.beginPath(); fctx.arc(point.x, point.y, 6, 0, Math.PI * 2); fctx.fill();
    }
  }

  function drawWave() {
    const latency = latencies.at(-1) || 0;
    const activity = Math.min(1, sparks.length / 18);
    samples.push(activity * 0.62 + (latency ? Math.min(0.35, latency / 220) : 0) + Math.random() * 0.1);
    samples.shift();
    const w = wave.clientWidth, h = wave.clientHeight;
    wctx.clearRect(0, 0, w, h);
    wctx.beginPath();
    samples.forEach((value, i) => {
      const x = i / (samples.length - 1) * w;
      const y = h - 6 - value * (h - 18);
      if (i) wctx.lineTo(x, y); else wctx.moveTo(x, y);
    });
    wctx.strokeStyle = 'rgba(53,200,232,.72)';
    wctx.lineWidth = 1.1;
    wctx.stroke();
    $('hud-wave-caption').textContent = `${sparks.length} pulses · ${latency || '—'} ms`;
  }

  function frame(now) {
    frames += 1;
    if (now - lastFps > 1000) {
      fps = frames; frames = 0; lastFps = now;
      $('hud-fps').textContent = `${fps} fps`;
    }
    drawFx();
    drawIris(now);
    requestAnimationFrame(frame);
  }

  addEventListener('mousemove', event => {
    mouse = { x: event.clientX, y: event.clientY };
    document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
    document.documentElement.style.setProperty('--my', `${event.clientY}px`);
    document.body.classList.toggle('ret-hover', !!event.target.closest('a,button,.hud-panel'));
    document.body.classList.toggle('ret-text', !!event.target.closest('input,textarea'));
  });

  let drag = null;
  for (const panel of document.querySelectorAll('.drag-panel')) panel.addEventListener('mousedown', event => {
    if (event.target.closest('a,button,input,textarea')) return;
    const rect = panel.getBoundingClientRect();
    drag = { panel, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    panel.classList.add('dragging');
    event.preventDefault();
  });
  addEventListener('mousemove', event => {
    if (!drag) return;
    drag.panel.style.left = `${event.clientX - drag.dx}px`;
    drag.panel.style.top = `${event.clientY - drag.dy}px`;
    drag.panel.style.right = 'auto';
    drag.panel.style.bottom = 'auto';
  });
  addEventListener('mouseup', () => {
    if (!drag) return;
    const id = drag.panel.dataset.panel;
    const rect = drag.panel.getBoundingClientRect();
    state.panels[id] = { x: rect.left, y: rect.top };
    save();
    drag.panel.classList.remove('dragging');
    drag = null;
  });

  function restorePanels() {
    for (const [id, pos] of Object.entries(state.panels || {})) {
      const element = document.querySelector(`[data-panel="${id}"]`);
      if (!element) continue;
      element.style.left = `${Math.min(innerWidth - 80, Math.max(0, pos.x))}px`;
      element.style.top = `${Math.min(innerHeight - 60, Math.max(46, pos.y))}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    }
  }

  $('hud-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('hud-input');
    const command = input.value.trim();
    if (!command) return;
    const reply = $('hud-reply');
    reply.classList.add('on');
    reply.textContent = 'Processando…';
    input.disabled = true;
    try {
      const result = await api('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
      reply.textContent = result.reply ?? result.response ?? result.message ?? JSON.stringify(result, null, 2);
      input.value = '';
      await load();
    } catch (error) { reply.textContent = error instanceof Error ? error.message : String(error); }
    finally { input.disabled = false; input.focus(); }
  });
  $('hud-core-hit').onclick = () => { $('hud-input').focus(); speak('Sim?'); };
  addEventListener('keydown', event => {
    if (event.key === 'Escape') $('hud-reply').classList.remove('on');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('hud-input').focus(); }
  });

  async function boot() {
    const box = $('hud-boot'), lines = $('hud-boot-lines'), bar = $('hud-boot-bar');
    const steps = ['INICIANDO MUNIN CORE…', `SESSÃO ${state.sessions} · MEMÓRIA ADAPTATIVA LOCAL`, 'CARREGANDO: OPERATE · CAREER · MEMORY · STUDIO', 'VALIDANDO API E FONTES DE DADOS…', 'SINAPSES ONLINE. <span class="ok">SISTEMAS NOMINAIS.</span>'];
    for (let i = 0; i < steps.length; i += 1) {
      lines.innerHTML += `<div>&gt; ${steps[i]}</div>`;
      bar.style.width = `${Math.round((i + 1) / steps.length * 100)}%`;
      await new Promise(resolve => setTimeout(resolve, state.sessions > 3 ? 120 : 260));
    }
    await new Promise(resolve => setTimeout(resolve, 220));
    box.classList.add('fade');
    if (state.voice) speak('Sistemas online. Bem-vindo de volta.');
  }

  sizeCanvas(iris); sizeCanvas(fx); sizeWave(); initParticles(); layout();
  requestAnimationFrame(frame);
  setInterval(drawWave, 320);
  addEventListener('resize', () => { sizeCanvas(iris); sizeCanvas(fx); sizeWave(); layout(); });
  boot(); load(); health(); syncMail();
  setInterval(health, 5000);
  setInterval(load, 60000);
  setInterval(syncMail, 300000);
  setInterval(renderAdaptive, 60000);
})();
