#!/usr/bin/env node
// Usage: node tools/envelope.js episodes/<ep> [--audio file] [--out file] [--fps 30]
// Lip-sync envelope for the character rig (engine/character/rig.js).
// Decodes audio/voice.wav (fallback: first audio/teil-*.{wav,mp3}) with ffmpeg to mono 16 kHz PCM
// and writes build/envelope.json:
// {
//   fps: 30, frames: N, duration: s, source: "audio/voice.wav",
//   rms:  [N]   per video frame, loudness 0..1 (robust percentile-normalised dB, ±1 frame look-around)
//   hf:   [N]   per video frame, spectral brightness 0..1 (high/low band ratio; high = s/sch/f/t, low = o/u/m/n)
//   zcr:  [N]   per video frame, zero-crossing rate 0..1 (normalised)
//   hop: 0.01, env: [M]  100 Hz loudness 0..1 (same normalisation, 25 ms windows) – the rig uses this
//                        for sub-frame attack/release; renderers that only need per-frame data use `rms`.
//   envHf: [M]  100 Hz brightness 0..1
//   norm: { floorDb, peakDb, gateDb }   normalisation info
// }
// No dependencies besides ffmpeg on PATH.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 16000;

function findAudio(epDir) {
  const a = path.join(epDir, 'audio');
  const voice = ['voice.wav', 'voice.flac', 'voice.mp3'].map(f => path.join(a, f)).find(f => fs.existsSync(f));
  if (voice) return voice;
  if (!fs.existsSync(a)) return null;
  const parts = fs.readdirSync(a).filter(f => /^teil-\d+\.(wav|mp3|flac|m4a)$/i.test(f))
    .sort((x, y) => parseInt(x.match(/\d+/)[0]) - parseInt(y.match(/\d+/)[0]));
  return parts.length ? path.join(a, parts[0]) : null;
}

function decode(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'],
    { maxBuffer: 1024 * 1024 * 1024 });
  const n = buf.length >> 1, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(i * 2) / 32768;
  return x;
}

function percentile(arr, p) {
  const a = Array.from(arr).sort((u, v) => u - v);
  if (!a.length) return 0;
  return a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
}

// windowed analysis: energy, high-band energy (first difference ≈ +6 dB/oct pre-emphasis),
// low-band energy (one-pole low-pass @ ~700 Hz), zero crossings
function analyse(x, centers, half) {
  const n = x.length, out = { db: new Float32Array(centers.length), ratio: new Float32Array(centers.length), zcr: new Float32Array(centers.length) };
  // prefix sums for speed
  const e = new Float64Array(n + 1), h = new Float64Array(n + 1), l = new Float64Array(n + 1), z = new Float64Array(n + 1);
  const a = Math.exp(-2 * Math.PI * 700 / SR);
  let lp = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const v = x[i], d = v - prev;
    lp = (1 - a) * v + a * lp;
    e[i + 1] = e[i] + v * v;
    h[i + 1] = h[i] + d * d;
    l[i + 1] = l[i] + lp * lp;
    z[i + 1] = z[i] + ((v >= 0) !== (prev >= 0) && Math.abs(v - prev) > 0.002 ? 1 : 0);
    prev = v;
  }
  for (let k = 0; k < centers.length; k++) {
    const c = centers[k], i0 = Math.max(0, c - half), i1 = Math.min(n, c + half), len = Math.max(1, i1 - i0);
    const en = (e[i1] - e[i0]) / len, hi = (h[i1] - h[i0]) / len, lo = (l[i1] - l[i0]) / len;
    out.db[k] = 10 * Math.log10(en + 1e-10);
    out.ratio[k] = 10 * Math.log10((hi + 1e-10) / (lo + 1e-10));
    out.zcr[k] = (z[i1] - z[i0]) / len;
  }
  return out;
}

function r3(v) { return Math.round(v * 1000) / 1000; }

