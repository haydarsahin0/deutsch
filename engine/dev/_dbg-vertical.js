const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => console.log('[c]', m.text()));
  await p.goto('file:///home/user/deutsch/engine/player.html?ep=03-ki-als-deutschlehrer&subs=0&vertical=1&t=-1');
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const r = await p.evaluate(async () => { await window.renderFrame(14.5); const E = MeloEngine._E; const s = E.vShot; return { i: s.i, type: s.type, set: s.set, args: s.args, melo: s.melo, inShot: E.meloInShot, heads: E.heads }; });
  console.log(JSON.stringify(r));
  await b.close();
})();
