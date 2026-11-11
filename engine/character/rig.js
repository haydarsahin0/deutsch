/*!
 * MeloRig — animation rig for Melo (Concept B) on top of brand/concepts/b/melo-b.js.
 * Browser: window.MeloRig (load melo-b.js first) · Node: require('engine/character/rig.js')
 *
 *   var rig = MeloRig.prepare({ fps, envelope, words, cues, seed, duration });
 *   var fr  = rig.render(t, { boardSide: 'right'|'left', board: true });
 *   fr.svg      '<g class="melo-rig">…</g>'  character coords: feet at (0,0), +y down, head centre ≈ (0,-292)
 *   fr.anchors  { feet, headCenter, headTop, mouth, eyes, handL, handR, fingerTip, bbox }
 *   fr.state    { expr, pose, look, speaking, mouthOpen, blink, … }
 *
 * render(t) is a pure function of t (everything is precomputed in prepare), so frames can be rendered
 * in any order / in parallel workers. See README.md for the state model and tuning parameters.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../brand/concepts/b/melo-b.js'));
  else root.MeloRig = factory(root.MeloB);
})(typeof self !== 'undefined' ? self : this, function (MeloB) {
  'use strict';
  if (!MeloB || !MeloB.parts) throw new Error('MeloRig needs melo-b.js (with MeloB.parts) loaded first');

  var U = MeloB._util, P = MeloB.parts, Ink = MeloB._Ink, EXPR = MeloB._EXPR, POSES = MeloB._POSES, HANDS = MeloB._HANDS;
  var HEAD = P.HEAD, HEAD_Y = P.HEAD_Y;
  var f1 = U.f1;

  // ───────────────────────────── tuning ─────────────────────────────
  var T = {
    hop: 0.01,             // internal lip-sync resolution (s)
    attack: 0.040,         // mouth opening time constant (s)
    release: 0.090,        // mouth closing time constant (s)
    snap: 0.030,           // closing time constant outside speech (s)
    bridgeGap: 0.12,       // gaps between words shorter than this keep the mouth "in speech"
    padStart: 0.03,        // speech mask padding before word start / after word end (s)
    padEnd: 0.03,
    gate: 0.06,            // loudness gate (normalised envelope 0..1)
    closeBelow: 0.05,      // hysteresis: mouth snaps fully shut below this
    openMax: 0.9,          // max lip-sync openness passed to melo-b
    transition: 0.32,      // expression / pose / look easing (s)
    blinkMin: 2.5, blinkMax: 6.0, doubleBlink: 0.18,
    breathPeriod: 3.9,
    boilEvery: 4,          // new line-boil variant every N frames
    roughFreq: 0.035, roughAmp: 0.75,   // baked ink wobble (≈ the brand's feTurbulence 0.035 / scale 2.6)
    grainFreq: 0.45, grainAmp: 0.32,    // baked fine edge grain when the grain filter is off
    grainAmpWithFilter: 0.12,           // … and when it is on
    grainTile: 24, grainTilePx: 32, grainFilter: 1.4  // grain filter: noise tile size (user units / px), displacement
  };

  // ───────────────────────────── small utils ─────────────────────────────
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function lerpPt(a, b, w) { return [lerp(a[0], b[0], w), lerp(a[1], b[1], w)]; }
  // recursive numeric blend; non-numeric values switch at w=0.5; missing numbers count as 0
  function blendObj(a, b, w) {
    if (w <= 0) return clone(a);
    if (w >= 1) return clone(b);
    if (Array.isArray(a) && Array.isArray(b)) {
      var out = [];
      for (var i = 0; i < Math.max(a.length, b.length); i++) out.push(blendVal(a[i], b[i], w));
      return out;
    }
    var o = {}, k;
    for (k in a) o[k] = blendVal(a[k], b[k], w);
    for (k in b) if (!(k in a)) o[k] = blendVal(undefined, b[k], w);
    return o;
  }
  function blendVal(x, y, w) {
    if (typeof x === 'number' || typeof y === 'number') {
      if ((typeof x === 'number' || x == null) && (typeof y === 'number' || y == null)) return lerp(x || 0, y || 0, w);
    }
    if (x && y && typeof x === 'object' && typeof y === 'object') return blendObj(x, y, w);
    return w < 0.5 ? (x === undefined ? y : x) : (y === undefined ? x : y);
  }

  // ───────────────────────────── expression model ─────────────────────────────
  // rest mouths: what the mouth does in silence for each expression (lip-sync rule: no flapping in pauses).
  var REST = {
    talking: { mouth: { l: [-15, 0.5], r: [17, -3.5], u: [2.2, 1.6], d: [2.2, 1.6], lowerLip: 1 }, open: 0 },
    surprised: { open: 0.13, mouth: { round: 0.7 } },
    laughing: { open: 0.55 },
    annoyed: { open: 0.2 }
  };
  function exprParams(name) {
    var e = clone(EXPR[name] || EXPR.smirk);
    var r = REST[name];
    if (r) {
      if (r.mouth) for (var k in r.mouth) e.mouth[k] = clone(r.mouth[k]);
      if (r.open != null) e.open = r.open;
    }
    e.open = e.open || 0;
    e.mouth.round = e.mouth.round || 0; e.mouth.wide = e.mouth.wide || 0; e.mouth.lipIn = e.mouth.lipIn || 0;
    e.browL.lift = 0; e.browR.lift = 0;
    return e;
  }
  var EXPR_P = {};
  Object.keys(EXPR).forEach(function (n) { EXPR_P[n] = exprParams(n); });

  function blendExpr(a, b, w) {
    var o = blendObj(a, b, w);
    // laughing eyes have no lid params → switch at the midpoint, hidden by a blink bump
    var la = !!(a.eyeL && a.eyeL.laugh), lb = !!(b.eyeL && b.eyeL.laugh);
    if (la !== lb) {
      o.eyeL = clone(w < 0.5 ? a.eyeL : b.eyeL); o.eyeR = clone(w < 0.5 ? a.eyeR : b.eyeR);
      o._blink = 1 - Math.abs(2 * w - 1);
    }
    return o;
  }

  // ───────────────────────────── pose model ─────────────────────────────
  function poseParams(name) {
    var p = clone(POSES[name] || POSES.idle);
    ['a', 'b'].forEach(function (s) { var h = p[s].hand; h.spec = clone(HANDS[h.g] || HANDS.relaxed); });
    return p;
  }
  var POSE_P = {};
  Object.keys(POSES).forEach(function (n) { POSE_P[n] = poseParams(n); });
  function blendPose(a, b, w) {
    var o = blendObj(a, b, w);
    ['a', 'b'].forEach(function (s) {
      var ha = a[s].hand, hb = b[s].hand;
      var da = ((hb.ang - ha.ang) % 360 + 540) % 360 - 180; // shortest way round
      o[s].hand.ang = ha.ang + da * w;
      o[s].hand.flip = w < 0.5 ? ha.flip : hb.flip;
    });
    return o;
  }
  // how much each arm may gesture while talking (a = viewer-left arm, b = viewer-right arm)
  var GESTURE = {
    idle: [0.15, 0.55], finger: [0.15, 0.6], point: [0.12, 0.35], explain: [1, 1],
    crossed: [0.08, 0.08], chin: [0.12, 0.05], shrug: [0.5, 0.5]
  };

  // ───────────────────────────── German graphemes → visemes ─────────────────────────────
  // open 0..1, round 0..1, wide -1..1, lipIn 0..1, closed (m/b/p), w = relative duration weight
  var VIS = {
    a: { open: 1, wide: 0.15, w: 2 }, aa: { open: 1, wide: 0.15, w: 3 }, ah: { open: 1, wide: 0.15, w: 3 },
    e: { open: 0.6, wide: 0.5, w: 1.6 }, ee: { open: 0.6, wide: 0.55, w: 2.6 }, eh: { open: 0.6, wide: 0.55, w: 2.6 },
    i: { open: 0.38, wide: 0.8, w: 1.5 }, ie: { open: 0.38, wide: 0.85, w: 2.5 }, ih: { open: 0.38, wide: 0.85, w: 2.5 },
    o: { open: 0.72, round: 0.85, w: 2 }, oo: { open: 0.72, round: 0.9, w: 3 }, oh: { open: 0.72, round: 0.9, w: 3 },
    u: { open: 0.42, round: 1, w: 1.8 }, uh: { open: 0.42, round: 1, w: 2.6 },
    'ä': { open: 0.75, wide: 0.4, w: 2 }, 'ö': { open: 0.55, round: 0.75, w: 2 }, 'ü': { open: 0.38, round: 0.9, w: 1.8 }, y: { open: 0.38, round: 0.8, w: 1.6 },
    ei: { open: 0.85, wide: 0.45, w: 2.6 }, ai: { open: 0.85, wide: 0.45, w: 2.6 }, au: { open: 0.85, round: 0.55, w: 2.6 },
    eu: { open: 0.7, round: 0.6, w: 2.6 }, 'äu': { open: 0.7, round: 0.6, w: 2.6 },
    m: { closed: 1, w: 1.1 }, b: { closed: 1, w: 0.9 }, p: { closed: 1, w: 0.9 }, pf: { closed: 1, w: 1 },
    f: { open: 0.14, lipIn: 1, w: 1 }, v: { open: 0.14, lipIn: 1, w: 1 }, w: { open: 0.16, lipIn: 0.9, w: 0.9 }, ph: { open: 0.14, lipIn: 1, w: 1 },
    s: { open: 0.16, wide: 0.5, w: 1 }, 'ß': { open: 0.16, wide: 0.5, w: 1 }, z: { open: 0.18, wide: 0.4, w: 1 }, x: { open: 0.22, wide: 0.3, w: 1.2 },
    t: { open: 0.2, wide: 0.3, w: 0.7 }, d: { open: 0.22, wide: 0.3, w: 0.7 }, n: { open: 0.22, wide: 0.2, w: 0.8 }, l: { open: 0.3, wide: 0.2, w: 0.8 },
    r: { open: 0.3, w: 0.7 }, c: { open: 0.22, wide: 0.3, w: 0.7 },
    sch: { open: 0.24, round: 0.75, w: 1.3 }, tsch: { open: 0.24, round: 0.75, w: 1.5 }, ch: { open: 0.26, wide: 0.2, w: 1.1 },
    j: { open: 0.25, wide: 0.4, w: 0.7 }, g: { open: 0.3, w: 0.7 }, k: { open: 0.3, w: 0.7 }, ck: { open: 0.3, w: 0.7 }, q: { open: 0.3, round: 0.4, w: 0.7 },
    ng: { open: 0.26, w: 0.9 }, h: { open: 0.5, w: 0.5 }, th: { open: 0.2, w: 0.7 }, tz: { open: 0.18, wide: 0.4, w: 1 }
  };
  var GRAPH = ['tsch', 'sch', 'äu', 'eu', 'ei', 'ai', 'au', 'ie', 'ih', 'aa', 'ee', 'oo', 'ah', 'eh', 'oh', 'uh', 'ch', 'ck', 'ng', 'pf', 'ph', 'th', 'tz'];
  function visemes(word) {
    var w = String(word).toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
    if (/^\d+$/.test(w)) w = 'zwanzig'.slice(0, Math.min(7, 2 + w.length * 2)); // numbers: generic
    var out = [], i = 0;
    while (i < w.length) {
      var g = null;
      for (var k = 0; k < GRAPH.length; k++) if (w.substr(i, GRAPH[k].length) === GRAPH[k]) { g = GRAPH[k]; break; }
      if (!g) g = w[i];
      var v = VIS[g];
      if (v) {
        // doubled consonants (mm, ss, tt …) → one longer segment
        if (out.length && out[out.length - 1].g === g && !/[aeiouäöü]/.test(g)) out[out.length - 1].w += 0.4;
        else out.push({ g: g, open: v.open || 0, round: v.round || 0, wide: v.wide || 0, lipIn: v.lipIn || 0, closed: v.closed || 0, w: v.w });
      }
      i += g.length;
    }
    if (!out.length) out.push({ g: 'a', open: 0.6, round: 0, wide: 0, lipIn: 0, closed: 0, w: 1 });
    return out;
  }

  // ───────────────────────────── prepare ─────────────────────────────
  function prepare(cfg) {
    cfg = cfg || {};
    var fps = cfg.fps || 30, seed = cfg.seed == null ? 7 : cfg.seed;
    var env = cfg.envelope || {};
    var words = (cfg.words || []).filter(function (w) { return w && isFinite(w.start) && isFinite(w.end); })
      .map(function (w) { return { text: w.text || '', start: +w.start, end: Math.max(+w.end, +w.start + 0.06) }; })
      .sort(function (a, b) { return a.start - b.start; });
    var cues = (cfg.cues || []).filter(function (c) { return c && isFinite(c.t); }).slice().sort(function (a, b) { return a.t - b.t; });
    var hop = T.hop;

    // loudness at hop resolution
    var envArr = env.env, envHf = env.envHf, envHop = env.hop || 0.01;
    if (!envArr && env.rms) { envArr = env.rms; envHf = env.hf; envHop = 1 / (env.fps || fps); }
    envArr = envArr || [];
    var duration = cfg.duration || Math.max(envArr.length * envHop, words.length ? words[words.length - 1].end + 1 : 0, cues.length ? cues[cues.length - 1].t + 2 : 0, 1);
    var N = Math.ceil(duration / hop) + 2;
    function sampleArr(arr, ah, t) {
      if (!arr || !arr.length) return 0;
      var x = t / ah - 0.5, i = Math.floor(x), f = x - i;
      var a = arr[clamp(i, 0, arr.length - 1)], b = arr[clamp(i + 1, 0, arr.length - 1)];
      return lerp(a, b, f);
    }
    var L = new Float32Array(N), HF = new Float32Array(N);
    for (var k = 0; k < N; k++) { L[k] = sampleArr(envArr, envHop, k * hop); HF[k] = sampleArr(envHf, envHop, k * hop); }

    // robustness: words much longer than their audible part (e.g. stretched over an inserted silence) are clipped to it
    if (envArr.length) words.forEach(function (w) {
      if (w.end - w.start < 0.6) return;
      var i0 = Math.floor(w.start / hop), i1 = Math.min(N - 1, Math.ceil(w.end / hop)), a = -1, b = -1;
      for (var i = i0; i <= i1; i++) if (L[i] > T.gate * 2) { if (a < 0) a = i; b = i; }
      if (a < 0) { w.end = w.start + 0.06; w.silent = true; return; }
      var s0 = Math.max(w.start, a * hop - 0.04), s1 = Math.min(w.end, b * hop + 0.06);
      if (s1 - s0 < (w.end - w.start) * 0.75) { w.start = s0; w.end = Math.max(s1, s0 + 0.08); }
    });

    // speech mask: word intervals (bridged over short gaps) – or, without words, envelope with hysteresis
    var mask = new Uint8Array(N), segs = [];
    if (words.length) {
      var cur = null;
      words.forEach(function (w) {
        var a = w.start - T.padStart, b = w.end + T.padEnd;
        if (cur && a - cur[1] <= T.bridgeGap) cur[1] = Math.max(cur[1], b);
        else { if (cur) segs.push(cur); cur = [a, b]; }
      });
      if (cur) segs.push(cur);
    } else if (envArr.length) {
      var on = false, st = 0;
      for (k = 0; k < N; k++) {
        if (!on && L[k] > T.gate * 1.6) { on = true; st = k * hop; }
        else if (on && L[k] < T.gate) { on = false; segs.push([st, k * hop]); }
      }
      if (on) segs.push([st, N * hop]);
      var merged = [];
      segs.forEach(function (s) {
        if (merged.length && s[0] - merged[merged.length - 1][1] <= T.bridgeGap) merged[merged.length - 1][1] = s[1];
        else if (s[1] - s[0] > 0.06) merged.push(s);
      });
      segs = merged;
    }
    segs.forEach(function (s) { for (var i = Math.max(0, Math.floor(s[0] / hop)); i < Math.min(N, Math.ceil(s[1] / hop)); i++) mask[i] = 1; });

    // viseme targets per hop sample
    var vO = new Float32Array(N), vR = new Float32Array(N), vW = new Float32Array(N), vF = new Float32Array(N), vC = new Uint8Array(N);
    for (k = 0; k < N; k++) vO[k] = words.length ? 0 : 0.7;
    if (!words.length) for (k = 0; k < N; k++) { vR[k] = clamp(0.5 - HF[k], 0, 0.5); vW[k] = clamp(HF[k] - 0.4, 0, 0.6); }
    words.forEach(function (w) {
      var vs = visemes(w.text), tot = 0;
      vs.forEach(function (v) { tot += v.w; });
      var dur = w.end - w.start, t0 = w.start;
      var mids = [];
      vs.forEach(function (v) { var d = dur * v.w / tot; v.t0 = t0; v.t1 = t0 + d; mids.push(t0 + d / 2); t0 += d; });
      var i0 = Math.max(0, Math.floor(w.start / hop)), i1 = Math.min(N - 1, Math.ceil(w.end / hop));
      for (var i = i0; i <= i1; i++) {
        var t = i * hop, j = 0;
        while (j < vs.length - 1 && mids[j + 1] <= t) j++;
        var A = vs[j], B = vs[Math.min(j + 1, vs.length - 1)];
        var f = B === A ? 0 : clamp((t - mids[j]) / (mids[j + 1] - mids[j]), 0, 1);
        if (t < mids[0]) { A = B = vs[0]; f = 0; }
        f = ease(f);
        vO[i] = lerp(A.open, B.open, f); vR[i] = lerp(A.round, B.round, f); vW[i] = lerp(A.wide, B.wide, f); vF[i] = lerp(A.lipIn, B.lipIn, f);
        // crisp lip closure for m/b/p (at least 45 ms)
        for (var q = 0; q < vs.length; q++) {
          var v = vs[q]; if (!v.closed) continue;
          var c = (v.t0 + v.t1) / 2, hw = Math.max(0.0225, (v.t1 - v.t0) * 0.35);
          if (Math.abs(t - c) <= hw) vC[i] = 1;
        }
      }
    });

    // lip openness: gate × viseme × loudness → attack/release filter → hysteresis
    var open = new Float32Array(N), rnd = new Float32Array(N), wid = new Float32Array(N), lip = new Float32Array(N);
    var y = 0, yr = 0, yw = 0, yf = 0, isOpen = false;
    var aA = 1 - Math.exp(-hop / T.attack), aR = 1 - Math.exp(-hop / T.release), aS = 1 - Math.exp(-hop / T.snap), aShape = 1 - Math.exp(-hop / 0.045);
    for (k = 0; k < N; k++) {
      var tgt = 0;
      if (mask[k]) {
        var l = L[k];
        if (l > T.gate) {
          var lf = Math.pow(clamp((l - T.gate) / 0.55, 0, 1), 0.6);
          tgt = lf * (0.3 + 0.7 * vO[k]) * (1 - 0.25 * HF[k] * (1 - vO[k]));
        }
        if (vC[k]) tgt = 0;
      }
      var a = tgt > y ? aA : (mask[k] ? aR : aS);
      if (vC[k]) a = Math.max(a, 0.55); // closures snap
      y += (tgt - y) * a;
      if (isOpen && y < T.closeBelow) isOpen = false; else if (!isOpen && y > T.closeBelow * 2) isOpen = true;
      open[k] = isOpen ? y : 0;
      yr += (vR[k] - yr) * aShape; yw += (vW[k] + 0.25 * HF[k] - yw) * aShape; yf += (vF[k] - yf) * aShape;
      rnd[k] = yr; wid[k] = clamp(yw, -1, 1); lip[k] = yf;
    }

    // smoothed speech weight: open-mouth expressions (laughing, surprised, annoyed) hand the mouth to lip sync while talking
    var sw = new Float32Array(N), sv = 0, swUp = 1 - Math.exp(-hop / 0.06), swDn = 1 - Math.exp(-hop / 0.18);
    for (k = 0; k < N; k++) { var m0 = mask[k] ? 1 : 0; sv += (m0 - sv) * (m0 > sv ? swUp : swDn); sw[k] = sv; }

    // talk energy (slow) for gestures, and speech activity
    var energy = new Float32Array(N), e = 0;
    var eUp = 1 - Math.exp(-hop / 0.25), eDn = 1 - Math.exp(-hop / 0.7);
    for (k = 0; k < N; k++) {
      var tg = mask[k] ? clamp(L[k] * 1.3, 0, 1) : 0;
      e += (tg - e) * (tg > e ? eUp : eDn); energy[k] = e;
    }

    // stressed syllables (beats): prominent loudness peaks inside speech
    var beats = [], W = Math.round(0.16 / hop), lastBeat = -9, br = rngF(seed * 3 + 11);
    for (k = W; k < N - W; k++) {
      if (!mask[k] || L[k] < 0.62) continue;
      var isMax = true;
      for (var d = -W; d <= W; d++) if (L[k + d] > L[k]) { isMax = false; break; }
      if (!isMax) continue;
      var tb = k * hop;
      if (tb - lastBeat < 0.55) continue;
      lastBeat = tb;
      beats.push({ t: tb, s: clamp((L[k] - 0.55) / 0.4, 0.3, 1), brow: br() < 0.45, nod: br() < 0.7, hand: br() < 0.8 });
    }

    // blinks (seeded), occasional double blink
    var blinks = [], r = rngF(seed * 7 + 3), tbk = 0.6 + r() * 2;
    while (tbk < duration + 1) {
      blinks.push(tbk);
      if (r() < T.doubleBlink) blinks.push(tbk + 0.24 + r() * 0.06);
      tbk += T.blinkMin + r() * (T.blinkMax - T.blinkMin);
    }

    // cue tracks
    var tracks = buildTracks(cues, words, seed);

    // auto glances viewer → board during long speech, micro saccades
    var glances = [], rg = rngF(seed * 13 + 5), tg2 = 4 + rg() * 5;
    while (tg2 < duration) {
      var ki = Math.floor(tg2 / hop);
      if (mask[ki] && energy[ki] > 0.25) { glances.push([tg2, tg2 + 0.8 + rg() * 0.9]); tg2 += 7 + rg() * 8; }
      else tg2 += 0.5;
    }
    var sacc = [], rs = rngF(seed * 17 + 1), ts = 0;
    while (ts < duration + 2) { sacc.push([ts, (rs() - 0.5) * 0.16, (rs() - 0.5) * 0.12]); ts += 0.6 + rs() * 1.6; }

    var rig = {
      fps: fps, seed: seed, duration: duration, tuning: T,
      _d: { hop: hop, N: N, mask: mask, sw: sw, open: open, rnd: rnd, wid: wid, lip: lip, energy: energy, L: L, beats: beats, blinks: blinks, tracks: tracks, glances: glances, sacc: sacc, segs: segs },
      _cache: new Map(), _id: cfg.id || 'mr', pencil: !!cfg.pencil
    };
    rig.render = function (t, hint) { return render(rig, t, hint || {}); };
    rig.stateAt = function (t, hint) { return computeState(rig, t, hint || {}); };
    return rig;
  }

  function rngF(seed) { return U.rng(hash(seed) || 1); }

  // ───────────────────────────── cue tracks ─────────────────────────────
  var TAG_HINT = [
    [/laugh|chuckl|giggl|lach/i, 'laughing', 1.3],
    [/sigh|seufz/i, 'unimpressed', 1.2],
    [/sarcas|smug|mischiev|verschmitzt|wink/i, 'smirk', 1.6],
    [/excited|surpris|überrascht/i, 'surprised', 0.9],
    [/deadpan|dry|trocken/i, 'deadpan', 1.6]
  ];
  function buildTracks(cues, words, seed) {
    var expr = [{ t: -1e9, v: 'smirk' }], pose = [{ t: -1e9, v: 'idle' }], look = [{ t: -1e9, v: 'viewer' }];
    var brow = [], nod = [], ov = { expr: [], pose: [], look: [] };
    cues.forEach(function (c) {
      var a = c.args || {};
      if (c.cue === 'melo') {
        if (a.expr && EXPR[a.expr]) expr.push({ t: c.t, v: a.expr, x: 1 });
        if (a.pose && POSES[a.pose]) pose.push({ t: c.t, v: a.pose, x: 1 });
        if (a.look) look.push({ t: c.t, v: a.look, x: 1 });
      } else if (c.cue === 'voice' && a.tag) {
        for (var i = 0; i < TAG_HINT.length; i++) if (TAG_HINT[i][0].test(a.tag)) { ov.expr.push([c.t + 0.05, c.t + 0.05 + TAG_HINT[i][2], TAG_HINT[i][1], 'voice']); break; }
      } else if (c.cue === 'draw' && a.type === 'wrong') {
        ov.expr.push([c.t + 0.35, c.t + 1.5, 'unimpressed', 'auto']);
        ov.look.push([c.t + 0.15, c.t + 1.1, 'board', 'auto']);
      } else if (c.cue === 'draw' && a.type === 'right') {
        ov.expr.push([c.t + 0.3, c.t + 1.4, 'smirk', 'auto']);
        nod.push(c.t + 0.4);
      } else if (c.cue === 'reveal') {
        brow.push(c.t + 0.1);
        ov.pose.push([c.t, c.t + 1.8, 'finger', 'auto']);
      } else if (c.cue === 'pause' && +a.s >= 2) {
        // quiz countdown: chin pose + look at the board while waiting
        // the silence ends at the cue time (cue = first word after it); prev_end = end of the word before
        var p0 = isFinite(c.prev_end) ? c.prev_end : c.t - (+a.s), p1 = c.t;
        if (p1 - p0 < 1) { p0 = c.t; p1 = c.t + (+a.s); } // older alignments: cue at the start of the silence
        var q = cues.filter(function (x) { return x.cue === 'quiz' && x.t <= p0 + 0.01 && p0 - x.t < 60; });
        if (q.length) { ov.pose.push([p0 + 0.1, p1 - 0.15, 'chin', 'auto']); ov.look.push([p0 + 0.3, p1 - 0.4, 'board', 'auto']); }
      }
    });
    function apply(track, list) {
      list.sort(function (a, b) { return a[0] - b[0]; });
      list.forEach(function (o) {
        var a = o[0], b = o[1];
        // explicit cues win: an overlay never overrides an explicit cue inside its window
        var nextE = track.filter(function (k) { return k.x && k.t > a - 0.15; })[0];
        // an explicit cue shortly after the overlay would end → hold the overlay until it (no flicker back and forth)
        if (nextE && nextE.t > b && nextE.t - b < 0.7) b = nextE.t;
        var end = nextE ? Math.min(b, nextE.t) : b;
        if (end - a < 0.45) return;
        var base = valueAt(track, a);
        if (base === o[2]) return;
        var restore = valueAt(track, end);
        track.push({ t: a, v: o[2] });
        if (end === b) track.push({ t: b, v: restore });
        track.sort(function (p, q) { return p.t - q.t; });
      });
    }
    // explicit expr cues that sit on the same time as voice tags beat tags; pose/look same
    expr.sort(function (a, b) { return a.t - b.t; }); pose.sort(function (a, b) { return a.t - b.t; }); look.sort(function (a, b) { return a.t - b.t; });
    apply(expr, ov.expr); apply(pose, ov.pose); apply(look, ov.look);
    return { expr: expr, pose: pose, look: look, brow: brow, nod: nod };
  }
  function valueAt(track, t) { var v = track[0].v; for (var i = 0; i < track.length && track[i].t <= t; i++) v = track[i].v; return v; }
  function idxAt(track, t) { var j = 0; for (var i = 0; i < track.length && track[i].t <= t; i++) j = i; return j; }
  // eased track evaluation: returns blended params via table+blend fn; chained transitions start from the blended state
  function evalTrack(track, t, table, blend, depth) {
    var j = idxAt(track, t), k = track[j];
    var target = table[k.v] || table[Object.keys(table)[0]];
    if (j === 0) return target;
    var w = ease((t - k.t) / T.transition);
    if (w >= 1) return target;
    var from = depth > 2 ? (table[track[j - 1].v] || target) : evalTrack(track, k.t - 1e-6, table, blend, (depth || 0) + 1);
    return blend(from, target, w);
  }

  // ───────────────────────────── per-frame state ─────────────────────────────
  function at(arr, d, t) { var x = t / d.hop, i = Math.floor(x), f = x - i; i = clamp(i, 0, d.N - 2); return lerp(arr[i], arr[i + 1], clamp(f, 0, 1)); }

  function computeState(rig, t, hint) {
    var d = rig._d, tr = d.tracks;
    var boardDir = hint.boardSide === 'left' ? -1 : 1;
    var hasBoard = hint.board !== false;
    var ex = clone(evalTrack(tr.expr, t, EXPR_P, blendExpr));   // clone: per-frame tweaks must never leak into the tables
    var pose = clone(evalTrack(tr.pose, t, POSE_P, blendPose));
    var exprName = valueAt(tr.expr, t), poseName = valueAt(tr.pose, t), lookName = valueAt(tr.look, t);

    // mouth
    var ki = Math.round(t / d.hop);
    var lipOpen = at(d.open, d, t) * T.openMax;
    var speaking = !!d.mask[clamp(ki, 0, d.N - 1)];
    var restOpen = ex.open || 0;
    var m = ex.mouth, talkW = clamp((lipOpen - restOpen * (1 - at(d.sw, d, t) * 0.8) + 0.02) / 0.12, 0, 1);
    var spW = at(d.sw, d, t);
    var mouthOpen = lerp(Math.max(restOpen, lipOpen), Math.max(lipOpen, restOpen * 0.2), spW);
    if (lipOpen > 0.01) {
      // narrow resting mouths (unimpressed, surprised) get a usable talking width
      var kw = clamp(lipOpen * 3, 0, 1) * 0.6;
      m.l = [lerp(m.l[0], Math.min(m.l[0], -14), kw), m.l[1]];
      m.r = [lerp(m.r[0], Math.max(m.r[0], 16), kw), m.r[1]];
      m.round = lerp(m.round || 0, at(d.rnd, d, t), clamp(lipOpen * 4, 0, 1));
      m.wide = lerp(m.wide || 0, at(d.wid, d, t), clamp(lipOpen * 4, 0, 1));
      m.lipIn = at(d.lip, d, t) * clamp(lipOpen * 6, 0, 1);
      if (talkW > 0.5) { m.teeth = 1; m.tongue = mouthOpen > 0.3 ? 1 : 0; }
      if (m.lipIn > 0.4) m.teeth = 1;
    }
    ex.open = mouthOpen;

    // blink
    var blink = ex._blink || 0;
    for (var i = 0; i < d.blinks.length; i++) {
      var dt = t - d.blinks[i];
      if (dt < -0.1) break;
      if (dt < 0) continue;
      var b = dt < 0.05 ? dt / 0.05 : dt < 0.09 ? 1 : dt < 0.21 ? 1 - (dt - 0.09) / 0.12 : 0;
      blink = Math.max(blink, b);
    }

    // beats → brow lift, head nod, hand beat
    var beatB = 0, beatN = 0, beatH = 0;
    for (i = 0; i < d.beats.length; i++) {
      var bt = d.beats[i], x = t - bt.t;
      if (x < -0.15) break;
      if (x > 0.8) continue;
      var k = x < 0 ? Math.exp(-Math.pow(x / 0.07, 2)) : Math.exp(-x / 0.22);
      if (bt.brow) beatB = Math.max(beatB, k * bt.s);
      if (bt.nod) beatN = Math.max(beatN, k * bt.s);
      if (bt.hand) beatH = Math.max(beatH, k * bt.s);
    }
    tr.brow.forEach(function (tb) { var x = t - tb; if (x > -0.1 && x < 1.6) beatB = Math.max(beatB, x < 0.12 ? x / 0.12 : Math.max(0, 1 - (x - 0.9) / 0.7)); });
    tr.nod.forEach(function (tb) { var x = t - tb; if (x > 0 && x < 0.7) beatN = Math.max(beatN, Math.sin(x / 0.7 * Math.PI) * 1.4); });
    // which brow lifts: the one that is already higher (his "eine Braue immer oben")
    ex.browR.lift = (ex.browR.lift || 0) + beatB * 3.2;
    ex.browL.lift = (ex.browL.lift || 0) + beatB * 1.2;

    // look: expression's own pupils for "viewer", otherwise a direction
    var energy = at(d.energy, d, t);
    var lookVec = lookTarget(lookName, ex, boardDir);
    var jl = idxAt(tr.look, t);
    if (jl > 0) {
      var wl = ease((t - tr.look[jl].t) / (T.transition * 0.8));
      if (wl < 1) lookVec = lerpPt(lookTarget(tr.look[jl - 1].v, ex, boardDir), lookVec, wl);
    }
    if (hasBoard && lookName === 'viewer') {
      d.glances.forEach(function (g) {
        if (t > g[0] - 0.2 && t < g[1] + 0.2) {
          var w = ease((t - g[0]) / 0.18) * (1 - ease((t - g[1]) / 0.18));
          lookVec = lerpPt(lookVec, [0.8 * boardDir, -0.1], w);
        }
      });
    }
    var sc = d.sacc[0];
    for (i = 0; i < d.sacc.length && d.sacc[i][0] <= t; i++) sc = d.sacc[i];
    lookVec = [lookVec[0] + sc[1], lookVec[1] + sc[2]];

    // head motion: breathing, idle drift, speech micro-tilts, nods
    var n = noise(rig.seed);
    var breath = Math.sin(t / T.breathPeriod * Math.PI * 2);
    var headTilt = (n(t * 0.23) * 1.2) + energy * n(t * 0.9 + 40) * 2.2 + beatN * 1.4 * (n(Math.floor(t) + 9) > 0 ? 1 : -1);
    var lookTilt = lookVec[0] * 1.5;
    var headDy = -breath * 1.1 + beatN * 2.6;
    var headDx = n(t * 0.17 + 20) * 1.2;
    var sway = n(t * 0.11 + 70) * 0.55;

    return {
      t: t, exprName: exprName, poseName: poseName, lookName: lookName, ex: ex, pose: pose,
      speaking: speaking, lipOpen: lipOpen, mouthOpen: mouthOpen, blink: clamp(blink, 0, 1), look: lookVec,
      beat: beatH, energy: energy, breath: breath, headTilt: headTilt + lookTilt, headDx: headDx, headDy: headDy, sway: sway, boardDir: boardDir
    };
  }
  function lookTarget(name, ex, boardDir) {
    if (name === 'board') return [0.85 * boardDir, -0.12];
    if (name === 'left') return [-0.9, 0];
    if (name === 'right') return [0.9, 0];
    if (name === 'up') return [0.2, -0.8];
    if (name === 'down') return [0.1, 0.7];
    return [(ex.eyeR.px || 0) / 4.5, (ex.eyeR.py || 0) / 2];
  }
  var NOISE = {};
  function noise(seed) { return NOISE[seed] || (NOISE[seed] = U.noiseFn(hash(seed * 5 + 1))); }

  // ───────────────────────────── render ─────────────────────────────
  function cached(rig, key, fn) {
    var c = rig._cache, v = c.get(key);
    if (v === undefined) {
      v = fn();
      if (c.size > 200) c.delete(c.keys().next().value);
      c.set(key, v);
    }
    return v;
  }
  function rk(p) { return Math.round(p[0] * 2) / 2 + ',' + Math.round(p[1] * 2) / 2; }

  // 2D value noise (deterministic), used for the baked ink roughness
  function vnoise(seed) {
    var tab = new Float32Array(1024), r = U.rng(hash(seed) || 1);
    for (var i = 0; i < 1024; i++) tab[i] = r() * 2 - 1;
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      function h(a, b) { return tab[((a * 73856093) ^ (b * 19349663)) & 1023]; }
      var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  // displacement field for boil variant v at a given local scale (face is drawn ×1.6)
  function dispField(seed, v, sc, amp, gmul) {
    var nx = vnoise(seed * 101 + v * 7 + 1), ny = vnoise(seed * 103 + v * 7 + 2), gx = vnoise(seed * 107 + v * 7 + 3), gy = vnoise(seed * 109 + v * 7 + 4);
    var f = T.roughFreq * sc, ff = T.grainFreq * sc, A = T.roughAmp * amp / sc, G = T.grainAmp * amp * (gmul == null ? 1 : gmul) / sc;
    return function (x, y) {
      return [A * (nx(x * f, y * f) + 0.5 * nx(x * f * 2.1 + 17, y * f * 2.1 + 5)) + G * gx(x * ff, y * ff),
              A * (ny(x * f, y * f) + 0.5 * ny(x * f * 2.1 + 9, y * f * 2.1 + 13)) + G * gy(x * ff, y * ff)];
    };
  }
  var BOIL_PERM = [0, 2, 1, 3];

  // tiny random noise tile as a BMP data URL (no canvas needed → identical in Node and the browser)
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(bytes) {
    var out = '', i;
    for (i = 0; i + 2 < bytes.length; i += 3) { var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; }
    var rem = bytes.length - i;
    if (rem === 1) { n = bytes[i] << 16; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + '=='; }
    else if (rem === 2) { n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + '='; }
    return out;
  }
  function noiseTile(seed, size) {
    var r = U.rng(hash(seed) || 1), row = size * 3, pad = (4 - row % 4) % 4, data = (row + pad) * size, len = 54 + data;
    var b = new Uint8Array(len);
    function u32(o, v) { b[o] = v & 255; b[o + 1] = v >> 8 & 255; b[o + 2] = v >> 16 & 255; b[o + 3] = v >>> 24; }
    b[0] = 66; b[1] = 77; u32(2, len); u32(10, 54); u32(14, 40); u32(18, size); u32(22, size); b[26] = 1; b[28] = 24; u32(34, data);
    // white noise, wrapped 3×3 blur (→ fractalNoise-like spread around 0.5), stretched ×2.2
    var gr = [new Float32Array(size * size), new Float32Array(size * size)], c, x, y, dx, dy;
    for (c = 0; c < 2; c++) for (x = 0; x < size * size; x++) gr[c][x] = r();
    var o = 54;
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var px = [0, 0];
        for (c = 0; c < 2; c++) {
          var acc = 0;
          for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) acc += gr[c][((y + dy + size) % size) * size + (x + dx + size) % size];
          px[c] = clamp(Math.round(128 + (acc / 9 - 0.5) * 2.2 * 255), 0, 255);
        }
        b[o++] = 128; b[o++] = px[1]; b[o++] = px[0];
      }
      o += pad;
    }
    return 'data:image/bmp;base64,' + b64(b);
  }
  function grainFilter(fid, seed, v, amp) {
    var url = noiseTile(seed * 13 + v * 101 + 1, T.grainTilePx);
    return '<filter id="' + fid + '" x="-12%" y="-8%" width="124%" height="116%" color-interpolation-filters="sRGB">' +
      '<feImage href="' + url + '" x="0" y="0" width="' + T.grainTile + '" height="' + T.grainTile + '" preserveAspectRatio="none" result="t"/>' +
      '<feTile in="t" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="' + f1(T.grainFilter * amp) + '" xChannelSelector="R" yChannelSelector="G"/></filter>';
  }

  function render(rig, t, hint) {
    var S = computeState(rig, t, hint);
    var seed = rig.seed, id = rig._id;
    var mirror = hint.mirror != null ? !!hint.mirror : S.boardDir < 0;
    var pose = S.pose, ex = S.ex, defs = '';
    var rough = hint.rough == null ? 1 : hint.rough;
    var useFilter = !!hint.filter && rough > 0;           // original SVG-filter look (slow, for stills)
    var baked = !useFilter && rough > 0;
    var grain = baked && hint.grain !== false;            // cheap tiled-noise edge grain on top of the baked wobble
    // boil: a new line variant every N frames (4 cached variants cycled)
    var block = Math.floor(t * rig.fps / T.boilEvery + 1e-6);
    var bv = hint.boil === false ? 0 : BOIL_PERM[((block % 4) + 4) % 4];
    var rk0 = (baked ? 'b' + bv + 'r' + rough + (grain ? 'g' : '') : useFilter ? 'f' : 'n') + ':';
    var fields = baked ? cached(rig, 'field' + rk0, function () {
      var ga = grain ? T.grainAmpWithFilter / T.grainAmp : 1;
      return { body: dispField(seed, bv, 1, rough, ga), face: dispField(seed, bv, P.HEAD.face, rough, ga) };
    }) : null;
    function withDisp(fn, which) {
      if (!baked) return fn();
      var prev = P.displace(fields[which || 'body']);
      try { return fn(); } finally { P.displace(prev); }
    }

    // static layers (cached per boil variant)
    var head = cached(rig, rk0 + 'head', function () {
      return withDisp(function () {
        var dd = '', add = function (x) { dd += x; };
        var g = P.skull(new Ink(seed), new Ink(seed * 31 + 5), id, add) + P.cut(new Ink(seed + 101), new Ink(seed * 31 + 77), { pencil: rig.pencil }, id, add);
        return { svg: g, defs: dd };
      });
    });
    defs += head.defs;
    var shadow = cached(rig, rk0 + 'shadow', function () { return withDisp(function () { return P.shadow(new Ink(seed + 3)); }); });
    var legsKey = rk0 + 'legs' + rk(pose.la.kn) + rk(pose.la.an) + rk(pose.lb.kn) + rk(pose.lb.an) + rk(pose.la.hip);
    var legs = cached(rig, legsKey, function () { return withDisp(function () { return P.legs(new Ink(seed + 5), pose); }); });

    // breathing: shoulders / torso
    var br = S.breath, shY = -br * 0.9;
    var P2 = clone(pose);
    ['a', 'b'].forEach(function (s) { P2[s].sh[1] += shY; P2[s].el[1] += shY * 0.6; });
    var torsoKey = rk0 + 'torso' + pose.torso.map(rk).join('|') + rk(pose.a.sh) + rk(pose.b.sh);
    var torso = cached(rig, torsoKey, function () { return withDisp(function () { return P.torso(new Ink(seed + 7), pose, true); }); });
    var torsoG = '<g transform="translate(0 ' + f1(-168) + ') scale(1 ' + (1 + br * 0.006).toFixed(4) + ') translate(0 168)">' + torso + '</g>';

    // talking gestures (arms)
    var n = noise(seed + 2), en = S.energy;
    var gw = blendGesture(rig, t);
    ['a', 'b'].forEach(function (s, si) {
      var amp = gw[si], A = P2[s], o = si * 50;
      if (amp <= 0) return;
      var dx = (n(t * 0.8 + o) * 7 + n(t * 1.9 + o + 7) * 2.5) * en * amp;
      var dy = (n(t * 0.7 + o + 3) * 8 - S.beat * 7) * en * amp;
      A.wr = [A.wr[0] + dx * (si ? 1 : -1), A.wr[1] + dy];
      A.el = [A.el[0] + dx * 0.35 * (si ? 1 : -1), A.el[1] + dy * 0.3];
      A.hand.ang += (n(t * 1.1 + o + 11) * 10 - S.beat * 6) * en * amp * (si ? 1 : -1);
    });

    // neck + head
    var hx = pose.torso[0][0] + S.headDx, hy = HEAD_Y + S.headDy;
    var neck = withDisp(function () { return P.neck(new Ink(seed + 9), [pose.torso[0][0], pose.torso[0][1] + shY * 0.5], hx, hy + HEAD.ry - 6); });
    var tilt = (pose.tilt || 0) + (ex.tilt || 0) + S.headTilt;
    var faceDefs = '';
    var face = withDisp(function () { return P.face(new Ink(seed + 13), ex, { blink: S.blink, look: S.look }, id + 'f', function (x) { faceDefs += x; }); }, 'face');
    defs += faceDefs;
    var headX = mirror ? -hx : hx;
    var headG = '<g class="mb-head" transform="translate(' + f1(headX) + ' ' + f1(hy) + ') rotate(' + f1(tilt) + ' 0 ' + HEAD.ry + ')"><g class="mb-head-inner">' + head.svg + face + '</g></g>';

    var armA = withDisp(function () { return P.arm(new Ink(seed + 17), toArm(P2.a), 'a', true); });
    var armB = withDisp(function () { return P.arm(new Ink(seed + 19), toArm(P2.b), 'b', true); });

    if (grain) defs += cached(rig, rk0 + 'grain', function () { return grainFilter(id + '-rough', seed, bv, rough); });
    if (useFilter) {
      var hb = hash(block * 977 + seed);
      defs += P.filter(id + '-rough', hb % 97, (hb >>> 8) % 89 + 3, rough, 'x="-12%" y="-8%" width="124%" height="116%"');
    }

    var body = '<g class="mb-body"' + (mirror ? ' transform="scale(-1 1)"' : '') + '>' + shadow + legs + neck + torsoG + '</g>';
    var arms = '<g class="mb-arms"' + (mirror ? ' transform="scale(-1 1)"' : '') + '>' + armA + armB + '</g>';
    var swayT = 'rotate(' + S.sway.toFixed(2) + ')';
    var svg = '<g class="melo-rig" data-expr="' + S.exprName + '" data-pose="' + S.poseName + '"><defs>' + defs + '</defs>' +
      '<g' + (useFilter || grain ? ' filter="url(#' + id + '-rough)"' : '') + '><g transform="' + swayT + '">' + body + headG + arms + '</g></g></g>';

    return { svg: svg, anchors: anchors(S, P2, hx, hy, tilt, mirror), state: publicState(S) };
  }

  function blendGesture(rig, t) {
    var tr = rig._d.tracks.pose, j = idxAt(tr, t), g = GESTURE[tr[j].v] || [0.3, 0.3];
    if (j > 0) {
      var w = ease((t - tr[j].t) / T.transition), g0 = GESTURE[tr[j - 1].v] || [0.3, 0.3];
      g = [lerp(g0[0], g[0], w), lerp(g0[1], g[1], w)];
    }
    return g;
  }
  function toArm(A) { return { sh: A.sh, el: A.el, wr: A.wr, hand: { g: A.hand.spec, ang: A.hand.ang, flip: A.hand.flip } }; }

  function rot(p, c, deg) {
    var r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r), x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
  }
  function anchors(S, pose, hx, hy, tilt, mirror) {
    var mx = mirror ? -1 : 1, pv = [hx * mx, hy + HEAD.ry];
    function hp(p) { return rot([hx * mx + p[0], hy + p[1]], pv, tilt); }
    function sw(p) { return rot(p, [0, 0], S.sway); }
    function R(p) { return sw([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]).map(function (v) { return Math.round(v * 10) / 10; }); }
    function hand(A) {
      var a = A.hand.ang * Math.PI / 180;
      return { wrist: R([A.wr[0] * mx, A.wr[1]]), tip: R([(A.wr[0] + Math.cos(a) * 34) * mx, A.wr[1] + Math.sin(a) * 34]) };
    }
    var ha = hand(pose.a), hb = hand(pose.b);
    var pointing = /point|finger/.test(S.poseName) ? hb.tip : null;
    return {
      feet: [0, 0], headCenter: R(hp([0, 0])), headTop: R(hp([0, -HEAD.ry * 0.62])), mouth: R(hp([3, 75])), eyes: R(hp([3, 27])),
      handL: mirror ? hb.wrist : ha.wrist, handR: mirror ? ha.wrist : hb.wrist, fingerTip: pointing,
      bbox: [-180, -512, 360, 534]
    };
  }
  function publicState(S) {
    return {
      t: S.t, expr: S.exprName, pose: S.poseName, look: S.lookName, speaking: S.speaking,
      mouthOpen: Math.round(S.mouthOpen * 1000) / 1000, lipOpen: Math.round(S.lipOpen * 1000) / 1000,
      blink: Math.round(S.blink * 100) / 100, energy: Math.round(S.energy * 100) / 100
    };
  }

  return { prepare: prepare, tuning: T, visemes: visemes, EXPRESSIONS: Object.keys(EXPR), POSES: Object.keys(POSES) };
});
