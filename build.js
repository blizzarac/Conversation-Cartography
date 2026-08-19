#!/usr/bin/env node
// Build script: content/shapes/*.md -> dist/. No external dependencies —
// a small hand-written frontmatter/markdown parser tailored to this repo's content shape.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// GitHub Pages project sites are served under /<repo>/, not domain root — a plain "/src/..."
// reference 404s there. GITHUB_REPOSITORY (set by Actions) gives us the repo name to derive
// that prefix; BASE_PATH env var overrides it (e.g. for a custom domain at root); local
// `node build.js` + scripts/serve.js has neither set, so it falls back to "/" for dev.
const BASE_PATH = process.env.BASE_PATH
  || (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/');

function fail(msg) {
  console.error(`\n[build] ERROR: ${msg}\n`);
  process.exit(1);
}

// ---------- tiny YAML-subset frontmatter parser ----------
// Handles exactly the shapes used in content/shapes/*.md: scalars, quoted strings,
// inline bracket lists of bare words, and indented lists of single-line flow maps.
function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0, inQuote = false, cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"' ) inQuote = !inQuote;
    if (!inQuote) {
      if (c === '{' || c === '[') depth++;
      if (c === '}' || c === ']') depth--;
    }
    if (c === sep && depth === 0 && !inQuote) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseScalar(raw) {
  let v = raw.trim();
  if (/^".*"$/.test(v)) return v.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseFlowMap(inner) {
  const obj = {};
  for (const pair of splitTopLevel(inner, ',')) {
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    obj[key] = parseScalar(pair.slice(idx + 1));
  }
  return obj;
}

function parseFrontmatter(raw) {
  const lines = raw.split('\n');
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const [, key, rest] = m;
    if (rest.trim() === '') {
      // possible indented list follows
      const list = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*\{.*\}\s*$/.test(lines[j])) {
        const inner = lines[j].trim().replace(/^-\s*\{/, '').replace(/\}$/, '');
        list.push(parseFlowMap(inner));
        j++;
      }
      data[key] = list;
      i = j;
    } else if (/^\[.*\]$/.test(rest.trim())) {
      data[key] = rest.trim().slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      i++;
    } else {
      data[key] = parseScalar(rest);
      i++;
    }
  }
  return data;
}

// ---------- tiny markdown-subset -> HTML ----------
function inline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function mdToHtml(md) {
  const blocks = md.trim().split(/\n{2,}/).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith('- '))) {
      return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    }
    if (lines.every((l) => l.startsWith('>'))) {
      return `<blockquote><p>${lines.map((l) => inline(l.replace(/^>\s?/, ''))).join('<br>')}</p></blockquote>`;
    }
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('\n');
}

const SECTION_ORDER = ['Signature', 'Genesis', 'Healthy & Degenerate', 'Inside View', 'Transitions', 'Specimen'];

function splitSections(body) {
  const sections = {};
  const re = /^##\s+(.+)$/gm;
  let match; const marks = [];
  while ((match = re.exec(body))) marks.push({ name: match[1].trim(), index: match.index, len: match[0].length });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i].len;
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    sections[marks[i].name] = body.slice(start, end).trim();
  }
  return sections;
}

function parseSpecimen(raw) {
  const fenceMatch = raw.match(/```specimen\n([\s\S]*?)```/);
  const turns = [];
  if (fenceMatch) {
    for (const line of fenceMatch[1].split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (m) turns.push({ speaker: m[1], text: m[2] });
    }
  }
  const annotations = [];
  const annoRe = /^>\s*@turn\s+(\d+):\s*(.*)$/gm;
  let am;
  while ((am = annoRe.exec(raw))) annotations.push({ turn: Number(am[1]), note: am[2].trim() });
  return { turns, annotations };
}

