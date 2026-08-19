// The Spiral — same question revisited at increasing depth. depthGain=0 collapses the
// spiral into a repeated circle: the Loop.
import { PALETTE, tremorPoints, smoothPath, drawDot, truncatePolyline, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'depthGain', label: 'Depth per pass', min: 0, max: 1, default: 0.6, step: 0.01, degenerate_at: 0 },
  { key: 'passes', label: 'Passes', min: 2, max: 9, default: 5, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'spiral');
  let w = 0, h = 0;
  let p = { depthGain: params[0].default, passes: params[1].default };
  let skeleton = [];

  function build() {
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(w, h) * 0.42;
    const minR = maxR * 0.16;
    const totalPoints = Math.max(80, Math.round(p.passes * 48));
    const pts = [];
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * p.passes * Math.PI * 2 - Math.PI / 2;
      const passFrac = t; // 0..1 across all passes
      const radiusFrac = 0.16 + p.depthGain * passFrac * 0.84;
      const r = minR + (maxR - minR) * (radiusFrac / 1) ;
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    skeleton = pts;
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function drawGround() {
    ctx.clearRect(0, 0, w, h);
  }

  function step(t) {
    drawGround();
    const drawn = tremorPoints(skeleton, seed, t, 1.1);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = p.depthGain <= 0.08 ? PALETTE.cool : PALETTE.ember;
    ctx.globalAlpha = 0.85;
    smoothPath(ctx, drawn);
    ctx.globalAlpha = 1;
    // traveling pulse
    const cycle = (t * 0.06) % 1;
    const head = drawn[Math.floor(cycle * (drawn.length - 1))];
    if (head) drawDot(ctx, head[0], head[1], 3.2, PALETTE.parchment);
    drawDot(ctx, skeleton[0][0], skeleton[0][1], 2.4, PALETTE.parchmentDim);
  }

  function renderProgress(fraction) {
    drawGround();
    const sub = truncatePolyline(skeleton, fraction);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = p.depthGain <= 0.08 ? PALETTE.cool : PALETTE.ember;
    smoothPath(ctx, sub);
    if (sub.length) drawDot(ctx, sub[sub.length - 1][0], sub[sub.length - 1][1], 3.5, PALETTE.parchment);
  }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(skeleton, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
