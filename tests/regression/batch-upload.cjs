const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const storageKey = 'deck-sage-web-v1';
const fixturePath = path.join(__dirname, '..', 'fixtures', 'batch-card-photo.png');
const report = { checks: [], errors: [], externalWrites: [], startedAt: new Date().toISOString() };
const emptyLands = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0, Wastes: 0 };
const fixtureState = {
  version: 1,
  profile: { name: 'Fixture Planeswalker', username: '', avatar: 1, role: 'Player', bio: '' },
  decks: [{ id: 'batch-deck', name: 'Fixture Deck', commander: 'Fixture Commander', commanderCard: null, commanders: [], cards: [], basicLands: emptyLands, notes: '', format: 'Commander', status: 'active', createdAt: '2026-10-13T00:00:00.000Z' }],
  retainedDeckRecords: [], bulk: [], favorites: [], contacts: [], stores: [], notifications: [],
  settings: { theme: 'forest', motion: true, images: true, notificationInbox: true },
};

function pass(name) { report.checks.push(name); console.log('PASS', name); }
function watch(page) { page.on('pageerror', (error) => report.errors.push(error.message)); }
async function waitPreview(page, index) { await page.waitForFunction(number => { const image = document.querySelector(`[data-photo-slot="${number}"] .batch-photo-preview img`); return image?.getAttribute('src')?.startsWith('data:image/jpeg') && image.complete && image.naturalWidth > 0; }, index); }
async function isolate(context) {
  await context.route('**/account-config.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' }));
  await context.route('https://**/*', (route) => {
    if (route.request().method() !== 'GET') report.externalWrites.push(route.request().url());
    return route.abort();
  });
  await context.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('deck-sage-browser-only-choice-v1', '1');
  }, { key: storageKey, state: fixtureState });
}
async function openBulk(page) {
  await page.goto(`${baseUrl}/#/bulk`);
  await page.getByRole('heading', { name: 'My bulk', exact: true }).waitFor();
}
async function openBatchFromBulk(page) {
  await openBulk(page);
  await page.getByRole('button', { name: 'Batch upload cards', exact: true }).click();
  await page.getByRole('heading', { name: 'Batch upload cards', exact: true }).waitFor();
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await isolate(desktop);
    const page = await desktop.newPage();
    watch(page);
    await openBatchFromBulk(page);

    assert.equal(new URL(page.url()).hash, '#/batch-upload/bulk');
    assert.equal(await page.locator('[data-photo-slot]').count(), 20);
    assert.equal(await page.getByRole('heading', { name: 'Photo 1', exact: true }).count(), 1);
    assert.equal(await page.getByRole('heading', { name: 'Photo 20', exact: true }).count(), 1);
    assert.match(await page.getByRole('note').filter({ hasText: 'Your photos stay on this device.' }).textContent(), /Refreshing, closing the tab, or switching usernames clears temporary photos/i);
    const firstInput = page.getByLabel('Choose Photo 1', { exact: true });
    assert.equal(await firstInput.getAttribute('capture'), null);
    assert.equal(await firstInput.getAttribute('multiple'), null);
    assert.match(await firstInput.getAttribute('accept'), /image\/jpeg.*image\/png.*image\/webp/);
    pass('My Bulk links to a contextual page with 20 ordered, mobile-friendly single-photo slots');

    const stateBefore = await page.evaluate((key) => localStorage.getItem(key), storageKey);
    await firstInput.setInputFiles(fixturePath);
    await waitPreview(page, 1);
    await page.getByText('1 / 20 staged', { exact: false }).waitFor();
    await page.getByLabel('Choose Photo 20', { exact: true }).setInputFiles(fixturePath);
    await waitPreview(page, 20);
    await page.getByText('2 / 20 staged', { exact: false }).waitFor();
    pass('Photo 1 and Photo 20 stage original files and render local previews');

    const photo1Before = await page.getByAltText('Preview for Photo 1').getAttribute('src');
    await page.getByLabel('Replace Photo 1', { exact: true }).setInputFiles([]);
    assert.equal(await page.locator('[data-photo-slot="1"] .batch-photo-file strong').textContent(), 'batch-card-photo.png');
    assert.match(await page.getByText('2 / 20 staged', { exact: false }).textContent(), /2 \/ 20/);
    await page.getByLabel('Replace Photo 1', { exact: true }).setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
    await waitPreview(page, 1);
    await page.waitForFunction(previous => { const source = document.querySelector('[data-photo-slot="1"] .batch-photo-preview img')?.getAttribute('src'); return source?.startsWith('data:image/jpeg') && source !== previous; }, photo1Before);
    const photo1After = await page.getByAltText('Preview for Photo 1').getAttribute('src');
    assert.notEqual(photo1After, photo1Before);
    assert.equal(await page.locator('[data-photo-slot="1"] .batch-photo-file strong').textContent(), 'replacement.png');
    assert.match(photo1After, /^data:image\/jpeg;base64,/);
    pass('Cancel keeps the existing photo, while replacement regenerates a bounded thumbnail');

    await page.getByLabel('Choose Photo 2', { exact: true }).setInputFiles({ name: 'not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await page.locator('[data-photo-slot="2"]').getByRole('alert').waitFor();
    assert.match(await page.locator('[data-photo-slot="2"]').getByRole('alert').textContent(), /Choose a JPEG, PNG or static WebP photo/);
    assert.match(await page.getByText('2 / 20 staged', { exact: false }).textContent(), /2 \/ 20/);
    await page.getByLabel('Choose Photo 2', { exact: true }).setInputFiles({ name: 'too-large.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(12 * 1024 * 1024 + 1) });
    assert.match(await page.locator('[data-photo-slot="2"]').getByRole('alert').textContent(), /larger than 12 MB/);
    pass('Unsupported and oversized files fail in place without replacing staged photos');

    for (const unsupported of [
      { name: 'iphone-photo.heic', mimeType: 'image/heic', buffer: Buffer.from('fixture-heic') },
      { name: 'oversized.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="999999" height="999999"/>') },
    ]) {
      await page.getByLabel('Choose Photo 2', { exact: true }).setInputFiles(unsupported);
      await page.locator('[data-photo-slot="2"]').getByRole('alert').getByText(/dimensions could not be checked safely/).waitFor();
      assert.equal(await page.locator('[data-photo-slot="2"] .batch-photo-file').count(), 0);
      assert.match(await page.getByText('2 / 20 staged', { exact: false }).textContent(), /2 \/ 20/);
    }
    pass('Unsupported HEIC and SVG are rejected before staging with a safe-format explanation');
    await page.getByLabel('Choose Photo 2', { exact: true }).setInputFiles({ name: 'second-photo.png', mimeType: 'image/png', buffer: fs.readFileSync(fixturePath) });
    await waitPreview(page, 2);
    await page.getByText('3 / 20 staged', { exact: false }).waitFor();
    assert.equal(await page.locator('[data-photo-slot="2"]').getByRole('alert').count(), 0);
    pass('A supported replacement clears the validation error and stages normally');

    await page.locator('[data-photo-slot="20"]').getByRole('button', { name: 'Remove', exact: true }).click();
    assert.equal(await page.getByLabel('Choose Photo 20', { exact: true }).count(), 1);
    await page.getByRole('button', { name: '← Back to My bulk', exact: true }).click();
    await page.getByRole('heading', { name: 'My bulk', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Batch upload cards', exact: true }).click();
    assert.equal(await page.locator('[data-photo-slot="1"] .batch-photo-file strong').textContent(), 'replacement.png');
    assert.equal(await page.locator('[data-photo-slot="2"] .batch-photo-file strong').textContent(), 'second-photo.png');
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), stateBefore);
    pass('Remove releases preview state, in-site navigation preserves staged originals, and collection storage is untouched');

    await page.screenshot({ path: path.join(__dirname, 'batch-upload-desktop.png'), fullPage: true });
    page.on('dialog', (dialog) => dialog.accept());
    await page.reload();
    await page.getByRole('heading', { name: 'Batch upload cards', exact: true }).waitFor();
    assert.match(await page.getByText('0 / 20 staged', { exact: false }).textContent(), /0 \/ 20/);
    pass('Refresh clears the in-memory batch exactly as disclosed');
    await desktop.close();

    const deckContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await isolate(deckContext);
    const deckPage = await deckContext.newPage();
    watch(deckPage);
    await deckPage.goto(`${baseUrl}/#/decks/batch-deck`);
    await deckPage.getByRole('heading', { name: 'Fixture Deck', exact: true }).waitFor();
    await deckPage.getByRole('button', { name: 'Batch upload cards', exact: true }).click();
    await deckPage.getByRole('heading', { name: 'Batch upload cards', exact: true }).waitFor();
    assert.equal(new URL(deckPage.url()).hash, '#/batch-upload/deck/batch-deck');
    assert.match(await deckPage.locator('.page-heading p').textContent(), /for Fixture Deck/);
    await deckPage.getByRole('button', { name: '← Back to Fixture Deck', exact: true }).click();
    await deckPage.getByRole('heading', { name: 'Fixture Deck', exact: true }).waitFor();
    pass('Deck Details passes its deck context and provides exact return navigation');
    await deckContext.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
    await isolate(mobile);
    const phone = await mobile.newPage();
    watch(phone);
    await openBatchFromBulk(phone);
    await phone.getByLabel('Choose Photo 1', { exact: true }).setInputFiles(fixturePath);
    await waitPreview(phone, 1);
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await phone.locator('[data-photo-slot]').count(), 20);
    await phone.screenshot({ path: path.join(__dirname, 'batch-upload-mobile.png'), fullPage: true });
    pass('Mobile layout stages from the same supported-format picker without horizontal overflow');
    await mobile.close();

    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalWrites, []);
    pass('Batch photo QA produced no browser errors or external write requests');
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'batch-upload-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch((error) => {
  report.failure = error.stack;
  fs.writeFileSync(path.join(__dirname, 'batch-upload-report.json'), JSON.stringify(report, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
});
