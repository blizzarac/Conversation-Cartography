// The Switchback — two positions alternate, converging by degrees. convergence=0 keeps
// the same distance apart forever: the Trench.
import { PALETTE, tremorPoints, smoothPath, drawDot, truncatePolyline, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'convergence', label: 'Convergence per turn', min: 0, max: 1, default: 0.65, step: 0.01, degenerate_at: 0 },
  { key: 'turns', label: 'Turns', min: 3, max: 10, default: 7, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'switchback');
  let w = 0, h = 0;
  let p = { convergence: params[0].default, turns: params[1].default };
  let skeleton = [];
  let poles = { left: 0, right: 0, top: 0, bottom: 0 };

  function build() {
    const marginX = w * 0.18;
    const marginY = h * 0.1;
    poles = { left: marginX, right: w - marginX, top: marginY, bottom: h - marginY };
    const cx = w / 2;
    const amp = (poles.right - poles.left) / 2;
    const pts = [];
    for (let i = 0; i <= p.turns; i++) {
      const frac = i / p.turns;
      const decay = 1 - p.convergence * frac;
      const side = i % 2 === 0 ? -1 : 1;
      const x = cx + side * amp * decay;
      const y = poles.top + frac * (poles.bottom - poles.top);
      pts.push([x, y]);
    }
    skeleton = pts;
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function drawGround() {
    ctx.clearRect(0, 0, w, h);
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = PALETTE.parchmentFaint || PALETTE.grid;
    ctx.lineWidth = 1;
    [poles.left, poles.right].forEach((x) => {
      ctx.beginPath(); ctx.moveTo(x, poles.top); ctx.lineTo(x, poles.bottom); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function colorFor() { return p.convergence <= 0.08 ? PALETTE.cool : PALETTE.ember; }

  function step(t) {
    drawGround();
    const drawn = tremorPoints(skeleton, seed, t, 1);
    ctx.strokeStyle = colorFor();
    ctx.lineWidth = 1.6;
    smoothPath(ctx, drawn);
    drawn.forEach((pt, i) => drawDot(ctx, pt[0], pt[1], i === drawn.length - 1 ? 3.4 : 2, i % 2 === 0 ? PALETTE.ember : PALETTE.cool));
  }

  function renderProgress(fraction) {
    drawGround();
    const sub = truncatePolyline(skeleton, fraction);
    ctx.strokeStyle = colorFor();
    ctx.lineWidth = 1.6;
    smoothPath(ctx, sub);
    sub.forEach((pt, i) => drawDot(ctx, pt[0], pt[1], 2, i % 2 === 0 ? PALETTE.ember : PALETTE.cool));
  }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(skeleton, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
