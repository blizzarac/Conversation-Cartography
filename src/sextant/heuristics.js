// Tier 1 classifier — fully local, turn-level lexical features and hand-written rules
// mapping feature patterns to shapes. Explainability over correctness: every result
// carries the evidence that produced it.

const STOPWORDS = new Set('a an the this that these those is are was were be been being to of in on for and or but if then so as it its it\'s i you we they he she not no yes do does did just really very can could should would will with at by from about into over under again also'.split(' '));

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => !STOPWORDS.has(w) && w.length > 1);
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function cosine(tfA, tfB) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of tfA) { na += v * v; if (tfB.has(k)) dot += v * tfB.get(k); }
  for (const [, v] of tfB) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function countMarkers(text, markers) {
  const low = text.toLowerCase();
  return markers.reduce((n, m) => n + (low.includes(m) ? 1 : 0), 0);
}

function findTurnsWithMarkers(turns, markers) {
  return turns.map((t, i) => ({ i, hit: countMarkers(t.text, markers) > 0 })).filter((x) => x.hit).map((x) => x.i);
}

const MARKERS = {
  concession: ['agreed', 'fine, but', 'only if', "that works", 'fair enough', 'i can accept', 'good compromise', "i can commit"],
  pruning: ['parking', "not doing", 'closing that', 'deferred', "let's park", 'out of scope', 'separate project'],
  branching: ['also,', 'separately', 'another thing', 'by the way', 'unrelated', 'one more thing', 'different question'],
  reframe: ['actually,', 'the real', "what's really", 'i guess', 'honestly', 'the actual'],
  concrete: ["let's", 'remove', 'add', 'ship', 'change', 'fix', 'implement', 'delete', 'specific'],
  deadEnd: ["doesn't work", "won't work", 'dead end', 'defeats the purpose', "that fails", 'no better than'],
  retreat: ['back to', "let's back out", 'instead', 'go back', 'the fork', 'alternate branch'],
  artifact: ['draft', 'updated', 'revised', 'added', 'version', 'spec', 'the copy', 'revision'],
  resolution: ['ship it', 'sign-off', 'sounds good', 'good to go', 'ready', 'resolved', "let's spec that"],
  naming: ["that's not", 'one thing', 'common thread', 'actually all', 'the same thing', 'not four things', "so the fix"],
};

export function extractFeatures(turns) {
  const tfs = turns.map((t) => termFreq(tokenize(t.text)));
  const lengths = turns.map((t) => tokenize(t.text).length);
  const novelty = turns.map((t, i) => {
    if (i === 0) return 1;
    const union = new Map();
    for (let j = 0; j < i; j++) for (const [k, v] of tfs[j]) union.set(k, (union.get(k) || 0) + v);
    const cur = tfs[i];
    if (cur.size === 0) return 0;
    let novel = 0;
    for (const k of cur.keys()) if (!union.has(k)) novel++;
    return novel / cur.size;
  });
  const drift = turns.map((t, i) => (i === 0 ? 1 : 1 - cosine(tfs[i - 1], tfs[i])));
  const questionDensity = turns.map((t) => {
    const sentences = Math.max(1, (t.text.match(/[.!?]+/g) || []).length);
    const qs = (t.text.match(/\?/g) || []).length;
    return qs / sentences;
  });
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  const bySpeaker = speakers.map((s) => lengths.filter((_, i) => turns[i].speaker === s));
  const meanLen = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const speakerMeans = bySpeaker.map(meanLen);
  const speakerAsymmetry = speakerMeans.length > 1
    ? (Math.max(...speakerMeans) - Math.min(...speakerMeans)) / (Math.max(...speakerMeans) || 1) : 0;

  return { tfs, lengths, novelty, drift, questionDensity, speakers, speakerAsymmetry };
}

function keywordOverlapEarlyLate(turns, tfs) {
  const half = Math.floor(turns.length / 2) || 1;
  const early = new Map(), late = new Map();
  for (let i = 0; i < half; i++) for (const [k, v] of tfs[i]) early.set(k, (early.get(k) || 0) + v);
  for (let i = half; i < turns.length; i++) for (const [k, v] of tfs[i]) late.set(k, (late.get(k) || 0) + v);
  return cosine(early, late);
}

function scoreSpiral(turns, f) {
  // recurring keyword(s) revisited with rising novelty each time = depth accrual
  const midNovelty = f.novelty.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, f.novelty.length - 1);
  const topicStability = keywordOverlapEarlyLate(turns, f.tfs);
  const score = topicStability * 0.6 + Math.min(1, midNovelty * 1.3) * 0.4;
  const evidence = [`Early/late keyword overlap: ${(topicStability * 100).toFixed(0)}% (same topic held throughout)`,
    `Average per-turn novelty after the opener: ${(midNovelty * 100).toFixed(0)}%`];
  const healthy = midNovelty > 0.32;
  return { score, evidence, healthy,
    variantEvidence: healthy
      ? [`Novelty stays above ~30% turn to turn — each pass is adding something, not just restating it.`]
      : [`Novelty on repeated passes drops near ${(midNovelty * 100).toFixed(0)}% — turns revisit the topic without adding new content (Loop risk).`] };
}