// ---------- load + validate content ----------
async function loadShapes() {
  const dir = path.join(ROOT, 'content/shapes');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const shapes = [];
  for (const file of files) {
    const raw = readFileSync(path.join(dir, file), 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) fail(`${file}: missing frontmatter block`);
    const [, fmRaw, body] = fmMatch;
    const fm = parseFrontmatter(fmRaw);
    if (!fm.id) fail(`${file}: frontmatter missing 'id'`);
    const sections = splitSections(body);
    for (const need of SECTION_ORDER) {
      if (!(need in sections)) fail(`${file}: missing '## ${need}' section`);
    }
    const specimen = parseSpecimen(sections['Specimen']);
    if (specimen.turns.length < 4) fail(`${file}: specimen has fewer than 4 turns`);

    const sectionsHtml = {};
    for (const name of SECTION_ORDER) {
      if (name === 'Specimen') continue;
      sectionsHtml[name] = mdToHtml(sections[name]);
    }

    shapes.push({
      id: fm.id,
      name: fm.name,
      order: Number(fm.order) || 0,
      signature: fm.signature || '',
      degenerateName: fm.degenerate_name || '',
      transitions: fm.transitions || [],
      vizParams: fm.viz_params || [],
      palette: fm.palette || 'warm',
      sectionsHtml,
      specimen,
      sourceFile: file,
    });
  }
  shapes.sort((a, b) => a.order - b.order);
  return shapes;
}

async function validate(shapes) {
  const ids = new Set(shapes.map((s) => s.id));
  for (const s of shapes) {
    for (const target of s.transitions) {
      if (!ids.has(target)) fail(`${s.sourceFile}: transitions target '${target}' does not exist`);
    }
    const rendererPath = path.join(ROOT, 'src/viz/shapes', `${s.id}.js`);
    if (!existsSync(rendererPath)) fail(`${s.sourceFile}: no renderer at src/viz/shapes/${s.id}.js`);
    const mod = await import(pathToFileURL(rendererPath).href + `?t=${Date.now()}`);
    if (!Array.isArray(mod.params)) fail(`src/viz/shapes/${s.id}.js: must export 'params' array`);
    const rendererKeys = new Set(mod.params.map((p) => p.key));
    const contentKeys = new Set(s.vizParams.map((p) => p.key));
    for (const k of contentKeys) {
      if (!rendererKeys.has(k)) fail(`${s.sourceFile}: viz_params key '${k}' not consumed by src/viz/shapes/${s.id}.js`);
    }
    for (const k of rendererKeys) {
      if (!contentKeys.has(k)) fail(`src/viz/shapes/${s.id}.js: param '${k}' has no matching frontmatter viz_params entry in ${s.sourceFile}`);
    }
  }
  console.log(`[build] validated ${shapes.length} shapes, all transitions and viz_params consistent.`);
}

