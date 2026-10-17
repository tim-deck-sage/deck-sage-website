const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const report = { checks: [], errors: [], externalWrites: [], startedAt: new Date().toISOString() };

function pass(name) { report.checks.push(name); console.log('PASS', name); }
function watch(page) { page.on('pageerror', (error) => report.errors.push(error.message)); }
async function openDecks(page) { await page.goto(`${baseUrl}/#/decks`); await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor(); }
async function pick(page, label, name) { await page.getByRole('textbox', { name: label, exact: true }).fill(name); await page.locator('.picker-results button').filter({ hasText: name }).first().click(); }

async function routeOffline(context, preferredImage) {
  await context.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (request.url().endsWith('/account-config.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' });
    if (new URL(request.url()).origin === 'https://api.scryfall.com') {
      const query = new URL(request.url()).searchParams.get('q') || '';
      const commanderIndex = ['Krenko, Mob Boss', 'Talrand, Sky Summoner', 'Marwyn, the Nurturer', 'Shorikai, Genesis Engine', 'Ayara, First of Locthwain', 'Karn, Legacy Reforged'].findIndex((name) => query.includes(name));
      const oracleId = query.includes('Bruse Tarl') ? 'partner-oracle-3' : `oracle-${Math.max(0, commanderIndex)}`;
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [{ id: `preferred-${oracleId}`, oracle_id: oracleId, name: 'Fixture Commander', full_art: true, games: ['paper'], highres_image: true, image_status: 'highres_scan', released_at: '2026-01-01', image_uris: { large: preferredImage } }], has_more: false }) });
    }
    if (request.url().endsWith('/missing-card-reference.png')) return route.fulfill({ status: 404, body: '' });
    if (request.url().startsWith(baseUrl)) return route.continue();
    if (request.method() !== 'GET') report.externalWrites.push(request.url());
    return route.abort();
  });
}

async function seed(page, fixture) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: fixture });
  await page.reload();
  await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
}

