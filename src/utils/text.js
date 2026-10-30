// Small string helpers shared by the parser, validator and engine.

/** Lower-cases and strips everything except letters and digits: "AI / ML" -> "aiml". */
export function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Splits a multi-value cell. Semicolons and pipes are preferred separators; commas are
 * only used when no other separator is present (a quoted CSV cell can contain commas).
 */
export function splitList(value) {
  const text = String(value ?? '').trim();
  if (!text || /^(none|nil|na|n\/a|-|null)$/i.test(text)) return [];
  const separator = /[;|]/.test(text) ? /[;|]/ : /,/;
  const seen = new Set();
  const out = [];
  for (const part of text.split(separator)) {
    const item = part.trim();
    const key = normalizeKey(item);
    if (!item || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function listToSentence(items, conj = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

export function plural(n, word, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

/** n choose k as a float (only used for reporting search-space sizes). */
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
