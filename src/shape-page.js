// Field guide page: hero canvas with param sliders, scroll-linked specimen viewer.
import { createLoop, prefersReducedMotion } from './viz/engine.js';

async function main() {
  const article = document.querySelector('.body-content[data-shape-id]');
  if (!article) return;
  const shapeId = article.dataset.shapeId;
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const mod = await import(`./viz/shapes/${shapeId}.js`);
  const instance = mod.create(canvas.getContext('2d'), { seed: shapeId });

  const loop = createLoop(canvas, {
    step: (t) => instance.step(t),
    resize: (w, h) => instance.resize(w, h),
  });

  const readout = document.getElementById('variant-readout');
  const degenerateName = document.querySelector('.degenerate-name')?.textContent.replace('degenerates into: ', '') || 'the degenerate form';

  function updateVariantReadout() {
    const degenerateSlider = document.querySelector('input[type=range][data-degenerate-at]:not([data-degenerate-at=""])');
    if (!degenerateSlider || !readout) return;
    const val = Number(degenerateSlider.value);
    const target = Number(degenerateSlider.dataset.degenerateAt);
    const span = Number(degenerateSlider.max) - Number(degenerateSlider.min);
    const isDegenerate = Math.abs(val - target) <= span * 0.06;
    readout.textContent = isDegenerate ? `Currently: degenerate form — ${degenerateName}` : 'Currently: healthy form';
    readout.classList.toggle('degenerate', isDegenerate);
  }

  document.querySelectorAll('input[type=range][data-key]').forEach((input) => {
    const out = document.getElementById(`out-${input.dataset.key}`);
    input.addEventListener('input', () => {
      const val = Number(input.value);
      if (out) out.textContent = Number.isInteger(val) ? String(val) : val.toFixed(2);
      instance.setParam(input.dataset.key, val);
      updateVariantReadout();
      if (prefersReducedMotion()) instance.step(0);
    });
  });
  updateVariantReadout();
  loop.start();

  // ---- Scroll-linked specimen viewer ----
  const turnsWrap = document.getElementById('specimen-turns');
  const specimenSection = document.getElementById('specimen');
  const progressBar = document.getElementById('specimen-progress-bar');
  const playBtn = document.getElementById('specimen-play');
  if (!turnsWrap || !specimenSection) return;

  const turnEls = [...turnsWrap.querySelectorAll('.turn')];
  let specimenActive = false;
  let ticking = false;
  let playing = false;

  function setProgress(fraction) {
    const clamped = Math.max(0, Math.min(1, fraction));
    instance.renderProgress(clamped);
    if (progressBar) progressBar.style.width = `${clamped * 100}%`;
    const activeCount = Math.round(clamped * turnEls.length);
    turnEls.forEach((el, i) => el.classList.toggle('active', i < Math.max(activeCount, clamped > 0 ? 1 : 0)));
  }

  function onScroll() {
    if (ticking || playing) return;
    ticking = true;
    requestAnimationFrame(() => {
      const viewportCenter = window.innerHeight * 0.55;
      let activeIndex = -1;
      turnEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.top < viewportCenter) activeIndex = i;
      });
      if (activeIndex >= 0) setProgress((activeIndex + 1) / turnEls.length);
      ticking = false;
    });
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      specimenActive = entry.isIntersecting;
      if (specimenActive) { loop.stop(); onScroll(); }
      else if (!playing) loop.start();
    }
  }, { threshold: 0.05 });
  io.observe(specimenSection);

  window.addEventListener('scroll', onScroll, { passive: true });

  playBtn?.addEventListener('click', () => {
    if (playing) return;
    playing = true;
    loop.stop();
    const duration = prefersReducedMotion() ? 0 : 3200;
    const start = performance.now();
    function step(now) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setProgress(t);
      if (t < 1) requestAnimationFrame(step);
      else { playing = false; if (!specimenActive) loop.start(); }
    }
    requestAnimationFrame(step);
  });
}

main();
