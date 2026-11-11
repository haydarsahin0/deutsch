#!/usr/bin/env node
// Test render of the character rig: Playwright frame capture → ffmpeg (+ audio).
// Usage:
//   node engine/character/test-render.js episodes/<ep> --from 20 --to 40 [--out file.mp4]
//        [--align build/alignment.json] [--env build/envelope.json] [--audio audio/voice.wav]
//        [--size 1280x720] [--layout split|full|head] [--board left|right] [--workers 2]
//        [--sheet 2] [--sheet-cols 8] [--sheet-out file.png]   contact sheet: every Nth frame, no video
//        [--bench]                                             report timings only (rig.render + paint)
// The page shows the full figure (left) and a head close-up (right) of the same frame, plus a debug strip
// (speech mask / mouth openness / words).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const flag = k => args.includes(k);
const ep = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--bench'].includes(args[i - 1])));
if (!ep) { console.error('usage: test-render.js episodes/<ep> --from s --to s [options]'); process.exit(1); }
const epDir = path.resolve(ep);
const from = +opt('--from', 0), to = +opt('--to', from + 10);
const fps = 30;
const [W, H] = opt('--size', '1280x720').split('x').map(Number);
const layout = opt('--layout', 'split');
const boardSide = opt('--board', 'right');
const alignFile = path.resolve(epDir, opt('--align', 'build/alignment.json'));
const envFile = path.resolve(epDir, opt('--env', 'build/envelope.json'));
let audio = opt('--audio', null);
if (audio) audio = path.resolve(epDir, audio);
else audio = require(path.join(ROOT, 'tools', 'envelope.js')).findAudio(epDir);
const sheetEvery = +opt('--sheet', 0);
const workers = +opt('--workers', 2);
const outFile = path.resolve(opt('--out', path.join(epDir, 'build', 'character-test', `talk-${from}-${to}.mp4`)));

const align = fs.existsSync(alignFile) ? JSON.parse(fs.readFileSync(alignFile, 'utf8')) : { words: [], cues: [] };
const envelope = JSON.parse(fs.readFileSync(envFile, 'utf8'));

function pageHtml() {
  const mb = 'file://' + path.join(ROOT, 'brand/concepts/b/melo-b.js');
  const rg = 'file://' + path.join(ROOT, 'engine/character/rig.js');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#ebe1c8;overflow:hidden}
  #st{position:absolute;inset:0}
  #dbg{position:absolute;left:0;right:0;bottom:0;height:46px;font:14px monospace;color:#17130f;padding:4px 10px;box-sizing:border-box;background:rgba(235,225,200,.85)}
  </style><script src="${mb}"></script><script src="${rg}"></script></head><body>
  <svg id="st" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg><div id="dbg"></div></body></html>`;
}

async function setup(browser, data) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const tmp = path.join(path.dirname(outFile), `.page-${process.pid}.html`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, pageHtml());
  await page.goto('file://' + tmp);
  fs.unlinkSync(tmp);
  await page.evaluate(({ data, W, H, layout, boardSide }) => {
    const words = data.words;
    window.rig = MeloRig.prepare({ fps: 30, envelope: data.envelope, words, cues: data.cues, seed: 7 });
    const st = document.getElementById('st'), dbg = document.getElementById('dbg');
    window.draw = (t) => {
      const t0 = performance.now();
      const fr = rig.render(t, { boardSide, rough: window.ROUGH });
      const t1 = performance.now();
      let html = '';
      if (layout === 'split' || layout === 'full') {
        const s = layout === 'split' ? H * 0.92 / 534 : H * 0.95 / 534;
        const cx = layout === 'split' ? W * 0.25 : W * 0.5;
        html += `<g transform="translate(${cx} ${H * 0.95}) scale(${s})">${fr.svg}</g>`;
      }
      if (layout === 'split' || layout === 'head') {
        const hc = fr.anchors.headCenter, s = layout === 'split' ? H * 0.85 / 200 : H * 0.9 / 200;
        const cx = layout === 'split' ? W * 0.68 : W * 0.5;
        html += `<g transform="translate(${cx} ${H * 0.47}) scale(${s}) translate(${-hc[0]} ${-hc[1]})">${fr.svg}</g>`;
      }
      st.innerHTML = html;
      const w = words.find(x => t >= x.start && t <= x.end);
      const S = fr.state;
      dbg.textContent = `t=${t.toFixed(2)}  ${S.speaking ? 'SPEAK' : '-----'}  open=${S.mouthOpen.toFixed(2)}  ${S.expr}/${S.pose}/${S.look}  blink=${S.blink}  word: ${w ? w.text : ''}`;
      return t1 - t0;
    };
  }, { data, W, H, layout, boardSide });
  if (opt('--rough', null) != null) await page.evaluate(r => { window.ROUGH = r; }, +opt('--rough', 1));
  if (flag('--blank')) await page.evaluate(() => { window.draw = () => 0; });
  return page;
}

(async () => {
  const data = { envelope, words: align.words || [], cues: align.cues || [] };
  const browser = await chromium.launch();
  const frames = [];
  for (let f = Math.round(from * fps); f < Math.round(to * fps); f++) frames.push(f);

  if (flag('--bench')) {
    const page = await setup(browser, data);
    let rigMs = 0, totMs = 0, n = 0;
    for (const f of frames) {
      const t0 = Date.now();
      rigMs += await page.evaluate(t => window.draw(t), f / fps);
      await page.screenshot({ type: 'jpeg', quality: 80 });
      totMs += Date.now() - t0; n++;
    }
    console.log(`bench ${n} frames: rig.render ${(rigMs / n).toFixed(2)} ms/frame (in Chromium), render+paint+screenshot ${(totMs / n).toFixed(1)} ms/frame @ ${W}x${H} (${layout})`);
    await browser.close();
    return;
  }

  if (sheetEvery) {
    const page = await setup(browser, data);
    const cols = +opt('--sheet-cols', 8);
    const sel = frames.filter((f, i) => i % sheetEvery === 0);
    const dir = path.join(path.dirname(outFile), `.sheet-${process.pid}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < sel.length; i++) {
      await page.evaluate(t => window.draw(t), sel[i] / fps);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
    }
    const sheetOut = path.resolve(opt('--sheet-out', outFile.replace(/\.mp4$/, `-sheet.png`)));
    const rows = Math.ceil(sel.length / cols);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'f%04d.png'),
      '-vf', `scale=${Math.round(W / 4)}:-1,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', sheetOut]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('wrote', sheetOut, `(${sel.length} frames, every ${sheetEvery}th from ${from}s)`);
    await browser.close();
    return;
  }

  // video: workers render interleaved chunks into PNG files, then ffmpeg encodes + muxes audio
  const dir = path.join(path.dirname(outFile), `.frames-${process.pid}`);
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  let rigMs = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await setup(browser, data);
    for (let i = w; i < frames.length; i += workers) {
      rigMs += await page.evaluate(t => window.draw(t), frames[i] / fps);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
  }));
  const capMs = Date.now() - t0;
  const ff = ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg')];
  if (audio) ff.push('-ss', String(from), '-t', String(to - from), '-i', audio);
  ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'veryfast');
  if (audio) ff.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
  ff.push(outFile);
  execFileSync('ffmpeg', ff);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`wrote ${outFile}  ${frames.length} frames, capture ${(capMs / frames.length).toFixed(1)} ms/frame (${workers} workers), rig.render avg ${(rigMs / frames.length).toFixed(2)} ms`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
