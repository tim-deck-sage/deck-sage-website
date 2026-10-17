const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const esbuild = require(path.resolve(__dirname, '../../node_modules/esbuild'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const report = { checks: [], errors: [], externalWrites: [], representativeRecommendations: {}, beforeAfter: {}, performance: {}, reasonSamples: {}, startedAt: new Date().toISOString() };
function pass(name) { report.checks.push(name); console.log('PASS', name); }

function loadAnalysis() {
  const source = fs.readFileSync(path.resolve(__dirname, '../../preview/source/app/utils/deckBalanceAnalysis.ts'), 'utf8');
  const code = esbuild.transformSync(source, { loader: 'ts', format: 'cjs', target: 'node20' }).code;
  const mod = new Module('deck-balance-test'); mod.filename = 'deckBalanceAnalysis.cjs'; mod.paths = module.paths; mod._compile(code, mod.filename); return mod.exports.analyzeDeckBalance;
}
const analyze = loadAnalysis();
const basics = (values = {}) => ({ Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0, Wastes: 0, ...values });
const synthetic = (name, typeLine, oracleText = '', cmc = 2, manaCost = '{2}', quantity = 1) => ({ name, typeLine, oracleText, cmc, manaCost, quantity, metadataComplete: true });
function shell(name, commander, cards, lands, commanders = [{ ...commander, role: 'primary' }]) { return { name, commanderCard: commander, commanders, cards, basicLands: lands, targetSize: 100 }; }

function analysisFixtures() {
  const equipment = synthetic('Quiet Equipment', 'Artifact — Equipment', 'Equipped creature gets +1/+1.', 2);
  const selfProtected = synthetic('Invisible Stalker', 'Creature — Human Rogue', 'Hexproof\nInvisible Stalker can’t be blocked.', 2, '{1}{U}');
  const cantrip = synthetic('Opt', 'Instant', 'Scry 1.\nDraw a card.', 1, '{U}');
  const looter = synthetic('Careful Looter', 'Creature - Human Rogue', 'Whenever Careful Looter attacks, draw a card, then discard a card.', 2, '{1}{U}');
  const engine = synthetic('Consecrated Sphinx', 'Creature — Sphinx', 'Flying\nWhenever an opponent draws a card, you may draw two cards.', 6, '{4}{U}{U}');
  const wipe = synthetic('Austere Command', 'Sorcery', 'Choose two —\n• Destroy all artifacts.\n• Destroy all enchantments.\n• Destroy all creatures with mana value 3 or less.\n• Destroy all creatures with mana value 4 or greater.', 6, '{4}{W}{W}');
  const namedLand = synthetic('Command Tower', 'Land', "{T}: Add one mana of any color in your commander's color identity.", 0, '');
  const commander = synthetic('Fixture Leader', 'Legendary Creature — Wizard', 'Whenever you cast a spell, scry 1.', 3, '{1}{U}{U}'); commander.colorIdentity = ['U'];
  const falsePositive = analyze(shell('False-positive guard', commander, [equipment, selfProtected, cantrip, looter, engine, wipe, namedLand], basics({ Island: 33 })));
  assert.equal(falsePositive.rampCount, 0, 'artifacts are not automatically ramp');
  assert.equal(falsePositive.protectionCount, 0, 'self-only hexproof is not deck protection');
  assert.equal(falsePositive.drawCount, 1.35, 'cantrip and looting are fractional while repeatable net draw is full weight');
  assert.equal(falsePositive.boardWipeCount, 1, 'modal wipe counts once, not once per mode');
  assert.equal(falsePositive.finisherCount, 0, 'mana value alone is not a finisher');
  assert.equal(falsePositive.landCount, 34, 'named lands and basics are both counted');
  pass('False-positive guards separate artifacts, cantrips, self-protection, modal wipes, finishers, and named lands');

  const goblins = Array.from({ length: 24 }, (_, index) => synthetic(`Goblin ${index}`, 'Creature — Goblin', index < 8 ? 'Create a 1/1 red Goblin creature token.' : '', 2, '{1}{R}'));
  const krenko = { ...synthetic('Krenko, Mob Boss', 'Legendary Creature — Goblin Warrior', '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.', 4, '{2}{R}{R}'), colorIdentity: ['R'] };
  const krenkoResult = analyze(shell('Krenko fixture', krenko, [...goblins, ...Array.from({ length: 38 }, (_, i) => synthetic(`Red spell ${i}`, 'Sorcery', 'Target creature gets +1/+0 until end of turn.', 3, '{2}{R}'))], basics({ Mountain: 37 })));
  assert(krenkoResult.planSignals.includes('tokens')); assert.equal(krenkoResult.tribe, 'Goblin'); assert(krenkoResult.issues.some(issue => issue.id === 'advantage'));
  assert(krenkoResult.planSignals.includes('tap_commander')); assert(krenkoResult.issues.some(issue => issue.id === 'commander_support'));

  const elves = Array.from({ length: 25 }, (_, index) => synthetic(`Elf ${index}`, 'Creature — Elf Druid', index < 8 ? '{T}: Add {G}.' : '', 2, '{1}{G}'));
  const marwyn = { ...synthetic('Marwyn, the Nurturer', 'Legendary Creature — Elf Druid', 'Whenever another Elf enters under your control, put a +1/+1 counter on Marwyn.\n{T}: Add an amount of {G} equal to Marwyn’s power.', 3, '{2}{G}'), colorIdentity: ['G'] };
  const marwynResult = analyze(shell('Marwyn fixture', marwyn, [...elves, ...Array.from({ length: 37 }, (_, i) => synthetic(`Green spell ${i}`, 'Sorcery', 'Target creature gets +1/+1 until end of turn.', 3, '{2}{G}'))], basics({ Forest: 37 })));
  assert.equal(marwynResult.tribe, 'Elf'); assert(marwynResult.planSignals.includes('counters'));
  assert(marwynResult.planSignals.includes('mana_engine')); assert(marwynResult.issues.some(issue => issue.id === 'commander_support'));

  const sacrificeOnly = analyze(shell('Sacrifice is not graveyard', commander, Array.from({ length: 12 }, (_, i) => synthetic(`Sacrifice ${i}`, 'Artifact', 'Sacrifice this artifact: Add {C}.', 2, '{2}')), basics({ Island: 36 })));
  assert(!sacrificeOnly.planSignals.includes('graveyard'), 'sacrifice text alone must not fabricate a graveyard plan');

  const spellslingerCommander = { ...synthetic('Talrand, Sky Summoner', 'Legendary Creature — Merfolk Wizard', 'Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.', 4, '{2}{U}{U}'), colorIdentity: ['U'] };
  const spellslinger = analyze(shell('Spellslinger fixture', spellslingerCommander, Array.from({ length: 28 }, (_, i) => synthetic(`Instant ${i}`, 'Instant', i < 4 ? 'Draw a card.' : 'Counter target spell unless its controller pays {1}.', 2, '{1}{U}')), basics({ Island: 36 })));
  assert(spellslinger.planSignals.includes('spellslinger')); assert(spellslinger.planSignals.includes('tokens'));

  const graveCommander = { ...synthetic('Meren of Clan Nel Toth', 'Legendary Creature — Human Shaman', 'Whenever another creature you control dies, you get an experience counter. At the beginning of your end step, return target creature card from your graveyard.', 4, '{2}{B}{G}'), colorIdentity: ['B', 'G'] };
  const graveyard = analyze(shell('Graveyard fixture', graveCommander, Array.from({ length: 62 }, (_, i) => synthetic(`Grave card ${i}`, 'Creature — Insect', i < 15 ? 'When this creature dies, mill two cards.' : '', 3, '{2}{B}')), basics({ Swamp: 18, Forest: 19 })));
  assert(graveyard.planSignals.includes('graveyard'));

  const colorlessCommander = { ...synthetic('Kozilek, the Great Distortion', 'Legendary Creature — Eldrazi', 'When you cast this spell, if you have fewer than seven cards in hand, draw cards equal to the difference.', 10, '{8}{C}{C}'), colorIdentity: [] };
  const colorless = analyze(shell('Colorless fixture', colorlessCommander, Array.from({ length: 62 }, (_, i) => synthetic(`Construct ${i}`, 'Artifact Creature — Construct', '', 4, '{4}')), basics({ Wastes: 37 })));
  assert.deepEqual(colorless.colorDemand, { W: 0, U: 0, B: 0, R: 0, G: 0 });

  const partnerA = { ...synthetic('Partner A', 'Legendary Creature — Human', 'Partner', 3, '{2}{W}'), colorIdentity: ['W'], role: 'primary' };
  const partnerB = { ...synthetic('Partner B', 'Legendary Creature — Elf', 'Partner', 3, '{2}{B}'), colorIdentity: ['B'], role: 'partner' };
  const partner = analyze(shell('Partner fixture', partnerA, Array.from({ length: 20 }, (_, i) => synthetic(`Black card ${i}`, 'Sorcery', 'Draw two cards.', 2, '{1}{B}')), basics({ Plains: 20 }), [partnerA, partnerB]));
  assert(partner.issues.some(issue => issue.id === 'color_sources' && issue.label.startsWith('B ')), 'partner identity contributes black demand/source diagnosis');

  const companion = { ...synthetic('Companion', 'Legendary Creature — Elemental Otter', 'Companion — Each nonland card in your starting deck has a different name.', 3, '{1}{U}{R}'), colorIdentity: ['U', 'R'], role: 'companion' };
  const companionResult = analyze(shell('Companion fixture', marwyn, Array.from({ length: 20 }, (_, i) => synthetic(`Red demand ${i}`, 'Sorcery', 'Draw a card.', 2, '{1}{R}')), basics({ Forest: 20 }), [{ ...marwyn, role: 'primary' }, companion]));
  assert(!companionResult.issues.some(issue => issue.id === 'color_sources' && issue.label.startsWith('R ')), 'companion does not expand identity');

  const incomplete = analyze(shell('Incomplete fixture', krenko, [synthetic('Only card', 'Creature — Goblin', '', 1, '{R}')], basics({ Mountain: 4 })));
  assert.equal(incomplete.confidence, 'low'); assert(incomplete.issues.some(issue => issue.id === 'incomplete'));
  assert.deepEqual(analyze(shell('Determinism', krenko, goblins, basics({ Mountain: 37 }))), analyze(shell('Determinism', krenko, goblins, basics({ Mountain: 37 }))));
  pass('Krenko, Marwyn, partner, colorless, spellslinger, graveyard, companion, incomplete, and deterministic analysis fixtures pass');
}

async function offline(context) {
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.url().endsWith('/account-config.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' });
    if (request.url().startsWith(baseUrl) || request.url().startsWith('https://cards.scryfall.io')) return route.continue();
    if (request.method() !== 'GET') report.externalWrites.push(request.url());
    return route.abort();
  });
}
async function worker(page, pathName, body = null, params = {}) {
  return page.evaluate(({ pathName, body, params }) => new Promise((resolve, reject) => { const instance = new Worker('/card-worker.js'); instance.onmessage = ({ data }) => { instance.terminate(); data.error ? reject(Error(data.error)) : resolve(data.result); }; instance.onerror = reject; instance.postMessage({ id: 1, path: pathName, body, params }); }), { pathName, body, params });
}
async function workerSequence(page, requests) {
  return page.evaluate(requests => new Promise((resolve, reject) => { const instance = new Worker('/card-worker.js'); const results = [], durations = []; let started = performance.now(); instance.onerror = reject; instance.onmessage = ({ data }) => { if (data.error) { instance.terminate(); reject(Error(data.error)); return; } durations.push(Math.round(performance.now() - started)); results.push(data.result); if (results.length === requests.length) { instance.terminate(); resolve({ results, durations }); return; } const next = requests[results.length]; started = performance.now(); instance.postMessage({ id: results.length + 1, path: next.path, body: next.body, params: next.params || {} }); }; const first = requests[0]; instance.postMessage({ id: 1, path: first.path, body: first.body, params: first.params || {} }); }), requests);
}
async function resolve(page, names) { return (await worker(page, '/api/resolve', { names })).cards; }
function siteState(decks) { return { version: 1, profile: { name: 'Recommendation QA', username: '', avatar: 1, role: 'Player', bio: '' }, decks, retainedDeckRecords: [], bulk: [], favorites: [], contacts: [], stores: [], notifications: [], settings: { theme: 'forest', motion: false, images: true, notificationInbox: true } }; }

