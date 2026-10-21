/**
 * Offline, catalog-only OCR title matching. No photo IDs, layouts or card-specific
 * exceptions belong here. OCR confidence is checked by the caller.
 */
export const MATCHER_POLICY = Object.freeze({
  minSimilarity: 0.85,
  minMargin: 0.05,
  minNameChars: 5,
  minExactNameChars: 4,
  maxTrailingManaWords: 3,
  spatialOverlap: 0.35,
});

export function normalizeCardName(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

// A banded Levenshtein calculation: distances over limit cannot affect either
// acceptance or the runner-up margin. Unlike prefix/first-letter filters this
// does not omit a valid competing title.
function boundedDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = new Int32Array(b.length + 1);
  let current = new Int32Array(b.length + 1);
  previous.fill(limit + 1);
  for (let j = 0; j <= Math.min(b.length, limit); j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    current.fill(limit + 1);
    current[0] = i <= limit ? i : limit + 1;
    const start = Math.max(1, i - limit), end = Math.min(b.length, i + limit);
    let rowMin = limit + 1;
    for (let j = start; j <= end; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > limit) return limit + 1;
    [previous, current] = [current, previous];
  }
  return previous[b.length];
}

// Strip only unmistakable mana notation, never an arbitrary final word from
// rules text. Bare letters must be uppercase; brackets may surround symbols.
function isManaSuffix(words) {
  if (!words.length || words.length > MATCHER_POLICY.maxTrailingManaWords) return false;
  return words.every(word => {
    if (/^(?:\{(?:\d+|[WUBRGCXYZSP]|[WUBRGC2]\/[WUBRGCP])\})+$/.test(word)) return true;
    return /^(?:[0-9WUBRGCXYZSP]+|[WUBRGC2]\/[WUBRGCP])$/.test(word) && word.length <= 12;
  });
}

function hasUnstrippedWords(query, entry) {
  const words = query.trim().split(/\s+/);
  // Full words following a complete title are not OCR character mistakes.
  // This is a rejection-only guard, not prefix matching or rules-text parsing.
  for (let length = words.length - 1; length >= 1; length--) {
    if (normalizeCardName(words.slice(0, length).join(' ')) === entry.n) {
      return !isManaSuffix(words.slice(length));
    }
  }
  return false;
}

/**
 * Returns a memoized function taking a complete OCR text line. DFC/split face
 * aliases resolve to the catalog's complete name, not a separate invented card.
 * Ambiguity is measured across distinct canonical identities, not face aliases.
 */
