#!/usr/bin/env node
// Usage: node tools/build.js episodes/<ep> [--force] [--no-render] [render flags: --from s --to s --preview --workers N --no-subs --out f]
// Full pipeline, each step skipped when its output is newer than its inputs:
//   1. sprechtext   tools/sprechtext.js        script.md → sprechtext.md, tts files
//   2. audio+align  tools/assemble-audio.py    audio/teil-*.{mp3,wav} → audio/voice.wav + build/alignment.json
//                   (or tools/align.py if there is a voice.wav but no assemble script)
//   3. envelope     tools/envelope.js          voice → build/envelope.json
//   4. timeline     tools/timeline.js          → build/timeline.json (+ timeline.js for the player)
//   5. render       tools/render-video.js      → out/video.mp4 (or out/preview.mp4)
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const ep = argv.find(a => !a.startsWith('--'));
if (!ep || !fs.existsSync(path.join(ep, 'script.md'))) { console.error('usage: node tools/build.js episodes/<ep> [--force] [--no-render] [--from s --to s --preview --workers N --no-subs]'); process.exit(1); }
const force = argv.includes('--force');
const T = path.join(__dirname);
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
const newest = fs_ => Math.max(0, ...fs_.map(mtime));
const P = (...a) => path.join(ep, ...a);
const audioDir = P('audio');
const parts = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter(f => /^teil-\d+\.(mp3|wav|flac)$/i.test(f)).map(f => path.join(audioDir, f)) : [];

function step(name, outs, ins, cmd, args, optional) {
  const stale = force || outs.some(o => !fs.existsSync(o)) || newest(ins) > Math.min(...outs.map(mtime));
  if (!stale) { console.log(`• ${name}: up to date`); return true; }
  if (!fs.existsSync(args[0]) && cmd !== 'node') { console.log(`• ${name}: skipped (${args[0]} missing)`); return !!optional; }
  if (cmd === 'node' && !fs.existsSync(args[0])) { console.log(`• ${name}: skipped (${args[0]} missing)`); return !!optional; }
  console.log(`▶ ${name}`);
  const t0 = Date.now(), r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`✗ ${name} failed (exit ${r.status})`); return false; }
  console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return true;
}

const t0 = Date.now();
let ok = step('sprechtext', [P('sprechtext.md')], [P('script.md'), path.join(T, 'sprechtext.js')], 'node', [path.join(T, 'sprechtext.js'), ep], true);

const voice = P('audio', 'voice.wav'), alignment = P('build', 'alignment.json');
if (parts.length && fs.existsSync(path.join(T, 'assemble-audio.py'))) {
  ok = step('audio + alignment', [voice, alignment], [...parts, P('script.md')], 'python3', [path.join(T, 'assemble-audio.py'), ep], true) && ok;
} else if (fs.existsSync(voice) && fs.existsSync(path.join(T, 'align.py'))) {
  ok = step('alignment', [alignment], [voice, P('script.md')], 'python3', [path.join(T, 'align.py'), ep], true) && ok;
} else console.log('• audio/alignment: no audio parts or tools – using existing files');
if (!fs.existsSync(alignment)) console.log('  ⚠ no build/alignment.json – timeline will fall back to engine/dev/alignment.json (dev only)');

const voiceSrc = fs.existsSync(voice) ? voice : parts[0];
step('lip-sync envelope', [P('build', 'envelope.json')], [voiceSrc, path.join(T, 'envelope.js')].filter(Boolean), 'node', [path.join(T, 'envelope.js'), ep], true);

if (!step('timeline', [P('build', 'timeline.json'), P('build', 'timeline.js')], [alignment, P('build', 'envelope.json'), P('script.md'), path.join(T, 'timeline.js')], 'node', [path.join(T, 'timeline.js'), ep])) process.exit(1);

if (!argv.includes('--no-render')) {
  const pass = argv.filter(a => a !== ep && a !== '--force');
  const r = spawnSync('node', [path.join(T, 'render-video.js'), ep, ...pass], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('✗ render failed'); process.exit(1); }
}
console.log(`✓ build done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
