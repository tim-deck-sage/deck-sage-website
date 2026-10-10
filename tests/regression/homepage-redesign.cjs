const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

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

async function openHome(page) {
  await page.goto(`${baseUrl}/#/home`);
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await desktop.newPage();
    page.on('pageerror', (error) => report.errors.push(error.message));
    await openHome(page);

    const links = page.locator('.home-feature');
    assert.equal(await links.count(), expectedFeatures.length);
    assert.equal(await page.locator('.home-primary-grid .home-feature').count(), 3);
    assert.equal(await page.locator('.home-secondary-grid .home-feature').count(), 4);
    assert.equal(await page.locator('.home-page img[src*="cards.scryfall"]').count(), 0);
    pass('Homepage renders only the seven supplied semantic feature links in a 3 + 4 layout');

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
    const reducedPage = await reduced.newPage();
    await openHome(reducedPage);
    const motion = await reducedPage.locator('.home-feature').first().evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      transition: getComputedStyle(element).transitionDuration
    }));
    assert.equal(motion.animation, 'none');
    assert(motion.transition.split(',').every((duration) => duration.trim() === '0s'));
    pass('Prefers-reduced-motion disables feature pulses and transitions');
    await reduced.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobile.newPage();
    phone.on('pageerror', (error) => report.errors.push(error.message));
    await openHome(phone);
    const touchTarget = phone.locator('.home-feature').first();
    await touchTarget.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
    assert(await touchTarget.evaluate((element) => element.classList.contains('is-pressed')));
    await touchTarget.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
    assert(!(await touchTarget.evaluate((element) => element.classList.contains('is-pressed'))));
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await phone.screenshot({ path: path.join(__dirname, 'homepage-mobile.png'), fullPage: true });
    pass('Touch press feedback and mobile layout work without horizontal overflow');
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
