// NODE_PATH points to an installed playwright; this checks the discussion artifact, not Herdr or T3.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(join(__dirname, 'show-me-layout-controls.html')).href);
    const visible = id => page.locator('#' + id).isVisible();
    const click = id => page.locator('#' + id).click();
    assert(!await visible('details'), '详情应默认收起，不常驻');
    const terminalBefore = await page.locator('#terminal').boundingBox();
    await click('details-toggle');
    assert(await visible('run-action'));
    assert.equal(await page.locator('#details > div').count(), 3, '只保留机器/目录、Open in、Actions 三行');
    assert(await visible('machine-row')); assert(await visible('open-in-row'));
    assert.equal((await page.locator('#terminal').boundingBox()).width, terminalBefore.width, '弹出详情不改变终端宽度');
    await click('details-toggle'); assert(!await visible('details'));
    await click('details-toggle'); assert(await visible('details'));
    await click('panel-toggle');
    await page.waitForFunction(() => document.getElementById('details').hidden);
    assert(await visible('panel'));
    assert.equal(await page.locator('#details-toggle').evaluate(el => el.parentElement.id), 'local-controls');
    await click('details-toggle'); await click('actions-toggle');
    assert(await visible('actions-menu'));
    await page.keyboard.press('Escape');
    assert(!await visible('actions-menu')); assert(await visible('details'));
    await page.keyboard.press('Escape');
    assert(!await visible('details')); assert(await visible('panel'));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'details-toggle');
    await click('details-toggle'); await click('terminal');
    assert(!await visible('details')); assert(await visible('panel'));
    await click('review-tab'); await click('panel-toggle'); await click('panel-toggle');
    assert.equal(await page.locator('#review-tab').getAttribute('aria-selected'), 'true');
    await click('maximize-toggle'); assert(!await visible('work'));
    await click('panel-toggle'); assert(await visible('work')); assert(!await visible('panel'));
    await click('panel-toggle'); assert(await visible('work'));
    await page.setViewportSize({ width: 390, height: 920 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert(await visible('panel-toggle'));
    assert(!await visible('details'));
    await click('details-toggle'); assert(await visible('run-action'));
    assert.deepEqual(errors, []);
    console.log('preview interactions passed: three-row popup, unchanged terminal width, nested Escape, outside click, page restore, maximize, mobile fit');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
