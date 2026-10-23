const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const esbuild = require(path.resolve(__dirname, '../../node_modules/esbuild'));
const { classifyRampCard } = require(path.resolve(__dirname, '../../preview/public/ramp-classification.js'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const report = { checks: [], errors: [], externalWrites: [], representativeRecommendations: {}, beforeAfter: {}, performance: {}, reasonSamples: {}, startedAt: new Date().toISOString() };
function pass(name) { report.checks.push(name); console.log('PASS', name); }

function loadAnalysis() {
  const sourcePath = path.resolve(__dirname, '../../preview/source/app/utils/deckBalanceAnalysis.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const code = esbuild.transformSync(source, { loader: 'ts', format: 'cjs', target: 'node20' }).code;
  const mod = new Module(sourcePath); mod.filename = sourcePath; mod.paths = Module._nodeModulePaths(path.dirname(sourcePath)); mod._compile(code, mod.filename); return mod.exports.analyzeDeckBalance;
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

  const rampOracle = [
    ['Rampant Growth', 'Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.'],
    ['Cultivate', 'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.'],
    ["Kodama's Reach", 'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.'],
    ["Nature's Lore", 'Search your library for a Forest card, put that card onto the battlefield, then shuffle.'],
    ['Three Visits', 'Search your library for a Forest card, put it onto the battlefield, then shuffle.'],
    ['Farseek', 'Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle.'],
    ['Migration Path', 'Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.'],
    ['Harrow', 'As an additional cost to cast this spell, sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield, then shuffle.'],
    ['Roiling Regrowth', 'Sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.'],
    ['Entish Restoration', 'Sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle. If you control a creature with power 4 or greater, instead search your library for up to three basic land cards, put them onto the battlefield tapped, then shuffle.']
  ].map(([name, oracleText]) => synthetic(name, 'Sorcery', oracleText, 3, '{2}{G}'));
  for (const rampCard of rampOracle) { assert.deepEqual(classifyRampCard(rampCard), { kind: 'reliable', weight: 1, basis: 'net-land-search' }, `${rampCard.name} should use the shared reliable-ramp classification`); assert.equal(analyze(shell(rampCard.name, commander, [rampCard], basics({ Island: 36 }))).rampCount, 1, `${rampCard.name} should count as one reliable ramp piece`); }
  const conditionalRamp = synthetic('Knight of the White Orchid', 'Creature — Human Knight', 'First strike. When this creature enters, if an opponent controls more lands than you, you may search your library for a Plains card, put it onto the battlefield, then shuffle.', 2, '{W}{W}');
  assert.deepEqual(classifyRampCard(conditionalRamp), { kind: 'conditional', weight: .65, basis: 'net-land-search' }); assert.equal(analyze(shell('Conditional catch-up ramp', commander, [conditionalRamp], basics({ Island: 36 }))).rampCount, .65, 'catch-up land ramp should be credited conditionally rather than as fully reliable');
  const nonRampOracle = [
    ['Land Tax', 'At the beginning of your upkeep, if an opponent controls more lands than you, you may search your library for up to three basic land cards, reveal them, put them into your hand, then shuffle.'],
    ['Explore', 'You may play an additional land this turn. Draw a card.'],
    ['Crop Rotation', 'As an additional cost to cast this spell, sacrifice a land. Search your library for a land card, put that card onto the battlefield, then shuffle.'],
    ['Scapeshift', 'Sacrifice any number of lands. Search your library for up to that many land cards, put them onto the battlefield tapped, then shuffle.'],
    ['Opponent Gift', 'Target opponent may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.'],
    ['Unrelated Clauses', 'Search your library for a basic land card, reveal it, put it into your hand, then shuffle. Put target creature card from your graveyard onto the battlefield.']
  ].map(([name, oracleText]) => synthetic(name, 'Sorcery', oracleText, 2, '{1}{G}'));
  for (const card of nonRampOracle) { assert.equal(classifyRampCard(card).kind, 'none', `${card.name} must be rejected by the shared ramp classifier`); assert.equal(analyze(shell(card.name, commander, [card], basics({ Island: 36 }))).rampCount, 0, `${card.name} must not count as net mana acceleration`); }
  const rampComplete = analyze(shell('Real land ramp', commander, [...rampOracle.slice(0, 8), ...Array.from({ length: 54 }, (_, index) => synthetic(`Ramp filler ${index}`, 'Creature — Beast', '', 2, '{1}{G}'))], basics({ Island: 37 })));
  assert.equal(rampComplete.rampCount, 8); assert(!rampComplete.issues.some(issue => issue.id === 'ramp'), 'eight real land-ramp spells should satisfy the adaptive ramp target');
  pass('Land-search parsing recognizes single, multiple, one-and-other, named-subtype, and net-positive sacrifice ramp without counting tutors or land replacements');

  const typalCommander = (type, text = `Other ${type}s you control get +1/+1.`) => ({ ...synthetic(`${type} Leader`, `Legendary Creature — ${type}`, text, 3, '{2}{U}'), colorIdentity: ['U'] });
  const typalCards = (type, count = 10, extra = '') => Array.from({ length: count }, (_, index) => synthetic(`${type} ${index}`, `Creature — ${extra}${extra ? ' ' : ''}${type}`, index < 2 ? `Other ${type}s you control have ward {1}.` : '', 2, '{1}{U}'));
  for (const type of ['Wizard', 'Soldier', 'Warrior', 'Knight']) {
    const result = analyze(shell(`${type} evidence`, typalCommander(type), [...typalCards(type), ...Array.from({ length: 12 }, (_, index) => synthetic(`${type} filler ${index}`, 'Creature — Beast', '', 2, '{1}{U}'))], basics({ Island: 37 })));
    assert.equal(result.tribe, type); assert(result.planSignals.includes('typal'));
  }
  const humanWizards = Array.from({ length: 10 }, (_, index) => synthetic(`Human Wizard ${index}`, 'Creature — Human Wizard', index < 3 ? 'Wizards you control have ward {1}.' : '', 2, '{1}{U}'));
  const wizardFavored = analyze(shell('Wizard over Human', typalCommander('Wizard'), [...humanWizards, ...Array.from({ length: 12 }, (_, index) => synthetic(`Faerie ${index}`, 'Creature — Faerie', '', 2, '{1}{U}'))], basics({ Island: 37 })));
  assert.equal(wizardFavored.tribe, 'Wizard');
  const humanFavoredCards = Array.from({ length: 10 }, (_, index) => synthetic(`Human Wizard H${index}`, 'Creature — Human Wizard', index < 3 ? 'Humans you control have ward {1}.' : '', 2, '{1}{U}'));
  const humanFavored = analyze(shell('Human over Wizard', typalCommander('Human', 'Other Humans you control get +1/+1.'), [...humanFavoredCards, ...Array.from({ length: 12 }, (_, index) => synthetic(`Spirit ${index}`, 'Creature — Spirit', '', 2, '{1}{U}'))], basics({ Island: 37 })));
  assert.equal(humanFavored.tribe, 'Human');
  const mixedWizards = ['Human', 'Merfolk', 'Faerie', 'Vedalken'].flatMap(species => Array.from({ length: 3 }, (_, index) => synthetic(`${species} Wizard ${index}`, `Creature — ${species} Wizard`, index === 0 ? 'Other Wizards you control have ward {1}.' : '', 2, '{1}{U}')));
  const mixedResult = analyze(shell('Mixed Wizards', typalCommander('Wizard'), [...mixedWizards, ...Array.from({ length: 10 }, (_, index) => synthetic(`Mixed filler ${index}`, 'Creature — Illusion', '', 2, '{1}{U}'))], basics({ Island: 37 })));
  assert.equal(mixedResult.tribe, 'Wizard');
  const ambiguous = analyze(shell('Ambiguous Human Wizards', synthetic('Generic Leader', 'Legendary Creature — Human Wizard', 'Scry 1.', 3, '{2}{U}'), [...Array.from({ length: 10 }, (_, index) => synthetic(`Ambiguous ${index}`, 'Creature — Human Wizard', '', 2, '{1}{U}')), ...Array.from({ length: 12 }, (_, index) => synthetic(`Ambiguous filler ${index}`, 'Creature — Beast', '', 2, '{1}{U}'))], basics({ Island: 37 })));
  assert.equal(ambiguous.tribe, undefined); assert(!ambiguous.planSignals.includes('typal'));
  pass('Evidence-based typal detection supports Wizard, Soldier, Warrior, and Knight classes; resolves overlapping Human Wizard plans; and abstains on unsupported ties');

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
    // Keep image-button review deterministic without depending on an external CDN.
    if (new URL(request.url()).origin === 'https://cards.scryfall.io' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
    if (request.url().startsWith(baseUrl)) return route.continue();
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

async function assertStyleCounsel(page, expected) {
  const counsel = page.locator('.sage-style-guidance');
  assert.equal(await counsel.count(), 1, 'exactly one page-level style counsel');
  assert.match(await counsel.innerText(), expected);
  assert.equal(await page.locator('.upgrade-card .sage-style-guidance').count(), 0, 'counsel is not repeated inside cards');
  assert(!(await page.locator('.upgrade-card').allTextContents()).some(text => /(?:Aggressive|Patient|Unpredictable) emphasis:/.test(text)), 'cards do not repeat old playstyle boilerplate');
}

async function browserFixtures() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } }); await offline(context);
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message)); await page.goto(`${baseUrl}/#/home`);
    const [krenko, marwyn, lutri, tolabow, tana, tymna, kenrith] = await resolve(page, ['Krenko, Mob Boss', 'Marwyn, the Nurturer', 'Lutri, the Spellchaser', 'Tolabow, Loch Rascal', 'Tana, the Bloodsower', 'Tymna the Weaver', 'Kenrith, the Returned King']);
    const [archmage, restInPeace, puresteel, beastmaster, youngPyromancer, generousGift, onduInversion, treasureCruise, exsanguinate, draco, basaltMonolith, rings, thassasOracle, consultation, petitioners, evolutionSage, pitilessPlunderer, godsWilling, phyrexianArena] = await resolve(page, ['Archmage Emeritus', 'Rest in Peace', 'Puresteel Paladin', 'Beastmaster Ascension', 'Young Pyromancer', 'Generous Gift', 'Ondu Inversion // Ondu Skyruins', 'Treasure Cruise', 'Exsanguinate', 'Draco', 'Basalt Monolith', 'Rings of Brighthearth', "Thassa's Oracle", 'Demonic Consultation', 'Persistent Petitioners', 'Evolution Sage', 'Pitiless Plunderer', 'Gods Willing', 'Phyrexian Arena']);
    assert.equal(lutri.legalities.commander, 'legal'); pass('Current catalog preserves Lutri as Commander-legal while the official restriction remains companion-only');
    const catalogRamp = await resolve(page, ['Rampant Growth', 'Cultivate', "Kodama's Reach", "Nature's Lore", 'Three Visits', 'Farseek', 'Harrow', 'Roiling Regrowth', 'Knight of the White Orchid', 'Land Tax', 'Crop Rotation']);
    for (const card of catalogRamp.slice(0, 8)) assert.equal(analyze(shell(`Catalog ${card.name}`, krenko, [card], basics({ Mountain: 36 }))).rampCount, 1, `${card.name} catalog Oracle text should count as ramp`);
    assert.equal(analyze(shell('Catalog catch-up ramp', krenko, [catalogRamp[8]], basics({ Mountain: 36 }))).rampCount, .65);
    for (const card of catalogRamp.slice(9)) assert.equal(analyze(shell(`Catalog ${card.name}`, krenko, [card], basics({ Mountain: 36 }))).rampCount, 0, `${card.name} catalog Oracle text should not count as net ramp`);
    for (const card of catalogRamp.slice(0, 9)) assert((await worker(page, '/api/cards', null, { q: card.name, role: 'ramp', limit: 10 })).cards.some(result => result.name === card.name), `${card.name} should pass the worker ramp-role filter`);
    for (const card of catalogRamp.slice(9)) assert(!(await worker(page, '/api/cards', null, { q: card.name, role: 'ramp', limit: 10 })).cards.some(result => result.name === card.name), `${card.name} should fail the worker ramp-role filter`);
    pass('Current local catalog Oracle records reproduce the land-ramp positives and net-ramp negatives');

    const [solRing] = await resolve(page, ['Sol Ring']);
    const completeRampCards = [...catalogRamp.slice(0, 8), solRing, catalogRamp[8], catalogRamp[9], catalogRamp[10], archmage, ...Array.from({ length: 9 }, (_, index) => synthetic(`Ramp parity draw ${index}`, 'Enchantment', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{U}')), ...Array.from({ length: 40 }, (_, index) => synthetic(`Ramp parity filler ${index}`, 'Creature - Human', 'Vigilance', 2, '{1}{W}'))];
    const completeRampBasics = basics({ Plains: 8, Island: 8, Swamp: 7, Mountain: 7, Forest: 7 });
    const completeRampDeck = shell('Cross-engine ramp parity', kenrith, completeRampCards, completeRampBasics);
    const completeRampBalance = analyze(completeRampDeck);
    assert.equal(completeRampBalance.rampCount, 9.65); assert(!completeRampBalance.issues.some(issue => issue.id === 'ramp'), 'nine reliable and one conditional accelerant must not be diagnosed as missing ramp');
    const completeRampBody = { colors: ['W', 'U', 'B', 'R', 'G'], issues: completeRampBalance.issues, planSignals: completeRampBalance.planSignals, tribe: completeRampBalance.tribe || '', playstyle: 'balanced', deckCards: completeRampCards, commanders: [{ ...kenrith, role: 'primary' }], basicLands: completeRampBasics, targetSize: 100, existingOracleIds: completeRampCards.map(card => card.oracleId).filter(Boolean), existingNames: completeRampCards.map(card => card.name) };
    const completeRampWorker = await worker(page, '/api/recommendations', completeRampBody);
    assert.deepEqual(completeRampWorker.rampProfile, { reliable: 9, conditional: .65, burst: 0, weightedTotal: 9.65 }, 'worker ramp totals must match balance weights for the same complete legal deck');
    assert(!completeRampWorker.groups.some(group => group.issue.id === 'ramp'), 'the live worker caller must not fabricate a ramp gap absent from balance diagnosis');
    const parityCuts = new Set((completeRampWorker.suggestedCuts.cards || []).map(item => item.card.name));
    for (const card of [...catalogRamp.slice(0, 8), solRing]) assert(!parityCuts.has(card.name), `${card.name} must remain protected as reliable ramp`);
    assert(parityCuts.has('Archmage Emeritus'), 'the control cut should still surface while essential ramp is protected');
    const forcedRampIssue = { id: 'ramp', label: 'Mana acceleration', severity: 'important', current: 4, target: 9, evidence: 'Diagnostic forced ramp gap.', recommendation: 'Add reliable acceleration.', candidateRole: 'ramp' };
    const forcedRampWorker = await worker(page, '/api/recommendations', { ...completeRampBody, issues: [forcedRampIssue] });
    const rampGroup = forcedRampWorker.groups.find(group => group.issue.id === 'ramp'); assert(rampGroup?.cards.length, 'upgrade ranking should return ramp candidates for the diagnostic issue');
    assert.equal(classifyRampCard(rampGroup.cards[0].card).kind, 'reliable'); assert.match(rampGroup.cards[0].why, /repeatable or net-positive land acceleration/);
    pass('One complete legal deck stays consistent across balance diagnosis, worker weighted counts, upgrade explanations, and Suggested Cuts ramp guards');

    const issues = [
      { id: 'ramp', label: 'Mana acceleration', severity: 'important', evidence: 'Low ramp.', recommendation: 'Add ramp.', candidateRole: 'ramp' },
      { id: 'advantage', label: 'Sustained card advantage', severity: 'important', evidence: 'Low advantage.', recommendation: 'Add advantage.', candidateRole: 'advantage' },
      { id: 'interaction', label: 'Flexible interaction', severity: 'important', evidence: 'Low interaction.', recommendation: 'Add interaction.', candidateRole: 'interaction' },
      { id: 'finishers', label: 'Closing the game', severity: 'important', evidence: 'No finishers.', recommendation: 'Add a payoff.', candidateRole: 'finisher' }
    ];
    const commanderIssue = { id: 'commander_support', label: 'Commander engine support', severity: 'important', evidence: 'Tap engine lacks support.', recommendation: 'Add haste, untap, or protection.', candidateRole: 'commander_support' };
    const wizardCards = [...Array.from({ length: 20 }, (_, index) => synthetic(`Wizard body ${index}`, 'Creature — Human Wizard', index < 4 ? 'Other Wizards you control have ward {1}.' : '', 2, '{1}{U}')), ...Array.from({ length: 42 }, (_, index) => synthetic(`Wizard support ${index}`, 'Sorcery', 'Scry 1.', 2, '{1}{U}'))];
    const wizardStaples = ['Rhystic Study','Skullclamp','Idol of Oblivion','Mystic Remora','Archmage Emeritus',"Tocasia's Welcome",'Trouble in Pairs','Esper Sentinel','Phyrexian Arena','Black Market Connections','Morbid Opportunist','Professional Face-Breaker','Valakut Exploration','Guardian Project','Beast Whisperer','Toski, Bearer of Secrets','Return of the Wildspeaker'];
    const wizardRun = await worker(page, '/api/recommendations', { colors: ['U'], issues: [issues[1]], planSignals: ['typal'], tribe: 'Wizard', playstyle: 'balanced', deckCards: wizardCards, commanders: [], basicLands: basics({ Island: 38 }), targetSize: 100, existingOracleIds: [], existingNames: wizardStaples });
    const wizardCandidate = wizardRun.groups[0].cards.find(item => item.card.name === 'Azami, Lady of Scrolls');
    assert(wizardCandidate, 'supported Wizard evidence should make Azami eligible as repeatable card advantage'); assert.match(wizardCandidate.why, /Wizard support is already present from Wizard body/);
    for (const item of wizardRun.groups[0].cards) if (/Wizard support/.test(item.why)) assert(/\bWizards?\b/i.test(item.card.oracleText), `${item.card.name} must not receive a Wizard explanation without Wizard rules text`);
    pass('Wizard recommendations consume the corrected subtype evidence and never infer support from an unrelated word such as “other”');

    const cutNames = result => (result.suggestedCuts?.cards || []).map(item => item.card.name);
    const drawEngines = Array.from({ length: 9 }, (_, index) => synthetic(`Verified draw ${index}`, 'Enchantment', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{U}'));
    const tokenBodies = Array.from({ length: 18 }, (_, index) => synthetic(`Token soldier ${index}`, 'Creature - Soldier', index < 8 ? 'Create a 1/1 white Soldier creature token.' : 'Vigilance', 2, '{1}{W}'));
    const tokenFiller = Array.from({ length: 34 }, (_, index) => synthetic(`Token filler ${index}`, 'Creature - Soldier', 'Vigilance', 2, '{1}{W}'));
    const tokenCutBody = { colors: ['W', 'U', 'B', 'R', 'G'], issues: [], planSignals: ['tokens', 'typal'], tribe: 'Soldier', playstyle: 'balanced', deckCards: [...drawEngines, ...tokenBodies, ...tokenFiller, archmage], commanders: [{ ...kenrith, role: 'primary' }], basicLands: basics({ Plains: 10, Island: 8, Swamp: 6, Mountain: 6, Forest: 7 }), targetSize: 100, existingOracleIds: [], existingNames: [] };
    const tokenCuts = await worker(page, '/api/recommendations', tokenCutBody);
    assert(cutNames(tokenCuts).includes('Archmage Emeritus')); assert.match(tokenCuts.suggestedCuts.cards.find(item => item.card.name === 'Archmage Emeritus').why, /0 instant or sorcery cards/);
    for (const style of ['aggressive', 'patient', 'unpredictable']) assert(cutNames(await worker(page, '/api/recommendations', { ...tokenCutBody, playstyle: style })).includes('Archmage Emeritus'), `${style} ranking must not erase strong unsupported-payoff evidence`);
    const spellCardsForKeep = [...Array.from({ length: 24 }, (_, index) => synthetic(`Spell ${index}`, 'Instant', 'Scry 1.', 1, '{U}')), ...drawEngines.slice(0, 8), ...Array.from({ length: 29 }, (_, index) => synthetic(`Spell shell ${index}`, 'Artifact', '', 2, '{2}')), archmage];
    const spellKeep = await worker(page, '/api/recommendations', { ...tokenCutBody, planSignals: ['spellslinger'], tribe: '', deckCards: spellCardsForKeep });
    assert(!cutNames(spellKeep).includes('Archmage Emeritus'), 'the same commander and payoff must be retained when the full list actually supplies its spell engine');
    pass('Suggested Cuts uses full-list payoff evidence and saved styles only for ranking; the same commander produces different conclusions for different lists');

    const graveCardsForCut = [...Array.from({ length: 18 }, (_, index) => synthetic(`Grave engine ${index}`, 'Creature - Zombie', index < 10 ? 'Mill two cards.' : index < 14 ? 'Return target creature card from your graveyard to your hand.' : 'Whenever another creature dies, draw a card.', 3, '{2}{B}')), ...Array.from({ length: 43 }, (_, index) => synthetic(`Grave filler ${index}`, 'Creature - Fungus', 'Vigilance', 2, '{1}{G}')), restInPeace];
    const graveCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, colors: ['W', 'B', 'G'], planSignals: ['graveyard'], tribe: '', deckCards: graveCardsForCut, basicLands: basics({ Plains: 10, Swamp: 14, Forest: 13 }) });
    assert(cutNames(graveCuts).includes('Rest in Peace')); assert.match(graveCuts.suggestedCuts.cards.find(item => item.card.name === 'Rest in Peace').why, /14 enablers/); assert.match(graveCuts.suggestedCuts.cards.find(item => item.card.name === 'Rest in Peace').tradeoff, /graveyard interaction/);
    const equipmentCards = [...drawEngines.slice(0, 8), ...Array.from({ length: 20 }, (_, index) => synthetic(`Artifact ${index}`, 'Artifact', '{T}: Add {C}.', 2, '{2}')), synthetic('Only Equipment', 'Artifact - Equipment', 'Equipped creature gets +1/+1.', 2, '{2}'), ...Array.from({ length: 32 }, (_, index) => synthetic(`Equipment filler ${index}`, 'Creature - Human', 'Vigilance', 2, '{1}{W}')), puresteel];
    const equipmentCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, planSignals: ['artifacts'], tribe: '', deckCards: equipmentCards });
    assert(cutNames(equipmentCuts).includes('Puresteel Paladin')); assert.match(equipmentCuts.suggestedCuts.cards.find(item => item.card.name === 'Puresteel Paladin').why, /1 Equipment card/);
    const spellCutCards = [...Array.from({ length: 24 }, (_, index) => synthetic(`Blue instant ${index}`, 'Instant', 'Scry 1.', 1, '{U}')), ...Array.from({ length: 4 }, (_, index) => synthetic(`Spell finisher ${index}`, 'Sorcery', 'This spell deals 4 damage to each opponent.', 5, '{4}{R}')), ...Array.from({ length: 33 }, (_, index) => synthetic(`Spell artifact ${index}`, 'Artifact', '', 2, '{2}')), beastmaster];
    const spellCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, planSignals: ['spellslinger'], tribe: '', deckCards: spellCutCards });
    assert(cutNames(spellCuts).includes('Beastmaster Ascension')); assert.match(spellCuts.suggestedCuts.cards.find(item => item.card.name === 'Beastmaster Ascension').why, /0 creatures/);
    pass('Catalog-backed graveyard, Equipment/artifact, and spellslinger fixtures surface explicit conflicts and unsupported payoffs with current counts and tradeoffs');

    const protectedCards = [generousGift, onduInversion, treasureCruise, exsanguinate, draco, basaltMonolith, rings, thassasOracle, consultation, petitioners, evolutionSage, pitilessPlunderer, godsWilling];
    const protectedShell = [...Array.from({ length: 8 }, (_, index) => synthetic(`Counter maker ${index}`, 'Creature - Human', 'Put a +1/+1 counter on target creature, then proliferate.', 3, '{2}{G}')), ...Array.from({ length: 8 }, (_, index) => synthetic(`Sacrifice maker ${index}`, 'Creature - Human', 'Sacrifice another creature: Create a Treasure token.', 2, '{1}{B}')), ...Array.from({ length: 33 }, (_, index) => synthetic(`Protected filler ${index}`, 'Creature - Human', 'Vigilance', 2, '{1}{W}')), ...protectedCards];
    assert.equal(protectedShell.length, 62);
    const protectedRun = await worker(page, '/api/recommendations', { ...tokenCutBody, planSignals: ['tokens', 'counters', 'sacrifice', 'graveyard'], tribe: '', deckCards: protectedShell });
    for (const card of protectedCards) assert(!cutNames(protectedRun).includes(card.name), `${card.name} should clear safe-keep guards for roles, MDFCs, variable/alternate costs, win routes, combo packages, copy exceptions, or supported bridge plans`);
    pass('Safe-keep guards protect interaction, MDFCs, X/delve and high-MV payoffs, supported mixed-plan bridges, and known combo packages');

    const castabilityCards = [...drawEngines, ...tokenBodies, ...Array.from({ length: 34 }, (_, index) => synthetic(`Castability filler ${index}`, 'Creature - Soldier', 'Vigilance', 2, '{1}{W}')), phyrexianArena];
    const castabilityCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, colors: ['W', 'B'], planSignals: ['tokens'], tribe: '', deckCards: castabilityCards, basicLands: basics({ Plains: 37 }) });
    assert(cutNames(castabilityCuts).includes('Phyrexian Arena')); assert.match(castabilityCuts.suggestedCuts.cards.find(item => item.card.name === 'Phyrexian Arena').why, /no explicit source/);
    const partnerLibrary = [...drawEngines.slice(0, 8), ...tokenBodies.slice(0, 10), ...Array.from({ length: 42 }, (_, index) => synthetic(`Partner filler ${index}`, 'Creature - Saproling', 'Vigilance', 2, '{1}{G}')), puresteel];
    assert.equal(partnerLibrary.length, 61);
    const partnerCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, colors: ['W', 'B', 'R', 'G'], planSignals: ['tokens'], tribe: '', deckCards: partnerLibrary, commanders: [{ ...tana, role: 'primary' }, { ...tymna, role: 'partner' }], basicLands: basics({ Plains: 10, Swamp: 9, Mountain: 9, Forest: 9 }) });
    assert(cutNames(partnerCuts).includes('Puresteel Paladin')); assert(!partnerCuts.suggestedCuts.abstention, 'a 98-card library plus two partner commanders is a complete Commander deck');
    const partialCuts = await worker(page, '/api/recommendations', { ...tokenCutBody, deckCards: tokenCutBody.deckCards.slice(0, 45), basicLands: basics({ Plains: 20 }) });
    assert.equal(partialCuts.suggestedCuts.cards.length, 0); assert.match(partialCuts.suggestedCuts.abstention, /complete 100-card shell/);
    pass('Castability evidence, 98-card partner libraries, and partial-list abstention are handled without inventing weak cuts');

    const [blackMarketConnections] = await resolve(page, ['Black Market Connections']);
    const interactionWeakness = { id: 'interaction', label: 'Flexible interaction', severity: 'important', current: 1, target: 7, evidence: 'Only one precise answer was found.', recommendation: 'Add efficient answers that cover permanent types your colors can reach.', candidateRole: 'interaction' };
    const contextualTargets = { ramp: 8, advantage: 8, interaction: 7, wipe: 2, protection: 2, graveyard_hate: 1, finisher: 3, commander_support: 0 };
    const surplusDrawCards = [phyrexianArena, blackMarketConnections, ...Array.from({ length: 10 }, (_, index) => synthetic(`Surplus draw engine ${index}`, 'Enchantment', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{U}')), ...Array.from({ length: 50 }, (_, index) => synthetic(`Surplus shell ${index}`, 'Creature - Human', 'Vigilance', 2, '{1}{W}'))];
    const surplusBody = { colors: ['W', 'U', 'B', 'R', 'G'], issues: [interactionWeakness], roleTargets: contextualTargets, planSignals: [], tribe: '', playstyle: 'balanced', deckCards: surplusDrawCards, commanders: [{ ...kenrith, role: 'primary' }], basicLands: basics({ Plains: 8, Island: 8, Swamp: 7, Mountain: 7, Forest: 7 }), targetSize: 100, existingOracleIds: surplusDrawCards.map(card => card.oracleId).filter(Boolean), existingNames: surplusDrawCards.map(card => card.name) };
    const surplusRun = await worker(page, '/api/recommendations', surplusBody), strongNames = value => (value.suggestedCuts?.strongCards?.cards || []).map(item => item.card.name);
    const arenaSlot = surplusRun.suggestedCuts.strongCards.cards.find(item => item.card.name === 'Phyrexian Arena');
    assert(arenaSlot, 'a known strong single-role card should be optional when its contextual role remains meaningfully above target'); assert.equal(arenaSlot.weaknessId, 'interaction'); assert.deepEqual(arenaSlot.coverage, { role: 'advantage', before: 12, remaining: 11, target: 8 }); assert.match(arenaSlot.whyGood, /upkeep/i); assert.match(arenaSlot.whyOptional, /11 after this hypothetical removal/); assert.match(arenaSlot.impact, /still 3 above target/); assert.match(arenaSlot.slotPurpose, /Flexible interaction/); assert(arenaSlot.suggestedAddition?.name, 'the optional slot should reuse the grounded interaction recommendation'); assert.match(arenaSlot.suggestedAddition.why, /interaction|answer|exile|destroy|counter|return/i);
    assert(!strongNames(surplusRun).includes('Black Market Connections'), 'multi-role advantage and ramp must be protected even when both raw counts look high');
    assert([...new Set(cutNames(surplusRun))].every(name => !strongNames(surplusRun).includes(name)), 'a candidate must belong to at most one cut tier');
    for (const item of surplusRun.suggestedCuts.strongCards.cards) assert(item.coverage.remaining >= item.coverage.target + 2, `${item.card.name} must leave meaningful contextual coverage`);
    for (const style of ['aggressive', 'patient', 'unpredictable']) { const styled = await worker(page, '/api/recommendations', { ...surplusBody, playstyle: style }); assert(strongNames(styled).includes('Phyrexian Arena'), `${style} ranking must not erase a safely evidenced surplus slot`); }
    const tightDrawCards = [phyrexianArena, ...Array.from({ length: 8 }, (_, index) => synthetic(`Tight draw engine ${index}`, 'Enchantment', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{U}')), ...Array.from({ length: 53 }, (_, index) => synthetic(`Tight shell ${index}`, 'Creature - Human', 'Vigilance', 2, '{1}{W}'))];
    const tightRun = await worker(page, '/api/recommendations', { ...surplusBody, deckCards: tightDrawCards, existingOracleIds: tightDrawCards.map(card => card.oracleId).filter(Boolean), existingNames: tightDrawCards.map(card => card.name) });
    assert.equal(tightRun.suggestedCuts.strongCards.cards.length, 0); assert.match(tightRun.suggestedCuts.strongCards.abstention, /No strong card has enough contextual surplus/);
    const flexRun = await worker(page, '/api/recommendations', { ...surplusBody, issues: [] }); assert.equal(flexRun.suggestedCuts.strongCards.mode, 'flexibility'); assert(strongNames(flexRun).includes('Phyrexian Arena')); assert.match(flexRun.suggestedCuts.strongCards.cards.find(item => item.card.name === 'Phyrexian Arena').slotPurpose, /No diagnosed weakness/);
    const tightFlexRun = await worker(page, '/api/recommendations', { ...surplusBody, issues: [], deckCards: tightDrawCards, existingOracleIds: tightDrawCards.map(card => card.oracleId).filter(Boolean), existingNames: tightDrawCards.map(card => card.name) }); assert.equal(tightFlexRun.suggestedCuts.strongCards.cards.length, 0);
    const typalDraw = synthetic('Goblin Insight', 'Creature - Goblin', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{R}');
    const typalSurplusCards = [typalDraw, ...Array.from({ length: 10 }, (_, index) => synthetic(`Goblin draw support ${index}`, 'Enchantment', 'At the beginning of your upkeep, draw two cards.', 3, '{2}{R}')), ...Array.from({ length: 19 }, (_, index) => synthetic(`Protected Goblin ${index}`, 'Creature - Goblin', 'Haste', 2, '{1}{R}')), ...Array.from({ length: 32 }, (_, index) => synthetic(`Typal shell ${index}`, 'Artifact', '', 2, '{2}'))];
    const typalSurplusRun = await worker(page, '/api/recommendations', { ...surplusBody, colors: ['R'], planSignals: ['typal'], tribe: 'Goblin', deckCards: typalSurplusCards, basicLands: basics({ Mountain: 37 }), existingOracleIds: [], existingNames: typalSurplusCards.map(card => card.name) });
    assert(!strongNames(typalSurplusRun).includes('Goblin Insight'), 'a redundancy-dependent typal body stays protected despite apparent advantage surplus');
    const partialStrong = await worker(page, '/api/recommendations', { ...surplusBody, deckCards: surplusDrawCards.slice(0, 35), basicLands: basics({ Plains: 10, Island: 10 }) }); assert.equal(partialStrong.suggestedCuts.strongCards.cards.length, 0); assert.match(partialStrong.suggestedCuts.strongCards.abstention, /complete 100-card shell/);
    pass('Contextual surplus offers optional strong-card slots for a real weakness while protecting tight, multi-role, typal, balanced, and partial lists');

    const krenkoCards = [...Array.from({ length: 24 }, (_, index) => synthetic(`Goblin body ${index}`, 'Creature - Goblin', index < 8 ? 'Create a 1/1 red Goblin creature token.' : 'Haste', 2, '{1}{R}')), ...Array.from({ length: 38 }, (_, index) => synthetic(`Red support ${index}`, 'Sorcery', 'Target creature gets +1/+0 until end of turn.', 3, '{2}{R}'))];
    const request = { colors: ['R'], issues: [...issues, commanderIssue], roleTargets: { ramp: 8, advantage: 8, interaction: 7, wipe: 1, protection: 3, graveyard_hate: 1, finisher: 3, commander_support: 4 }, planSignals: ['tokens', 'typal', 'tap_commander', 'commander_tokens'], tribe: 'Goblin', playstyle: 'balanced', forestTargets: 0, humanRatio: 0, deckCards: krenkoCards, commanders: [{ ...krenko, role: 'primary' }], basicLands: basics({ Mountain: 37 }), targetSize: 100, existingOracleIds: [krenko.oracleId], existingNames: [krenko.name] };
    const cacheShapeChange = { ...request, deckCards: request.deckCards.map((card, index) => index ? card : { ...card, manaCost: '{R}{R}', layout: 'normal', faces: [{ name: `${card.name} face`, type_line: card.typeLine, oracle_text: card.oracleText }] }) };
    const sequence = await workerSequence(page, [{ path: '/api/recommendations', body: request }, { path: '/api/recommendations', body: request }, { path: '/api/recommendations', body: { ...request, playstyle: 'aggressive' } }, { path: '/api/recommendations', body: cacheShapeChange }, { path: '/api/recommendations', body: { ...request, roleTargets: { ...request.roleTargets, advantage: 9 } } }]), [first, second, styleMiss, shapeMiss, targetMiss] = sequence.results, [coldMs, cacheMs, styleMs, shapeMs, targetMs] = sequence.durations;
    report.performance = { coldWorkerRecommendationMs: coldMs, cachedRecommendationMs: cacheMs, warmStyleMissMs: styleMs, cardShapeMissMs: shapeMs, roleTargetMissMs: targetMs };
    assert(coldMs < 8000, `cold worker recommendation should remain interactive; took ${coldMs}ms`);
    const names = value => value.groups.map(group => [group.issue.id, group.cards.map(item => item.card.name)]);
    assert.deepEqual(names(first), names(second));
    assert.equal(first.cacheStatus, 'miss'); assert.equal(second.cacheStatus, 'hit'); assert.equal(styleMiss.cacheStatus, 'miss'); assert.equal(shapeMiss.cacheStatus, 'miss'); assert.equal(targetMiss.cacheStatus, 'miss'); assert.equal(first.algorithmVersion, '2026-10-23.1');
    pass('Recommendation cache hits only for the same full deck, card faces/costs, commander, style, contextual targets, algorithm, and data snapshot');
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
    for (const styled of [first, styleMiss, patientRun, unpredictableRun]) {
      const cards = styled.groups.flatMap(group => group.cards);
      assert(cards.length > 0, 'style copy check must exercise populated recommendations');
      assert(cards.every(item => !/(?:Aggressive|Patient|Unpredictable) emphasis:/.test(item.why)), 'playstyle counsel belongs once above the results, not on every card');
      assert(cards.every(item => item.why.length > 25), 'individual card benefits remain after boilerplate removal');
    }
    assert(['Sol Ring','Arcane Signet','Mind Stone'].includes(styleMiss.groups.find(group => group.issue.id === 'ramp').cards[0].card.name), `Aggressive emphasis cannot displace reliable acceleration with burst or conditional ramp; received ${JSON.stringify(names(styleMiss))}`);
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

    const [hyrax, temurSabertooth, staffOfDomination, umbralMantle, wirewoodLodge, celeborn, glorfindel, aggressiveMammoth, dawnsTruce, savaenElves, elvishArchdruid, priestOfTitania, wirewoodSymbiote, quirionRanger, imperiousPerfect] = await resolve(page, ['Hyrax Tower Scout', 'Temur Sabertooth', 'Staff of Domination', 'Umbral Mantle', 'Wirewood Lodge', 'Celeborn the Wise', 'Glorfindel, Dauntless Rescuer', 'Aggressive Mammoth', "Dawn's Truce", 'Savaen Elves', 'Elvish Archdruid', 'Priest of Titania', 'Wirewood Symbiote', 'Quirion Ranger', 'Imperious Perfect']);
    assert([hyrax, temurSabertooth, staffOfDomination, umbralMantle, wirewoodLodge, celeborn, glorfindel, aggressiveMammoth, dawnsTruce, savaenElves, elvishArchdruid, priestOfTitania, wirewoodSymbiote, quirionRanger, imperiousPerfect].every(Boolean), 'the sanitized Marwyn fixture must resolve every real card from the local catalog');
    const marwynShapeCards = [solRing, hyrax, temurSabertooth, staffOfDomination, umbralMantle, wirewoodLodge, celeborn, glorfindel, aggressiveMammoth, dawnsTruce, savaenElves, elvishArchdruid, priestOfTitania, wirewoodSymbiote, quirionRanger, imperiousPerfect,
      ...Array.from({ length: 14 }, (_, index) => synthetic(`Sanitized Elf body ${index}`, 'Creature - Elf Druid', index < 5 ? '{T}: Add {G}.' : 'Vigilance', 2, '{1}{G}')),
      ...Array.from({ length: 6 }, (_, index) => synthetic(`Sanitized land ramp ${index}`, 'Sorcery', 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.', 2, '{1}{G}')),
      ...Array.from({ length: 3 }, (_, index) => synthetic(`Sanitized interaction ${index}`, 'Instant', 'Destroy target artifact or enchantment.', 2, '{1}{G}')),
      synthetic('Sanitized protection', 'Instant', 'Permanents you control gain hexproof and indestructible until end of turn.', 2, '{1}{G}'),
      ...Array.from({ length: 26 }, (_, index) => synthetic(`Sanitized utility ${index}`, index < 9 ? 'Creature - Elf Warrior' : 'Creature - Beast', index < 9 ? 'Reach' : 'Trample', 3, '{2}{G}'))];
    assert.equal(marwynShapeCards.reduce((sum, card) => sum + Number(card.quantity || 1), 0), 66, 'sanitized Marwyn shape plus 33 basics and its commander must be a complete 100-card fixture');
    const marwynShapeIssues = [
      { id: 'interaction', label: 'Flexible interaction', severity: 'important', current: 3, target: 8, evidence: 'Three answers found.', recommendation: 'Add efficient answers.', candidateRole: 'interaction' },
      { id: 'protection', label: 'Protection', severity: 'important', current: 1, target: 3, evidence: 'One protection spell found.', recommendation: 'Add resilient protection.', candidateRole: 'protection' },
      { id: 'graveyard_hate', label: 'Graveyard counterplay', severity: 'watch', current: 0, target: 1, evidence: 'No graveyard answer found.', recommendation: 'Add one graveyard answer.', candidateRole: 'graveyard_hate' }
    ];
    const marwynShapeBody = { colors: ['G'], issues: marwynShapeIssues, roleTargets: { ramp: 8, advantage: 8, interaction: 8, wipe: 2, protection: 3, graveyard_hate: 1, finisher: 3, commander_support: 5 }, planSignals: ['typal', 'counters', 'tap_commander', 'mana_engine'], tribe: 'Elf', playstyle: 'unpredictable', forestTargets: 33, humanRatio: 0, deckCards: marwynShapeCards, commanders: [{ ...marwyn, role: 'primary' }], basicLands: basics({ Forest: 33 }), targetSize: 100, existingOracleIds: marwynShapeCards.map(card => card.oracleId).filter(Boolean), existingNames: marwynShapeCards.map(card => card.name) };
    const marwynShapeRun = await worker(page, '/api/recommendations', marwynShapeBody), marwynShapeStrong = strongNames(marwynShapeRun), marwynShapeSwapCuts = marwynShapeRun.groups.flatMap(group => group.cards.map(item => item.swap?.cut?.name).filter(Boolean));
    for (const protectedName of ['Sol Ring', 'Hyrax Tower Scout', 'Wirewood Lodge']) { assert(!marwynShapeStrong.includes(protectedName), `${protectedName} must not be offered as an optional cut while its structural contribution remains proved`); assert(!marwynShapeSwapCuts.includes(protectedName), `${protectedName} must not be used as the hidden cut in an add/remove swap`); }
    assert(!marwynShapeSwapCuts.includes('Aggressive Mammoth'), 'a board-wide combat payoff must not become the default hidden swap cut merely because it has a high mana value');
    assert(marwynShapeStrong.includes('Celeborn the Wise'), `a lower-impact typal body with a real but modest scry bridge should remain reviewable; received ${JSON.stringify(marwynShapeStrong)}`);
    const celebornSlot = marwynShapeRun.suggestedCuts.strongCards.cards.find(item => item.card.name === 'Celeborn the Wise'); assert.match(`${celebornSlot.whyOptional} ${celebornSlot.tradeoff}`, /scry enables Glorfindel/i); assert.match(celebornSlot.whyOptional, /30 qualifying pieces now, 29 after this hypothetical removal/i);
    report.beforeAfter.marwynCutSafety = { before: ['Sol Ring', 'Hyrax Tower Scout', 'Wirewood Lodge'], after: marwynShapeStrong, swapCuts: marwynShapeSwapCuts, repair: 'Raw surplus is now only an eligibility gate; card quality and verified commander-engine dependencies control ranking in both recommendation tiers and swaps.' };
    pass('Sanitized Marwyn-shaped regression protects Sol Ring, repeatable Hyrax and Wirewood Lodge engine links while keeping Celeborn reviewable with its exact typal and scry tradeoff');

    const tapLeader = { ...synthetic('Tap Engine Leader', 'Legendary Creature - Artificer', '{T}: Create a 1/1 colorless Servo artifact creature token.', 3, '{2}{U}'), colorIdentity: ['U'] };
    const replayableUntapper = synthetic('Replayable Untapper', 'Creature - Scout', 'When Replayable Untapper enters, untap target creature.', 3, '{2}{U}');
    const bounceEngine = synthetic('Repeatable Recast Engine', 'Creature - Beast', "{1}{U}: Return another creature you control to its owner's hand.", 4, '{3}{U}');
    const hasteSupport = Array.from({ length: 10 }, (_, index) => synthetic(`Haste support ${index}`, 'Instant', 'Target creature gains haste and hexproof until end of turn.', 1, '{R}'));
    const engineFiller = Array.from({ length: 50 }, (_, index) => synthetic(`Engine negative control ${index}`, 'Creature - Citizen', 'Vigilance', 2, '{1}{U}'));
    const engineBody = { colors: ['U', 'R'], issues: [interactionWeakness], roleTargets: { ...contextualTargets, commander_support: 5 }, planSignals: ['tap_commander', 'tokens'], tribe: '', playstyle: 'balanced', deckCards: [replayableUntapper, bounceEngine, ...hasteSupport, ...engineFiller], commanders: [{ ...tapLeader, role: 'primary' }], basicLands: basics({ Island: 19, Mountain: 18 }), targetSize: 100, existingOracleIds: [], existingNames: [] };
    const withReplay = await worker(page, '/api/recommendations', engineBody); assert(!strongNames(withReplay).includes('Replayable Untapper'), 'an ETB untapper must be protected when a repeatable recast engine can replay it against a productive tap commander');
    const withoutReplay = await worker(page, '/api/recommendations', { ...engineBody, deckCards: [replayableUntapper, synthetic('Ordinary replacement', 'Creature - Citizen', 'Vigilance', 4, '{3}{U}'), ...hasteSupport, ...engineFiller] }); assert(strongNames(withoutReplay).includes('Replayable Untapper'), 'the same one-shot untapper must become reviewable when the replay dependency is removed and commander support stays redundant');
    const forestOnlyUntapper = synthetic('Forest-Only Untapper', 'Creature - Scout', 'When Forest-Only Untapper enters, untap target Forest.', 3, '{2}{G}');
    const forestControl = await worker(page, '/api/recommendations', { ...engineBody, colors: ['G', 'R'], deckCards: [forestOnlyUntapper, ...hasteSupport, ...engineFiller], commanders: [{ ...tapLeader, colorIdentity: ['G', 'R'], manaCost: '{2}{G}', role: 'primary' }], basicLands: basics({ Forest: 20, Mountain: 18 }) }); assert(forestControl.groups.flatMap(group => group.cards.map(item => item.swap?.cut?.name)).includes('Forest-Only Untapper'), 'a restricted untapper that cannot reach the saved tap engine must stay eligible for a low-risk swap instead of receiving fabricated structural protection');
    pass('General engine dependency tests distinguish repeatable ETB reuse from one-shot untap and reject unsupported target matches instead of globally protecting untappers');

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
    const cutUiDeck = { ...deck, id: 'suggested-cuts-ui', name: 'Suggested Cuts QA', commander: kenrith.name, commanderCard: kenrith, commanders: [{ ...kenrith, role: 'primary' }], cards: tokenCutBody.deckCards, basicLands: tokenCutBody.basicLands };
    const strongCutUiDeck = { ...deck, id: 'strong-cuts-ui', name: 'Strong Optional Cuts QA', commander: kenrith.name, commanderCard: kenrith, commanders: [{ ...kenrith, role: 'primary' }], cards: surplusBody.deckCards, basicLands: surplusBody.basicLands };
    const blockedCompanion = { ...deck, id: 'companion-guard', name: 'Companion Guard', commanders: [{ ...krenko, role: 'primary' }, { ...lutri, role: 'companion' }] };
    const tolabowDeck = { ...deck, id: 'tolabow-guard', name: 'Tolabow Guard', commander: tolabow.name, commanderCard: tolabow, commanders: [{ ...tolabow, role: 'primary' }], cards: filler.map(card => ({ ...card, colorIdentity: ['U'], manaCost: '{1}{U}', typeLine: 'Instant', oracleText: 'Draw a card.' })), basicLands: basics({ Island: 37 }) };
    const partnerDeck = { ...deck, id: 'partner-guard', name: 'Partner Guard', commander: `${tana.name} + ${tymna.name}`, commanderCard: tana, commanders: [{ ...tana, role: 'primary' }, { ...tymna, role: 'partner' }], basicLands: basics({ Plains: 10, Swamp: 9, Mountain: 9, Forest: 9 }) };
    await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([blockedCompanion, tolabowDeck, partnerDeck]) });
    for (const [id, phrase] of [['companion-guard', 'bans it specifically as a companion'], ['tolabow-guard', 'chosen outside color']]) { await page.goto(`${baseUrl}/#/decks/${id}`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.getByText(new RegExp(phrase), { exact: false }).waitFor(); }
    await page.goto(`${baseUrl}/#/decks/partner-guard`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.locator('.upgrade-group').first().waitFor({ timeout: 20000 }); assert.equal(await page.getByText(/stored Oracle text does not prove/, { exact: false }).count(), 0);
    pass('Browser identity guards block Lutri-as-companion and unresolved Tolabow choices while accepting a verified partner pairing');
    await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([cutUiDeck, strongCutUiDeck]) });
    await page.goto(`${baseUrl}/#/decks/${cutUiDeck.id}`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click();
    await page.locator('.suggested-cut-card').first().waitFor({ timeout: 20000 }); assert.equal(await page.locator('.upgrade-card').count() > 0, true); assert.equal(await page.locator('[data-oracle-id]').count(), await page.locator('.upgrade-card:not(.suggested-cut-card):not(.suggested-strong-card)').count()); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.locator('[data-cut-card="Archmage Emeritus"]').count(), 1); assert.match(await page.locator('[data-cut-card="Archmage Emeritus"]').innerText(), /0 instant or sorcery cards[\s\S]*Keep it if[\s\S]*card advantage/); assert.equal(await page.locator('.suggested-strong-card').count(), 0); assert(await page.getByRole('heading', { name: 'Poor-fit or conflicting cards', exact: true }).count()); assert(await page.getByRole('heading', { name: 'Strong cards you could make room with', exact: true }).count()); assert.equal(await page.locator('.suggested-cuts').getByRole('button', { name: /delete|remove/i }).count(), 0);
    await page.locator('[data-cut-card="Archmage Emeritus"]').getByRole('button', { name: 'Review card' }).click(); await page.getByText('Format legalities', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Close dialog' }).click();
    assert.equal(await page.getByRole('radio').count(), 4); assert.equal(await page.getByRole('radio', { name: /Balanced/ }).getAttribute('aria-checked'), 'true'); await assertStyleCounsel(page, /weigh the whole plan/); assert(await page.getByText(/independently evaluated alternative/, { exact: false }).count() >= 1);
    await page.getByRole('radio', { name: /Aggressive/ }).click(); await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'aggressive', storageKey); await page.getByText(/with aggressive ranking emphasis/i).waitFor({ timeout: 20000 }); await assertStyleCounsel(page, /You favor a swift victory/);
    await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.locator('.upgrade-group').first().waitFor({ timeout: 20000 }); assert.equal(await page.getByRole('radio', { name: /Aggressive/ }).getAttribute('aria-checked'), 'true'); await assertStyleCounsel(page, /You favor a swift victory/);
    const aggressiveRadio = page.getByRole('radio', { name: /Aggressive/ }); await aggressiveRadio.focus(); await aggressiveRadio.press('ArrowRight'); await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'patient', storageKey); await page.getByText(/with patient ranking emphasis/i).waitFor({ timeout: 20000 }); assert.equal(await page.getByRole('radio', { name: /Patient/ }).getAttribute('aria-checked'), 'true'); await assertStyleCounsel(page, /You favor the long game/);
    pass('Desktop playstyle selection persists locally, reloads, and supports radio-keyboard navigation');
    await page.goto(`${baseUrl}/#/decks/${strongCutUiDeck.id}`); await page.reload(); await page.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await page.locator('[data-strong-cut-card="Phyrexian Arena"]').waitFor({ timeout: 20000 }); assert.equal(await page.locator('.suggested-cut-card').count(), 0); const strongArena = page.locator('[data-strong-cut-card="Phyrexian Arena"]'); assert.match(await strongArena.innerText(), /Why it is good[\s\S]*11 after this hypothetical removal[\s\S]*Removal check[\s\S]*Make room for[\s\S]*Keep it if/i); assert.equal(await page.locator('.strong-cut-tier').getByRole('button', { name: /delete|remove|add to deck/i }).count(), 0);
    for(let review=0;review<2;review++){await strongArena.getByRole('button',{name:'Review card',exact:true}).click();await page.getByText('Format legalities',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();}
    await page.screenshot({ path: path.join(__dirname, 'commander-upgrades-desktop.png'), fullPage: true });
    const firstCard = page.locator('.upgrade-card:not(.suggested-cut-card):not(.suggested-strong-card)').first(), firstCardName = await firstCard.locator('.card-title').innerText(); await firstCard.locator('.upgrade-card-image').click(); await page.getByText('Format legalities', { exact: true }).waitFor(); assert(await page.locator('.card-faces, .rules-text').count()); await page.getByRole('button', { name: 'Close dialog' }).click();
    await firstCard.getByRole('button', { name: 'Add to deck', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); assert(!(await page.locator('.inventory-table').allTextContents()).join(' ').includes(firstCardName));
    pass('Desktop Upgrades renders separate poor-fit and optional-strong tiers, populated and empty states, repeated review, and canceled add without mutations');
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' }); await offline(mobile);
    const phone = await mobile.newPage(); phone.on('pageerror', error => report.errors.push(error.message)); await phone.goto(`${baseUrl}/#/home`); await phone.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, value: siteState([strongCutUiDeck]) }); await phone.goto(`${baseUrl}/#/decks/${strongCutUiDeck.id}`); await phone.reload(); await phone.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await phone.locator('[data-strong-cut-card="Phyrexian Arena"]').waitFor({ timeout: 20000 }); assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); assert.equal(await phone.locator('.playstyle-picker > div').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2); assert.equal(await phone.locator('.suggested-cut-card').count(), 0); assert.equal(await phone.locator('[data-strong-cut-card="Phyrexian Arena"]').count(), 1); await phone.locator('[data-strong-cut-card="Phyrexian Arena"]').getByRole('button',{name:'Review card',exact:true}).click();await phone.getByText('Format legalities',{exact:true}).waitFor();await phone.getByRole('button',{name:'Close dialog'}).click(); await phone.getByRole('radio', { name: /Unpredictable/ }).click(); await phone.waitForFunction(key => JSON.parse(localStorage.getItem(key)).decks[0].playstyle === 'unpredictable', storageKey); await phone.getByText(/with unpredictable ranking emphasis/i).waitFor({ timeout: 20000 }); await assertStyleCounsel(phone, /keep rivals guessing/); await phone.screenshot({ path: path.join(__dirname, 'commander-upgrades-mobile.png'), fullPage: true });
    await phone.reload(); await phone.getByRole('tab', { name: 'Upgrades', exact: true }).click(); await phone.locator('[data-strong-cut-card="Phyrexian Arena"]').waitFor({ timeout: 20000 }); assert.equal(await phone.getByRole('radio', { name: /Unpredictable/ }).getAttribute('aria-checked'), 'true'); await assertStyleCounsel(phone, /keep rivals guessing/); assert.equal(await phone.locator('[data-strong-cut-card="Phyrexian Arena"]').count(), 1);
    pass('Mobile optional-strong populated and poor-fit empty states fit without overflow, review safely, and persist style after reload'); await mobile.close();

    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalWrites, []); pass('Recommendation QA produced no browser runtime errors or external writes');
  } finally { await browser.close(); }
}

async function run() { analysisFixtures(); await browserFixtures(); report.finishedAt = new Date().toISOString(); }
run().catch(error => { report.failure = error.stack; console.error(error.stack); process.exitCode = 1; }).finally(() => fs.writeFileSync(path.join(__dirname, 'commander-upgrades-report.json'), JSON.stringify(report, null, 2)));
