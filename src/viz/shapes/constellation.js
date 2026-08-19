// The Constellation — apparently unrelated topics resolve into one theme.
// convergentTheme=0 leaves the points scattered, never connected: the Scatter.
import { PALETTE, tremorPoints, drawDot, mulberry32, hashSeed, sampleAlongPolyline } from '../engine.js';

export const params = [
  { key: 'convergentTheme', label: 'Thematic convergence', min: 0, max: 1, default: 0.8, step: 0.01, degenerate_at: 0 },
  { key: 'points', label: 'Topics', min: 5, max: 12, default: 8, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'constellation');
  let w = 0, h = 0;
  let p = { convergentTheme: params[0].default, points: params[1].default };
  let pts = [];
  let theme = [0, 0];

  function build() {
    const rand = mulberry32(seed);
    const margin = Math.min(w, h) * 0.14;
    pts = [];
    for (let i = 0; i < p.points; i++) {
      pts.push([margin + rand() * (w - margin * 2), margin + rand() * (h - margin * 2)]);
    }
    theme = [w / 2, h / 2];
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function drawGround() { ctx.clearRect(0, 0, w, h); }

  function draw(fraction, t) {
    drawGround();
    const linked = Math.round(fraction * pts.length);
    const connect = p.convergentTheme > 0.1;
    if (connect) {
      for (let i = 1; i < linked; i++) {
        const a = t == null ? pts[i - 1] : tremorPoints([pts[i - 1]], seed + i, t, 0.6)[0];
        const b = t == null ? pts[i] : tremorPoints([pts[i]], seed + i + 1, t, 0.6)[0];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        const pull = p.convergentTheme;
        const mx = a[0] + (b[0] - a[0]) * 0.5 + (theme[0] - (a[0] + b[0]) / 2) * pull * 0.25;
        const my = a[1] + (b[1] - a[1]) * 0.5 + (theme[1] - (a[1] + b[1]) / 2) * pull * 0.25;
        ctx.quadraticCurveTo(mx, my, b[0], b[1]);
        ctx.strokeStyle = PALETTE.ember;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (linked === pts.length && p.convergentTheme > 0.5) {
        drawDot(ctx, theme[0], theme[1], 4.5, PALETTE.parchment);
        ctx.beginPath();
        ctx.arc(theme[0], theme[1], 14, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.emberDim;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const visible = i < Math.max(linked, connect ? 0 : linked);
      const on = i < (connect ? linked : Math.round(fraction * pts.length));
      if (!on) continue;
      const pt = t == null ? pts[i] : tremorPoints([pts[i]], seed + i * 11, t, 1.4)[0];
      drawDot(ctx, pt[0], pt[1], 3, connect ? PALETTE.parchment : PALETTE.coolDim);
    }
  }

  function step(t) {
    const cycle = (Math.sin(t * 0.12) + 1) / 2;
    draw(0.4 + cycle * 0.6, t);
  }
  function renderProgress(fraction) { draw(fraction, null); }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(pts, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
