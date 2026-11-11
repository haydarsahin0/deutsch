#!/usr/bin/env node
// Usage: node tools/render-video.js episodes/<ep> [--from s] [--to s] [--preview] [--workers N] [--no-subs]
//                                   [--out file.mp4] [--crf 18] [--preset fast] [--stills t1,t2,… --stills-dir dir]
// Renders engine/player.html frame by frame with Playwright Chromium in N parallel browsers (contiguous
// chunks) → ffmpeg libx264 yuv420p 30 fps → concat → mux audio (timeline.audio, normally audio/voice.wav)
// as AAC 192k → out/video.mp4 (or out/preview.mp4 with --preview = 960×540).
// Subtitles are burned in by default (--no-subs to disable). Needs build/timeline.js (tools/timeline.js).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const k = a[i].slice(2), v = a[i + 1];
      if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
    } else o._.push(a[i]);
  }
  return o;
}

async function openPage(ep, scale, subs) {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security', '--force-color-profile=srgb', '--disable-gpu-vsync'] });
  const W = Math.round(1920 * scale), H = Math.round(1080 * scale);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const s = m.text(); if (!/layout: scene|MeloIcons/.test(s) || process.env.VERBOSE) console.log('  [page]', s); } });
  page.on('pageerror', e => console.log('  [page error]', e.message));
  const url = 'file://' + path.resolve(__dirname, '..', 'engine', 'player.html') + `?ep=${encodeURIComponent(path.basename(path.resolve(ep)))}&scale=${scale}&subs=${subs ? 1 : 0}&t=-1`;
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('player init failed: ' + err);
  return { browser, page };
}

async function grab(page, t, type) {
  await page.evaluate(t => window.renderFrame(t), t);
  return page.screenshot({ type, quality: type === 'jpeg' ? 93 : undefined, clip: undefined, omitBackground: false, animations: 'disabled', caret: 'hide', scale: 'css' });
}

async function renderChunk(ep, opts, i, f0, f1, file, progress) {
  const { browser, page } = await openPage(ep, opts.scale, opts.subs);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
    '-c:v', 'libx264', '-preset', opts.preset, '-crf', String(opts.crf), '-pix_fmt', 'yuv420p', '-r', '30', '-threads', '2', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  for (let f = f0; f < f1; f++) {
    const buf = await grab(page, f / 30, 'jpeg');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    progress(i);
  }
  ff.stdin.end();
  await done;
  await browser.close();
}

async function main() {
  const o = args(), ep = o._[0];
  if (!ep) { console.error('usage: node tools/render-video.js episodes/<ep> [--from s] [--to s] [--preview] [--workers N] [--no-subs]'); process.exit(1); }
  const tlFile = path.join(ep, 'build', 'timeline.json');
  if (!fs.existsSync(tlFile)) { console.error('missing ' + tlFile + ' – run node tools/timeline.js ' + ep); process.exit(1); }
  const TL = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
  const opts = { scale: o.preview ? 0.5 : 1, subs: !o['no-subs'] && o.subs !== '0', crf: +(o.crf || (o.preview ? 23 : 18)), preset: o.preset || (o.preview ? 'veryfast' : 'fast') };

  // stills mode
  if (o.stills) {
    const dir = o['stills-dir'] || path.join(__dirname, '..', 'engine', 'dev', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await openPage(ep, opts.scale, opts.subs);
    for (const spec of String(o.stills).split(',')) {
      const [ts, name] = spec.split(':'), t = parseFloat(ts);
      const t0 = Date.now(), buf = await grab(page, t, 'png');
      const f = path.join(dir, (name || ('t' + t.toFixed(2))) + '.png');
      fs.writeFileSync(f, buf);
      console.log(`  still ${t.toFixed(2)} s → ${f} (${Date.now() - t0} ms)`);
    }
    await browser.close();
    return;
  }

  const from = Math.max(0, parseFloat(o.from || 0)), to = Math.min(TL.duration, parseFloat(o.to || TL.duration));
  const F0 = Math.round(from * 30), F1 = Math.round(to * 30), N = F1 - F0;
  if (N <= 0) { console.error('nothing to render'); process.exit(1); }
  const workers = Math.max(1, Math.min(+(o.workers || Math.max(1, os.cpus().length)), Math.ceil(N / 30)));
  const outDir = path.join(ep, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const out = o.out || path.join(outDir, o.preview ? 'preview.mp4' : 'video.mp4');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'melo-render-'));
  console.log(`render ${from.toFixed(2)}–${to.toFixed(2)} s (${N} frames) · ${workers} workers · ${opts.scale === 1 ? '1920×1080' : '960×540'} · subs ${opts.subs ? 'on' : 'off'} → ${out}`);
  const t0 = Date.now(), counts = new Array(workers).fill(0);
  let last = 0;
  const progress = (i) => {
    counts[i]++;
    const now = Date.now();
    if (now - last > 5000) {
      last = now;
      const done = counts.reduce((a, b) => a + b, 0), el = (now - t0) / 1000;
      process.stdout.write(`  ${done}/${N} frames · ${(el * 1000 / done).toFixed(0)} ms/frame overall · ETA ${((N - done) * el / done / 60).toFixed(1)} min\n`);
    }
  };
  const chunks = [];
  for (let i = 0; i < workers; i++) {
    const a = F0 + Math.floor(N * i / workers), b = F0 + Math.floor(N * (i + 1) / workers);
    chunks.push({ i, a, b, file: path.join(tmp, `chunk-${String(i).padStart(3, '0')}.mp4`) });
  }
  await Promise.all(chunks.map(c => renderChunk(ep, opts, c.i, c.a, c.b, c.file, progress)));
  const el = (Date.now() - t0) / 1000;
  console.log(`  frames done in ${el.toFixed(1)} s · ${(el * 1000 / N).toFixed(0)} ms/frame overall (${(el * 1000 * workers / N).toFixed(0)} ms/frame per worker)`);
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, chunks.map(c => `file '${c.file}'`).join('\n'));
  const silent = path.join(tmp, 'video.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  let audio = TL.audio ? path.join(ep, TL.audio) : null;
  if (!audio || !fs.existsSync(audio)) {
    const cand = ['voice.wav', 'teil-1.mp3'].map(f => path.join(ep, 'audio', f)).find(f => fs.existsSync(f));
    audio = cand || null;
  }
  if (audio) {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  } else { fs.copyFileSync(silent, out); console.log('  ⚠ no audio found – silent video'); }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${(to - from).toFixed(1)} s)`);
}

main().catch(e => { console.error('render failed:', e.message); process.exit(1); });
