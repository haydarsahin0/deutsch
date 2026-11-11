#!/usr/bin/env node
// Usage: node tools/html-frames.js --page <page.html> --out <dir|file.png> --w 1080 --h 1920
//                                  [--params p.json] [--frames N] [--fps 30] [--t0 0] [--transparent]
// Renders an HTML page frame by frame to PNGs (<dir>/f_0000.png …) or, with --frames 1 and an --out ending in .png,
// to a single still. The page must set window.__ready = true once initialised and expose window.renderFrame(t)
// (sync or async). --params JSON is injected as window.SHORT_PARAMS before the page loads.
// Used by tools/make-short.py for the Shorts overlays (title pop-in, end card) and the cover.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    const k = a[i].slice(2), v = a[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}

(async () => {
  const o = args();
  if (!o.page || !o.out) { console.error('usage: html-frames.js --page p.html --out dir --w W --h H [--params p.json] [--frames N]'); process.exit(1); }
  const W = +(o.w || 1080), H = +(o.h || 1920), N = +(o.frames || 1), fps = +(o.fps || 30), t0 = +(o.t0 || 0);
  const params = o.params ? JSON.parse(fs.readFileSync(o.params, 'utf8')) : {};
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('  [page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [page]', m.text()); });
  await page.addInitScript(p => { window.SHORT_PARAMS = p; }, params);
  await page.goto('file://' + path.resolve(o.page));
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(err);
  const single = N === 1 && /\.png$/i.test(o.out);
  if (!single) fs.mkdirSync(o.out, { recursive: true });
  const t1 = Date.now();
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.renderFrame(t), t0 + f / fps);
    const file = single ? o.out : path.join(o.out, 'f_' + String(f).padStart(4, '0') + '.png');
    await page.screenshot({ path: file, omitBackground: !!o.transparent, animations: 'disabled', caret: 'hide' });
  }
  await browser.close();
  console.log(`  ${N} frame(s) ${W}×${H} → ${o.out} (${((Date.now() - t1) / N).toFixed(0)} ms/frame)`);
})().catch(e => { console.error('html-frames failed:', e.message); process.exit(1); });
