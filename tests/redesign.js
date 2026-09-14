#!/usr/bin/env node
// Redesign checks: above-fold picks, thickness filters, build-this, privacy, overflow.
const path = require('path');
const { pathToFileURL } = require('url');
let chromium;
try { chromium = require('playwright-core').chromium; }
catch (e) { console.error('FAIL: playwright-core not found'); process.exit(2); }
const failures = [];
function check(name, cond, detail) {
  if (cond) console.log(`PASS: ${name}`);
  else { console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`); failures.push(name); }
}
(async () => {
  const launchOpts = { headless: true };
  if (process.env.CHROME_HEADLESS_SHELL) launchOpts.executablePath = process.env.CHROME_HEADLESS_SHELL;
  const browser = await chromium.launch(launchOpts);
  try {
    const defaultUrl = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
    const url = process.env.BED_URL || defaultUrl;
    for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const tag = `${vp.width}x${vp.height}`;
      console.log(`\n=== viewport ${tag} ===`);
      const page = await browser.newPage({ viewport: vp, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForSelector('#picks');

      // Above fold: first pick total visible without scrolling (desktop strict, mobile near-top)
      const tops = await page.evaluate(() => [...document.querySelectorAll('.pick-total')].map(el => el.getBoundingClientRect().top));
      const limit = vp.width >= 1000 ? vp.height : 1400;
      check(`[${tag}] picks actionable near top`, tops.length === 3 && tops[0] < limit, `tops=${JSON.stringify(tops)}`);

      // Thickness filter: 2" shows only thickness=2
      await page.click('button[data-thickness="2"]');
      await page.waitForTimeout(80);
      const vis2 = await page.evaluate(() => [...document.querySelectorAll('#topper-grid .product')].map(c => ({ t: c.getAttribute('data-thickness'), hidden: c.classList.contains('hidden') || c.offsetParent === null })));
      check(`[${tag}] thickness=2 filters`, vis2.filter(c => !c.hidden).length > 0 && vis2.filter(c => !c.hidden).every(c => c.t === '2'), JSON.stringify(vis2));
      await page.click('button[data-thickness="4"]');
      await page.waitForTimeout(80);
      const vis4 = await page.evaluate(() => [...document.querySelectorAll('#topper-grid .product')].map(c => ({ t: c.getAttribute('data-thickness'), hidden: c.classList.contains('hidden') || c.offsetParent === null })));
      check(`[${tag}] thickness=4 filters`, vis4.filter(c => !c.hidden).length > 0 && vis4.filter(c => !c.hidden).every(c => c.t === '4'), JSON.stringify(vis4));
      await page.click('button[data-thickness="all"]');
      await page.waitForTimeout(80);

      // Build-this applies calculator options.
      // Intentional pick change (core-longevity restructure): picks are now
      // latex/supersoft2, valevag/ego2, hq6/ego2. Third pick: hq6 + ego2 + low
      // = 250.99+49.49+64.99+96 = 461.47 (was lux6 + ego2 + low = 404.47).
      const builds = await page.$$('button[data-build]');
      check(`[${tag}] three build buttons`, builds.length === 3, `found=${builds.length}`);
      await builds[2].click();
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({
        core: (document.querySelector('input[name="core"]:checked') || {}).value,
        topper: (document.querySelector('input[name="topper"]:checked') || {}).value,
        base: (document.querySelector('input[name="base"]:checked') || {}).value,
        total: document.getElementById('out-total').textContent.trim(),
        note: document.getElementById('calc-note').textContent
      }));
      check(`[${tag}] build-this sets calculator`, st.core === 'hq6' && st.topper === 'ego2' && st.base === 'low' && st.total === '$461.47', JSON.stringify(st));

      // Privacy: no personal anecdote text anywhere (incl SVG docs fetched)
      const bodyText = await page.evaluate(() => document.body.innerText);
      const banned = ['$200', 'unwanted firm mattress', 'best-bed', 'Why modular wins', 'my best', 'I already had'];
      const hits = banned.filter(s => bodyText.includes(s));
      check(`[${tag}] no personal anecdote`, hits.length === 0, `hits=${JSON.stringify(hits)}`);
      const svgTexts = await page.evaluate(async () => {
        const out = [];
        for (const src of ['assets/bed-stack.svg', 'assets/base-plan.svg', 'assets/fallback.svg']) {
          try { const r = await fetch(src); out.push((await r.text()).slice(0, 4000)); } catch (e) { out.push('FETCH-FAIL ' + src); }
        }
        return out.join('\n');
      });
      const svgHits = ['$200', 'unwanted', 'best-bed', 'my ~'].filter(s => svgTexts.includes(s));
      check(`[${tag}] SVGs have no personal anecdote`, svgHits.length === 0, JSON.stringify(svgHits));

      // Overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`[${tag}] no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);

      // Focus visibility: tab to first nav link yields outline
      await page.keyboard.press('Tab');
      const focusOk = await page.evaluate(() => { const el = document.activeElement; if (!el) return false; const o = getComputedStyle(el).outlineWidth; return el.className === 'skip' || o !== '0px'; });
      check(`[${tag}] keyboard focus lands visibly`, focusOk === true, '');

      const realErrors = errors.filter(e => !e.includes('Fetch API cannot load file://'));
      check(`[${tag}] no console/page errors`, realErrors.length === 0, realErrors.join(' | ').slice(0, 300));

      // Screenshots
      const shot = `/tmp/opencode/bed-${vp.width}x${vp.height}.png`;
      await page.goto(url, { waitUntil: 'load' });
      await page.screenshot({ path: shot, fullPage: vp.width < 1000 });
      console.log(`shot: ${shot}`);
      await page.close();
    }
    // Desktop full-page for review
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(process.env.BED_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href, { waitUntil: 'load' });
    await page.screenshot({ path: '/tmp/opencode/bed-full-1440.png', fullPage: true });
    console.log('shot: /tmp/opencode/bed-full-1440.png');
    await page.close();
  } finally { await browser.close(); }
  if (failures.length) { console.error(`\n${failures.length} check(s) FAILED`); process.exit(1); }
  console.log('\nAll redesign checks passed.');
})();
