// The Ladder — linear escalation of abstraction. grounding=0 lets the rungs compress
// and run off the top with nothing to stand on: the Tower.
import { PALETTE, tremorPoints, drawDot, truncatePolyline, sampleAlongPolyline, hashSeed } from '../engine.js';

export const params = [
  { key: 'grounding', label: 'Grounding at the top', min: 0, max: 1, default: 0.7, step: 0.01, degenerate_at: 0 },
  { key: 'rungs', label: 'Rungs', min: 3, max: 9, default: 6, step: 1 },
];

export function create(ctx, opts = {}) {
  const seed = hashSeed(opts.seed || 'ladder');
  let w = 0, h = 0;
  let p = { grounding: params[0].default, rungs: params[1].default };
  let skeleton = [];
  let rungY = [];
  let rails = { left: 0, right: 0, bottom: 0, top: 0 };

  function yFrac(t) {
    const exponent = 1 / (0.32 + 0.68 * p.grounding);
    return Math.pow(t, exponent);
  }

  function build() {
    rails = { left: w * 0.32, right: w * 0.68, bottom: h * 0.88, top: h * 0.08 };
    const pts = [];
    const res = 60;
    for (let i = 0; i <= res; i++) {
      const t = i / res;
      const yf = yFrac(t);
      const y = rails.bottom - yf * (rails.bottom - rails.top);
      pts.push([(rails.left + rails.right) / 2, y]);
    }
    skeleton = pts;
    rungY = [];
    for (let i = 0; i <= p.rungs; i++) {
      const t = i / p.rungs;
      const yf = yFrac(t);
      rungY.push(rails.bottom - yf * (rails.bottom - rails.top));
    }
  }

  function resize(nw, nh) { w = nw; h = nh; build(); }
  function setParam(key, value) { p[key] = value; build(); }

  function color() { return p.grounding <= 0.1 ? PALETTE.cool : PALETTE.ember; }

  function drawStructure(t, upTo) {
    ctx.clearRect(0, 0, w, h);
    const n = upTo == null ? rungY.length : upTo;
    const railPts = [[rails.left, rails.bottom], [rails.left, rungY[n - 1] ?? rails.bottom]];
    const railPts2 = [[rails.right, rails.bottom], [rails.right, rungY[n - 1] ?? rails.bottom]];
    [railPts, railPts2].forEach((rp) => {
      const drawn = t == null ? rp : tremorPoints(rp, seed + 1, t, 0.6);
      ctx.beginPath(); ctx.moveTo(drawn[0][0], drawn[0][1]); ctx.lineTo(drawn[1][0], drawn[1][1]);
      ctx.strokeStyle = color(); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    });
    for (let i = 0; i < n; i++) {
      const y = rungY[i];
      const rp = [[rails.left, y], [rails.right, y]];
      const drawn = t == null ? rp : tremorPoints(rp, seed + i * 5, t, 0.7);
      ctx.beginPath(); ctx.moveTo(drawn[0][0], drawn[0][1]); ctx.lineTo(drawn[1][0], drawn[1][1]);
      const isTop = i === n - 1;
      ctx.strokeStyle = isTop && p.grounding <= 0.1 ? PALETTE.cool : PALETTE.ember;
      ctx.lineWidth = isTop ? 2.2 : 1.3;
      ctx.stroke();
    }
    if (p.grounding <= 0.15) {
      // ceiling breach: ladder keeps going, unresolved
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = PALETTE.coolDim;
      ctx.beginPath(); ctx.moveTo(rails.left, rails.top); ctx.lineTo(rails.left, rails.top - 24);
      ctx.moveTo(rails.right, rails.top); ctx.lineTo(rails.right, rails.top - 24);
      ctx.stroke(); ctx.setLineDash([]);
    } else {
      // landing: a rung both parties can stand on
      drawDot(ctx, (rails.left + rails.right) / 2, rungY[rungY.length - 1], 3.4, PALETTE.parchment);
    }
  }

  function step(t) { drawStructure(t); }
  function renderProgress(fraction) { drawStructure(null, Math.max(1, Math.round(rungY.length * fraction))); }

  function mapTurns(turns) {
    const n = Array.isArray(turns) ? turns.length : turns;
    return sampleAlongPolyline(skeleton, n);
  }

  return { step, resize, setParam, renderProgress, mapTurns };
}
