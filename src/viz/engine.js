// Shared animation engine for all shape renderers: RNG, easing, tremor strokes,
// palette, and a resize/prefers-reduced-motion-aware render loop.

export const PALETTE = {
  ground: '#0d0f14',
  groundAlt: '#12151c',
  parchment: '#e8dcc0',
  parchmentDim: 'rgba(232, 220, 192, 0.35)',
  ember: '#d4783c',
  emberDim: 'rgba(212, 120, 60, 0.35)',
  cool: '#5a8a9e',
  coolDim: 'rgba(90, 138, 158, 0.35)',
  grid: 'rgba(232, 220, 192, 0.06)',
};

// Deterministic PRNG (mulberry32) so figures are stable across renders for a given seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Per-vertex "hand tremor" jitter that is stable per seed but breathes gently over time.
export function tremorPoints(points, seed, time, amount = 1.2) {
  const rand = mulberry32(seed);
  const offsets = points.map(() => ({ a: rand() * Math.PI * 2, s: 0.6 + rand() * 0.8 }));
  return points.map((p, i) => {
    const o = offsets[i];
    const wobble = Math.sin(time * 0.4 * o.s + o.a) * amount;
    const wobble2 = Math.cos(time * 0.31 * o.s + o.a * 1.7) * amount;
    return [p[0] + wobble, p[1] + wobble2];
  });
}

export function strokePath(ctx, points, { close = false } = {}) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

// Smooth a polyline into a quadratic-curve path (midpoint smoothing) for an organic hand-drawn feel.
export function smoothPath(ctx, points, { close = false } = {}) {
  if (points.length < 3) return strokePath(ctx, points, { close });
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

export function drawDot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function polylineLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return len;
}

// Evenly sample n points along a polyline by arc length (stable base for mapTurns —
// sample the un-jittered skeleton, not the animated tremor, so turn positions don't swim).
export function sampleAlongPolyline(points, n) {
  if (n <= 0) return [];
  if (points.length === 1 || n === 1) return [points[points.length - 1]];
  const total = polylineLength(points);
  const out = [];
  for (let i = 0; i < n; i++) {
    const target = n === 1 ? total : (total * i) / (n - 1);
    out.push(pointAtLength(points, target));
  }
  return out;
}

export function pointAtLength(points, target) {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (acc + segLen >= target || i === points.length - 1) {
      const t = segLen === 0 ? 0 : clamp((target - acc) / segLen, 0, 1);
      return [
        lerp(points[i - 1][0], points[i][0], t),
        lerp(points[i - 1][1], points[i][1], t),
      ];
    }
    acc += segLen;
  }
  return points[points.length - 1];
}

// Truncate a polyline to the first `fraction` of its arc length — the primitive behind
// every renderProgress() implementation (scroll-linked specimen drawing).
export function truncatePolyline(points, fraction) {
  if (fraction >= 1) return points;
  if (fraction <= 0) return [];
  const total = polylineLength(points);
  const target = total * fraction;
  let acc = 0;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (acc + segLen >= target) {
      const t = segLen === 0 ? 0 : (target - acc) / segLen;
      out.push([lerp(points[i - 1][0], points[i][0], t), lerp(points[i - 1][1], points[i][1], t)]);
      return out;
    }
    acc += segLen;
    out.push(points[i]);
  }
  return out;
}

// Creates a managed render loop bound to a canvas. Handles DPR scaling, resize, and
// prefers-reduced-motion (renders a single static frame instead of looping).
export function createLoop(canvas, onFrame) {
  const ctx = canvas.getContext('2d');
  let raf = null;
  let last = 0;
  let t = 0;
  let running = false;
  const reduced = prefersReducedMotion();

  function resizeToParent() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onFrame.resize && onFrame.resize(rect.width, rect.height);
  }

  function frame(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    t += dt;
    onFrame.step(t, dt);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    if (reduced) {
      resizeToParent();
      onFrame.step(0, 0);
    } else {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    resizeToParent();
    if (reduced) onFrame.step(t, 0);
  }) : null;
  if (ro) ro.observe(canvas);
  resizeToParent();

  return { start, stop, ctx, get reduced() { return reduced; }, resizeToParent };
}