function scoreDelta(turns, f) {
  const branchDensity = turns.filter((t) => countMarkers(t.text, MARKERS.branching) > 0).length / turns.length;
  const driftVar = f.drift.reduce((a, b) => a + b, 0) / turns.length;
  const score = branchDensity * 0.5 + Math.min(1, driftVar * 1.2) * 0.5;
  const pruneTurns = findTurnsWithMarkers(turns, MARKERS.pruning);
  const evidence = [`Branch-opening language ("also", "separately", "another thing") in ${(branchDensity * 100).toFixed(0)}% of turns`,
    `Average topic drift between consecutive turns: ${(driftVar * 100).toFixed(0)}%`];
  const healthy = pruneTurns.length > 0;
  return { score, evidence, healthy,
    variantEvidence: healthy
      ? [`Pruning language found at turn${pruneTurns.length > 1 ? 's' : ''} ${pruneTurns.map((i) => i + 1).join(', ')} — branches are being explicitly closed.`]
      : [`No pruning language ("parking", "closing that", "deferred") found — branches accumulate without resolution (Sprawl risk).`] };
}

function scoreSwitchback(turns, f) {
  if (f.speakers.length !== 2) return { score: 0, evidence: ['Requires exactly two speakers'], healthy: true, variantEvidence: [] };
  const alternation = turns.every((t, i) => i === 0 || t.speaker !== turns[i - 1].speaker) ? 1 : 0.4;
  const concessionTurns = findTurnsWithMarkers(turns, MARKERS.concession);
  const half = Math.floor(turns.length / 2);
  const concessionSecondHalf = concessionTurns.filter((i) => i >= half).length;
  const score = alternation * 0.5 + Math.min(1, concessionTurns.length / Math.max(2, turns.length * 0.3)) * 0.5;
  const evidence = [`Speaker alternation regularity: ${alternation === 1 ? 'strict' : 'loose'}`,
    `Concession language ("agreed", "fine, but", "only if") in ${concessionTurns.length} of ${turns.length} turns`];
  const healthy = concessionSecondHalf >= concessionTurns.length - concessionSecondHalf;
  return { score, evidence, healthy,
    variantEvidence: healthy
      ? [`Concessions cluster in the second half (turns ${concessionTurns.filter((i) => i >= half).map((i) => i + 1).join(', ') || '—'}) — the gap is narrowing.`]
      : [`Concessions don't increase toward the end — positions may be restating rather than converging (Trench risk).`] };
}

function scoreLadder(turns, f) {
  const avgWordLenTrend = [];
  for (const t of turns) {
    const words = tokenize(t.text);
    avgWordLenTrend.push(words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0);
  }
  let rising = 0;
  for (let i = 1; i < avgWordLenTrend.length; i++) if (avgWordLenTrend[i] >= avgWordLenTrend[i - 1] - 0.3) rising++;
  const monotonic = rising / Math.max(1, avgWordLenTrend.length - 1);
  const branchDensity = turns.filter((t) => countMarkers(t.text, MARKERS.branching) > 0).length / turns.length;
  const score = monotonic * 0.6 + (1 - branchDensity) * 0.4;
  const lastConcrete = countMarkers(turns[turns.length - 1]?.text || '', MARKERS.concrete) > 0;
  const evidence = [`Abstraction (avg. word length) trends upward in ${(monotonic * 100).toFixed(0)}% of turn-to-turn steps`,
    `Single-thread (branch language in only ${(branchDensity * 100).toFixed(0)}% of turns)`];
  return { score, evidence, healthy: lastConcrete,
    variantEvidence: lastConcrete
      ? [`The final turn contains concrete/action language — the climb lands on an actionable rung.`]
      : [`The final turn stays abstract with no concrete action named — the ladder may be a Tower.`] };
}

function scoreExcavation(turns, f) {
  const reframeTurns = findTurnsWithMarkers(turns, MARKERS.reframe);
  if (!reframeTurns.length) return { score: 0.05, evidence: ['No reframing language ("actually,", "the real", "honestly") found'], healthy: true, variantEvidence: [] };
  const reframeIdx = reframeTurns[0];
  const postDrift = f.drift.slice(reframeIdx + 1).reduce((a, b) => a + b, 0) / Math.max(1, turns.length - reframeIdx - 1);
  const score = 0.5 + Math.min(0.5, postDrift);
  const turnsAfter = turns.length - reframeIdx - 1;
  const evidence = [`Reframing language found at turn ${reframeIdx + 1}`,
    `Topic drift after the reframe: ${(postDrift * 100).toFixed(0)}%`];
  const healthy = turnsAfter >= 2 && postDrift > 0.25;
  return { score, evidence, healthy,
    variantEvidence: healthy
      ? [`${turnsAfter} turns follow the reframe and clearly address the new topic — the real question got reached.`]
      : [`Only ${turnsAfter} turn(s) follow the reframe with little topic change — the surface question may have been answered instead (False Floor risk).`] };
}

