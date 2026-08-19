# Conversation Cartography

An interactive atlas of the *shapes* conversations take — a naturalist's field guide to
dialogue topology, plus a diagnostic tool that locates a live conversation within that
taxonomy.

Three layers:

- **The Atlas** (`/`) — a constellation of eight animated, explorable conversation shapes.
- **The Field Guide** (`/shapes/<id>/`) — for each shape: what produces it, its healthy and
  degenerate forms (reachable from each other by a single parameter), and an annotated
  specimen transcript.
- **The Sextant** (`/sextant/`) — paste a transcript; a local, fully-explainable heuristic
  classifier (Tier 1) locates it in the taxonomy, with an optional BYO-key Anthropic API
  second opinion (Tier 2).

Static site, no backend, no analytics, no accounts. See `DESIGN.md`-equivalent intent in
the original design document for the full rationale.

## Develop

```sh
node build.js      # content/shapes/*.md -> dist/
node scripts/serve.js   # serve dist/ at http://localhost:8080
```

There is no bundler and no npm dependency install step — `build.js` and `scripts/serve.js`
are plain Node using only built-in modules. Renderers and app code run as native ES modules
directly in the browser.

## Structure

```
content/shapes/*.md      content source: frontmatter + Signature/Genesis/Healthy & Degenerate/
                          Inside View/Transitions/Specimen sections
src/viz/engine.js         shared canvas engine: seeded RNG, tremor strokes, arc-length sampling
src/viz/shapes/<id>.js    one parametric renderer per shape (params/create/step/resize/
                          setParam/renderProgress/mapTurns contract)
src/atlas.js               Atlas page logic
src/shape-page.js          Field guide page logic (param sliders, scroll-linked specimen)
src/sextant-app.js         Sextant page logic
src/sextant/parser.js      transcript parsing (Speaker:, **Bold:**, blank-line fallback)
src/sextant/heuristics.js  Tier 1 local classifier
src/sextant/llm.js         Tier 2 BYO-key Anthropic classifier
build.js                   content/shapes/*.md -> dist/, with frontmatter/param validation
```

## Adding a shape

1. Write `content/shapes/<id>.md` with the required frontmatter and all six body sections.
2. Write `src/viz/shapes/<id>.js` exporting `params` and `create()` per the renderer contract.
3. `node build.js` validates that `viz_params` in the frontmatter and `params` in the
   renderer agree, and that every `transitions` target exists, before it will write `dist/`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/`
to GitHub Pages. Enable Pages for the repo with source "GitHub Actions".

## Fonts

`assets/fonts/` self-hosts EB Garamond and JetBrains Mono (SIL Open Font License 1.1) —
see `assets/fonts/OFL-NOTICE.txt`. No fonts are loaded from a CDN at runtime.
