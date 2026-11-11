#!/usr/bin/env node
// Renders engine/cast/sheet.html pages to PNG with Playwright, or benchmarks Cast.render in Chromium.
//   node engine/cast/render-sheet.js                        → engine/cast/cast-sheet.png (scale 2)
//   node engine/cast/render-sheet.js --page char --id kellner --scale 1 --out /tmp/x.png
//   node engine/cast/render-sheet.js --bench [--frames 150]  → ms/frame per character (JS + paint)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const flag = k => args.includes(k);
const HERE = __dirname;

(async () => {
  const browser = await chromium.launch();
  const scale = +opt('--scale', 2);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  if (flag('--bench')) {
    await page.goto('file://' + path.join(HERE, 'sheet.html') + '?page=none');
    const frames = +opt('--frames', 150);
    const res = await page.evaluate((frames) => {
      const out = {}, st = document.getElementById('st');
      for (const id of Cast.list()) {
        let js = 0, tot = 0;
        for (let f = 0; f < frames; f++) {
          const t0 = performance.now();
          const fr = Cast.render(id, { t: f / 30, talk: (Math.sin(f * 0.7) + 1) / 2, pose: f < frames / 2 ? 'talk' : 'hold', expr: f % 60 < 30 ? 'neutral' : 'happy', id: 'b' });
          const t1 = performance.now();
          st.innerHTML = '<g transform="translate(960 1040) scale(1.9)">' + fr.svg + '</g>';
          st.getBoundingClientRect();
          js += t1 - t0; tot += performance.now() - t0;
        }
        out[id] = { jsMs: +(js / frames).toFixed(2), jsAndDomMs: +(tot / frames).toFixed(2), svgKB: +(Cast.render(id, { t: 1 }).svg.length / 1024).toFixed(0) };
      }
      return out;
    }, frames);
    // paint: screenshot time for one character at ~1000 px tall
    const paint = {};
    for (const id of await page.evaluate(() => Cast.list())) {
      let ms = 0; const n = 12;
      for (let f = 0; f < n; f++) {
        await page.evaluate(([id, f]) => { document.getElementById('st').innerHTML = '<g transform="translate(960 1040) scale(1.9)">' + Cast.render(id, { t: f / 30, talk: 0.5, pose: 'talk', id: 'b' }).svg + '</g>'; }, [id, f]);
        const t0 = Date.now(); await page.screenshot({ type: 'jpeg', quality: 80 }); ms += Date.now() - t0;
      }
      paint[id] = +(ms / n).toFixed(1);
    }
    let blank = 0; await page.evaluate(() => { document.getElementById('st').innerHTML = ''; });
    for (let f = 0; f < 12; f++) { const t0 = Date.now(); await page.screenshot({ type: 'jpeg', quality: 80 }); blank += Date.now() - t0; }
    console.log(JSON.stringify({ perFrame: res, screenshotMs: paint, blankScreenshotMs: +(blank / 12).toFixed(1) }, null, 1));
    await browser.close();
    return;
  }
  const q = new URLSearchParams();
  q.set('page', opt('--page', 'sheet'));
  for (const k of ['id', 't', 'talk', 'flip', 'grain']) if (opt('--' + k, null) != null) q.set(k, opt('--' + k));
  await page.goto('file://' + path.join(HERE, 'sheet.html') + '?' + q.toString());
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  const out = path.resolve(opt('--out', path.join(HERE, 'cast-sheet.png')));
  await page.screenshot({ path: out });
  console.log('wrote', out, 'build', (await page.evaluate(() => window.BUILD_MS)).toFixed(0), 'ms');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
