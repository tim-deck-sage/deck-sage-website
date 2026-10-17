const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtime = process.env.DECK_SAGE_TEST_NODE_MODULES || 'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const baseUrl = process.env.DECK_SAGE_PREVIEW_URL || 'http://127.0.0.1:4184';
const report = { checks: [], errors: [], externalWrites: [], startedAt: new Date().toISOString() };

function pass(name) { report.checks.push(name); console.log('PASS', name); }
function watch(page) { page.on('pageerror', (error) => report.errors.push(error.message)); }
async function isolate(context) {
  await context.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
  await context.route('**/account-config.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' }));
  await context.route('https://**/*', (route) => {
    if (route.request().method() !== 'GET') report.externalWrites.push(route.request().url());
    return route.abort();
  });
}
async function openSongs(page) {
  await page.goto(`${baseUrl}/#/songs`);
  await page.getByRole('heading', { name: 'Theme Songs', exact: true }).waitFor();
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await isolate(desktop);
    const page = await desktop.newPage();
    watch(page);
    await openSongs(page);

    assert.equal(await page.locator('.sidebar').evaluate((element) => getComputedStyle(element).display), 'none');
    assert.match(await page.locator('.songs-page').evaluate((element) => getComputedStyle(element).backgroundImage), /songs\/background\.png/);
    assert.match(await page.locator('.songs-hero').evaluate((element) => getComputedStyle(element).backgroundImage), /songs\/atraxa\.png/);
    assert.equal(await page.locator('.songs-rail').count(), 5);
    assert.deepEqual(new Set(await page.locator('.songs-card').evaluateAll((cards) => cards.map((card) => card.dataset.songId))), new Set(['atraxa', 'azusa', 'giada', 'kaalia', 'sephiroth', 'ur-dragon']));
    assert.equal(await page.locator('.songs-radio span').count(), 3);
    assert.equal(await page.locator('audio').count(), 0);
    const assetBytes = await page.evaluate(async () => (await fetch('/songs/atraxa.png')).arrayBuffer().then((bytes) => bytes.byteLength));
    assert(assetBytes > 2_000_000);
    pass('Desktop Songs mirrors the app hero, artwork, five rails, radio previews, and six-track catalog');

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.locator('[data-player-state="playing"]').waitFor();
    assert.equal(await page.getByText('ON AIR', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.locator('[data-player-state="paused"]').waitFor();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.locator('[data-player-state="playing"]').waitFor();
    pass('Primary control plays, pauses, and resumes real local audio');

    await page.locator('.songs-card[data-song-id="ur-dragon"]').first().click();
    await page.getByRole('heading', { name: 'The Ur-Dragon', exact: true }).waitFor();
    assert.equal(await page.locator('.songs-hero-copy p').textContent(), 'Skyfire Dominion');
    await page.locator('.songs-card[data-song-id="ur-dragon"]').first().click();
    await page.locator('[data-player-state="paused"]').waitFor();
    await page.getByRole('button', { name: 'Shuffle All', exact: true }).click();
    await page.locator('[data-player-state="playing"]').waitFor();
    assert.equal(await page.locator('.songs-hero-top strong').textContent(), 'Shuffle All');
    pass('Track cards select/toggle songs and Shuffle All switches to another track');

    const currentTitle = await page.locator('.songs-hero-copy h2').textContent();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: 'Theme Songs', exact: true }).waitFor();
    assert.equal(await page.locator('.songs-hero-copy h2').textContent(), currentTitle);
    assert.equal(await page.locator('.songs-page').getAttribute('data-player-state'), 'playing');
    await page.getByRole('button', { name: 'Stop Playback', exact: true }).click();
    assert.equal(await page.locator('.songs-page').getAttribute('data-player-state'), 'ready');
    assert.equal(await page.locator('.songs-hero-copy h2').textContent(), "Atraxa, Praetors' Voice");
    pass('Playback survives route navigation and Stop Playback returns the page to its ready state');

    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(__dirname, 'songs-desktop.png'), fullPage: true });
    await desktop.close();

    const loading = await browser.newContext({ viewport: { width: 1080, height: 800 } });
    await loading.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
    await loading.route('**/account-config.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' }));
    let requests = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await loading.route('**/assets/audio/AtraxaPraetor.mp3', async (route) => { requests++; await gate; await route.continue(); });
    const loadingPage = await loading.newPage();
    watch(loadingPage);
    await openSongs(loadingPage);
    await loadingPage.getByRole('button', { name: 'Play', exact: true }).click();
    await loadingPage.locator('[data-player-state="loading"]').waitFor();
    assert.equal(await loadingPage.getByRole('button', { name: 'Loading track…', exact: true }).isEnabled(), false);
    for (let attempt = 0; attempt < 20 && requests === 0; attempt++) await loadingPage.waitForTimeout(50);
    assert.equal(requests, 1);
    await loadingPage.getByRole('button', { name: 'Loading track…', exact: true }).click({ force: true });
    assert.equal(requests, 1);
    release();
    await loadingPage.locator('[data-player-state="playing"]').waitFor();
    pass('Loading state disables repeated playback requests');
    await loading.close();

    const failed = await browser.newContext({ viewport: { width: 1080, height: 800 } });
    await failed.addInitScript(() => localStorage.setItem('deck-sage-browser-only-choice-v1', '1'));
    await failed.route('**/account-config.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.DECK_SAGE_ACCOUNTS=null;' }));
    await failed.route('**/assets/audio/Sephiroth.mp3', (route) => route.abort());
    const failedPage = await failed.newPage();
    watch(failedPage);
    await openSongs(failedPage);
    await failedPage.locator('.songs-card[data-song-id="sephiroth"]').first().click();
    await failedPage.getByRole('alert').waitFor();
    assert.match(await failedPage.getByRole('alert').textContent(), /could not be played/);
    await failedPage.getByRole('button', { name: 'Dismiss', exact: true }).click();
    assert.equal(await failedPage.getByRole('alert').count(), 0);
    pass('Playback failures surface a dismissible inline error');
    await failed.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
    await isolate(mobile);
    const phone = await mobile.newPage();
    watch(phone);
    await openSongs(phone);
    assert.equal(Math.round(await phone.locator('.songs-hero').evaluate((element) => element.getBoundingClientRect().height)), 366);
    assert.equal(Math.round(await phone.locator('.songs-card').first().evaluate((element) => element.getBoundingClientRect().width)), 154);
    assert(await phone.locator('.songs-rail-track').first().evaluate((element) => element.scrollWidth > element.clientWidth));
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await phone.getByRole('button', { name: 'Play', exact: true }).click();
    await phone.locator('[data-player-state="playing"]').waitFor();
    await phone.getByRole('button', { name: 'Pause', exact: true }).click();
    await phone.locator('[data-player-state="paused"]').waitFor();
    await phone.waitForTimeout(1200);
    await phone.screenshot({ path: path.join(__dirname, 'songs-mobile.png'), fullPage: true });
    pass('Mobile dimensions, horizontal rails, playback controls, and overflow match the app layout');
    await mobile.close();

    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalWrites, []);
    pass('Songs QA produced no browser errors or external write requests');
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'songs-report.json'), JSON.stringify(report, null, 2));
  }
}

run().catch((error) => {
  report.failure = error.stack;
  fs.writeFileSync(path.join(__dirname, 'songs-report.json'), JSON.stringify(report, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
});
