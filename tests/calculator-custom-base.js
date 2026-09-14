#!/usr/bin/env node
// Focused browser test for the stack calculator custom-base behavior.
// No npm dependencies: uses externally installed playwright-core.
//
// Run:
//   NODE_PATH=/tmp/opencode/smoke/node_modules \
//   CHROME_HEADLESS_SHELL=/tmp/opencode/chrome-headless-shell-linux64/chrome-headless-shell \
//   LD_LIBRARY_PATH=/tmp/opencode/sysroot/usr/lib/x86_64-linux-gnu:/tmp/opencode/sysroot/lib/x86_64-linux-gnu \
//   FONTCONFIG_FILE=/tmp/opencode/fonts.conf \
//   /tmp/opencode/node-v20.19.0-linux-x64/bin/node tests/calculator-custom-base.js
// Or with a local node + playwright-core installed:
//   CHROME_HEADLESS_SHELL="/path/to/chrome-headless-shell" node tests/calculator-custom-base.js
//   (omit CHROME_HEADLESS_SHELL to use playwright's default chromium channel)
//
// Env overrides (no sandbox paths hardcoded as defaults):
//   BED_URL               - page URL to test (default: file://../index.html)
//   CHROME_HEADLESS_SHELL - executablePath for chromium (optional)
//   VIEWPORTS             - comma list like "390x800,1280x800" (default both)

const path = require('path');
const { pathToFileURL } = require('url');

let chromium;
try {
  chromium = require('playwright-core').chromium;
} catch (e) {
  console.error('FAIL: playwright-core not found. Install it or set NODE_PATH to its location.');
  console.error('  e.g. NODE_PATH=/tmp/opencode/smoke/node_modules node tests/calculator-custom-base.js');
  process.exit(2);
}

