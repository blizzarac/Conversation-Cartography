// Tier 2 — optional, opt-in classifier via the user's own Anthropic API key.
// The key is passed in per-call and never persisted (no localStorage, no cookies).

const API_URL = 'https://api.anthropic.com/v1/messages';

function buildSystemPrompt(shapeMeta) {
  const taxonomy = shapeMeta.map((s) =>
    `- ${s.id} ("${s.name}", degenerate form: "${s.degenerateName}"): ${s.signature}`
  ).join('\n');
  return `You classify the structural SHAPE of a conversation transcript against a fixed taxonomy of 8 shapes. ` +
    `You are judging structure, not content quality or correctness.\n\nTaxonomy:\n${taxonomy}\n\n` +
    `Pick exactly one primary shape id from the taxonomy above, judge whether this instance is the healthy form ` +
    `or has slid into its named degenerate form, cite specific turn numbers (1-indexed) as evidence, and give one ` +
    `concrete suggested move to shift the trajectory if it is degenerate (or say none is needed if healthy).`;
}

function transcriptToText(turns) {
  return turns.map((t, i) => `[${i + 1}] ${t.speaker}: ${t.text}`).join('\n');
}

const TOOL_SCHEMA = {
  name: 'classify_conversation',
  description: 'Report the structural classification of a conversation transcript.',
  input_schema: {
    type: 'object',
    properties: {
      shape: { type: 'string', enum: ['spiral', 'delta', 'switchback', 'ladder', 'excavation', 'relay', 'cul_de_sac', 'constellation'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      variant: { type: 'string', enum: ['healthy', 'degenerate'] },
      runner_up_shape: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' }, description: 'Short evidence statements, each citing a turn number' },
      suggestion: { type: 'string' },
    },
    required: ['shape', 'confidence', 'variant', 'evidence', 'suggestion'],
  },
};

export async function classifyWithLLM({ apiKey, model, turns, shapeMeta }) {
  if (!apiKey) throw new Error('No API key supplied.');
  const body = {
    model: model || 'claude-sonnet-5',
    max_tokens: 1024,
    system: buildSystemPrompt(shapeMeta),
    messages: [{ role: 'user', content: transcriptToText(turns) }],
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'classify_conversation' },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
  if (!toolUse) throw new Error('No structured classification returned.');
  const out = toolUse.input;

  const meta = shapeMeta.find((s) => s.id === out.shape);
  const runnerUpMeta = shapeMeta.find((s) => s.id === out.runner_up_shape);

  return {
    tier: 2,
    primary: {
      id: out.shape, name: meta?.name || out.shape, confidence: out.confidence,
      healthy: out.variant === 'healthy', degenerateName: meta?.degenerateName,
      evidence: out.evidence, variantEvidence: [],
    },
    runnerUp: runnerUpMeta ? { id: runnerUpMeta.id, name: runnerUpMeta.name, score: null } : null,
    suggestion: out.suggestion,
  };
}
