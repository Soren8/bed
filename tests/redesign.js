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

      // Above fold: first pick total visible near the top (desktop strict, mobile near-top).
      // Intentional layout shift (Sept 2026 feedback): the mandated bigger hero
      // diagram (display 135px -> 260px desktop / 90px -> 220px mobile, labels
      // redrawn at 20px+ viewBox scale) plus the mandated latex firmness clause
      // and consensus-testing caveat in #logic moved the first pick total from
      // ~760px to ~949px on desktop and ~1375px to ~1638px on mobile. Limits
      // below encode the new intentional layout; picks still follow immediately
      // after the hero + logic block (no bulk added above picks).
      const tops = await page.evaluate(() => [...document.querySelectorAll('.pick-total')].map(el => el.getBoundingClientRect().top));
      const limit = vp.width >= 1000 ? 1050 : 1750;
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
      // Intentional pick order (yearly cost, Sept 2026 feedback; Lux-HQ demoted
      // to watchlist over its second-domain buy flow): Pick 1 = valevag/ego2
      // (Best value), Pick 2 = latex/supersoft2, Pick 3 = lux6/ego2.
      const builds = await page.$$('button[data-build]');
      check(`[${tag}] three build buttons`, builds.length === 3, `found=${builds.length}`);
      // Picks ordered by yearly cost: coil ($54-92), latex ($70-118), Regular ($67-135).
      const pickTotals = await page.evaluate(() => [...document.querySelectorAll('.pick-total')].map(el => el.textContent.trim()));
      check(`[${tag}] picks ordered by yearly cost`, pickTotals.length === 3 && /54.*92/.test(pickTotals[0]) && /70.*118/.test(pickTotals[1]) && /67.*135/.test(pickTotals[2]), JSON.stringify(pickTotals));
      const pickParts = await page.evaluate(() => [...document.querySelectorAll('.pick-parts')].map(el => el.textContent.trim()));
      check(`[${tag}] picks show upfront totals`, pickParts.length === 3 && pickParts[0].includes('620.49') && pickParts[1].includes('1,385.99') && pickParts[2].includes('380.47'), JSON.stringify(pickParts));
      const firstFlag = await page.evaluate(() => (document.querySelector('.pick .flag') || {}).textContent || '');
      check(`[${tag}] first pick flagged best value`, /best value/i.test(firstFlag), firstFlag);
      const latexCardText = await page.evaluate(() => [...document.querySelectorAll('.pick')].map(el => el.innerText).join('\n---\n'));
      check(`[${tag}] latex pick justifies cost per year`, /\$70.*\$118\/yr/.test(latexCardText) && /estimate/i.test(latexCardText), latexCardText.slice(0, 300));
      // Third pick (cheapest upfront) wires correctly: lux6 + ego2 + low =
      // 193.99+49.49+64.99+96 = 404.47.
      await builds[2].click();
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({
        core: (document.querySelector('input[name="core"]:checked') || {}).value,
        topper: (document.querySelector('input[name="topper"]:checked') || {}).value,
        base: (document.querySelector('input[name="base"]:checked') || {}).value,
        total: document.getElementById('out-total').textContent.trim(),
        note: document.getElementById('calc-note').textContent
      }));
      check(`[${tag}] build-this sets calculator`, st.core === 'lux6' && st.topper === 'ego2' && st.base === 'low' && st.total === '$404.47', JSON.stringify(st));
      // First pick (Best value) wires correctly: valevag + ego2 + low (cover
      // built in) = 499.00+49.49+0+96 = 644.49.
      await page.evaluate(() => window.scrollTo(0, 0));
      await builds[0].click();
      await page.waitForTimeout(300);
      const st0 = await page.evaluate(() => ({
        core: (document.querySelector('input[name="core"]:checked') || {}).value,
        topper: (document.querySelector('input[name="topper"]:checked') || {}).value,
        base: (document.querySelector('input[name="base"]:checked') || {}).value,
        total: document.getElementById('out-total').textContent.trim()
      }));
      check(`[${tag}] best-value build sets calculator`, st0.core === 'valevag' && st0.topper === 'ego2' && st0.base === 'low' && st0.total === '$644.49', JSON.stringify(st0));

      // Privacy: no personal anecdote text anywhere (incl SVG docs fetched)
      const bodyText = await page.evaluate(() => document.body.innerText);
      const banned = ['$200', 'unwanted firm mattress', 'best-bed', 'Why modular wins', 'my best', 'I already had', 'foambymail'];
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