const failures = [];
function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS: ${name}`);
  } else {
    console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failures.push(name);
  }
}

(async () => {
  const launchOpts = { headless: true };
  if (process.env.CHROME_HEADLESS_SHELL) launchOpts.executablePath = process.env.CHROME_HEADLESS_SHELL;
  const browser = await chromium.launch(launchOpts);
  try {
    const defaultUrl = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
    const url = process.env.BED_URL || defaultUrl;
    const viewportSpecs = (process.env.VIEWPORTS || '1280x800,390x800').split(',').map(s => {
      const [w, h] = s.toLowerCase().split('x').map(Number);
      return { width: w || 1280, height: h || 800 };
    });

    for (const viewport of viewportSpecs) {
      const tag = `${viewport.width}x${viewport.height}`;
      console.log(`\n=== viewport ${tag} ===`);
      const page = await browser.newPage({ viewport });
      page.on('pageerror', e => console.error(`pageerror [${tag}]:`, String(e).slice(0, 300)));
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForSelector('#calc-form');

      const out = async (id) => (await page.textContent(id)).trim();

      // 1. Featured math: default lux6 + sweet + cover + low midpoint = 429.91
      check(`[${tag}] default total is $429.91`,
        (await out('#out-total')) === '$429.91',
        `got "${await out('#out-total')}"`);

      // 2. Separate accessible labels for custom radio vs custom price input
      const labelsSeparate = await page.evaluate(() => {
        const radio = document.querySelector('input[name="base"][value="custom"]');
        const input = document.getElementById('custom-base');
        if (!radio || !input) return { ok: false, reason: 'missing nodes' };
        const radioLabel = radio.closest('label');
        const inputLabel = input.closest('label');
        // Pass when they are NOT wrapped by the same <label>.
        if (radioLabel && inputLabel && radioLabel === inputLabel) {
          return { ok: false, reason: 'same label wraps radio+number' };
        }
        const name = (input.getAttribute('aria-label') || '').trim()
          || (input.id && document.querySelector(`label[for="${input.id}"]`) ? document.querySelector(`label[for="${input.id}"]`).textContent.trim() : '');
        return { ok: Boolean(name), reason: name ? '' : 'number input has no accessible name' };
      });
      check(`[${tag}] custom radio + price have separate accessible labels`,
        labelsSeparate.ok, labelsSeparate.reason);

      // 3. Typing a custom price selects the custom radio
      await page.check('input[name="base"][value="low"]');
      await page.fill('#custom-base', '150');
      // fill fires input; fix should also check the radio. Give handlers a tick.
      await page.waitForTimeout(100);
      const customCheckedAfterType = await page.isChecked('input[name="base"][value="custom"]');
      check(`[${tag}] typing custom price selects custom radio`, customCheckedAfterType === true,
        `custom checked=${customCheckedAfterType}`);

      // 4. Valid custom price math: lux6(193.99)+sweet(74.93)+cover(64.99)+150 = 483.91
      await page.check('input[name="core"][value="lux6"]');
      await page.check('input[name="topper"][value="sweet"]');
      await page.uncheck('#own-cover');
      await page.check('input[name="base"][value="custom"]');
      await page.fill('#custom-base', '150');
      await page.waitForTimeout(100);
      check(`[${tag}] custom 150 total is $483.91`,
        (await out('#out-total')) === '$483.91', `got "${await out('#out-total')}"`);

      // 5. Invalid: negative shows a clear error and no plausible $0-based subtotal
      await page.check('input[name="base"][value="custom"]');
      await page.fill('#custom-base', '-5');
      await page.waitForTimeout(100);
      const negState = await page.evaluate(() => {
        const err = document.getElementById('custom-base-error');
        const visible = !!(err && !err.hidden && err.offsetParent !== null && (err.textContent || '').trim().length > 0);
        return {
          errVisible: visible,
          errText: err ? (err.textContent || '').trim().slice(0, 160) : '',
          base: (document.getElementById('out-base') || {}).textContent || '',
          total: (document.getElementById('out-total') || {}).textContent || '',
          invalidAttr: document.getElementById('custom-base').getAttribute('aria-invalid')
        };
      });
      check(`[${tag}] negative custom shows clear error`, negState.errVisible === true,
        `errVisible=${negState.errVisible} text="${negState.errText}"`);
      const negPlausibleZero = negState.base.trim() === '$0.00';
      check(`[${tag}] negative custom has no plausible $0.00 base subtotal`, negPlausibleZero === false,
        `out-base="${negState.base}" out-total="${negState.total}"`);

      // 6. Invalid: empty shows a clear error and no plausible $0.00 base
      await page.check('input[name="base"][value="custom"]');
      await page.fill('#custom-base', '');
      await page.waitForTimeout(100);
      const emptyState = await page.evaluate(() => {
        const err = document.getElementById('custom-base-error');
        const visible = !!(err && !err.hidden && err.offsetParent !== null && (err.textContent || '').trim().length > 0);
        return {
          errVisible: visible,
          base: (document.getElementById('out-base') || {}).textContent || '',
          total: (document.getElementById('out-total') || {}).textContent || ''
        };
      });
      check(`[${tag}] empty custom shows clear error`, emptyState.errVisible === true,
        `base="${emptyState.base}" total="${emptyState.total}"`);
      check(`[${tag}] empty custom has no plausible $0.00 base subtotal`,
        emptyState.base.trim() !== '$0.00',
        `out-base="${emptyState.base}"`);

      // 7. max=2000 consistency: either no max cap (2500 accepted with correct math)
      //    or max is honored with a clear error. Current bug: max attr exists but JS ignores it.
      const maxConsistency = await page.evaluate(() => {
        const input = document.getElementById('custom-base');
        const maxAttr = input.getAttribute('max');
        return { maxAttr };
      });
      await page.check('input[name="base"][value="custom"]');
      await page.fill('#custom-base', '2500');
      await page.waitForTimeout(100);
      const overState = await page.evaluate(() => {
        const err = document.getElementById('custom-base-error');
        const visible = !!(err && !err.hidden && err.offsetParent !== null && (err.textContent || '').trim().length > 0);
        return {
          errVisible: visible,
          base: (document.getElementById('out-base') || {}).textContent || '',
          total: (document.getElementById('out-total') || {}).textContent || ''
        };
      });
      // Expected total with 2500 base: 193.99+74.93+64.99+2500 = 2833.91
      let maxOk, maxDetail;
      if (maxConsistency.maxAttr === null) {
        maxOk = overState.total.trim() === '$2833.91' && overState.errVisible === false;
        maxDetail = `no max attr; total="${overState.total}" errVisible=${overState.errVisible}`;
      } else {
        maxOk = overState.errVisible === true;
        maxDetail = `max="${maxConsistency.maxAttr}" but 2500 accepted without error; total="${overState.total}"`;
      }
      check(`[${tag}] custom max handled consistently (honored or removed)`, maxOk, maxDetail);

      // 8. Enter in custom field must not reset calculator state (no form submit reload)
      await page.check('input[name="core"][value="hq6"]');
      await page.check('input[name="topper"][value="ego2"]');
      await page.check('input[name="base"][value="custom"]');
      await page.fill('#custom-base', '150');
      await page.waitForTimeout(100);
      const beforeEnter = await out('#out-total');
      await page.focus('#custom-base');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      const afterEnter = await page.evaluate(() => ({
        total: (document.getElementById('out-total') || {}).textContent || '',
        core: (document.querySelector('input[name="core"]:checked') || {}).value || '',
        topper: (document.querySelector('input[name="topper"]:checked') || {}).value || '',
        base: (document.querySelector('input[name="base"]:checked') || {}).value || '',
        custom: document.getElementById('custom-base').value
      }));
      // hq6(250.99)+ego2(49.49)+cover(64.99)+150 = 515.47
      check(`[${tag}] Enter does not reset state`, afterEnter.total.trim() === '$515.47'
        && afterEnter.core === 'hq6' && afterEnter.topper === 'ego2'
        && afterEnter.base === 'custom' && afterEnter.custom === '150',
        `before="${beforeEnter}" after=${JSON.stringify(afterEnter)}`);

      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll custom-base browser checks passed.');
})();
