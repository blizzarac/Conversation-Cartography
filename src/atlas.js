// The Atlas — a constellation of all 8 shapes, ambient and explorable.
import { prefersReducedMotion, hashSeed, mulberry32, PALETTE } from './viz/engine.js';

const LAYOUT = [
  [0.16, 0.24], [0.50, 0.18], [0.84, 0.24],
  [0.13, 0.55], [0.87, 0.55],
  [0.26, 0.84], [0.50, 0.60], [0.74, 0.84],
];

async function main() {
  const canvas = document.getElementById('atlas-canvas');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  const tooltip = document.getElementById('atlas-tooltip');
  const toggleBtn = document.getElementById('toggle-transitions');
  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();

  const res = await fetch('/data/shapes.json');
  const shapes = await res.json();

  const modules = await Promise.all(shapes.map((s) => import(`/src/viz/shapes/${s.id}.js`)));

  let width = 0, height = 0, dpr = 1;
  let boxSize = 0;
  const entries = shapes.map((shape, i) => ({
    shape,
    mod: modules[i],
    instance: null,
    pos: LAYOUT[i % LAYOUT.length],
    center: [0, 0],
  }));

  let showTransitions = false;
  let hovered = null;

  function layout() {
    const rect = wrap.getBoundingClientRect();
    width = rect.width; height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    boxSize = Math.min(width, height) * 0.2;
    for (const e of entries) {
      e.center = [e.pos[0] * width, e.pos[1] * height];
      if (!e.instance) e.instance = e.mod.create(ctx, { seed: e.shape.id });
      e.instance.resize(boxSize, boxSize);
    }
  }

  function drawMiniature(e, t) {
    const dim = hovered && hovered !== e;
    ctx.save();
    ctx.translate(e.center[0] - boxSize / 2, e.center[1] - boxSize / 2);
    ctx.globalAlpha = dim ? 0.22 : 1;
    e.instance.step(t);
    ctx.restore();
  }

  function drawTransitions(t) {
    if (!showTransitions) return;
    ctx.save();
    for (const e of entries) {
      for (const targetId of e.shape.transitions) {
        const target = entries.find((x) => x.shape.id === targetId);
        if (!target) continue;
        const a = e.center, b = target.center;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = 'rgba(212,120,60,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // traveling particle
        const seed = hashSeed(e.shape.id + targetId);
        const speed = 0.05 + (seed % 100) / 4000;
        const phase = reduced ? 0.5 : ((t * speed) + (seed % 1000) / 1000) % 1;
        const px = a[0] + (b[0] - a[0]) * phase;
        const py = a[1] + (b[1] - a[1]) * phase;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.ember;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function frame(t) {
    ctx.clearRect(0, 0, width, height);
    drawTransitions(t);
    for (const e of entries) drawMiniature(e, t);
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestDist = Infinity;
    for (const e of entries) {
      const d = Math.hypot(x - e.center[0], y - e.center[1]);
      if (d < boxSize * 0.62 && d < bestDist) { best = e; bestDist = d; }
    }
    return best;
  }

  function showTooltip(e, clientX, clientY) {
    if (!e) { tooltip.classList.remove('visible'); return; }
    const rect = wrap.getBoundingClientRect();
    tooltip.style.left = `${clientX - rect.left}px`;
    tooltip.style.top = `${clientY - rect.top}px`;
    tooltip.querySelector('.name').textContent = e.shape.name;
    tooltip.querySelector('.sig').textContent = e.shape.signature;
    tooltip.classList.add('visible');
  }

  canvas.addEventListener('mousemove', (ev) => {
    const e = hitTest(ev.clientX, ev.clientY);
    hovered = e;
    showTooltip(e, ev.clientX, ev.clientY);
    canvas.style.cursor = e ? 'pointer' : 'default';
    if (reduced) frame(0);
  });
  canvas.addEventListener('mouseleave', () => { hovered = null; tooltip.classList.remove('visible'); if (reduced) frame(0); });
  canvas.addEventListener('click', (ev) => {
    const e = hitTest(ev.clientX, ev.clientY);
    if (e) window.location.href = `/shapes/${e.shape.id}/`;
  });

  toggleBtn?.addEventListener('click', () => {
    showTransitions = !showTransitions;
    toggleBtn.setAttribute('aria-pressed', String(showTransitions));
    toggleBtn.textContent = showTransitions ? 'Hide transitions' : 'Show transitions';
    if (reduced) frame(0);
  });

  window.addEventListener('resize', () => { layout(); if (reduced) frame(0); });

  layout();

  if (reduced) {
    frame(0);
  } else {
    let start = null;
    function loop(ts) {
      if (start === null) start = ts;
      frame((ts - start) / 1000);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
}

main();