function fixtureDeck(original, index, image) {
  const identities = [['R'], ['U'], ['G'], ['W', 'U'], ['B'], []];
  const identity = identities[index % identities.length];
  const names = ['Newest Ember', 'Second Tide', 'Alphabet Keep', 'Bramble Court', 'Midnight Archive', 'Colorless Vault'];
  const commanders = ['Krenko, Mob Boss', 'Talrand, Sky Summoner', 'Marwyn, the Nurturer', 'Shorikai, Genesis Engine', 'Ayara, First of Locthwain', 'Karn, Legacy Reforged'];
  const name = index < names.length ? names[index] : `Sanctum Deck ${String(index + 1).padStart(2, '0')}`;
  const commander = commanders[index % commanders.length];
  const stamp = new Date(Date.UTC(2026, 9, 13 - Math.min(index, 12), 12)).toISOString();
  const commanderCard = { ...original.commanderCard, id: `card-${index}`, oracleId: `oracle-${index % identities.length}`, name: commander, colorIdentity: identity, imageUrl: image };
  const partner = index === 3 ? { ...commanderCard, id: 'partner-3', oracleId: 'partner-oracle-3', name: 'Bruse Tarl, Boorish Herder', colorIdentity: ['R', 'W'], role: 'partner' } : null;
  return { ...original, id: `deck-${index}`, name, commander, commanderCard, commanders: [{ ...commanderCard, role: 'primary' }, ...(partner ? [partner] : [])], cards: [{ name: `Fixture Card ${index}`, oracleId: `fixture-${index}`, quantity: index % 7, cardVariant: 'Normal', colorIdentity: identity }], basicLands: { ...original.basicLands, Mountain: index % 13 }, status: index > 0 && index % 10 === 0 ? 'archived' : 'active', createdAt: stamp, updatedAt: stamp };
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const fixtureImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="488" height="680"%3E%3Crect width="488" height="680" rx="28" fill="%23132824"/%3E%3Crect x="18" y="18" width="452" height="644" rx="20" fill="none" stroke="%23d9bd77" stroke-width="8"/%3E%3Ctext x="244" y="350" text-anchor="middle" fill="%23f2dfae" font-size="38" font-family="serif"%3ECard reference%3C/text%3E%3C/svg%3E';
  const preferredImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="488" height="680"%3E%3Crect width="488" height="680" rx="28" fill="%23241935"/%3E%3Crect x="18" y="18" width="452" height="644" rx="20" fill="none" stroke="%23d9bd77" stroke-width="8"/%3E%3Ctext x="244" y="350" text-anchor="middle" fill="%23f2dfae" font-size="34" font-family="serif"%3EPreferred full art%3C/text%3E%3C/svg%3E';
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await routeOffline(desktop, preferredImage);
    let page = await desktop.newPage(); watch(page); await openDecks(page);
    assert.equal(await page.locator('.sidebar').evaluate((el) => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.sanctum-featured-card').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Create new deck', exact: true }).count(), 1);
    assert.equal(await page.locator('.sanctum-library-empty').getByText('Your collection awaits', { exact: true }).count(), 1);
    assert.match(await page.locator('.sanctum-hero').evaluate((el) => getComputedStyle(el).backgroundImage), /my-decks\/background\.webp/);
    for (const asset of ['background.webp', 'table.webp', 'banner-left.webp', 'banner-right.webp', 'commander-frame.webp', 'new-deck.webp', 'divider.webp']) assert.equal((await page.request.get(`${baseUrl}/my-decks/${asset}`)).status(), 200, asset);
    pass('Zero-deck state uses supplied Sanctum artwork and one clear creation action');

    await page.getByRole('button', { name: 'Create new deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Cancelled draft');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    assert.equal((await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{"decks":[]}').decks.length, storageKey)), 0);
    pass('Create-deck cancellation leaves the isolated collection unchanged');

    await page.getByRole('button', { name: 'Create new deck', exact: true }).click();
    await page.getByRole('textbox', { name: 'Deck name', exact: true }).fill('Core Pair');
    await page.getByRole('button', { name: 'Create deck', exact: true }).click();
    await page.getByRole('alert').getByText('Choose at least one commander.', { exact: true }).waitFor();
    await pick(page, 'Choose your commander', 'Krenko, Mob Boss');
    await page.locator('.command-zone-patterns').getByRole('button', { name: 'Partner', exact: true }).click();
    await pick(page, 'Choose commander 2', 'Rograkh, Son of Rohgahh');
    await page.getByRole('button', { name: 'Create deck', exact: true }).dblclick();
    await page.getByRole('heading', { name: 'Core Pair', exact: true }).waitFor();
    let state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(state.decks.length, 1);
    assert.deepEqual(state.decks[0].commanders.map((card) => card.role), ['primary', 'partner']);
    pass('Multi-partner creation validates exact cards and ignores repeated submit');

    await page.getByRole('button', { name: /All decks/ }).click();
    await page.getByRole('heading', { name: 'My Decks', exact: true }).waitFor();
    assert.equal(await page.locator('.sanctum-featured-card').count(), 1);
    assert.equal(await page.locator('.sanctum-library-card').count(), 1);
    pass('One-deck collection adapts without hardcoded samples');

    const original = state.decks[0]; original.commanderCard.imageUrl = fixtureImage; original.commanders[0].imageUrl = fixtureImage;
    for (const count of [2, 3, 20]) {
      await seed(page, { ...state, decks: Array.from({ length: count }, (_, i) => fixtureDeck(original, i, fixtureImage)) });
      assert.equal(await page.locator('.sanctum-featured-card').count(), Math.min(2, count));
      assert.equal(await page.locator('.sanctum-library-card').count(), count);
      assert.equal(await page.getByRole('button', { name: 'Create new deck', exact: true }).count(), 1);
    }
    pass('Two, three, and twenty deck collections preserve the two-feature limit and complete library');

    const fifty = { ...state, decks: Array.from({ length: 50 }, (_, i) => fixtureDeck(original, i, fixtureImage)) };
    fifty.decks[49] = { ...fifty.decks[49], commander: 'Broken Oracle', commanderCard: { ...fifty.decks[49].commanderCard, name: 'Broken Oracle', oracleId: 'broken-oracle', premiumImageUrl: '', imageLarge: '', imageUrl: '/missing-card-reference.png' }, commanders: [{ ...fifty.decks[49].commanders[0], name: 'Broken Oracle', oracleId: 'broken-oracle', premiumImageUrl: '', imageLarge: '', imageUrl: '/missing-card-reference.png', role: 'primary' }] };
    await seed(page, fifty);
    assert.equal(await page.locator('.sanctum-featured-card').count(), 2);
    assert.deepEqual(await page.locator('.sanctum-featured-copy h2').allTextContents(), ['Newest Ember', 'Second Tide']);
    assert.equal(await page.locator('.sanctum-library-card').count(), 50);
    assert.equal(await page.locator('.sanctum-featured-card button, .sanctum-library-card button').count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Delete / }).count(), 0);
    const cardCss = await page.locator('.sanctum-featured-art .card-thumb').first().evaluate((el) => { const style = getComputedStyle(el); return { objectFit: style.objectFit, clipPath: style.clipPath }; });
    assert.equal(cardCss.objectFit, 'contain'); assert.equal(cardCss.clipPath, 'none');
    assert(await page.locator('[data-commander-art-treatment="full_art"]').first().isVisible());
    const brokenReference = page.locator('.sanctum-library-card').filter({ hasText: 'Broken Oracle' }).locator('img.card-thumb');
    await brokenReference.evaluate((image) => image.dispatchEvent(new Event('error')));
    await page.locator('.sanctum-library-card').filter({ hasText: 'Broken Oracle' }).locator('.card-thumb.placeholder').waitFor({ state: 'visible' });
    assert.equal((await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).decks[0].commanderCard.imageUrl, fixtureImage);
    pass('Fifty real decks render deterministic features, semantic links, and uncropped display-only full art');

    await page.getByRole('textbox', { name: 'Search your decks', exact: true }).fill('Talrand');
    assert.equal(await page.locator('.sanctum-library-card').count(), 8);
    await page.getByRole('textbox', { name: 'Search your decks', exact: true }).fill('Newest Ember');
    assert.deepEqual(await page.locator('.sanctum-library-copy strong').allTextContents(), ['Newest Ember']);
    await page.getByRole('textbox', { name: 'Search your decks', exact: true }).fill('');
    await page.getByRole('combobox', { name: 'Filter by color identity', exact: true }).selectOption('M');
    assert.equal(await page.locator('.sanctum-library-card').count(), 8);
    await page.getByRole('combobox', { name: 'Filter by color identity', exact: true }).selectOption('');
    await page.getByRole('combobox', { name: 'Filter deck status', exact: true }).selectOption('archived');
    assert.equal(await page.locator('.sanctum-library-card').count(), 4);
    await page.getByRole('combobox', { name: 'Filter deck status', exact: true }).selectOption('all');
    await page.getByRole('combobox', { name: 'Sort decks', exact: true }).selectOption('alpha');
    assert.equal(await page.locator('.sanctum-library-copy strong').first().textContent(), 'Alphabet Keep');
    pass('Search, commander lookup, identity, archive, and A–Z filters work over the full collection');

    await page.getByRole('link', { name: 'Open Alphabet Keep', exact: true }).first().focus(); await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Alphabet Keep', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Edit deck', exact: true }).click();
    await page.getByText('Remove this deck', { exact: true }).click();
    await page.getByRole('button', { name: 'Review deletion options', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert(await page.getByRole('heading', { name: 'Alphabet Keep', exact: true }).isVisible());
    await page.getByRole('button', { name: /All decks/ }).click();
    pass('Keyboard navigation opens detail and edit/delete choices remain safely in management UI');

    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(__dirname, 'my-decks-desktop.png'), fullPage: true });
    pass('Desktop Sanctum fits without horizontal overflow and screenshot evidence was captured');
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await routeOffline(mobile, preferredImage);
    await mobile.addInitScript(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key: storageKey, fixture: { ...fifty, decks: fifty.decks.slice(0, 3) } });
    const phone = await mobile.newPage(); watch(phone); await openDecks(phone);
    assert.equal(await phone.locator('.sanctum-featured-card').count(), 2);
    assert.equal(await phone.locator('.sanctum-library-card').count(), 3);
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await phone.locator('.sanctum-library-card').first().evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    await phone.getByRole('button', { name: 'Create new deck', exact: true }).click();
    await phone.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await phone.screenshot({ path: path.join(__dirname, 'my-decks-mobile.png'), fullPage: true });
    pass('Mobile layout, reduced motion, modal cancel, and horizontal fit are verified');
    await mobile.close();

    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalWrites, []);
    pass('No browser runtime errors or external write requests were observed');
  } finally {
    await browser.close(); report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'my-decks-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch((error) => { report.failure = error.stack; fs.writeFileSync(path.join(__dirname, 'my-decks-report.json'), JSON.stringify(report, null, 2)); console.error(error.stack); process.exitCode = 1; });
