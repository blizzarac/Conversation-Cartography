// The Excavation — the stated question is peeled back to reveal a different one beneath.
// depthReached=0 leaves a final layer over the core, never actually reached: the False Floor.
import { PALETTE, tremorPoints, drawDot, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'depthReached', label: 'Depth reached', min: 0, max: 1, default: 1, step: 0.01, degenerate_at: 0 },
  { key: 'layers', label: 'Layers', min: 3, max: 8, default: 5, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'excavation');
  let w = 0, h = 0;
  let p = { depthReached: params[0].default, layers: params[1].default };
  let rings = [];
  let skeleton = [];
  let cx = 0, cy = 0, maxR = 0;

  function build() {
    cx = w / 2; cy = h / 2;
    maxR = Math.min(w, h) * 0.42;
    // depth 0 = core (smallest radius); depth (layers-1) = outermost layer.
    rings = [];
    for (let d = 0; d < p.layers; d++) {
      rings.push({ r: maxR * ((d + 1) / p.layers), depth: d });
    }
    const pts = [];
    const totalTurns = 3.2;
    const res = 90;
    for (let i = 0; i <= res; i++) {
      const t = i / res;
      const angle = t * totalTurns * Math.PI * 2;
      const r = maxR * (1 - t * 0.94);
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    skeleton = pts;
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  // fraction: 0 = nothing excavated, 1 = fully excavated (subject to depthReached ceiling)
  function draw(fraction, t) {
    ctx.clearRect(0, 0, w, h);
    const effectiveFraction = Math.min(fraction, 0.15 + p.depthReached * 0.85);
    const removedCount = Math.floor(effectiveFraction * p.layers); // outer layers peeled so far
    const coreExposed = removedCount >= p.layers;

    // draw remaining (not-yet-peeled) layers, outermost first, down to whichever is innermost-remaining
    for (let d = p.layers - 1; d >= 0; d--) {
      const removed = (p.layers - 1 - d) < removedCount;
      if (removed) continue;
      const ring = rings[d];
      const pts = [];
      const res = 48;
      for (let j = 0; j <= res; j++) {
        const a = (j / res) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * ring.r, cy + Math.sin(a) * ring.r]);
      }
      const drawn = t == null ? pts : tremorPoints(pts, seed + d * 3, t, 0.8);
      ctx.beginPath();
      drawn.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
      ctx.closePath();
      if (d === 0 && !coreExposed) {
        // the last layer still covering the core — the "false floor" when it never lifts
        ctx.fillStyle = 'rgba(90,138,158,0.12)';
        ctx.fill();
        ctx.strokeStyle = PALETTE.coolDim;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = PALETTE.parchmentFaint || 'rgba(232,220,192,0.3)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (coreExposed) {
      ctx.beginPath();
      ctx.arc(cx, cy, rings[0].r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212,120,60,0.18)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.ember;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      drawDot(ctx, cx, cy, 4, PALETTE.parchment);
    } else {
      drawDot(ctx, cx, cy, 2, PALETTE.coolDim);
    }
  }

  function step(t) {
    const cycle = (Math.sin(t * 0.15) + 1) / 2; // slow breathing excavation for ambient view
    draw(0.35 + cycle * 0.65, t);
  }

  function renderProgress(fraction) { draw(fraction, null); }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(skeleton, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