export function createCatalogMatcher(names) {
  if (!Array.isArray(names)) throw new TypeError('Card names must be an array.');
  const byLength = new Map(), exact = new Map(), memo = new Map();
  const canonicalNames = [...new Set(names.filter(name => typeof name === 'string' && name.trim()))];
  for (const name of canonicalNames) {
    const aliases = [...new Set([name, ...name.split(/\s*\/\/\s*/)].map(x => x.trim()).filter(Boolean))];
    const normalizedAliases = new Set();
    for (const alias of aliases) {
      const n = normalizeCardName(alias);
      if (!n || normalizedAliases.has(n)) continue;
      normalizedAliases.add(n);
      const entry = Object.freeze({ name, n, alias, isFaceAlias: alias !== name });
      if (!exact.has(n)) exact.set(n, []);
      exact.get(n).push(entry);
      if (!byLength.has(n.length)) byLength.set(n.length, []);
      byLength.get(n.length).push(entry);
    }
  }

  function match(query) {
    const n = normalizeCardName(query);
    if (n.length < MATCHER_POLICY.minExactNameChars) return null;
    const exactEntries = exact.get(n) || [];
    // Preserve literal disambiguation for punctuation-normalization collisions.
    // An actual full catalog title takes precedence over an alias collision.
    const literal = exactEntries.filter(e => e.name.toLowerCase() === query.trim().toLowerCase());
    if (literal.length === 1) return { ...literal[0], similarity: 1, margin: 1, query };
    const literalAliases = exactEntries.filter(e => e.alias.toLowerCase() === query.trim().toLowerCase());
    if (literalAliases.length === 1) return { ...literalAliases[0], similarity: 1, margin: 1, query };
    if (exactEntries.length === 1) return { ...exactEntries[0], similarity: 1, margin: 1, query };
    if (exactEntries.length > 1 || n.length < MATCHER_POLICY.minNameChars) return null;

    // With acceptance >= .85 and margin >= .05, a runner-up below .80 can
    // never change acceptance. Enumerate the complete relevant length range.
    const floor = MATCHER_POLICY.minSimilarity - MATCHER_POLICY.minMargin;
    const minLength = Math.ceil(n.length * floor - 1e-10);
    const maxLength = Math.floor(n.length / floor + 1e-10);
    const candidates = new Map();
    for (let length = minLength; length <= maxLength; length++) {
      const maxDistance = Math.floor((1 - floor) * Math.max(n.length, length) + 1e-10);
      for (const entry of byLength.get(length) || []) {
        // Four-character titles are deliberately exact-only, including when
        // a longer OCR string would otherwise be a close fuzzy candidate.
        if (entry.n.length < MATCHER_POLICY.minNameChars) continue;
        const distance = boundedDistance(n, entry.n, maxDistance);
        if (distance > maxDistance) continue;
        const similarity = 1 - distance / Math.max(n.length, length);
        const prior = candidates.get(entry.name);
        if (!prior || similarity > prior.similarity) candidates.set(entry.name, { ...entry, similarity });
      }
    }
    const ranked = [...candidates.values()].sort((a, b) => b.similarity - a.similarity || a.name.localeCompare(b.name));
    const best = ranked[0];
    if (!best || best.similarity < MATCHER_POLICY.minSimilarity) return null;
    // Keep competitors even when the line-content guard would reject them:
    // removing a competitor must never manufacture an unambiguous winner.
    // If no relevant runner-up exists, report a conservative lower bound,
    // rather than pretending the unexplored (< .80) competitors have score 0.
    const margin = best.similarity - (ranked[1]?.similarity ?? floor);
    if (margin + 1e-10 < MATCHER_POLICY.minMargin || hasUnstrippedWords(query, best)) return null;
    return { ...best, margin, marginIsLowerBound: ranked.length < 2, query };
  }

  function catalogMatch(text) {
    if (typeof text !== 'string') return null;
    if (memo.has(text)) return memo.get(text);
    const words = text.trim().split(/\s+/), matches = [];
    for (let drop = 0; drop <= Math.min(MATCHER_POLICY.maxTrailingManaWords, words.length - 1); drop++) {
      if (drop && !isManaSuffix(words.slice(-drop))) continue;
      const query = words.slice(0, words.length - drop).join(' ');
      const found = match(query);
      if (found) matches.push({ ...found, drop });
    }
    matches.sort((a, b) => b.similarity - a.similarity || b.n.length - a.n.length || a.drop - b.drop);
    const result = matches.length ? Object.freeze(matches[0]) : null;
    // A scan can contain many body lines; bound this per-catalog cache rather
    // than retaining every image's OCR text for the lifetime of the page.
    if (memo.size >= 8192) memo.delete(memo.keys().next().value);
    memo.set(text, result);
    return result;
  }
  return catalogMatch;
}

function polygonArea(poly) {
  let twice = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return twice / 2;
}

function physicalPolygon(prediction) {
  const poly = prediction.originalPoly;
  if (Array.isArray(poly) && poly.length >= 3 && poly.every(p => Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every(Number.isFinite)) && Math.abs(polygonArea(poly)) > 0) return poly;
  const box = prediction.originalBox;
  if (!box || !['x0', 'y0', 'x1', 'y1'].every(key => Number.isFinite(box[key])) || box.x1 <= box.x0 || box.y1 <= box.y0) return null;
  return [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]];
}

function polygonOverlap(a, b) {
  if (!a || !b) return 0;
  const sign = polygonArea(b) < 0 ? -1 : 1;
  let result = a;
  for (let i = 0; i < b.length && result.length; i++) {
    const start = b[i], end = b[(i + 1) % b.length];
    const side = p => sign * ((end[0] - start[0]) * (p[1] - start[1]) - (end[1] - start[1]) * (p[0] - start[0]));
    const input = result;
    result = [];
    let previous = input[input.length - 1], previousSide = side(previous);
    for (const current of input) {
      const currentSide = side(current);
      if ((currentSide >= 0) !== (previousSide >= 0)) {
        const fraction = previousSide / (previousSide - currentSide);
        result.push([previous[0] + fraction * (current[0] - previous[0]), previous[1] + fraction * (current[1] - previous[1])]);
      }
      if (currentSide >= 0) result.push(current);
      previous = current;
      previousSide = currentSide;
    }
  }
  return Math.abs(polygonArea(result)) / Math.max(1, Math.min(Math.abs(polygonArea(a)), Math.abs(polygonArea(b))));
}

/** Suppress overlapping observations, never separate copies sharing a name. */
export function deduplicatePredictions(all) {
  const ranked = [...all].sort((a, b) => b.similarity - a.similarity || b.confidence - a.confidence);
  const kept = [];
  for (const prediction of ranked) {
    const poly = physicalPolygon(prediction);
    if (!kept.some(other => polygonOverlap(poly, other.poly) > MATCHER_POLICY.spatialOverlap)) kept.push({ prediction, poly });
  }
  return kept.map(item => item.prediction);
}