// ---------- page shell ----------
function pageShell({ title, description, activeNav, bodyHtml, headExtra = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${BASE_PATH}">
<title>${title} — Conversation Cartography</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="src/styles.css">
<link rel="icon" href="assets/favicon.png" type="image/png">
${headExtra}
</head>
<body class="${bodyClass}">
<header class="site-header">
  <a class="brand" href="./">Conversation Cartography</a>
  <nav>
    <a href="./" ${activeNav === 'atlas' ? 'aria-current="page"' : ''}>Atlas</a>
    <a href="sextant/" ${activeNav === 'sextant' ? 'aria-current="page"' : ''}>Sextant</a>
  </nav>
</header>
<main>
${bodyHtml}
</main>
<footer class="site-footer">
  A field guide to the shapes conversations take. No accounts, no analytics, no server.
</footer>
</body>
</html>`;
}

function shapePage(shape, shapes) {
  const idx = shapes.findIndex((s) => s.id === shape.id);
  const prev = shapes[(idx - 1 + shapes.length) % shapes.length];
  const next = shapes[(idx + 1) % shapes.length];
  const sliders = shape.vizParams.map((vp) => `
    <label class="param">
      ${vp.label} <output id="out-${vp.key}">${vp.default}</output>
      <input type="range" id="param-${vp.key}" min="${vp.min}" max="${vp.max}" step="${vp.step ?? 0.01}" value="${vp.default}" data-key="${vp.key}" data-degenerate-at="${vp.degenerate_at ?? ''}">
    </label>`).join('');

  const sectionsHtml = SECTION_ORDER.filter((n) => n !== 'Specimen').map((name) => `
    <section id="${name.toLowerCase().replace(/[^a-z]+/g, '-')}">
      <h2>${name}</h2>
      ${shape.sectionsHtml[name]}
    </section>`).join('\n');

  const transitionsList = shape.transitions.map((tId) => {
    const t = shapes.find((s) => s.id === tId);
    return `<li><a href="shapes/${tId}/">${t ? t.name : tId} →</a></li>`;
  }).join('');

  const turnsHtml = shape.specimen.turns.map((turn, i) => {
    const anno = shape.specimen.annotations.find((a) => a.turn === i + 1);
    return `<div class="turn" data-index="${i}">
      <div class="speaker">${turn.speaker}</div>
      <div class="text">${inline(turn.text)}${anno ? `<div class="annotation">${inline(anno.note)}</div>` : ''}</div>
    </div>`;
  }).join('\n');

  const bodyHtml = `
<article class="body-content" data-shape-id="${shape.id}">
  <div class="shape-title">
    <h1>${shape.name}</h1>
    <span class="degenerate-name">degenerates into: ${shape.degenerateName}</span>
  </div>
  <p class="shape-signature">${shape.signature}</p>

  <div class="shape-hero">
    <canvas id="hero-canvas" aria-label="Animated diagram of ${shape.name}" role="img"></canvas>
    <div class="param-panel">
      <p class="mono" style="font-size:0.8rem;color:var(--parchment-faint)">Adjust the parameters below — at the marked value, this shape becomes its degenerate form.</p>
      ${sliders}
      <p class="param-readout" id="variant-readout">Currently: healthy form</p>
    </div>
  </div>

  ${sectionsHtml}

  <section id="specimen">
    <h2>Specimen</h2>
    <p style="color:var(--parchment-faint);font-size:0.85rem">Scroll through the annotated transcript below — the hero canvas above draws the shape in sync.</p>
    <div class="specimen-controls">
      <button id="specimen-play">▶ Play</button>
      <div class="specimen-progress"><span id="specimen-progress-bar"></span></div>
    </div>
    <div class="turns" id="specimen-turns">
      ${turnsHtml}
    </div>
  </section>

  <section id="transitions-graph">
    <h2>Transitions</h2>
    <ul class="transitions-list">${transitionsList}</ul>
  </section>

  <nav class="shape-nav">
    <a href="shapes/${prev.id}/"><span class="label">← Previous</span>${prev.name}</a>
    <a href="shapes/${next.id}/"><span class="label">Next →</span>${next.name}</a>
  </nav>
</article>`;

  return pageShell({
    title: shape.name,
    description: shape.signature,
    activeNav: 'guide',
    bodyHtml,
    headExtra: `<script type="module" src="src/shape-page.js"></script>`,
  });
}

function atlasPage(shapes) {
  const noscriptList = shapes.map((s) => `
    <li>
      <a href="shapes/${s.id}/">${s.name}</a>
      <div class="sig">${s.signature}</div>
    </li>`).join('');

  const bodyHtml = `
<section class="atlas-intro">
  <h1>An Atlas of Conversation Shapes</h1>
  <p>Every conversation has a structure independent of its content. This is a field guide to the shapes it can take —
  and, in the <a href="sextant/">Sextant</a>, a way to locate a live conversation within them.</p>
</section>

<div class="atlas-canvas-wrap">
  <canvas id="atlas-canvas" role="img" aria-label="An animated constellation of eight conversation-shape figures. Use the list below to navigate with a keyboard or screen reader."></canvas>
  <div class="atlas-tooltip" id="atlas-tooltip"><span class="name"></span><span class="sig"></span></div>
</div>
<div class="atlas-controls">
  <button id="toggle-transitions" aria-pressed="false">Show transitions</button>
</div>
<p class="atlas-caption">Hover or focus a figure for its name. Click to open its field guide entry.</p>

<noscript>
  <style>.atlas-canvas-wrap, .atlas-controls, .atlas-caption { display: none; }</style>
  <ul class="noscript-list">${noscriptList}</ul>
</noscript>
`;

  return pageShell({
    title: 'Atlas',
    description: 'A naturalist\'s field guide to the shapes conversations take.',
    activeNav: 'atlas',
    bodyHtml,
    headExtra: `<script type="module" src="src/atlas.js"></script>`,
  });
}

function sextantPage() {
  const bodyHtml = `
<section class="sextant-intro">
  <h1>The Sextant</h1>
  <p>Paste a transcript below. The local heuristic classifier (Tier 1) runs entirely in your browser and always
  produces a result, with its evidence shown alongside it. An optional Tier 2 can hand the transcript to Anthropic's
  API under your own key for a second opinion.</p>
</section>

<div class="sextant-grid">
  <div class="sextant-input">
    <label class="param" for="transcript-input">Transcript</label>
    <textarea id="transcript-input" placeholder="Alice: ...&#10;Bob: ...&#10;&#10;or **Human:** / **Assistant:** style, or blank-line-separated alternating blocks."></textarea>
    <p class="mono" style="font-size:0.8rem;color:var(--parchment-faint)">Try a specimen instead:</p>
    <div class="sample-picker" id="sample-picker"></div>

    <div class="key-panel">
      <label style="display:flex;align-items:center;gap:0.4em;font-size:0.85rem;color:var(--parchment-dim)">
        <input type="checkbox" id="tier2-enable"> Use Tier 2 (Anthropic API, your key)
      </label>
    </div>
    <div class="key-panel" id="tier2-inputs" hidden>
      <input type="password" id="api-key-input" placeholder="sk-ant-... (kept in memory only, never stored)" autocomplete="off">
      <input type="text" id="model-input" placeholder="claude-sonnet-5" value="claude-sonnet-5">
    </div>

    <div class="atlas-controls" style="justify-content:flex-start;padding-top:0.5rem;">
      <button id="analyze-btn">Analyze</button>
      <span class="tier-badge" id="tier-badge" hidden></span>
    </div>
  </div>

  <div class="sextant-result" id="sextant-result">
    <canvas id="sextant-canvas" role="img" aria-label="The classified shape with this transcript's turns mapped onto it"></canvas>
    <div class="classification-card">
      <div>
        <span class="shape-name" id="result-shape-name"></span>
        <span class="variant" id="result-variant"></span>
      </div>
      <div class="confidence-bar"><span id="confidence-fill"></span></div>
      <p class="runner-up" id="result-runner-up"></p>
      <h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--parchment-faint);margin-top:1.5rem">Evidence</h3>
      <ul class="evidence-list" id="evidence-list"></ul>
      <div class="suggestion-box" id="suggestion-box"></div>
    </div>
  </div>
</div>

<p class="privacy-note">
  <strong>Privacy.</strong> Tier 1 (the local heuristic classifier) processes everything in your browser — nothing is
  transmitted anywhere. Tier 2, if you opt in, sends the pasted transcript to Anthropic's API directly from your
  browser using the key you supply; that key is held in memory for this page load only and is never written to
  localStorage, a cookie, or any server we control. No other transmission of any kind happens on this site.
</p>
`;

  return pageShell({
    title: 'Sextant',
    description: 'Paste a transcript; find out which shape of conversation you\'re in.',
    activeNav: 'sextant',
    bodyHtml,
    headExtra: `<script type="module" src="src/sextant-app.js"></script>`,
  });
}

function notFoundPage() {
  return pageShell({
    title: 'Not Found',
    description: 'Page not found.',
    activeNav: '',
    bodyHtml: `<h1>Not found</h1><p>That page doesn't exist. <a href="./">Return to the Atlas</a>.</p>`,
  });
}

