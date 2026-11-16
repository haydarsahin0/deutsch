// Capture the crayon film: one JPEG per drawing (12 a second), rendered by headless Chromium (WebGL2 via SwiftShader).
//   node capture.js --modules <dir with node_modules/three> --out <frames dir> [--workers 3] [--only 0,4.5,12] [--q .93]
// The page is served by a tiny static server: this folder at /, three.js at /node_modules/.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = __dirname, MODS = path.resolve(arg('modules', path.join(ROOT, '..'))), OUT = path.resolve(arg('out', path.join(ROOT, 'out/frames')));
const WORKERS = +arg('workers', 3), Q = +arg('q', .93), ONLY = arg('only', null), FROM = +arg('from', 0);   // --from <s>: re-render only the tail
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const file = u.startsWith('/node_modules/') ? path.join(MODS, u) : path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!file.startsWith(MODS) && !file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const open = async () => {
    const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
    await p.goto(url); await p.waitForFunction(() => window.READY === true, null, { timeout: 45000 });
    return p;
  };
  const first = await open(); const DUR = await first.evaluate(() => window.DUR);
  const jobs = ONLY ? ONLY.split(',').map(Number).map(t => ({ t, name: `still_${t.toFixed(2)}.jpg` }))
    : Array.from({ length: Math.ceil(DUR * 12 - 1e-6) }, (_, i) => ({ t: i / 12, name: `f${String(i).padStart(4, '0')}.jpg` })).filter(j => j.t >= FROM - 1e-6);
  const pages = [first, ...await Promise.all(Array.from({ length: Math.max(0, Math.min(WORKERS, jobs.length) - 1) }, open))];
  const t0 = Date.now(); let next = 0, done = 0;
  await Promise.all(pages.map(async p => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const data = await p.evaluate(([t, q]) => { window.render(t); return document.getElementById('gl').toDataURL('image/jpeg', q); }, [j.t + 1e-4, Q]);
      fs.writeFileSync(path.join(OUT, j.name), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 24 === 0 || done === jobs.length) console.log(`${done}/${jobs.length}  ${((Date.now() - t0) / done / 1000).toFixed(2)} s/drawing (wall)`);
    }
  }));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
