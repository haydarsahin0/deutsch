// Usage: node tools/render.js <page.html> <out.png> <width> <height> [scale=1] [--transparent]
// --transparent keeps the page background see-through (page must not paint one).
// Renders a local HTML page to PNG with headless Chromium. Waits for fonts.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const args = process.argv.slice(2);
  const transparent = args.includes('--transparent');
  const [input, output, w, h, s = '1'] = args.filter(a => a !== '--transparent');
  if (!input || !output || !w || !h) { console.error('usage: render.js page.html out.png W H [scale]'); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +s });
  await page.goto('file://' + path.resolve(input));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: output, omitBackground: transparent });
  await browser.close();
  console.log('wrote', output);
})();