function copyStatic() {
  mkdirSync(DIST, { recursive: true });
  cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  cpSync(path.join(ROOT, 'src'), path.join(DIST, 'src'), { recursive: true });
}

async function build() {
  console.log('[build] cleaning dist/');
  rmSync(DIST, { recursive: true, force: true });

  console.log('[build] loading content/shapes/*.md');
  const shapes = await loadShapes();
  await validate(shapes);

  copyStatic();

  mkdirSync(path.join(DIST, 'data'), { recursive: true });
  const manifest = shapes.map((s) => ({
    id: s.id, name: s.name, order: s.order, signature: s.signature,
    degenerateName: s.degenerateName, transitions: s.transitions,
    vizParams: s.vizParams, palette: s.palette,
    specimen: s.specimen,
  }));
  writeFileSync(path.join(DIST, 'data/shapes.json'), JSON.stringify(manifest, null, 2));
  console.log('[build] wrote dist/data/shapes.json');

  writeFileSync(path.join(DIST, 'index.html'), atlasPage(shapes));
  console.log('[build] wrote dist/index.html (Atlas)');

  mkdirSync(path.join(DIST, 'sextant'), { recursive: true });
  writeFileSync(path.join(DIST, 'sextant/index.html'), sextantPage());
  writeFileSync(path.join(DIST, '404.html'), notFoundPage());
  console.log('[build] wrote dist/sextant/index.html and dist/404.html');

  for (const shape of shapes) {
    const dir = path.join(DIST, 'shapes', shape.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), shapePage(shape, shapes));
  }
  console.log(`[build] wrote ${shapes.length} field guide pages`);
  console.log('[build] done -> dist/');
}

build().catch((err) => { console.error(err); process.exit(1); });
