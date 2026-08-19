// The River Delta — one question fans into many threads. pruning=0 lets every branch
// keep multiplying and none resolve: the Sprawl.
import { PALETTE, tremorPoints, smoothPath, drawDot, mulberry32, hashSeed, sampleAlongPolyline } from '../engine.js';

export const params = [
  { key: 'pruning', label: 'Pruning discipline', min: 0, max: 1, default: 0.7, step: 0.01, degenerate_at: 0 },
  { key: 'branchGenerations', label: 'Branch generations', min: 1, max: 4, default: 3, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'delta');
  let w = 0, h = 0;
  let p = { pruning: params[0].default, branchGenerations: params[1].default };
  let edges = []; // {a:[x,y], b:[x,y], gen, pruned, survived}
  let nodes = [];
  let trunk = [];

  function build() {
    const rand = mulberry32(seed);
    const root = [w / 2, h * 0.08];
    edges = [];
    nodes = [root];
    trunk = [root];
    const maxLen = Math.min(w, h) * 0.86;

    function branch(origin, angle, gen, len, isTrunk) {
      if (gen > p.branchGenerations) return;
      const end = [origin[0] + Math.cos(angle) * len, origin[1] + Math.sin(angle) * len];
      const survivalRoll = rand();
      // the trunk (primary chain) always survives to depth — a delta's main channel
      // doesn't get pruned away, only its side distributaries do.
      const pruned = gen > 0 && !isTrunk && survivalRoll < p.pruning * (0.3 + gen * 0.2);
      edges.push({ a: origin, b: end, gen, pruned, survived: !pruned });
      nodes.push(end);
      if (isTrunk) trunk.push(end);
      if (pruned) return;
      const children = gen === 0 ? 3 : (rand() < 0.55 + (1 - p.pruning) * 0.3 ? 2 : 1);
      const spread = (0.55 + gen * 0.18) * (0.6 + (1 - p.pruning) * 0.5);
      for (let i = 0; i < children; i++) {
        const off = children === 1 ? 0 : (i / (children - 1) - 0.5) * spread;
        const childAngle = angle + off + (rand() - 0.5) * 0.12;
        branch(end, childAngle, gen + 1, len * (0.82 + rand() * 0.08), isTrunk && i === 0);
      }
    }
    branch(root, Math.PI / 2, 0, maxLen * 0.4, true);
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function drawGround() { ctx.clearRect(0, 0, w, h); }

  function drawEdges(t, upToIndex) {
    const n = upToIndex == null ? edges.length : upToIndex;
    for (let i = 0; i < n; i++) {
      const e = edges[i];
      const pts = t == null ? [e.a, e.b] : tremorPoints([e.a, e.b], seed + i * 7, t, 0.8);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineWidth = e.gen === 0 ? 2 : Math.max(0.7, 1.8 - e.gen * 0.4);
      if (e.pruned) {
        ctx.strokeStyle = PALETTE.coolDim;
        ctx.globalAlpha = 0.55;
      } else {
        ctx.strokeStyle = p.pruning < 0.12 ? PALETTE.coolDim : PALETTE.ember;
        ctx.globalAlpha = p.pruning < 0.12 ? 0.5 : 0.9;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (i >= n - 1 - (edges.length - n) && e.gen === p.branchGenerations && !e.pruned) {
        drawDot(ctx, e.b[0], e.b[1], 2.6, p.pruning < 0.12 ? PALETTE.coolDim : PALETTE.parchment);
      }
    }
    // origin: forgotten (dim) when discipline is absent, legible when pruning is deliberate
    const origin = edges[0] ? edges[0].a : [w / 2, h * 0.1];
    drawDot(ctx, origin[0], origin[1], 3, p.pruning < 0.12 ? PALETTE.parchmentDim : PALETTE.parchment);
  }

  function step(t) { drawGround(); drawEdges(t); }

  function renderProgress(fraction) {
    drawGround();
    const upTo = Math.round(edges.length * fraction);
    drawEdges(null, upTo);
  }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(trunk, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
