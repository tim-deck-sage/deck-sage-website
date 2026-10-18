const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const report = { checks: [], errors: [], startedAt: new Date().toISOString() };
const expectedFeatures = [
  ['decks', 'My Decks'],
  ['bulk', 'My Bulk'],
  ['sage', 'Sage Tools'],
  ['lore', 'Commander Lore'],
  ['songs', 'Theme Songs'],
  ['value', 'Collection Value'],
  ['news', 'Latest News']
];

function pass(name) {
  report.checks.push(name);
  console.log('PASS', name);
}
async function browserOnlyFixture(context) {
  await context.route('**/account-config.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' }));
}

async function alphaBounds(file, threshold = 16) {
  const raw = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = raw.info.width;
  let minY = raw.info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raw.info.height; y += 1) {
    for (let x = 0; x < raw.info.width; x += 1) {
      if (raw.data[(y * raw.info.width + x) * 4 + 3] > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, bottom: maxY };
}

async function openHome(page) {
  await page.goto(`${baseUrl}/#/home`);
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
}

async function run() {
  const buttonRoot = path.resolve(__dirname, '../../preview/public/home/buttons');
  const alphaGroups = [
    { files: ['my-decks.webp', 'my-bulk.webp', 'sage-tools.webp'], expected: [1280, 478] },
    { files: ['commander-lore.webp', 'theme-songs.webp', 'collection-value.webp', 'latest-news.webp'], expected: [1280, 390] }
  ];
  for (const group of alphaGroups) {
    const measurements = [];
    for (const name of group.files) {
      const file = path.join(buttonRoot, name);
      const metadata = await sharp(file).metadata();
      assert.deepEqual([metadata.width, metadata.height], group.expected);
      measurements.push(await alphaBounds(file));
    }
    assert(Math.max(...measurements.map((item) => item.height)) - Math.min(...measurements.map((item) => item.height)) <= 2);
    assert(Math.max(...measurements.map((item) => item.y)) - Math.min(...measurements.map((item) => item.y)) <= 1);
    assert(Math.max(...measurements.map((item) => item.bottom)) - Math.min(...measurements.map((item) => item.bottom)) <= 1);
  }
  pass('Alpha-bounded artwork has equal visible height and baseline within each button row');

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await desktop.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
    await browserOnlyFixture(desktop);
    const page = await desktop.newPage();
    page.on('pageerror', (error) => report.errors.push(error.message));
    await openHome(page);

    const links = page.locator('.home-feature');
    assert.equal(await links.count(), expectedFeatures.length);
    assert.equal(await page.locator('.home-primary-grid .home-feature').count(), 3);
    assert.equal(await page.locator('.home-secondary-grid .home-feature').count(), 4);
    assert.equal(await page.locator('.home-page img[src*="cards.scryfall"]').count(), 0);
    pass('Homepage renders only the seven supplied semantic feature links in a 3 + 4 layout');

    let libraryLink = page.getByRole('link', { name: 'Search the library of every MTG card', exact: true });
    assert.equal(await libraryLink.count(), 1);
    assert.equal(await libraryLink.getAttribute('href'), '#/cards');
    assert.equal(await page.getByText('Indexed card identities', { exact: true }).count(), 0);
    const desktopLibraryText = await libraryLink.locator('strong').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return { lines: range.getClientRects().length, fits: element.scrollWidth <= element.clientWidth + 1 };
    });
    assert(desktopLibraryText.lines >= 2);
    assert(desktopLibraryText.fits);
    const libraryBox = await libraryLink.boundingBox();
    assert(libraryBox && libraryBox.width > 100 && libraryBox.height > 40);
    await libraryLink.click({ position: { x: libraryBox.width - 8, y: libraryBox.height - 8 } });
    await page.waitForURL(/#\/cards$/);
    await page.getByRole('heading', { name: 'The card library', exact: true }).waitFor();
    await page.evaluate(() => { location.hash = '#/home'; });
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    libraryLink = page.getByRole('link', { name: 'Search the library of every MTG card', exact: true });
    await page.evaluate(() => document.activeElement?.blur());
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab');
      if (await libraryLink.evaluate((element) => document.activeElement === element)) break;
    }
    assert(await libraryLink.evaluate((element) => document.activeElement === element));
    assert.notEqual(await libraryLink.evaluate((element) => getComputedStyle(element).outlineStyle), 'none');
    await libraryLink.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
    assert(await libraryLink.evaluate((element) => element.classList.contains('is-pressed')));
    await libraryLink.dispatchEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true });
    await libraryLink.press('Enter');
    await page.waitForURL(/#\/cards$/);
    pass('The full card-library stat is an exact-label link with mouse and keyboard navigation');
    await page.evaluate(() => { location.hash = '#/home'; });
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();

    const geometry = await page.locator('.home-feature').evaluateAll((elements) => elements.map((element) => {
      const image = element.querySelector('img').getBoundingClientRect();
      const link = element.getBoundingClientRect();
      return { imageHeight: image.height, top: link.top, bottom: link.bottom };
    }));
    for (const group of [geometry.slice(0, 3), geometry.slice(3)]) {
      assert(Math.max(...group.map((item) => item.imageHeight)) - Math.min(...group.map((item) => item.imageHeight)) < 1);
      assert(Math.max(...group.map((item) => item.top)) - Math.min(...group.map((item) => item.top)) < 1);
      assert(Math.max(...group.map((item) => item.bottom)) - Math.min(...group.map((item) => item.bottom)) < 1);
    }
    pass('Desktop top and bottom button rows render with equal heights and aligned baselines');

    for (const [route, label] of expectedFeatures) {
      const link = page.getByRole('link', { name: new RegExp(`^${label}\\.`) });
      assert.equal(await link.getAttribute('href'), `#/${route}`);
      await link.click();
      await page.waitForURL(new RegExp(`#/${route}$`));
      await page.locator('main h1').waitFor();
      await page.evaluate(() => { location.hash = '#/home'; });
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    }
    pass('Every supplied feature tile opens its existing route');

    const validBackgrounds = new Set([1, 2, 3, 4, 5].map((number) => `/home/background-${number}.webp`));
    const stableBackground = await page.locator('.home-page').getAttribute('data-home-background');
    assert(validBackgrounds.has(stableBackground));
    await page.evaluate(() => { location.hash = '#/decks'; });
    await page.locator('main h1').waitFor();
    await page.evaluate(() => { location.hash = '#/home'; });
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    assert.equal(await page.locator('.home-page').getAttribute('data-home-background'), stableBackground);
    const seen = new Set();
    for (let index = 0; index < 18; index += 1) {
      await page.reload();
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
      const background = await page.locator('.home-page').getAttribute('data-home-background');
      assert(validBackgrounds.has(background));
      seen.add(background);
    }
    assert(seen.size > 1, `Expected more than one random background across reloads; saw ${[...seen].join(', ')}`);
    pass('Background is session-stable during SPA navigation and reselects from all five assets on full loads');

    const first = page.locator('.home-feature').first();
    await first.dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true, bubbles: true });
    assert(await first.evaluate((element) => element.classList.contains('is-pressed')));
    await first.dispatchEvent('pointerup', { pointerType: 'mouse', isPrimary: true, bubbles: true });
    assert(!(await first.evaluate((element) => element.classList.contains('is-pressed'))));
    await first.focus();
    assert.notEqual(await first.evaluate((element) => getComputedStyle(element).outlineStyle), 'none');
    await first.dispatchEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
    assert(await first.evaluate((element) => element.classList.contains('is-pressed')));
    await first.dispatchEvent('keyup', { key: ' ', code: 'Space', bubbles: true });
    await page.waitForURL(/#\/decks$/);
    pass('Pointer and keyboard press feedback returns on release, with a visible focus treatment');

    await page.evaluate(() => { location.hash = '#/home'; });
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await page.screenshot({ path: path.join(__dirname, 'homepage-desktop.png'), fullPage: true });
    pass('Desktop homepage has no horizontal overflow');
    await desktop.close();

    const reduced = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    await reduced.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
    await browserOnlyFixture(reduced);
    const reducedPage = await reduced.newPage();
    await openHome(reducedPage);
    const motion = await reducedPage.locator('.home-feature').first().evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      transition: getComputedStyle(element).transitionDuration
    }));
    assert.equal(motion.animation, 'none');
    assert(motion.transition.split(',').every((duration) => duration.trim() === '0s'));
    assert.equal(await reducedPage.locator('.home-library-stat').evaluate((element) => getComputedStyle(element).transitionDuration), '0s');
    pass('Prefers-reduced-motion disables feature pulses and transitions');
    await reduced.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
    await browserOnlyFixture(mobile);
    const phone = await mobile.newPage();
    phone.on('pageerror', (error) => report.errors.push(error.message));
    await openHome(phone);
    const touchTarget = phone.locator('.home-library-stat');
    await touchTarget.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
    assert(await touchTarget.evaluate((element) => element.classList.contains('is-pressed')));
    await touchTarget.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
    assert(!(await touchTarget.evaluate((element) => element.classList.contains('is-pressed'))));
    const mobileLibraryText = await touchTarget.locator('strong').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return { lines: range.getClientRects().length, fits: element.scrollWidth <= element.clientWidth + 1 };
    });
    assert(mobileLibraryText.lines >= 2);
    assert(mobileLibraryText.fits);
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await phone.screenshot({ path: path.join(__dirname, 'homepage-mobile.png'), fullPage: true });
    await touchTarget.tap();
    await phone.waitForURL(/#\/cards$/);
    pass('Touch press feedback, wrapped text, mobile layout, and library navigation work without overflow');
    await mobile.close();

    assert.deepEqual(report.errors, []);
    pass('No browser runtime errors');
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'homepage-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch((error) => {
  report.failure = error.stack;
  fs.writeFileSync(path.join(__dirname, 'homepage-report.json'), JSON.stringify(report, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
});
