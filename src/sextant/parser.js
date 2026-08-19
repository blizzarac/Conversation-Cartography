// Transcript parser — accepts "Speaker: text" lines, **Bold:** markdown chat exports,
// or falls back to blank-line-separated alternating blocks.

function parseBoldFormat(text) {
  const lines = text.split('\n');
  const turns = [];
  const re = /^\*\*([^*]{1,40}?):?\*\*\s*(.*)$/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      turns.push({ speaker: m[1].trim(), text: m[2].trim() });
    } else if (turns.length && line.trim()) {
      turns[turns.length - 1].text += ' ' + line.trim();
    }
  }
  return turns.filter((t) => t.text);
}

function parseLabelFormat(text) {
  const lines = text.split('\n');
  const re = /^([A-Za-z][A-Za-z0-9 _'-]{0,29}):\s+(.+)$/;
  const turns = [];
  let matched = 0, nonBlank = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    nonBlank++;
    const m = line.match(re);
    if (m) {
      matched++;
      turns.push({ speaker: m[1].trim(), text: m[2].trim() });
    } else if (turns.length) {
      turns[turns.length - 1].text += ' ' + line.trim();
    }
  }
  const labels = new Set(turns.map((t) => t.speaker));
  if (nonBlank === 0 || matched / nonBlank < 0.5 || labels.size < 2 || labels.size > 8) return [];
  return turns;
}

function parseBlankLineFormat(text) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => ({ speaker: i % 2 === 0 ? 'A' : 'B', text: block.replace(/\n/g, ' ') }));
}

export function parseTranscript(raw) {
  const text = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const bold = parseBoldFormat(text);
  if (bold.length >= 2) return bold;
  const labeled = parseLabelFormat(text);
  if (labeled.length >= 2) return labeled;
  return parseBlankLineFormat(text);
}