function scoreRelay(turns, f) {
  const artifactDensity = turns.filter((t) => countMarkers(t.text, MARKERS.artifact) > 0).length / turns.length;
  const score = artifactDensity;
  const resolved = countMarkers(turns[turns.length - 1]?.text || '', MARKERS.resolution) > 0;
  const evidence = [`Artifact/revision language ("draft", "updated", "version") in ${(artifactDensity * 100).toFixed(0)}% of turns`];
  return { score, evidence, healthy: resolved,
    variantEvidence: resolved
      ? [`The final turn signals sign-off ("ship it", "sounds good") — the artifact converged.`]
      : [`No sign-off language in the final turn — check whether edits are still oscillating (Ping-Pong risk).`] };
}

function scoreCulDeSac(turns, f) {
  const deadEndTurns = findTurnsWithMarkers(turns, MARKERS.deadEnd);
  if (!deadEndTurns.length) return { score: 0.05, evidence: ['No dead-end language found'], healthy: true, variantEvidence: [] };
  const deadEndIdx = deadEndTurns[0];
  const retreatAfter = findTurnsWithMarkers(turns.slice(deadEndIdx), MARKERS.retreat).length > 0;
  const score = 0.75;
  const evidence = [`Dead-end language ("doesn't work", "dead end") found at turn ${deadEndIdx + 1}`];
  return { score, evidence, healthy: retreatAfter,
    variantEvidence: retreatAfter
      ? [`Retreat language ("back to", "instead", "the fork") follows the dead end — the path was backed out of cleanly.`]
      : [`No retreat language follows the dead end — the path may be getting walked again anyway (Sunk Cost risk).`] };
}

function scoreConstellation(turns, f) {
  const earlyDrift = f.drift.slice(0, Math.ceil(turns.length / 2)).reduce((a, b) => a + b, 0) / Math.max(1, Math.ceil(turns.length / 2));
  const namingTurns = findTurnsWithMarkers(turns, MARKERS.naming);
  const score = Math.min(1, earlyDrift * 1.1) * 0.6 + (namingTurns.length ? 0.4 : 0);
  const evidence = [`Topic drift across the first half: ${(earlyDrift * 100).toFixed(0)}% (high = apparently unrelated topics)`,
    namingTurns.length ? `Naming language found at turn ${namingTurns[0] + 1}` : 'No naming/synthesis language found'];
  const healthy = namingTurns.length > 0;
  return { score, evidence, healthy,
    variantEvidence: healthy
      ? [`A connecting theme gets named at turn ${namingTurns[0] + 1} — the constellation resolves.`]
      : [`Topics stay high-drift with no naming turn — they may never connect (Scatter risk).`] };
}

const SCORERS = {
  spiral: scoreSpiral, delta: scoreDelta, switchback: scoreSwitchback, ladder: scoreLadder,
  excavation: scoreExcavation, relay: scoreRelay, cul_de_sac: scoreCulDeSac, constellation: scoreConstellation,
};

export function classify(turns, shapeMeta) {
  if (turns.length < 2) {
    return { primary: null, error: 'Need at least two turns to classify a shape.' };
  }
  const f = extractFeatures(turns);
  const results = Object.entries(SCORERS).map(([id, fn]) => ({ id, ...fn(turns, f) }));
  results.sort((a, b) => b.score - a.score);
  const [top, second] = results;
  const total = top.score + (second?.score || 0) || 1;
  const confidence = Math.max(0.15, Math.min(0.95, top.score / total));

  const meta = shapeMeta.find((s) => s.id === top.id);
  const suggestion = healthySuggestion(top.id, top.healthy, meta);

  return {
    tier: 1,
    primary: { id: top.id, name: meta?.name || top.id, confidence, healthy: top.healthy,
      degenerateName: meta?.degenerateName, evidence: top.evidence, variantEvidence: top.variantEvidence },
    runnerUp: second ? { id: second.id, name: shapeMeta.find((s) => s.id === second.id)?.name || second.id, score: second.score } : null,
    suggestion,
    features: f,
  };
}

function healthySuggestion(id, healthy, meta) {
  if (healthy) return `This reads as a healthy ${meta?.name || id}. No corrective move needed — keep doing what's working.`;
  const moves = {
    spiral: 'Name explicitly what this pass knows that the last pass didn\'t — if you can\'t, treat it as a signal to change the question, not repeat it.',
    delta: 'Pick one open branch and close it — either resolve it or say out loud that it\'s being deferred.',
    switchback: 'State a boundary you would actually accept, not just one the other side must accept.',
    ladder: 'Convert the current level of abstraction into one concrete action before climbing further.',
    excavation: 'Ask directly whether the answer just given addresses the original worry, or only the original words.',
    relay: 'Diff the current version against two revisions ago — if they match, stop editing and name the actual disagreement.',
    cul_de_sac: 'Say out loud that the current path doesn\'t work, and name the fork you\'re retreating to.',
    constellation: 'Try naming a one-sentence theme that would make the last few topics make sense together.',
  };
  return moves[id] || 'Name the pattern explicitly — naming it is usually enough to change it.';
}
