const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

async function main() {
  const { createCatalogMatcher, deduplicatePredictions, normalizeCardName, MATCHER_POLICY } =
    await import(pathToFileURL(path.resolve(__dirname, '../../preview/src/localScanMatcher.mjs')));
  assert.equal(MATCHER_POLICY.minSimilarity, 0.85);
  assert.equal(MATCHER_POLICY.minMargin, 0.05);
  assert.equal(normalizeCardName('Æther Écho, 2!'), 'therecho2');
  assert.throws(() => createCatalogMatcher(null), TypeError);

  // Synthetic identities only. These tests do not encode photo-specific names,
  // positions, labels, card layouts, or expected cards from evaluation images.
  const match = createCatalogMatcher([
    'Ancient Sky Dragon', 'Ancient Sea Dragon', 'Moonlit Observatory',
    'Dawn Sentinel // Dusk Sentinel', 'Twin Flame // Twin Flare',
    'Jolt', 'Ember Aegis', 'Echo-Bird', 'Echo Bird', 'Warm Welcome',
    'Knight of the Endless Verdant Woods',
  ]);
  assert.equal(match('Ancient Sky Dragon').name, 'Ancient Sky Dragon');
  assert.equal(match('ancient SKY dragon').name, 'Ancient Sky Dragon');
  assert.equal(match('Ancient Sky Dragom').name, 'Ancient Sky Dragon');
  assert.equal(match('Ancient Sxy Dragon').name, 'Ancient Sky Dragon');
  assert.equal(match('Moonlit 0bservatory').name, 'Moonlit Observatory');
  assert.equal(match('An unrelated sentence about magical spells.'), null);
  assert.equal(match(''), null);
  assert.equal(match(null), null);
  assert.equal(match('jolt').name, 'Jolt');
  assert.equal(match('Jolts'), null, 'Four-character titles are exact-only.');
  assert.equal(match('Jolt attacks'), null);
  assert.equal(createCatalogMatcher(['Ash'])('Ash'), null, 'Three-character ordinary titles remain too ambiguous.');
  assert.equal(match('Echobird'), null, 'Normalized punctuation collisions abstain.');
  assert.equal(match('Echo-Bird').name, 'Echo-Bird');
  assert.equal(match('Echo Bird').name, 'Echo Bird');

  for (const title of ['Dawn Sentinel', 'Dusk Sentinel', 'Dawn Sentinel // Dusk Sentinel']) {
    assert.equal(match(title).name, 'Dawn Sentinel // Dusk Sentinel');
  }
  assert.equal(match('Dusk Sentine1').name, 'Dawn Sentinel // Dusk Sentinel');
  assert.equal(match('Twin Flamx').name, 'Twin Flame // Twin Flare', 'Aliases of one identity do not compete for the margin.');
  const collidingFaces = createCatalogMatcher(['Shared Face // Sunrise One', 'Shared Face // Sunset Two']);
  assert.equal(collidingFaces('Shared Face'), null, 'A shared face cannot choose between distinct cards.');
  assert.equal(createCatalogMatcher(['Echo-Bird // Sunrise', 'Echo Bird // Sunset'])('Echo Bird').name, 'Echo Bird // Sunset');
  assert.equal(createCatalogMatcher(['Shared Face', 'Shared Face // Sunrise One'])('Shared Face').name, 'Shared Face', 'A literal canonical identity remains exact.');
  assert.equal(createCatalogMatcher(['Moonlit Observatory', 'Moonlit Observatory'])('Moonlit Observatory').name, 'Moonlit Observatory');

  for (const suffix of ['3RR', '{3}{R}{R}', '3 R R', '2/W', '{2/W}{W/P}', 'X']) {
    const found = match(`Ancient Sky Dragon ${suffix}`);
    assert.equal(found?.name, 'Ancient Sky Dragon', `Mana suffix: ${suffix}`);
    assert.equal(found.similarity, 1);
    assert.ok(found.drop > 0);
  }
  assert.equal(match('Jolt 1R').name, 'Jolt');
  assert.equal(match('Ancient Sky Dragon attacks'), null);
  assert.equal(match('Ancient Sky Dragon enters tapped'), null);
  assert.equal(match('Knight of the Endless Verdant Woods dies'), null, 'Even a near-full-line title match cannot swallow a complete rules-text word.');
  assert.equal(match('Whenever Ancient Sky Dragon attacks'), null, 'No substring matching.');
  assert.equal(match('Warm Welcome').drop, 0);
  const cached = match('Moonlit 0bservatory');
  assert.equal(match('Moonlit 0bservatory'), cached, 'Repeated OCR text returns the memoized immutable result.');
  assert.ok(Object.isFrozen(cached));

  // Differential check against exhaustive, unbounded Levenshtein. The bounded
  // search must preserve decisions and winner identities over all candidates,
  // including first-letter errors and close runner-ups of different lengths.
  function distance(a, b) {
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
      row = next;
    }
    return row[b.length];
  }
  function reference(names, text) {
    const n = normalizeCardName(text);
    if (n.length < 4) return null;
    const exact = names.filter(name => normalizeCardName(name) === n);
    if (exact.length) return exact.length === 1 ? exact[0] : null;
    if (n.length < 5) return null;
    const ranked = names.filter(name => normalizeCardName(name).length >= 5).map(name => ({
      name, score: 1 - distance(n, normalizeCardName(name)) / Math.max(n.length, normalizeCardName(name).length),
    })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    if (ranked[0].score < .85 || ranked[0].score - (ranked[1]?.score || 0) + 1e-10 < .05) return null;
    return ranked[0].name;
  }
  let seed = 20261021;
  function random(n) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; }
  const names = [];
  for (let i = 0; i < 100; i++) {
    let word = '';
    for (let j = 0, length = 4 + random(32); j < length; j++) word += 'abcdefghijklmno'[random(15)];
    names.push(word);
    if (i % 5 === 0) names.push(word.slice(0, -1) + 'p');
  }
  const optimized = createCatalogMatcher(names);
  let checks = 0;
  for (const name of names) for (let editCount = 0; editCount <= 4; editCount++) {
    let query = name;
    for (let j = 0; j < editCount; j++) {
      const index = random(query.length), mode = random(3);
      query = query.slice(0, index) + (mode === 0 ? '' : 'q') + query.slice(index + (mode === 2 ? 0 : 1));
    }
    assert.equal(optimized(query)?.name ?? null, reference(names, query), `Unbounded decision mismatch for ${query}`);
    checks++;
  }

  const box = (x, y, width = 100, height = 20) => ({ x0: x, y0: y, x1: x + width, y1: y + height });
  const prediction = (name, x, y, overrides = {}) => ({ name, similarity: 1, confidence: .95, originalBox: box(x, y), ...overrides });
  const repeatedCopies = [prediction('Jolt', 0, 0), prediction('Jolt', 200, 0), prediction('Jolt', 1, 1, { confidence: .8 })];
  assert.equal(deduplicatePredictions(repeatedCopies).length, 2, 'Two separate copies survive; repeated observations do not.');
  assert.equal(repeatedCopies.length, 3, 'Dedup does not mutate its input.');
  const conflicting = [prediction('Wrong Guess', 0, 0, { similarity: .9, confidence: 1 }), prediction('Best Guess', 1, 1)];
  assert.equal(deduplicatePredictions(conflicting)[0].name, 'Best Guess');
  assert.equal(deduplicatePredictions([prediction('A', 0, 0), prediction('B', 100, 0)]).length, 2, 'Touching is not overlapping.');
  assert.equal(deduplicatePredictions([{ name: 'A' }, { name: 'A' }]).length, 2, 'Missing geometry is not proof of duplication.');
  const diagonal = [[0, 0], [100, 100], [100, 110], [0, 10]];
  const neighboring = diagonal.map(([x, y]) => [x, y + 25]);
  const rotated = [prediction('Same Name', 0, 0, { originalPoly: diagonal }), prediction('Same Name', 0, 0, { originalPoly: neighboring })];
  assert.equal(deduplicatePredictions(rotated).length, 2, 'Overlapping axis-aligned boxes alone do not deduplicate distinct diagonal lines.');
  const reversed = diagonal.slice().reverse();
  assert.equal(deduplicatePredictions([rotated[0], prediction('Another Reading', 0, 0, { originalPoly: reversed, confidence: .8 })]).length, 1, 'Polygon winding does not change physical overlap.');
  assert.equal(deduplicatePredictions([prediction('Same Name', 0, 0), prediction('Same Name', 0, 30, { originalBox: box(0, 30, 50, 10) })]).length, 2, 'A nearby smaller title is not assumed to be a body mention.');

  console.log(`Local scan matcher: synthetic title, alias, ambiguity, mana, memoization and geometry checks passed; ${checks} exhaustive-search comparisons passed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
