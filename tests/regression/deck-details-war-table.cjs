const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const report = { checks: [], errors: [], externalWrites: [], startedAt: new Date().toISOString() };

function pass(name) { report.checks.push(name); console.log('PASS', name); }
function watch(page) { page.on('pageerror', error => report.errors.push(error.message)); }
async function routeOffline(context) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.url().endsWith('/account-config.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' });
    if (url.origin === 'https://api.scryfall.com') return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [], has_more: false }) });
    if (url.origin === 'https://cards.scryfall.io' && request.method() === 'GET') return route.continue();
    if (request.url().startsWith(baseUrl)) return route.continue();
    if (request.method() !== 'GET') report.externalWrites.push(request.url());
    return route.abort();
  });
}
async function readState(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function seed(page, fixture, route = '#/decks/war-table-fixture') {
  await page.goto(`${baseUrl}/#/home`);
  await page.evaluate(({ key, fixture }) => { localStorage.setItem(key, JSON.stringify(fixture)); localStorage.setItem('deck-sage-browser-only-choice-v1', '1'); }, { key: storageKey, fixture });
  await page.goto(`${baseUrl}/${route}`);
  await page.reload();
}
function card(name, identity, extra = {}) {
  return { id: name.toLowerCase().replaceAll(' ', '-'), oracleId: `oracle-${name}`, name, colorIdentity: identity, typeLine: 'Artifact', manaCost: '{2}', cmc: 2, quantity: 1, cardVariant: 'Normal', prices: { usd: '1.25' }, oracleText: 'Fixture rules text.', metadataComplete: true, ...extra };
}
function luminance(hex) { const values = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]; }
function contrast(a, b) { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + .05) / (low + .05); }
function themedDeck(id, name, commander, partner = null) {
  return { id, name, commander: [commander, partner].filter(Boolean).map(item => item.name).join(' + '), commanderCard: commander, commanders: [{ ...commander, role: 'primary' }, ...(partner ? [{ ...partner, role: 'partner' }] : [])], format: 'Commander', status: 'active', cards: [], basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0, Wastes: 0 }, notes: '', createdAt: '2026-10-13T12:00:00.000Z' };
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await routeOffline(desktop);
    const page = await desktop.newPage(); watch(page);
    await page.goto(`${baseUrl}/#/home`);
    const original = await readState(page) || { version: 1, profile: { name: 'Planeswalker', username: '', avatar: 1, role: 'Player', bio: '' }, decks: [], retainedDeckRecords: [], bulk: [], favorites: [], contacts: [], stores: [], notifications: [], settings: { theme: 'forest', motion: true, images: true, notificationInbox: true } };
    const primary = card('Tymna the Weaver', ['W', 'B'], { role: 'primary', typeLine: 'Legendary Creature - Human Cleric', manaCost: '{1}{W}{B}', imageUrl: '' });
    const partner = card('Kraum, Ludevic’s Opus', ['U', 'R'], { role: 'partner', typeLine: 'Legendary Creature — Zombie Horror', imageUrl: '' });
    const mainDeck = { ...themedDeck('war-table-fixture', 'Four Color Council', primary, partner), cards: [card('Arcane Signet', []), card('Sol Ring', [], { quantity: 2, cmc: 1, manaCost: '{1}', prices: { usd: '2.10' } })], basicLands: { Plains: 1, Island: 2, Swamp: 3, Mountain: 4, Forest: 5, Wastes: 6 }, notes: 'Opening plan' };
    const themeCases = [
      ['theme-white', 'White Theme', card('White Lead', ['W'], { manaCost: '{2}{W}{W}' }), 'W'],
      ['theme-blue', 'Blue Theme', card('Blue Lead', ['U'], { manaCost: '{1}{U}{U}' }), 'U'],
      ['theme-black', 'Black Theme', card('Black Lead', ['B'], { manaCost: '{2}{B}' }), 'B'],
      ['theme-red', 'Krenko Red Theme', card('Krenko, Mob Boss', ['R'], { id: '824b2d73-2151-4e5e-9f05-8f63e2bdcaa9', oracleId: '68418069-f615-40ef-ae0d-764192acae00', manaCost: '{2}{R}{R}', typeLine: 'Legendary Creature - Goblin Warrior', imageUrl: 'https://cards.scryfall.io/large/front/8/2/824b2d73-2151-4e5e-9f05-8f63e2bdcaa9.jpg?1783909065' }), 'R'],
      ['theme-green', 'Marwyn Green Theme', card('Marwyn, the Nurturer', ['G'], { id: 'aad61d99-5c8e-47b7-ab1a-e70905f59205', oracleId: 'ee35de1c-aef1-4bd4-85fd-fe77bc927790', manaCost: '{2}{G}', typeLine: 'Legendary Creature - Elf Druid', imageUrl: 'https://cards.scryfall.io/large/front/a/a/aad61d99-5c8e-47b7-ab1a-e70905f59205.jpg?1783928311' }), 'G'],
      ['theme-colorless', 'Colorless Theme', card('Colorless Lead', [], { manaCost: '{7}' }), 'C'],
      ['theme-dominant', 'Dominant Blue Theme', card('Blue White Lead', ['W', 'U'], { manaCost: '{1}{U}{U}{W}' }), 'U'],
      ['theme-tie', 'Stable White Tie', card('White Blue Tie', ['W', 'U'], { manaCost: '{W}{U}' }), 'W'],
      ['theme-explicit', 'Explicit Black Theme', card('Black Green Lead', ['B', 'G'], { manaCost: '{G}{G}{G}', primaryColor: 'B' }), 'B'],
      ['theme-dfc', 'DFC Black Theme', card('Two Faced Lead', ['U', 'B'], { manaCost: '', faces: [{ mana_cost: '{1}{B}{B}' }, { mana_cost: '{U}' }] }), 'B']
    ];
    const missingDeck = { ...themedDeck('theme-missing', 'Missing Theme Metadata', card('Temporary', [], {})), commander: '', commanderCard: null, commanders: [] };
    const fixture = { ...original, decks: [mainDeck, ...themeCases.map(([id, name, commander]) => themedDeck(id, name, commander)), missingDeck] };
    await seed(page, fixture);
    await page.getByRole('heading', { name: 'Four Color Council', exact: true }).waitFor();

    assert.equal(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.war-table-header').count(), 1);
    assert.equal(await page.locator('.war-table-commander').count(), 2);
    assert.deepEqual(await page.locator('.war-table-commander figcaption').allTextContents(), ['Primary', 'Partner']);
    assert.deepEqual(await page.locator('.war-table-meta .sanctum-identity i').allTextContents(), ['W', 'U', 'B', 'R']);
    assert.equal(await page.locator('.war-table-page').getAttribute('data-war-primary'), 'W');
    assert.match(await page.locator('.war-table-page').getAttribute('style'), /--war-primary/);
    for (const asset of ['background.webp', 'banner.webp', 'panel-frame.webp', 'divider.webp', 'land-plains.webp', 'land-island.webp', 'land-swamp.webp', 'land-mountain.webp', 'land-forest.webp', 'land-wastes.webp']) assert.equal((await page.request.get(`${baseUrl}/deck-details/${asset}`)).status(), 200, asset);
    pass('Supplied War Table art, horizontal shell, partner roles, and complete four-color identity render independently of the white lead theme');

    const themeSurfaces = new Map();
    for (const [id, name, , expected] of themeCases) {
      await page.goto(`${baseUrl}/#/decks/${id}`);
      await page.getByRole('heading', { name, exact: true }).waitFor();
      assert.equal(await page.locator('.war-table-page').getAttribute('data-war-primary'), expected, name);
      const theme = await page.locator('.war-table-page').evaluate(el => { const style = getComputedStyle(el); return { primary: style.getPropertyValue('--war-primary').trim(), onPrimary: style.getPropertyValue('--war-on-primary').trim() }; });
      assert(contrast(theme.primary, theme.onPrimary) >= 4.5, `${name} primary button contrast`);
      const surface = await page.locator('.war-table-panel').first().evaluate(el => getComputedStyle(el).backgroundImage);
      themeSurfaces.set(expected, surface);
      assert.match(surface, /gradient/);
    }
    assert.equal(new Set(['W', 'U', 'B', 'R', 'G', 'C'].map(color => themeSurfaces.get(color))).size, 6);
    await page.goto(`${baseUrl}/#/decks/theme-missing`);
    await page.getByRole('heading', { name: 'Missing Theme Metadata', exact: true }).waitFor();
    assert.equal(await page.locator('.war-table-page').getAttribute('data-war-primary'), 'C');
    await page.locator('.war-table-back').focus();
    const focusStyle = await page.locator('.war-table-back').evaluate(el => { const style = getComputedStyle(el); return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }; });
    assert.notEqual(focusStyle.outlineStyle, 'none'); assert(Number.parseFloat(focusStyle.outlineWidth) >= 2);
    for (const [id, filename] of [['theme-green', 'deck-details-theme-marwyn-green.png'], ['theme-red', 'deck-details-theme-krenko-red.png']]) {
      await page.goto(`${baseUrl}/#/decks/${id}`);
      await page.locator('.war-table-commander img.card-thumb').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('.war-table-commander img.card-thumb')?.complete);
      await page.screenshot({ path: path.join(__dirname, filename), fullPage: false });
    }
    await page.goto(`${baseUrl}/#/decks/war-table-fixture`);
    await page.getByRole('heading', { name: 'Four Color Council', exact: true }).waitFor();
    pass('W/U/B/R/G/colorless, dominant mana, WUBRG tie-break, explicit primary, DFC, partner isolation, missing metadata, route switching, and Marwyn/Krenko comparison screenshots are deterministic');

    const tabs = ['Cards', 'Balance', 'Sage rating', 'Strategy', 'Upgrades', 'Gameplay Coach'];
    for (const name of tabs.slice(1)) {
      await page.getByRole('tab', { name, exact: true }).click();
      assert.equal(await page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true');
    }
    assert.equal(await page.getByText('Your game note stays in this browser.').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Enable local AI', exact: true }).count(), 1);
    await page.screenshot({ path: path.join(__dirname, 'gameplay-coach-desktop.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Cards', exact: true }).click();
    pass('All five preserved deck-analysis tabs and the opt-in Gameplay Coach switch into real tabpanels without starting the model');

    await page.getByRole('textbox', { name: 'Quick add a card', exact: true }).fill('Command Tower');
    await page.locator('.picker-results button').first().waitFor();
    await page.locator('.picker-results button').first().click();
    assert.equal(await page.locator('.inventory-table tbody tr').count(), 3);
    await page.getByRole('textbox', { name: 'Filter collection cards', exact: true }).fill('Arcane');
    assert.equal(await page.locator('.inventory-table tbody tr').count(), 1);
    await page.getByRole('textbox', { name: 'Filter collection cards', exact: true }).fill('');
    await page.getByRole('combobox', { name: 'Sort collection', exact: true }).selectOption('value');
    await page.getByRole('spinbutton', { name: 'Quantity of Sol Ring', exact: true }).fill('4');
    await page.reload();
    assert.equal(await page.getByRole('spinbutton', { name: 'Quantity of Sol Ring', exact: true }).inputValue(), '4');
    pass('Quick add, search, sort, quantity, variant/price table, and reload persistence work');

    await page.getByRole('button', { name: 'Remove Arcane Signet', exact: true }).click();
    await page.getByRole('button', { name: 'Keep card', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Remove Arcane Signet', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Remove Arcane Signet', exact: true }).click();
    await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Remove Arcane Signet', exact: true }).count(), 0);
    pass('Remove flow cancels safely, then confirms once without a repeated action');

    await page.getByRole('button', { name: 'Import decklist', exact: true }).click();
    await page.getByRole('textbox', { name: 'Card list to import', exact: true }).fill('1 Arcane Signet\n2 Forest');
    await page.getByRole('button', { name: 'Review matches', exact: true }).click();
    await page.getByRole('button', { name: /Import 2 resolved lines/ }).click();
    assert.equal(await page.getByRole('button', { name: 'Remove Arcane Signet', exact: true }).count(), 1);
    assert.equal(await page.getByRole('spinbutton', { name: 'Forest count', exact: true }).inputValue(), '7');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export list', exact: true }).click();
    const downloaded = await downloadPromise, exportPath = await downloaded.path();
    const exported = fs.readFileSync(exportPath, 'utf8');
    assert.match(exported, /# Primary: Tymna the Weaver/); assert.match(exported, /7 Forest/); assert.match(exported, /4 Sol Ring/);
    pass('Import resolves typed lines and export includes roles, quantities, and lands');

    await page.getByRole('spinbutton', { name: 'Island count', exact: true }).fill('12');
    await page.getByRole('textbox', { name: 'Deck notes', exact: true }).fill('Hold interaction for the table.');
    await page.reload();
    assert.equal(await page.getByRole('spinbutton', { name: 'Island count', exact: true }).inputValue(), '12');
    assert.equal(await page.getByRole('textbox', { name: 'Deck notes', exact: true }).inputValue(), 'Hold interaction for the table.');
    pass('All six land controls and parchment notes preserve real state');

    await page.getByRole('button', { name: 'Edit deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Cancelled Council');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    assert(await page.getByRole('heading', { name: 'Four Color Council', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Edit deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Council at Dawn');
    await page.getByRole('button', { name: 'Save changes', exact: true }).dblclick();
    await page.getByRole('heading', { name: 'Council at Dawn', exact: true }).waitFor();
    assert.equal((await readState(page)).decks.length, fixture.decks.length);
    await page.getByRole('button', { name: 'All decks', exact: true }).click();
    await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open Council at Dawn', exact: true }).count(), 1);
    pass('Edit cancel/save, repeated submit protection, and All decks navigation preserve the fixture collection');

    await page.goto(`${baseUrl}/#/decks/war-table-fixture`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(__dirname, 'deck-details-war-table-desktop.png'), fullPage: true });
    pass('Desktop layout has no page-level horizontal overflow and screenshot evidence was captured');
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await routeOffline(mobile);
    const phone = await mobile.newPage(); watch(phone);
    const zeroFixture = { ...fixture, decks: [{ ...fixture.decks[0], id: 'zero-deck', name: 'Unbound Chronicle', commander: '', commanderCard: null, commanders: [], cards: [], basicLands: {}, notes: '' }] };
    await seed(phone, zeroFixture, '#/decks/zero-deck');
    await phone.getByRole('heading', { name: 'Unbound Chronicle', exact: true }).waitFor();
    assert.equal(await phone.locator('.war-table-commander').count(), 1);
    assert.equal(await phone.locator('.war-table-card-frame .placeholder').count(), 1);
    assert.equal(await phone.locator('.war-table-mote').first().evaluate(el => getComputedStyle(el).display), 'none');
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await phone.screenshot({ path: path.join(__dirname, 'deck-details-war-table-mobile.png'), fullPage: true });
    pass('Mobile zero-data fallback, reduced motion, responsive controls, and horizontal fit are verified');
    await mobile.close();

    const scan = await (await browser.newContext()).request.get(`${baseUrl}/ai-scan-config.js`);
    const scanConfig = await scan.text();
    assert.equal(scan.status(), 200);
    assert.match(scanConfig, /enabled\s*:\s*true|"enabled"\s*:\s*true/);
    assert.match(scanConfig, /mihmykgxbneuhlcxolzm\.supabase\.co\/functions\/v1\/website-ai-batch-scan/);
    pass('Scanner release candidate is enabled only through the authorized TEST gateway');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalWrites, []);
    pass('No browser runtime errors or external write requests were observed');
  } finally {
    await browser.close(); report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'deck-details-war-table-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch(error => { report.failure = error.stack; fs.writeFileSync(path.join(__dirname, 'deck-details-war-table-report.json'), JSON.stringify(report, null, 2)); console.error(error.stack); process.exitCode = 1; });
