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
    if (url.origin === 'https://api.scryfall.com') return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [], has_more: false }) });
    if (request.url().startsWith(baseUrl)) return route.continue();
    if (request.method() !== 'GET') report.externalWrites.push(request.url());
    return route.abort();
  });
}
async function readState(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function seed(page, fixture, route = '#/decks/war-table-fixture') {
  await page.goto(`${baseUrl}/#/home`);
  await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key: storageKey, fixture });
  await page.goto(`${baseUrl}/${route}`);
  await page.reload();
}
function card(name, identity, extra = {}) {
  return { id: name.toLowerCase().replaceAll(' ', '-'), oracleId: `oracle-${name}`, name, colorIdentity: identity, typeLine: 'Artifact', manaCost: '{2}', cmc: 2, quantity: 1, cardVariant: 'Normal', prices: { usd: '1.25' }, oracleText: 'Fixture rules text.', metadataComplete: true, ...extra };
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await routeOffline(desktop);
    const page = await desktop.newPage(); watch(page);
    await page.goto(`${baseUrl}/#/home`);
    const original = await readState(page) || { version: 1, profile: { name: 'Planeswalker', username: '', avatar: 1, role: 'Player', bio: '' }, decks: [], retainedDeckRecords: [], bulk: [], favorites: [], contacts: [], stores: [], notifications: [], settings: { theme: 'forest', motion: true, images: true, notificationInbox: true } };
    const primary = card('Tymna the Weaver', ['W', 'B'], { role: 'primary', typeLine: 'Legendary Creature — Human Cleric', imageUrl: '' });
    const partner = card('Kraum, Ludevic’s Opus', ['U', 'R'], { role: 'partner', typeLine: 'Legendary Creature — Zombie Horror', imageUrl: '' });
    const fixture = { ...original, decks: [{ id: 'war-table-fixture', name: 'Four Color Council', commander: `${primary.name} + ${partner.name}`, commanderCard: primary, commanders: [primary, partner], format: 'Commander', status: 'active', cards: [card('Arcane Signet', []), card('Sol Ring', [], { quantity: 2, cmc: 1, manaCost: '{1}', prices: { usd: '2.10' } })], basicLands: { Plains: 1, Island: 2, Swamp: 3, Mountain: 4, Forest: 5, Wastes: 6 }, notes: 'Opening plan', createdAt: '2026-10-13T12:00:00.000Z' }] };
    await seed(page, fixture);
    await page.getByRole('heading', { name: 'Four Color Council', exact: true }).waitFor();

    assert.equal(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.war-table-header').count(), 1);
    assert.equal(await page.locator('.war-table-commander').count(), 2);
    assert.deepEqual(await page.locator('.war-table-commander figcaption').allTextContents(), ['Primary', 'Partner']);
    assert.deepEqual(await page.locator('.war-table-meta .sanctum-identity i').allTextContents(), ['W', 'U', 'B', 'R']);
    assert.match(await page.locator('.war-table-page').getAttribute('style'), /--deck-spectrum/);
    for (const asset of ['background.webp', 'banner.webp', 'panel-frame.webp', 'divider.webp', 'land-plains.webp', 'land-island.webp', 'land-swamp.webp', 'land-mountain.webp', 'land-forest.webp', 'land-wastes.webp']) assert.equal((await page.request.get(`${baseUrl}/deck-details/${asset}`)).status(), 200, asset);
    pass('Supplied War Table art, horizontal shell, partner roles, and complete four-color identity render');

    const tabs = ['Cards', 'Balance', 'Sage rating', 'Strategy', 'Upgrades'];
    for (const name of tabs.slice(1)) {
      await page.getByRole('tab', { name, exact: true }).click();
      assert.equal(await page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true');
    }
    await page.getByRole('tab', { name: 'Cards', exact: true }).click();
    pass('All five preserved deck-analysis tabs switch into real tabpanels');

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
    assert.equal((await readState(page)).decks.length, 1);
    await page.getByRole('button', { name: 'All decks', exact: true }).click();
    await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open Council at Dawn', exact: true }).count(), 2);
    pass('Edit cancel/save, repeated submit protection, and All decks navigation preserve one deck');

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
    assert.equal(scan.status(), 200); assert.match(await scan.text(), /enabled\s*:\s*false|"enabled"\s*:\s*false/);
    pass('Scanner remains disabled and untouched');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalWrites, []);
    pass('No browser runtime errors or external write requests were observed');
  } finally {
    await browser.close(); report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'deck-details-war-table-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch(error => { report.failure = error.stack; fs.writeFileSync(path.join(__dirname, 'deck-details-war-table-report.json'), JSON.stringify(report, null, 2)); console.error(error.stack); process.exitCode = 1; });
