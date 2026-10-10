const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const report = { checks: [], errors: [], externalWrites: [], startedAt: new Date().toISOString() };

function pass(name) {
  report.checks.push(name);
  console.log('PASS', name);
}

async function openDecks(page) {
  await page.goto(`${baseUrl}/#/decks`);
  await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
}

async function pick(page, label, name) {
  await page.getByRole('textbox', { name: label, exact: true }).fill(name);
  await page.locator('.picker-results button').filter({ hasText: name }).first().click();
}

function watch(page) {
  page.on('pageerror', (error) => report.errors.push(error.message));
}

async function isolate(context) {
  await context.route('https://**/*', (route) => {
    if (route.request().method() !== 'GET') report.externalWrites.push(route.request().url());
    return route.abort();
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await isolate(desktop);
    let page = await desktop.newPage();
    watch(page);
    await openDecks(page);

    assert.equal(await page.locator('.sidebar').evaluate((element) => getComputedStyle(element).display), 'none');
    assert(await page.locator('.decks-empty img[src="/decks/empty-decks.webp"]').isVisible());
    assert.equal(await page.getByRole('button', { name: 'Create your first deck', exact: true }).count(), 1);
    pass('Empty My Decks state is immersive, sidebar-free, and offers one clear create action');

    await page.getByRole('button', { name: 'Create your first deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Cancelled draft');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal((await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{"decks":[]}').decks.length, storageKey)), 0);
    pass('Create-deck cancellation leaves the isolated workspace unchanged');

    await page.getByRole('button', { name: 'Create your first deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Core Pair');
    await page.getByRole('button', { name: 'Create deck', exact: true }).click();
    await page.getByRole('alert').getByText('Choose at least one commander.', { exact: true }).waitFor();
    await pick(page, 'Choose your commander', 'Krenko, Mob Boss');
    await page.getByRole('button', { name: 'Partner', exact: true }).click();
    await pick(page, 'Choose commander 2', 'Rograkh, Son of Rohgahh');
    await page.getByRole('button', { name: 'Create deck', exact: true }).dblclick();
    await page.getByRole('heading', { name: 'Core Pair', exact: true }).waitFor();
    let state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(state.decks.length, 1);
    assert.equal(state.decks[0].commanders.length, 2);
    assert.deepEqual(state.decks[0].commanders.map((commander) => commander.role), ['primary', 'partner']);
    pass('Multi-commander creation resolves exact cards and repeated submit produces one deck');

    const fixtureImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="488" height="680"%3E%3Crect width="488" height="680" rx="28" fill="%23132824"/%3E%3Crect x="18" y="18" width="452" height="644" rx="20" fill="none" stroke="%23d9bd77" stroke-width="8"/%3E%3Ctext x="244" y="350" text-anchor="middle" fill="%23f2dfae" font-size="42" font-family="serif"%3ECard reference%3C/text%3E%3C/svg%3E';
    const original = state.decks[0];
    original.cards = [{ name: 'Goblin Instigator', oracleId: 'fixture-goblin', quantity: 2, cardVariant: 'Normal', colorIdentity: ['R'] }];
    original.commanderCard.imageUrl = fixtureImage;
    original.commanders[0].imageUrl = fixtureImage;
    state.decks.push({ ...original, id: 'active-aegis', name: 'Aegis Collection', commander: 'Atraxa, Praetors Voice', commanderCard: { ...original.commanderCard, name: 'Atraxa, Praetors Voice' }, commanders: [{ ...original.commanders[0], name: 'Atraxa, Praetors Voice', role: 'primary' }], cards: [], status: 'active' });
    state.decks.push({ ...original, id: 'archived-ancient', name: 'Ancient Archive', commander: 'Avacyn, Angel of Hope', commanderCard: { ...original.commanderCard, name: 'Avacyn, Angel of Hope' }, commanders: [{ ...original.commanders[0], name: 'Avacyn, Angel of Hope', role: 'primary' }], cards: [], status: 'archived' });
    await desktop.close();

    const collection = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await isolate(collection);
    await collection.addInitScript(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key: storageKey, fixture: state });
    page = await collection.newPage();
    watch(page);
    await openDecks(page);
    const titles = await page.locator('.deck-showcase h3').allTextContents();
    assert.deepEqual(titles, ['Aegis Collection', 'Core Pair', 'Ancient Archive']);
    assert.equal(await page.locator('.deck-archived-badge').count(), 1);
    const cardCss = await page.locator('.deck-showcase-art .card-thumb').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { objectFit: style.objectFit, filter: style.filter, transform: style.transform, clipPath: style.clipPath };
    });
    assert.equal(cardCss.objectFit, 'contain');
    assert.equal(cardCss.filter, 'none');
    assert.equal(cardCss.transform, 'none');
    assert.equal(cardCss.clipPath, 'none');
    await page.screenshot({ path: path.join(__dirname, 'my-decks-desktop.png'), fullPage: true });
    pass('Active decks sort alphabetically before archived decks and card references remain uncropped');

    await page.getByRole('textbox', { name: 'Search your decks', exact: true }).fill('Rograkh');
    assert.deepEqual(await page.locator('.deck-showcase h3').allTextContents(), ['Core Pair']);
    await page.getByRole('button', { name: 'Open Core Pair', exact: true }).click();
    await page.getByRole('heading', { name: 'Core Pair', exact: true }).waitFor();
    await page.getByRole('button', { name: /All decks/ }).click();
    await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
    pass('Commander search and deck-detail navigation work from the redesigned collection');

    await page.getByRole('button', { name: 'Delete Core Pair', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open Core Pair', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Delete Core Pair', exact: true }).click();
    await page.getByRole('button', { name: /^Move Cards to Bulk/ }).evaluate((button) => { button.click(); button.click(); });
    state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(state.decks.some((deck) => deck.name === 'Core Pair'), false);
    assert.equal(state.bulk.find((card) => card.name === 'Goblin Instigator').quantity, 2);
    pass('Delete cancellation is safe and repeated move-to-bulk preserves each card copy once');

    await page.getByRole('button', { name: 'Delete Aegis Collection', exact: true }).click();
    await page.getByRole('button', { name: /^Delete Cards Forever/ }).evaluate((button) => { button.click(); button.click(); });
    state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(state.decks.some((deck) => deck.name === 'Aegis Collection'), false);
    assert.equal(state.bulk.find((card) => card.name === 'Goblin Instigator').quantity, 2);
    pass('Delete-forever removes the selected deck without duplicating bulk inventory');

    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    pass('Desktop My Decks layout has no horizontal overflow');

    const mobileFixture = state;
    await collection.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
    await isolate(mobile);
    await mobile.addInitScript(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key: storageKey, fixture: mobileFixture });
    const phone = await mobile.newPage();
    watch(phone);
    await openDecks(phone);
    assert(await phone.locator('.decks-library').isVisible());
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await phone.getByRole('button', { name: 'New deck', exact: true }).click();
    await phone.getByRole('button', { name: 'Cancel', exact: true }).click();
    await phone.screenshot({ path: path.join(__dirname, 'my-decks-mobile.png'), fullPage: true });
    pass('Mobile My Decks layout and modal cancel work without horizontal overflow');
    await mobile.close();

    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalWrites, []);
    pass('No browser runtime errors or external write requests');
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'my-decks-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch((error) => {
  report.failure = error.stack;
  fs.writeFileSync(path.join(__dirname, 'my-decks-report.json'), JSON.stringify(report, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
});
