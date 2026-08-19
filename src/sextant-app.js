// The Sextant — paste a transcript, get a local classification (Tier 1) with an
// optional BYO-key Anthropic second opinion (Tier 2).
import { parseTranscript } from './sextant/parser.js';
import { classify } from './sextant/heuristics.js';
import { PALETTE, drawDot, smoothPath } from './viz/engine.js';

async function main() {
  const textarea = document.getElementById('transcript-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  if (!textarea || !analyzeBtn) return;

  const samplePicker = document.getElementById('sample-picker');
  const tier2Enable = document.getElementById('tier2-enable');
  const tier2Inputs = document.getElementById('tier2-inputs');
  const apiKeyInput = document.getElementById('api-key-input');
  const modelInput = document.getElementById('model-input');
  const tierBadge = document.getElementById('tier-badge');
  const resultWrap = document.getElementById('sextant-result');
  const canvas = document.getElementById('sextant-canvas');
  const ctx = canvas.getContext('2d');

  const shapes = await (await fetch('/data/shapes.json')).json();

  for (const s of shapes) {
    const btn = document.createElement('button');
    btn.textContent = s.name;
    btn.addEventListener('click', () => {
      textarea.value = s.specimen.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n\n');
      runAnalysis();
    });
    samplePicker.appendChild(btn);
  }

  tier2Enable?.addEventListener('change', () => {
    tier2Inputs.hidden = !tier2Enable.checked;
  });

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  async function renderMap(turns, result) {
    const { w, h } = sizeCanvas();
    const mod = await import(`/src/viz/shapes/${result.primary.id}.js`);
    const instance = mod.create(ctx, { seed: result.primary.id });
    instance.resize(w, h);
    ctx.clearRect(0, 0, w, h);
    instance.renderProgress(1);
    const pts = instance.mapTurns(turns);
    const baseColor = result.primary.healthy ? PALETTE.ember : PALETTE.cool;
    // connect the mapped turns with a faint trajectory line so isolated dots read as a path,
    // even for shapes (like the Excavation) whose full renderProgress(1) collapses to one point.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PALETTE.parchmentDim;
    ctx.lineWidth = 1;
    smoothPath(ctx, pts);
    ctx.restore();
    pts.forEach((pt, i) => {
      const isLast = i === pts.length - 1;
      drawDot(ctx, pt[0], pt[1], isLast ? 5.5 : 2.6, isLast ? PALETTE.parchment : baseColor);
      if (isLast) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 10, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.parchmentDim;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = PALETTE.parchment;
        ctx.font = '11px monospace';
        ctx.fillText('you are here', pt[0] + 12, pt[1] - 8);
      }
    });
  }

  function renderCard(result) {
    document.getElementById('result-shape-name').textContent = result.primary.name;
    const variantEl = document.getElementById('result-variant');
    variantEl.textContent = result.primary.healthy ? 'healthy' : `degenerate — ${result.primary.degenerateName || ''}`;
    variantEl.className = `variant ${result.primary.healthy ? 'healthy' : 'degenerate'}`;
    document.getElementById('confidence-fill').style.width = `${Math.round((result.primary.confidence || 0) * 100)}%`;
    document.getElementById('result-runner-up').textContent = result.runnerUp
      ? `Runner-up: ${result.runnerUp.name}` : '';
    const evidenceList = document.getElementById('evidence-list');
    evidenceList.innerHTML = '';
    [...(result.primary.evidence || []), ...(result.primary.variantEvidence || [])].forEach((ev) => {
      const li = document.createElement('li');
      li.textContent = ev;
      evidenceList.appendChild(li);
    });
    document.getElementById('suggestion-box').textContent = result.suggestion;
    tierBadge.hidden = false;
    tierBadge.textContent = result.tier === 2 ? 'Tier 2 — Anthropic API' : 'Tier 1 — local heuristics';
    resultWrap.classList.add('visible');
  }

  async function runAnalysis() {
    const turns = parseTranscript(textarea.value);
    if (turns.length < 2) {
      alert('Could not find at least two turns in that transcript. Try the "Speaker: text" format, or paste a sample.');
      return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing…';
    try {
      const tier1 = classify(turns, shapes);
      let result = tier1;

      if (tier2Enable?.checked && apiKeyInput.value.trim()) {
        try {
          const { classifyWithLLM } = await import('./sextant/llm.js');
          result = await classifyWithLLM({
            apiKey: apiKeyInput.value.trim(),
            model: modelInput.value.trim() || 'claude-sonnet-5',
            turns, shapeMeta: shapes,
          });
        } catch (err) {
          console.warn('Tier 2 failed, falling back to Tier 1:', err);
          result = tier1;
          result.suggestion = `${result.suggestion} (Tier 2 request failed: ${err.message} — showing Tier 1 result.)`;
        }
      }

      renderCard(result);
      await renderMap(turns, result);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze';
    }
  }

  analyzeBtn.addEventListener('click', runAnalysis);
}

main();
