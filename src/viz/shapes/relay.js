// The Relay — each handoff transforms an artifact (draft, critique, revision).
// convergence=0 means edits oscillate forever instead of settling: the Ping-Pong.
import { PALETTE, tremorPoints, drawDot, truncatePolyline, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'convergence', label: 'Artifact convergence', min: 0, max: 1, default: 0.75, step: 0.01, degenerate_at: 0 },
  { key: 'handoffs', label: 'Handoffs', min: 3, max: 8, default: 5, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'relay');
  let w = 0, h = 0;
  let p = { convergence: params[0].default, handoffs: params[1].default };
  let nodes = [];
  let centerY = 0;

  function build() {
    const marginX = w * 0.1;
    centerY = h / 2;
    const amp = h * 0.28;
    nodes = [];
    for (let i = 0; i <= p.handoffs; i++) {
      const frac = i / p.handoffs;
      const x = marginX + frac * (w - marginX * 2);
      const decay = 1 - p.convergence * frac;
      const side = i % 2 === 0 ? 1 : -1;
      const y = centerY + side * amp * decay;
      nodes.push([x, y]);
    }
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function color() { return p.convergence <= 0.08 ? PALETTE.cool : PALETTE.ember; }

  function drawGround() {
    ctx.clearRect(0, 0, w, h);
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = PALETTE.grid;
    ctx.beginPath(); ctx.moveTo(nodes[0]?.[0] ?? 0, centerY); ctx.lineTo(nodes[nodes.length - 1]?.[0] ?? w, centerY); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawArcs(t, upTo) {
    const n = upTo == null ? nodes.length : upTo;
    for (let i = 1; i < n; i++) {
      const a = nodes[i - 1], b = nodes[i];
      const mx = (a[0] + b[0]) / 2;
      const bow = t == null ? 0 : Math.sin(t * 0.5 + i) * 2;
      const ctrl = [mx, Math.min(a[1], b[1]) - Math.abs(a[1] - b[1]) * 0.15 - 14 + bow];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(ctrl[0], ctrl[1], b[0], b[1]);
      ctx.strokeStyle = color();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < n; i++) {
      const pt = t == null ? nodes[i] : tremorPoints([nodes[i]], seed + i, t, 1.2)[0];
      const isLast = i === n - 1;
      drawDot(ctx, pt[0], pt[1], isLast ? 4 : 2.6, isLast && p.convergence > 0.08 ? PALETTE.parchment : (i % 2 === 0 ? PALETTE.ember : PALETTE.cool));
    }
  }

  function step(t) { drawGround(); drawArcs(t); }
  function renderProgress(fraction) { drawGround(); drawArcs(null, Math.max(1, Math.round(nodes.length * fraction))); }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(nodes, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