function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const epDir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--audio' && args[args.indexOf(a) - 1] !== '--out' && args[args.indexOf(a) - 1] !== '--fps');
  if (!epDir) { console.error('usage: node tools/envelope.js episodes/<ep> [--audio f] [--out f] [--fps 30]'); process.exit(1); }
  const fps = +opt('--fps', 30);
  const audio = opt('--audio', null) || findAudio(epDir);
  if (!audio) { console.error('no audio found in', path.join(epDir, 'audio')); process.exit(1); }
  const outFile = opt('--out', path.join(epDir, 'build', 'envelope.json'));
  const t0 = Date.now();
  const x = decode(audio);
  const duration = x.length / SR;

  // 100 Hz envelope, 25 ms windows
  const hop = 0.01, M = Math.ceil(duration / hop);
  const c100 = Array.from({ length: M }, (_, k) => Math.round((k + 0.5) * hop * SR));
  const A = analyse(x, c100, Math.round(0.0125 * SR));
  // per frame: window = frame span ±1/3 frame look-around on each side (≈ 56 ms at 30 fps)
  const N = Math.ceil(duration * fps);
  const cF = Array.from({ length: N }, (_, k) => Math.round((k + 0.5) / fps * SR));
  const F = analyse(x, cF, Math.round((0.5 + 0.33) / fps * SR));

  // robust normalisation: floor = 10th percentile (silence/breath), peak = 97th percentile of active frames
  const floorDb = percentile(A.db, 0.10);
  const active = Array.from(A.db).filter(v => v > floorDb + 12);
  const peakDb = percentile(active.length > 50 ? active : A.db, 0.97);
  const gateDb = floorDb + Math.max(8, (peakDb - floorDb) * 0.28);
  const norm = v => Math.max(0, Math.min(1, (v - gateDb) / Math.max(6, peakDb - gateDb)));
  // brightness: normalise the hi/lo band ratio over active frames only
  const actRatio = [], actZ = [];
  for (let k = 0; k < M; k++) if (A.db[k] > gateDb) { actRatio.push(A.ratio[k]); actZ.push(A.zcr[k]); }
  const rLo = percentile(actRatio, 0.05), rHi = percentile(actRatio, 0.95);
  const zLo = percentile(actZ, 0.05), zHi = percentile(actZ, 0.95);
  const nR = v => Math.max(0, Math.min(1, (v - rLo) / Math.max(1e-6, rHi - rLo)));
  const nZ = v => Math.max(0, Math.min(1, (v - zLo) / Math.max(1e-6, zHi - zLo)));

  const env = [], envHf = [], rms = [], hf = [], zcr = [];
  for (let k = 0; k < M; k++) { env.push(r3(norm(A.db[k]))); envHf.push(r3(A.db[k] > gateDb - 6 ? nR(A.ratio[k]) : 0)); }
  for (let k = 0; k < N; k++) {
    rms.push(r3(norm(F.db[k])));
    const on = F.db[k] > gateDb - 6;
    hf.push(r3(on ? nR(F.ratio[k]) : 0));
    zcr.push(r3(on ? nZ(F.zcr[k]) : 0));
  }
  const out = {
    fps, frames: N, duration: r3(duration), source: path.relative(epDir, audio),
    rms, hf, zcr, hop, env, envHf,
    norm: { floorDb: r3(floorDb), peakDb: r3(peakDb), gateDb: r3(gateDb) }
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out));
  const speaking = rms.filter(v => v > 0.05).length / N;
  console.log(`envelope: ${path.relative(process.cwd(), outFile)}  ${N} frames @ ${fps} fps, ${duration.toFixed(1)} s, ` +
    `floor ${floorDb.toFixed(1)} dB, gate ${gateDb.toFixed(1)} dB, peak ${peakDb.toFixed(1)} dB, active ${(speaking * 100).toFixed(0)}%, ${Date.now() - t0} ms`);
}

if (require.main === module) main();
module.exports = { findAudio };