async function browserFixtures() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } }); await offline(context);
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message)); await page.goto(`${baseUrl}/#/home`);
    const [krenko, marwyn, lutri, tolabow, tana, tymna, kenrith] = await resolve(page, ['Krenko, Mob Boss', 'Marwyn, the Nurturer', 'Lutri, the Spellchaser', 'Tolabow, Loch Rascal', 'Tana, the Bloodsower', 'Tymna the Weaver', 'Kenrith, the Returned King']);
    assert.equal(lutri.legalities.commander, 'legal'); pass('Current catalog preserves Lutri as Commander-legal while the official restriction remains companion-only');

    const issues = [
      { id: 'ramp', label: 'Mana acceleration', severity: 'important', evidence: 'Low ramp.', recommendation: 'Add ramp.', candidateRole: 'ramp' },
      { id: 'advantage', label: 'Sustained card advantage', severity: 'important', evidence: 'Low advantage.', recommendation: 'Add advantage.', candidateRole: 'advantage' },
      { id: 'interaction', label: 'Flexible interaction', severity: 'important', evidence: 'Low interaction.', recommendation: 'Add interaction.', candidateRole: 'interaction' },
      { id: 'finishers', label: 'Closing the game', severity: 'important', evidence: 'No finishers.', recommendation: 'Add a payoff.', candidateRole: 'finisher' }
    ];
    const commanderIssue = { id: 'commander_support', label: 'Commander engine support', severity: 'important', evidence: 'Tap engine lacks support.', recommendation: 'Add haste, untap, or protection.', candidateRole: 'commander_support' };
    const krenkoCards = [...Array.from({ length: 24 }, (_, index) => synthetic(`Goblin body ${index}`, 'Creature - Goblin', index < 8 ? 'Create a 1/1 red Goblin creature token.' : 'Haste', 2, '{1}{R}')), ...Array.from({ length: 38 }, (_, index) => synthetic(`Red support ${index}`, 'Sorcery', 'Target creature gets +1/+0 until end of turn.', 3, '{2}{R}'))];
    const request = { colors: ['R'], issues: [...issues, commanderIssue], planSignals: ['tokens', 'typal', 'tap_commander', 'commander_tokens'], tribe: 'Goblin', playstyle: 'balanced', forestTargets: 0, humanRatio: 0, deckCards: krenkoCards, commanders: [{ ...krenko, role: 'primary' }], basicLands: basics({ Mountain: 37 }), targetSize: 100, existingOracleIds: [krenko.oracleId], existingNames: [krenko.name] };
    const sequence = await workerSequence(page, [{ path: '/api/recommendations', body: request }, { path: '/api/recommendations', body: request }, { path: '/api/recommendations', body: { ...request, playstyle: 'aggressive' } }]), [first, second, styleMiss] = sequence.results, [coldMs, cacheMs, styleMs] = sequence.durations;
    report.performance = { coldWorkerRecommendationMs: coldMs, cachedRecommendationMs: cacheMs, warmStyleMissMs: styleMs };
    assert(coldMs < 8000, `cold worker recommendation should remain interactive; took ${coldMs}ms`);
    const names = value => value.groups.map(group => [group.issue.id, group.cards.map(item => item.card.name)]);
    assert.deepEqual(names(first), names(second));
    assert.equal(first.cacheStatus, 'miss'); assert.equal(second.cacheStatus, 'hit'); assert.equal(styleMiss.cacheStatus, 'miss'); assert.equal(first.algorithmVersion, '2026-10-17.3');
    pass('Recommendation cache hits only for the same full deck, commander, style, algorithm, and data snapshot');
    assert(['Sol Ring','Arcane Signet','Mind Stone'].includes(first.groups.find(group => group.issue.id === 'ramp').cards[0].card.name), `a reliable ramp shortage should prioritize repeatable acceleration over sacrifice or combat-dependent burst mana; received ${JSON.stringify(names(first))}`);
    assert(first.groups.find(group => group.issue.id === 'finishers').cards.some(item => ['Impact Tremors', 'Purphoros, God of the Forge', 'Shared Animosity', 'Goblin Bombardment', 'Thornbite Staff'].includes(item.card.name)));
    assert(first.groups.find(group => group.issue.id === 'commander_support').cards.some(item => /haste advances|untap enables|protects the commander/.test(item.why)), 'Krenko support reasons must name the commander dependency they repair');
    assert(!first.groups.find(group => group.issue.id === 'advantage').cards.some(item => item.card.name === "Smuggler's Copter"), 'repeatable looting is card selection, not sustained card advantage');
    assert(!first.groups.find(group => group.issue.id === 'interaction').cards.some(item => item.card.name === 'Soul-Guide Lantern'));
    assert(!first.groups.find(group => group.issue.id === 'interaction').cards.some(item => item.card.name === 'Lazotep Quarry'));
    for (const group of first.groups) for (const item of group.cards) { assert.equal(item.card.legalities.commander, 'legal'); assert(!item.card.colorIdentity.some(color => color !== 'R')); assert.notEqual(item.card.oracleId, krenko.oracleId); assert(item.why.length > 25); }
    assert(first.groups.flatMap(group => group.cards).every(item => item.swap?.mode === 'swap'), 'a complete 100-card fixture receives hypothetical swaps');
    assert(first.groups.flatMap(group => group.cards).every(item => /lands stay at 37/i.test(item.swap.outcome)), 'spell-for-spell swaps preserve land count');
    assert(first.groups.flatMap(group => group.cards).every(item => !/^Goblin body/.test(item.swap.cut?.name || '')), 'hypothetical cuts preserve demonstrated Goblin/token engine pieces');
    const patientRun = await worker(page, '/api/recommendations', { ...request, playstyle: 'patient' });
    const unpredictableRun = await worker(page, '/api/recommendations', { ...request, playstyle: 'unpredictable' });
    assert(styleMiss.groups.flatMap(group => group.cards).some(item => /Aggressive emphasis/.test(item.why)));
    assert(patientRun.groups.flatMap(group => group.cards).some(item => /Patient emphasis/.test(item.why)));
    assert(unpredictableRun.groups.find(group => group.issue.id === 'interaction').cards.some(item => /Unpredictable emphasis/.test(item.why)));
    assert(['Sol Ring','Arcane Signet','Mind Stone'].includes(styleMiss.groups.find(group => group.issue.id === 'ramp').cards[0].card.name), 'Aggressive emphasis cannot displace reliable acceleration with burst or conditional ramp');
    for (const styled of [styleMiss, patientRun, unpredictableRun]) for (const item of styled.groups.flatMap(group => group.cards)) { assert.equal(item.card.legalities.commander, 'legal'); assert(!item.card.colorIdentity.some(color => color !== 'R')); }
    assert.notDeepEqual(names(styleMiss), names(unpredictableRun), 'style may reorder emphasis while keeping hard constraints fixed');
    report.representativeRecommendations.styles = { balanced: names(first), aggressive: names(styleMiss), patient: names(patientRun), unpredictable: names(unpredictableRun) };
    pass('All four playstyles change ranking emphasis without changing legality, identity, mana, or safety gates');
    report.beforeAfter.krenkoRamp = { before: ['Professional Face-Breaker', 'Skirk Prospector', 'Sol Ring'], after: first.groups.find(group => group.issue.id === 'ramp').cards.map(item => item.card.name), repair: 'Reliable acceleration now outranks combat- and sacrifice-dependent burst mana for a diagnosed ramp shortage.' };
    report.reasonSamples.krenko = Object.fromEntries(first.groups.map(group => [group.issue.id, group.cards[0] ? { card: group.cards[0].card.name, why: group.cards[0].why, swap: group.cards[0].swap.outcome, caveats: group.cards[0].caveats } : null]));
    report.representativeRecommendations.krenko = names(first); pass('Krenko recommendations use actual Goblin/token density, prioritize reliable ramp, and produce constraint-preserving swaps');

    const excluded = first.groups.find(group => group.issue.id === 'ramp').cards[0].card;
    const excludedRun = await worker(page, '/api/recommendations', { ...request, existingOracleIds: [krenko.oracleId, excluded.oracleId], existingNames: [krenko.name] });
    assert(!excludedRun.groups.flatMap(group => group.cards).some(item => item.card.oracleId === excluded.oracleId));
    pass('Existing Oracle identities are excluded before scoring, including the selected commander');

    const marwynCards = [...Array.from({ length: 25 }, (_, index) => synthetic(`Elf engine ${index}`, 'Creature - Elf Druid', index < 8 ? '{T}: Add {G}.' : index < 12 ? 'Target creature gets +1/+1 until end of turn.' : '', 2, '{1}{G}')), ...Array.from({ length: 37 }, (_, index) => synthetic(`Green support ${index}`, 'Sorcery', index < 4 ? 'Target creature gets +2/+2 until end of turn.' : '', 3, '{2}{G}'))];
    const marwynBody = { colors: ['G'], issues: [issues[0], issues[3], commanderIssue], planSignals: ['typal', 'counters', 'tap_commander', 'mana_engine'], tribe: 'Elf', forestTargets: 37, humanRatio: 0, deckCards: marwynCards, commanders: [{ ...marwyn, role: 'primary' }], basicLands: basics({ Forest: 37 }), targetSize: 100, existingOracleIds: [marwyn.oracleId], existingNames: [marwyn.name] };
    const marwynRun = await worker(page, '/api/recommendations', marwynBody);
    const marwynNames = marwynRun.groups.flatMap(group => group.cards.map(item => item.card.name));
    assert(marwynNames.some(name => ['Priest of Titania', 'Wirewood Channeler', 'Circle of Dreams Druid', 'Umbral Mantle', 'Staff of Domination', 'Sword of the Paruns', 'Genesis Wave', 'Finale of Devastation'].includes(name)));
    assert(marwynRun.groups.find(group => group.issue.id === 'commander_support').cards.some(item => ['Wirewood Symbiote', 'Quirion Ranger', 'Umbral Mantle', 'Staff of Domination', 'Thousand-Year Elixir', "Magewright's Stone"].includes(item.card.name)), 'a supported Marwyn shell receives untap or engine-protection support');
    assert(marwynRun.groups.flatMap(group => group.cards).every(item => !/^Elf engine/.test(item.swap.cut?.name || '')), 'hypothetical cuts preserve demonstrated Elf/mana engine pieces');
    const sparseElfCards = [...Array.from({ length: 4 }, (_, index) => synthetic(`Sparse Elf ${index}`, 'Creature - Elf Druid', '{T}: Add {G}.', 2, '{1}{G}')), ...Array.from({ length: 58 }, (_, index) => synthetic(`Unrelated Beast ${index}`, 'Creature - Beast', '', 3, '{2}{G}'))];
    const sparseMarwyn = await worker(page, '/api/recommendations', { ...marwynBody, deckCards: sparseElfCards });
    const sparseNames = sparseMarwyn.groups.flatMap(group => group.cards.map(item => item.card.name));
    assert(!sparseNames.some(name => ['Priest of Titania', 'Wirewood Channeler', 'Circle of Dreams Druid', 'Umbral Mantle', 'Staff of Domination', 'Sword of the Paruns'].includes(name)), 'Elf-scaling and mana-conversion pieces must abstain without enough Elves and power support');
    report.beforeAfter.marwynSparse = { before: ['Priest of Titania', 'Circle of Dreams Druid', 'Staff of Domination'], after: sparseNames, repair: 'A commander label alone no longer fabricates the Elf density and power needed by scaling engines or untap combos.' };
    report.representativeRecommendations.marwyn = names(marwynRun); pass('Marwyn engine recommendations require actual Elf density and power support; sparse adversarial lists abstain');

    const colorlessRun = await worker(page, '/api/recommendations', { colors: [], issues: [issues[0]], planSignals: ['artifacts'], deckCards: Array.from({ length: 62 }, (_, index) => synthetic(`Construct ${index}`, 'Artifact Creature - Construct', '', 3, '{3}')), commanders: [], basicLands: basics({ Wastes: 38 }), targetSize: 100, existingOracleIds: [], existingNames: [] });
    assert(!colorlessRun.groups.flatMap(group => group.cards).some(item => ['Arcane Signet', 'Command Tower'].includes(item.card.name)));
    const noForestRun = await worker(page, '/api/recommendations', { colors: ['G'], issues: [issues[0]], planSignals: [], forestTargets: 0, deckCards: [], commanders: [], basicLands: basics({ Wastes: 37 }), targetSize: 100, existingOracleIds: [], existingNames: [] });
    assert(!noForestRun.groups.flatMap(group => group.cards).some(item => ["Nature's Lore", 'Three Visits'].includes(item.card.name)));
    const humanRun = await worker(page, '/api/recommendations', { colors: ['G'], issues: [issues[1]], planSignals: [], humanRatio: .8, deckCards: Array.from({ length: 50 }, (_, index) => synthetic(`Human ${index}`, 'Creature - Human', '', 2, '{1}{G}')), commanders: [], basicLands: basics({ Forest: 37 }), targetSize: 100, existingOracleIds: [], existingNames: [] });
    assert(!humanRun.groups.flatMap(group => group.cards).some(item => item.card.name === 'Return of the Wildspeaker'));
    const landIssue = { id: 'lands', label: 'Mana base depth', severity: 'important', current: 30, target: 34, evidence: '30 lands found.', recommendation: 'Add lands.', candidateRole: 'land' };
    const landRun = await worker(page, '/api/recommendations', { colors: ['R'], issues: [landIssue], planSignals: [], deckCards: Array.from({ length: 69 }, (_, index) => synthetic(`Red nonland ${index}`, 'Creature - Goblin', '', 3, '{2}{R}')), commanders: [{ ...krenko, role: 'primary' }], basicLands: basics({ Mountain: 30 }), targetSize: 100, existingOracleIds: [krenko.oracleId], existingNames: [krenko.name] });
    assert(landRun.groups[0].cards.length > 0 && landRun.groups[0].cards.every(item => !['Plains', 'Island', 'Swamp', 'Forest', 'Wastes'].includes(item.card.name)), 'land-depth candidates must not use off-color basics');
    assert(landRun.groups[0].cards.every(item => item.swap?.mode === 'swap' && /lands move 30 to 31/.test(item.swap.outcome)), 'a full low-land deck reanalysis intentionally increases land count by cutting a nonland');
    pass('Colorless mana, Forest-target, and Human-heavy conditional candidates are guarded explicitly');

    const spellCards = [...Array.from({ length: 28 }, (_, index) => synthetic(`Instant ${index}`, 'Instant', 'Draw a card.', 2, '{1}{U}')), ...Array.from({ length: 34 }, (_, index) => synthetic(`Blue support ${index}`, 'Artifact', '', 2, '{2}'))];
    const spellslingerRun = await worker(page, '/api/recommendations', { colors: ['U'], issues: [issues[1], issues[3]], planSignals: ['spellslinger', 'tokens'], deckCards: spellCards, commanders: [], basicLands: basics({ Island: 37 }), targetSize: 100, existingOracleIds: [], existingNames: [] });
    const spellslingerNames=spellslingerRun.groups.flatMap(group => group.cards.map(item=>item.card.name));assert(spellslingerNames.filter(name => ['Archmage Emeritus', 'Metallurgic Summonings', 'Murmuring Mystic', 'Shark Typhoon', 'Docent of Perfection', 'Aetherflux Reservoir'].includes(name)).length>=2);assert(!spellslingerNames.some(name=>['Thornbite Staff','It That Heralds the End'].includes(name)));
    const graveCards = [...Array.from({ length: 18 }, (_, index) => synthetic(`Grave enabler ${index}`, 'Creature - Insect', 'When this creature dies, mill two cards.', 2, '{1}{B}')), ...Array.from({ length: 44 }, (_, index) => synthetic(`Grave support ${index}`, 'Creature - Fungus', index < 8 ? 'Return target creature card from your graveyard to your hand.' : '', 3, '{2}{G}'))];
    const graveyardRun = await worker(page, '/api/recommendations', { colors: ['B', 'G'], issues: [{ id: 'graveyard_hate', label: 'Graveyard counterplay', severity: 'watch', evidence: 'None.', recommendation: 'Add one.', candidateRole: 'graveyard_hate' }, issues[3]], planSignals: ['graveyard'], deckCards: graveCards, commanders: [], basicLands: basics({ Swamp: 18, Forest: 20 }), targetSize: 100, existingOracleIds: [], existingNames: [] });
    assert(!graveyardRun.groups.flatMap(group => group.cards).some(item => ['Rest in Peace', 'Relic of Progenitus'].includes(item.card.name)), 'self-exiling graveyard hate must abstain in a graveyard deck');
    assert(graveyardRun.groups.find(group=>group.issue.id==='finishers').cards.some(item=>['Syr Konrad, the Grim','Living Death'].includes(item.card.name)));
    const partnerCards = Array.from({ length: 61 }, (_, index) => synthetic(`Partner creature ${index}`, 'Creature - Saproling', index < 8 ? 'Create a 1/1 green Saproling creature token.' : '', 2, '{1}{G}'));
    const partnerRun = await worker(page, '/api/recommendations', { colors: ['W', 'B', 'R', 'G'], issues: [issues[2]], planSignals: ['tokens'], deckCards: partnerCards, commanders: [{ ...tana, role: 'primary' }, { ...tymna, role: 'partner' }], basicLands: basics({ Plains: 0, Swamp: 12, Mountain: 12, Forest: 13 }), targetSize: 100, existingOracleIds: [tana.oracleId, tymna.oracleId], existingNames: [tana.name, tymna.name] });
    assert(partnerRun.groups.flatMap(group => group.cards).every(item => item.card.colorIdentity.every(color => ['W', 'B', 'R', 'G'].includes(color))));
    assert(!partnerRun.groups.flatMap(group => group.cards).some(item => item.card.colorIdentity.includes('W')), 'zero white sources block technically legal but uncastable white-pip recommendations');
    const flexibleBasics = basics({ Plains: 8, Island: 7, Swamp: 8, Mountain: 7, Forest: 7 });
    const tokenList = Array.from({ length: 62 }, (_, index) => synthetic(`Flexible token ${index}`, 'Creature - Soldier', index < 18 ? 'Create a 1/1 white Soldier creature token.' : '', 2, '{1}{W}'));
    const graveList = Array.from({ length: 62 }, (_, index) => synthetic(`Flexible grave ${index}`, 'Creature - Insect', index < 18 ? 'When this creature dies, mill two cards.' : index < 28 ? 'Return target creature card from your graveyard to your hand.' : '', 2, '{1}{B}'));
    const flexibleBase = { colors: ['W', 'U', 'B', 'R', 'G'], issues: [issues[3]], tribe: '', playstyle: 'balanced', commanders: [{ ...kenrith, role: 'primary' }], basicLands: flexibleBasics, targetSize: 100, existingOracleIds: [kenrith.oracleId], existingNames: [kenrith.name] };
    const tokenFlexible = await worker(page, '/api/recommendations', { ...flexibleBase, planSignals: ['tokens'], deckCards: tokenList });
    const graveFlexible = await worker(page, '/api/recommendations', { ...flexibleBase, planSignals: ['graveyard'], deckCards: graveList });
    const tokenFlexibleNames = tokenFlexible.groups[0].cards.map(item => item.card.name), graveFlexibleNames = graveFlexible.groups[0].cards.map(item => item.card.name);
    assert.notDeepEqual(tokenFlexibleNames, graveFlexibleNames); assert(tokenFlexibleNames.some(name => ['Impact Tremors', 'Purphoros, God of the Forge', 'Shared Animosity', 'Goblin Bombardment'].includes(name))); assert(graveFlexibleNames.some(name => ['Syr Konrad, the Grim', 'Living Death'].includes(name)));
    report.beforeAfter.flexibleCommander = { commander: kenrith.name, tokenList: tokenFlexibleNames, graveyardList: graveFlexibleNames, repair: 'The same flexible commander now follows demonstrated list contents instead of commander identity alone.' };
    pass('The same flexible commander produces different supported results for token and graveyard lists');
    report.beforeAfter.graveyardConflict = { before: 'Rest in Peace and Relic of Progenitus were merely penalized and could still clear ranking.', after: graveyardRun.groups.find(group => group.issue.id === 'graveyard_hate').cards.map(item => item.card.name), repair: 'Global self-exile is now a hard conflict; selective or opposing-graveyard interaction remains eligible.' };
    report.representativeRecommendations.spellslinger = names(spellslingerRun); report.representativeRecommendations.graveyard = names(graveyardRun); report.representativeRecommendations.partner = names(partnerRun);
    pass('Spellslinger, graveyard-plan, and four-color partner recommendation outputs receive plan and identity checks');

    const tokenWipe = await worker(page, '/api/recommendations', { ...request, issues: [{ id: 'wipes', label: 'Reset buttons', severity: 'watch', evidence: 'No reset.', recommendation: 'Consider a reset.', candidateRole: 'wipe' }] });
    assert(!tokenWipe.groups.flatMap(group => group.cards).some(item => ['Blasphemous Act', 'Farewell', 'Supreme Verdict', 'Toxic Deluge', 'Worldslayer', 'Furnace Dragon'].includes(item.card.name)), 'a creature-token deck should not be told to erase its own board without compelling asymmetry');
    report.beforeAfter.tokenWipe = { before: 'Generic symmetric creature wipes were eligible for every token deck.', after: tokenWipe.groups[0].cards.map(item => item.card.name), repair: 'Creature-board conflicts are rejected; only selective or one-sided resets remain.' };
    const unfinished = await worker(page, '/api/recommendations', { ...request, deckCards: krenkoCards.slice(0, 45), basicLands: basics({ Mountain: 20 }) });
    assert(unfinished.groups.flatMap(group => group.cards).every(item => item.swap?.mode === 'add' && item.swap.outcome.includes('/100-card shell')), 'unfinished lists receive add guidance without fabricated cuts');
    const lowEvidence = await worker(page, '/api/recommendations', { ...request, deckCards: krenkoCards.slice(0, 20), basicLands: basics({ Mountain: 10 }) });
    assert.equal(lowEvidence.groups.length, 0); assert.match(lowEvidence.abstention, /Only 31 of 100 cards/);
    pass('Adversarial token-wipe, colored-source, graveyard-conflict, unfinished-shell, and low-confidence abstention guards pass');

    const filler = Array.from({ length: 62 }, (_, index) => ({ id: `fixture-${index}`, oracleId: `fixture-${index}`, name: `Goblin Fixture ${index}`, colorIdentity: ['R'], typeLine: 'Creature — Goblin', oracleText: index < 12 ? 'Create a 1/1 red Goblin creature token.' : 'Haste', manaCost: '{1}{R}', cmc: 2, quantity: 1, metadataComplete: true }));
    const deck = { id: 'recommendation-krenko', name: 'Krenko Recommendation QA', commander: krenko.name, commanderCard: krenko, commanders: [{ ...krenko, role: 'primary' }], format: 'Commander', status: 'active', playstyle: 'balanced', cards: filler, basicLands: basics({ Mountain: 37 }), notes: '', createdAt: '2026-10-17T12:00:00.000Z' };
    const blockedCompanion = { ...deck, id: 'companion-guard', name: 'Companion Guard', commanders: [{ ...krenko, role: 'primary' }, { ...lutri, role: 'companion' }] };
    const tolabowDeck = { ...deck, id: 'tolabow-guard', name: 'Tolabow Guard', commander: tolabow.name, commanderCard: tolabow, commanders: [{ ...tolabow, role: 'primary' }], cards: filler.map(card => ({ ...card, colorIdentity: ['U'], manaCost: '{1}{U}', typeLine: 'Instant', oracleText: 'Draw a card.' })), basicLands: basics({ Island: 37 }) };
    const partnerDeck = { ...deck, id: 'partner-guard', name: 'Partner Guard', commander: `${tana.name} + ${tymna.name}`, commanderCard: tana, commanders: [{ ...tana, role: 'primary' }, { ...tymna, role: 'partner' }], basicLands: basics({ Plains: 10, Swamp: 9, Mountain: 9, Forest: 9 }) };
    await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([blockedCompanion, tolabowDeck, partnerDeck]) });
    for (const [id, phrase] of [['companion-guard', 'bans it specifically as a companion'], ['tolabow-guard', 'chosen outside color']]) { await page.goto(`${baseUrl}/#/decks/${id}`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.getByText(new RegExp(phrase), { exact: false }).waitFor(); }
    await page.goto(`${baseUrl}/#/decks/partner-guard`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.locator('.upgrade-group').first().waitFor({ timeout: 20000 }); assert.equal(await page.getByText(/stored Oracle text does not prove/, { exact: false }).count(), 0);
    pass('Browser identity guards block Lutri-as-companion and unresolved Tolabow choices while accepting a verified partner pairing');
    await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([deck]) });
    await page.goto(`${baseUrl}/#/decks/${deck.id}`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click();
    await page.locator('.upgrade-group').first().waitFor({ timeout: 20000 }); assert.equal(await page.locator('.upgrade-card').count() > 0, true); assert.equal(await page.locator('[data-oracle-id]').count(), await page.locator('.upgrade-card').count()); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.getByRole('radio').count(), 4); assert.equal(await page.getByRole('radio', { name: /Balanced/ }).getAttribute('aria-checked'), 'true'); assert.equal(await page.getByText(/independently evaluated alternative/, { exact: false }).count(), 1);
    await page.getByRole('radio', { name: /Aggressive/ }).click(); await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'aggressive', storageKey); await page.getByText(/with aggressive ranking emphasis/i).waitFor({ timeout: 20000 });
    await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.locator('.upgrade-group').first().waitFor({ timeout: 20000 }); assert.equal(await page.getByRole('radio', { name: /Aggressive/ }).getAttribute('aria-checked'), 'true');
    const aggressiveRadio = page.getByRole('radio', { name: /Aggressive/ }); await aggressiveRadio.focus(); await aggressiveRadio.press('ArrowRight'); await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'patient', storageKey); await page.getByText(/with patient ranking emphasis/i).waitFor({ timeout: 20000 }); assert.equal(await page.getByRole('radio', { name: /Patient/ }).getAttribute('aria-checked'), 'true');
    pass('Desktop playstyle selection persists locally, reloads, and supports radio-keyboard navigation');
    await page.screenshot({ path: path.join(__dirname, 'commander-upgrades-desktop.png'), fullPage: true });
    const firstCard = page.locator('.upgrade-card').first(), firstCardName = await firstCard.locator('.card-title').innerText(); await firstCard.locator('.upgrade-card-image').click(); await page.getByText('Format legalities', { exact: true }).waitFor(); assert(await page.locator('.card-faces, .rules-text').count()); await page.getByRole('button', { name: 'Close dialog' }).click();
    await firstCard.getByRole('button', { name: 'Add to deck', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); assert(!(await page.locator('.inventory-table').allTextContents()).join(' ').includes(firstCardName));
    pass('Desktop Upgrades renders Oracle-linked full card images, opens details, and cancels add without mutating the deck');
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' }); await offline(mobile);
    const phone = await mobile.newPage(); phone.on('pageerror', error => report.errors.push(error.message)); await phone.goto(`${baseUrl}/#/home`); await phone.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([deck]) }); await phone.goto(`${baseUrl}/#/decks/${deck.id}`); await phone.reload(); await phone.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await phone.locator('.upgrade-card').first().waitFor({ timeout: 20000 }); assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); assert.equal(await phone.locator('.playstyle-picker > div').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2); await phone.getByRole('radio', { name: /Unpredictable/ }).click(); await phone.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'unpredictable', storageKey); await phone.getByText(/with unpredictable ranking emphasis/i).waitFor({ timeout: 20000 }); await phone.screenshot({ path: path.join(__dirname, 'commander-upgrades-mobile.png'), fullPage: true });
    await phone.reload(); await phone.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await phone.locator('.upgrade-card').first().waitFor({ timeout: 20000 }); assert.equal(await phone.getByRole('radio', { name: /Unpredictable/ }).getAttribute('aria-checked'), 'true');
    pass('Mobile Upgrades uses a two-column selector, fits without overflow, and persists style after reload'); await mobile.close();

    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalWrites, []); pass('Recommendation QA produced no browser runtime errors or external writes');
  } finally { await browser.close(); }
}

async function run() { analysisFixtures(); await browserFixtures(); report.finishedAt = new Date().toISOString(); }
run().catch(error => { report.failure = error.stack; console.error(error.stack); process.exitCode = 1; }).finally(() => fs.writeFileSync(path.join(__dirname, 'commander-upgrades-report.json'), JSON.stringify(report, null, 2)));
