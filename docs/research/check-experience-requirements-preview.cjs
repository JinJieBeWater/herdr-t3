// Checks the standalone handoff illustration, not the native Herdr implementation.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(join(__dirname, 'show-me-experience-requirements.html')).href);
    const click = id => page.locator('#' + id).click();
    const visible = id => page.locator('#' + id).isVisible();
    const tabs = () => page.locator('.panel-tab').count();
    const openFile = path => page.locator('#panel-card [data-file]').filter({ hasText: path.split('/').pop() }).click();
    assert(!await visible('details-popup'));
    const terminal = await page.locator('#demo-terminal').boundingBox();
    await click('details-toggle');
    assert.equal(await page.locator('#details-popup > .detail-row').count(), 3);
    assert.equal((await page.locator('#demo-terminal').boundingBox()).width, terminal.width);
    await click('actions-toggle');
    await page.keyboard.press('Escape');
    assert(!await visible('actions-menu')); assert(await visible('details-popup'));
    await page.keyboard.press('Escape'); assert(!await visible('details-popup'));

    await click('panel-toggle'); assert.equal(await tabs(), 0);
    await click('add-tab'); await click('add-files'); await openFile('README.md');
    assert.equal(await tabs(), 1, 'first file replaces Files');
    await openFile('src/main.js'); await openFile('README.md');
    assert.equal(await tabs(), 2, 'opening the same file activates its existing tab');
    await click('add-tab'); await click('add-review');
    await click('add-tab'); await click('add-review');
    assert.equal(await tabs(), 3, 'Review is a singleton');
    await openFile('src/main.js'); assert.equal(await tabs(), 3, 'Review tree only navigates diff');
    await page.locator('.groups button').nth(1).click();
    assert.equal(await page.locator('#panel-card [data-file]').count(), 1, 'tree filters with diff group');
    await page.selectOption('#space-select', 'remote');
    assert(!await visible('demo-panel'));
    await click('details-toggle'); assert(await page.locator('#open-directory').isDisabled());
    await click('details-toggle');
    await page.selectOption('#space-select', 'herdr-t3');
    assert.equal(await tabs(), 3, 'space restores its tabs');
    await click('wide-toggle'); assert(!await visible('demo-work'));
    await click('panel-toggle'); await click('panel-toggle'); assert(await visible('demo-work'));
    await page.locator('.panel-tab').first().click({ button: 'right' });
    await page.locator('[data-command="others"]').click(); assert.equal(await tabs(), 1);
    await page.locator('.panel-tab').first().click({ button: 'middle' });
    assert(!await visible('demo-panel'), 'closing the last tab hides the panel');
    await click('panel-toggle'); assert.equal(await tabs(), 0);

    await click('choose-image'); await click('contain-mode');
    const canvas = await page.locator('#wall-canvas').boundingBox();
    let art = await page.locator('#wall-art').boundingBox();
    assert(art.width <= canvas.width && art.height <= canvas.height, 'contain at 1x shows the whole picture');
    await page.locator('#wall-zoom').fill('2');
    const beforeDrag = await page.locator('#wall-summary').textContent();
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width / 2 + 45, canvas.y + canvas.height / 2 + 20); await page.mouse.up();
    assert.notEqual(await page.locator('#wall-summary').textContent(), beforeDrag, 'drag changes draft placement');
    art = await page.locator('#wall-art').boundingBox();
    await page.keyboard.press('ArrowLeft');
    assert((await page.locator('#wall-art').boundingBox()).x < art.x, 'left key moves the picture left');
    await click('wall-apply'); assert(!await visible('wall-editor'));
    const saved = await page.locator('#wall-summary').textContent();
    await page.locator('#wall-canvas').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#wall-summary').textContent(), saved, 'saved wallpaper cannot be edited');
    await click('choose-image'); await click('cover-mode'); await click('wall-cancel');
    assert.equal(await page.locator('#wall-summary').textContent(), saved, 'Cancel preserves saved composition');

    const screenshots = mkdtempSync(join(tmpdir(), 'herdr-requirements-preview-'));
    await click('scenario-files');
    await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await click('details-toggle'); assert(await visible('run-action'));
    await click('details-toggle');
    await page.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('all preview checks passed: popup geometry, focus, tabs, group filtering, space restore, close, wallpaper drag/apply/cancel, mobile fit');
    console.log('Screenshots: ' + screenshots);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
