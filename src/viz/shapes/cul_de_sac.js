// The Cul-de-sac — a path followed, found terminal, and backed out of.
// retreatClarity=0 means the terminal path is circled again and again instead
// of retreated from: the Sunk Cost.
import { PALETTE, tremorPoints, smoothPath, drawDot, truncatePolyline, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'retreatClarity', label: 'Retreat clarity', min: 0, max: 1, default: 1, step: 0.01, degenerate_at: 0 },
  { key: 'loops', label: 'Circles at the dead end', min: 1, max: 5, default: 1, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'cul_de_sac');
  let w = 0, h = 0;
  let p = { retreatClarity: params[0].default, loops: params[1].default };
  let skeleton = [];
  let forkPoint = [0, 0];
  let deadEnd = { c: [0, 0], r: 0 };

  function build() {
    const start = [w * 0.12, h * 0.55];
    forkPoint = [w * 0.42, h * 0.55];
    deadEnd = { c: [w * 0.62, h * 0.3], r: Math.min(w, h) * 0.11 };
    const pts = [start, forkPoint];
    const retreating = p.retreatClarity > 0.12;
    const loopCount = retreating ? p.loops : p.loops + Math.round((1 - p.retreatClarity) * 3);
    const res = 40;
    for (let l = 0; l < loopCount; l++) {
      for (let i = 0; i <= res; i++) {
        const a = (i / res) * Math.PI * 2 - Math.PI / 2;
        pts.push([deadEnd.c[0] + Math.cos(a) * deadEnd.r, deadEnd.c[1] + Math.sin(a) * deadEnd.r]);
      }
    }
    if (retreating) {
      pts.push(forkPoint);
      pts.push([w * 0.85, h * 0.72]);
    }
    skeleton = pts;
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function color() { return p.retreatClarity <= 0.12 ? PALETTE.cool : PALETTE.ember; }

  function drawGround() { ctx.clearRect(0, 0, w, h); }

  function step(t) {
    drawGround();
    const drawn = tremorPoints(skeleton, seed, t, 1);
    ctx.strokeStyle = color();
    ctx.lineWidth = 1.5;
    smoothPath(ctx, drawn);
    drawDot(ctx, forkPoint[0], forkPoint[1], 3, PALETTE.parchmentDim);
    drawDot(ctx, deadEnd.c[0], deadEnd.c[1], 2, PALETTE.parchmentFaint || 'rgba(232,220,192,0.3)');
  }

  function renderProgress(fraction) {
    drawGround();
    const sub = truncatePolyline(skeleton, fraction);
    ctx.strokeStyle = color();
    ctx.lineWidth = 1.5;
    smoothPath(ctx, sub);
    if (sub.length) drawDot(ctx, sub[sub.length - 1][0], sub[sub.length - 1][1], 3.5, PALETTE.parchment);
  }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(skeleton, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
