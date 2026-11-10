/*!
 * Melo — Konzept A "Der Gelassene" (the laid-back one).
 * Code-only SVG generator, ink / editorial-comic style.
 * Browser: window.MeloA   ·   Node: module.exports
 *
 *   MeloA.svg(opts)    -> complete <svg> string
 *   MeloA.group(opts)  -> <g> string (carries its own <defs>, safe to inline many times)
 *
 * opts:
 *   expression : 'deadpan' | 'smirk' | 'talking' | 'surprised' | 'unimpressed' | 'annoyed' | 'laughing'
 *   mouthOpen  : 0..1 (overrides the expression's mouth opening; for lip sync)
 *   blink      : 0..1 (1 = eyes closed)
 *   look       : [x, y] pupil direction, -1..1 (overrides expression)
 *   pose       : 'idle' | 'point' | 'explain' | 'crossed' | 'chin'
 *   headOnly   : true -> head (+ neck stub) centred at 0,0
 *   seed       : integer, drives all line jitter / texture
 *   weight     : ink weight multiplier (use ~1.6–2 for tiny avatars)
 *   detail     : texture density 0..1 (lower for tiny sizes)
 *   pencil     : show the red pencil (signature), default true
 *
 * Coordinates (character units): feet anchor = (0,0), +y down; full figure fits
 * x ∈ [-180,180], y ∈ [-650,20].  headOnly: head centre (0,0), fits x ∈ [-120,120], y ∈ [-135,125].
 * Animatable groups carry classes: melo, melo-arm-back, melo-leg-back, melo-leg-front, melo-torso,
 * melo-head, melo-head-skin, melo-stem, melo-face, melo-brow-near/far, melo-eye-near/far,
 * melo-nose, melo-mouth, melo-mole, melo-pencil, melo-arm-front, melo-hand-*.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeloA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;

  var PAL = {
    ink: '#1A1714',
    skin: '#97AC60', skinLight: '#BFCC8A', stripe: '#3E5E34', shade: '#16261A', speck: '#D5DDA8',
    limb: '#C9D49C', limbShade: '#1A1714',
    flesh: '#C7463C', fleshDark: '#4E1416', teeth: '#EEE6CA',
    sclera: '#F3EDDA',
    stem: '#7D6840',
    pencil: '#B9372B', pencilDark: '#7A1F17', wood: '#E3C28E', ferrule: '#A79A6C', eraser: '#C77F6C',
    shoe: '#2B2925', sole: '#E7DEC5', seed: '#1F1712'
  };

  // ───────────────────────── utilities ─────────────────────────
  function mulberry(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noiseFn(rand, cells) {
    var v = []; for (var i = 0; i < cells + 2; i++) v.push(rand() * 2 - 1);
    return function (t) {
      t = Math.max(0, Math.min(1, t));
      var x = t * cells, i = Math.floor(x), fr = x - i, s = fr * fr * (3 - 2 * fr);
      return v[i] * (1 - s) + v[Math.min(i + 1, cells + 1)] * s;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp2(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
  function fx(n) { return Math.round(n * 10) / 10; }
  function pt(p) { return fx(p[0]) + ' ' + fx(p[1]); }
  function pathOf(pts, close) {
    if (!pts.length) return '';
    var s = 'M' + pt(pts[0]);
    for (var i = 1; i < pts.length; i++) s += 'L' + pt(pts[i]);
    return s + (close ? 'Z' : '');
  }
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t, o = [];
    for (var k = 0; k < 2; k++)
      o.push(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
    return o;
  }
  function crSample(c, per) {
    var out = [], n = c.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(n - 1, i + 2)];
      for (var j = 0; j < per; j++) out.push(cr(p0, p1, p2, p3, j / per));
    }
    out.push(c[n - 1].slice());
    return out;
  }
  function bez2(a, c, b, n) {
    var o = [];
    for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
    return o;
  }
  function bez3(a, c1, c2, b, n) {
    var o = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      o.push([u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
              u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]);
    }
    return o;
  }
  function sub(pts, t0, t1) { // sub-range of a sampled polyline by index fraction
    var n = pts.length - 1, a = Math.round(t0 * n), b = Math.round(t1 * n);
    return pts.slice(a, b + 1);
  }
  function offsetPts(pts, dx, dy) { return pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); }
  function yAtX(pts, x) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if ((a[0] - x) * (b[0] - x) <= 0) { var t = (x - a[0]) / ((b[0] - a[0]) || 1e-6); return lerp(a[1], b[1], t); }
    }
    return pts[0][1];
  }

  var L2 = [0.6, -0.8]; // 2D light direction (from upper right)

  // variable-width ribbon around a centreline; halfFn(t, normal) -> [halfLeft, halfRight]
  function tube(pts, halfFn, capS, capE) {
    var N = pts.length, L = [], R = [], ns = [], hs = [];
    for (var i = 0; i < N; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      var n = [-ty, tx]; ns.push(n);
      var h = halfFn(N > 1 ? i / (N - 1) : 0, n); hs.push(h);
      L.push([pts[i][0] + n[0] * h[0], pts[i][1] + n[1] * h[0]]);
      R.push([pts[i][0] - n[0] * h[1], pts[i][1] - n[1] * h[1]]);
    }
    var out = L.slice(), m = 9, k, a0, p, h2, an, r;
    if (capE) {
      n = ns[N - 1]; a0 = Math.atan2(n[1], n[0]); h2 = hs[N - 1]; p = pts[N - 1];
      for (k = 1; k < m; k++) { an = a0 - k * PI / m; r = lerp(h2[0], h2[1], k / m); out.push([p[0] + Math.cos(an) * r, p[1] + Math.sin(an) * r]); }
    }
    for (i = N - 1; i >= 0; i--) out.push(R[i]);
    if (capS) {
      n = ns[0]; a0 = Math.atan2(n[1], n[0]); h2 = hs[0]; p = pts[0];
      for (k = 1; k < m; k++) { an = a0 + PI - k * PI / m; r = lerp(h2[1], h2[0], k / m); out.push([p[0] + Math.cos(an) * r, p[1] + Math.sin(an) * r]); }
    }
    return pathOf(out, true);
  }
  // tapered brush stroke along pts: width profile fn(t) or [w0,wMid,w1]
  function stroke(pts, prof, caps) {
    var f = typeof prof === 'function' ? prof : function (t) {
      return t < 0.5 ? lerp(prof[0], prof[1], Math.sin(t * PI)) : lerp(prof[2], prof[1], Math.sin(t * PI));
    };
    return tube(pts, function (t) { var w = Math.max(0.08, f(t)) / 2; return [w, w]; }, caps !== false, caps !== false);
  }
  function hatchStroke(pts, w) {
    return tube(pts, function (t) { var h = Math.max(0.05, w / 2 * Math.pow(Math.sin(PI * clamp(t, 0, 1)), 0.45)); return [h, h]; }, false, false);
  }
  // outward offset of a closed polygon by lwFn(normal, t)
  function offsetClosed(pts, lwFn) {
    var N = pts.length, c = [0, 0], i;
    for (i = 0; i < N; i++) { c[0] += pts[i][0] / N; c[1] += pts[i][1] / N; }
    var ns = [], sg = 0;
    for (i = 0; i < N; i++) {
      var a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
      var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      var n = [-ty / l, tx / l]; ns.push(n);
      sg += n[0] * (pts[i][0] - c[0]) + n[1] * (pts[i][1] - c[1]);
    }
    var s = sg < 0 ? -1 : 1;
    return pts.map(function (p, i) { var n = [ns[i][0] * s, ns[i][1] * s], w = lwFn(n, i / N); return [p[0] + n[0] * w, p[1] + n[1] * w]; });
  }
  function ellipsePts(cx, cy, rx, ry, n, rot) {
    var o = [], cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    for (var i = 0; i < n; i++) { var a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * cs - y * sn, cy + x * sn + y * cs]); }
    return o;
  }
  function shadeLW(base, nz) { // ink width from a normal: thicker on the shadow side
    return function (n, t) {
      var d = n[0] * L2[0] + n[1] * L2[1];
      return base * (0.62 + 0.95 * Math.max(0, -d) + 0.15 * Math.max(0, d)) * (1 + 0.22 * (nz ? nz(t) : 0));
    };
  }

  // ───────────────────────── expressions ─────────────────────────
  // brow: [raise, angle(+ = inner end down), arch]; mouth corners in mouth-local units
  var EXPR = {
    deadpan:     { lid: [0.5, 0.5], look: [0.0, 0.1], brow: { n: [0, 0.02, -1], f: [0.5, 0.02, -1] }, mouth: { l: [-11, 0.3], r: [11, 0.3], c: 0.3, open: 0 }, roll: 0 },
    smirk:       { lid: [0.44, 0.38], look: [0.45, 0.05], brow: { n: [-0.5, 0.06, 0], f: [6, -0.02, 3] }, mouth: { l: [-12, 1.5], r: [13, -5.5], c: 1.6, open: 0, dimple: 1 }, roll: -0.05 },
    talking:     { lid: [0.3, 0.28], look: [0.25, 0], brow: { n: [2, 0, 1], f: [3.5, 0, 2] }, mouth: { l: [-11, 0], r: [12, -2.5], c: -0.4, open: 0.55 }, roll: -0.02 },
    surprised:   { lid: [0.0, 0.0], pr: 0.1, look: [0, 0], brow: { n: [9, -0.05, 3], f: [10, -0.05, 3] }, mouth: { l: [-5, 0], r: [5, 0], c: -0.5, open: 0.5 }, roll: 0.05 },
    unimpressed: { lid: [0.62, 0.58], look: [-0.75, 0.2], brow: { n: [-3, 0.1, 0], f: [11, -0.06, 5] }, mouth: { l: [-10, 1.8], r: [9, -1.2], c: 0, open: 0, shift: 0.1 }, roll: 0.05 },
    annoyed:     { lid: [0.5, 0.48], tilt: 0.3, look: [0.05, 0.15], brow: { n: [-4, 0.45, -2], f: [-3.5, 0.42, -2] }, mouth: { l: [-9, 3.5], r: [9, 4], c: -3.4, open: 0, wobble: 1 }, roll: 0.03, twitch: 1 },
    laughing:    { closed: 1, look: [0, 0], brow: { n: [4, -0.05, 2], f: [5, -0.05, 2] }, mouth: { l: [-14, -2], r: [15, -5.5], c: -1.2, open: 0.95 }, roll: -0.13 }
  };

  // ───────────────────────── head model (3-D surface of revolution) ─────────────────────────
  function HeadModel(o) {
    var R = o.R, H = o.H, cx = o.cx, cy = o.cy;
    var cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cR = Math.cos(o.roll), sR = Math.sin(o.roll);
    var Lv = (function () { var v = [0.5, -0.62, 0.62], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
    function rad(th) { var s = Math.sin(clamp(th, 0, PI)); return R * Math.pow(Math.max(0, s), 0.78) * (0.95 + 0.09 * th / PI); }
    function rot(x, y, z) { var y2 = y * cp + z * sp, z2 = -y * sp + z * cp; return [x * cR - y2 * sR, x * sR + y2 * cR, z2]; }
    function proj(th, ph) { var r = rad(th), v = rot(r * Math.cos(ph), -H * Math.cos(th), r * Math.sin(ph)); return [cx + v[0], cy + v[1], v[2]]; }
    function dR(th) { var e = 0.003; return (rad(Math.min(PI, th + e)) - rad(Math.max(0, th - e))) / (2 * e); }
    function normal(th, ph) {
      var dy = H * Math.sin(th), dr = dR(th);
      var n = rot(dy * Math.cos(ph), -dr, dy * Math.sin(ph)), l = Math.hypot(n[0], n[1], n[2]) || 1;
      return [n[0] / l, n[1] / l, n[2] / l];
    }
    function dark(th, ph) { var n = normal(th, ph), d = n[0] * Lv[0] + n[1] * Lv[1] + n[2] * Lv[2]; return clamp((0.3 - d) / 0.95, 0, 1); }
    function lit(th, ph) { var n = normal(th, ph); return n[0] * Lv[0] + n[1] * Lv[1] + n[2] * Lv[2]; }
    function visK(th) { var dy = H * Math.sin(th), dr = dR(th); if (dy < 1e-4) return dr > 0 ? -2 : 2; return -dr * sp / (dy * cp); }
    function visible(th, ph) { return Math.sin(ph) > visK(th); }
    function frame(th, ph) { // local feature frame: screen-right tangent + foreshortening
      var p = proj(th, ph), q = proj(th, ph - 0.01), dx = q[0] - p[0], dy = q[1] - p[1];
      var len = Math.hypot(dx, dy), r3 = rad(th) * 0.01;
      return { x: p[0], y: p[1], ang: Math.atan2(dy, dx) * 180 / PI, fs: clamp(len / r3, 0.2, 1) };
    }
    // silhouette by angular max-radius binning
    var bins = 220, best = new Array(bins).fill(0), th, ph, i;
    for (i = 0; i <= 90; i++) {
      th = i / 90 * PI;
      for (var j = 0; j < 120; j++) {
        ph = j / 120 * TAU;
        var p = proj(th, ph), dx = p[0] - cx, dy = p[1] - cy, r = Math.hypot(dx, dy);
        var b = Math.floor(((Math.atan2(dy, dx) + TAU) % TAU) / TAU * bins) % bins;
        if (r > best[b]) best[b] = r;
      }
    }
    for (i = 0; i < bins; i++) if (!best[i]) best[i] = best[(i + bins - 1) % bins];
    var sm = best.map(function (_, i) { var s = 0; for (var k = -2; k <= 2; k++) s += best[(i + k + bins) % bins]; return s / 5; });
    var sil = sm.map(function (r, i) { var a = (i + 0.5) / bins * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    return { R: R, H: H, cx: cx, cy: cy, rad: rad, proj: proj, normal: normal, dark: dark, lit: lit, visK: visK, visible: visible, frame: frame, sil: sil };
  }

  // ───────────────────────── head drawing ─────────────────────────
  function drawHead(M, ctx, E, opts) {
    var C = ctx.pal, rand = ctx.rand, W = ctx.weight, D = ctx.detail, uid = ctx.uid, s = '';
    var clipId = uid + '-hc', gradId = uid + '-hg';
    var nzO = noiseFn(rand, 14);
    var inkPoly = offsetClosed(M.sil, function (n, t) { return shadeLW(4.2 * W, nzO)(n, t); });
    s += '<defs><clipPath id="' + clipId + '"><path d="' + pathOf(M.sil, true) + '"/></clipPath>' +
      '<radialGradient id="' + gradId + '" gradientUnits="userSpaceOnUse" cx="' + fx(M.cx + M.R * 0.42) + '" cy="' + fx(M.cy - M.H * 0.42) + '" r="' + fx(M.H * 1.55) + '">' +
      '<stop offset="0" stop-color="' + C.skinLight + '" stop-opacity=".55"/><stop offset=".35" stop-color="' + C.skinLight + '" stop-opacity="0"/>' +
      '<stop offset=".62" stop-color="' + C.shade + '" stop-opacity="0"/><stop offset="1" stop-color="' + C.shade + '" stop-opacity=".62"/></radialGradient></defs>';
    s += '<g class="melo-head-ink" filter="url(#' + uid + '-rough)"><path d="' + pathOf(inkPoly, true) + '" fill="' + C.ink + '"/></g>';
    s += '<g class="melo-head-skin" clip-path="url(#' + clipId + ')">';
    s += '<path d="' + pathOf(M.sil, true) + '" fill="' + C.skin + '"/>';

    // stripes: jagged bands along meridians, clamped to the visible hemisphere
    var N = 11, off = ctx.rand() * TAU, stripes = '';
    for (var k = 0; k < N; k++) {
      var phc = off + k / N * TAU;
      phc = phc - TAU * Math.floor((phc + PI / 2) / TAU);
      var hw0 = 0.1 + rand() * 0.03, nzA = noiseFn(rand, 5), nzB = noiseFn(rand, 5), ph0 = rand() * 9, ph1 = rand() * 9;
      var Lft = [], Rgt = [];
      for (var i = 0; i <= 70; i++) {
        var th = 0.03 * PI + i / 70 * 0.95 * PI, tt = i / 70;
        var jagA = 0.05 * Math.abs(((th * 11 + ph0) % 1) - 0.5) * 2 + 0.03 * Math.sin(th * 23 + ph0);
        var jagB = 0.05 * Math.abs(((th * 11 + ph1) % 1) - 0.5) * 2 + 0.03 * Math.sin(th * 23 + ph1);
        var wander = 0.06 * nzA(tt);
        var hw = hw0 * (0.75 + 0.25 * Math.sin(th)) * (1 + 0.25 * nzB(tt));
        var a = phc + wander - hw - jagA, b = phc + wander + hw + jagB;
        var kk = M.visK(th), lo, hi;
        if (kk <= -1) { lo = -PI / 2; hi = 1.5 * PI; } else if (kk >= 1) { lo = hi = PI / 2; } else { lo = Math.asin(kk); hi = PI - Math.asin(kk); }
        a = clamp(a, lo, hi); b = clamp(b, lo, hi);
        var pa = M.proj(th, a), pb = M.proj(th, b);
        // push horizon points slightly outward so the clip does the edge
        if (a <= lo + 1e-6 || a >= hi - 1e-6) pa = [M.cx + (pa[0] - M.cx) * 1.06, M.cy + (pa[1] - M.cy) * 1.03];
        if (b <= lo + 1e-6 || b >= hi - 1e-6) pb = [M.cx + (pb[0] - M.cx) * 1.06, M.cy + (pb[1] - M.cy) * 1.03];
        Lft.push(pa); Rgt.push(pb);
      }
      stripes += '<path d="' + pathOf(Lft.concat(Rgt.reverse()), true) + '"/>';
    }
    s += '<g class="melo-stripes" fill="' + C.stripe + '">' + stripes + '</g>';
    s += '<path d="' + pathOf(M.sil, true) + '" fill="url(#' + gradId + ')"/>';

    // stipple (surface-uniform samples -> natural edge density), pale specks in light
    var dots = '', specks = '', nd = Math.round(5200 * D);
    for (i = 0; i < nd; i++) {
      var u = rand(), th2 = Math.acos(1 - 2 * u), ph2 = rand() * TAU;
      if (!M.visible(th2, ph2)) continue;
      var dk = M.dark(th2, ph2), p = M.proj(th2, ph2);
      if (rand() < 0.14 + 0.85 * Math.pow(dk, 1.3)) dots += 'M' + pt(p) + 'h0';
      else if (dk < 0.15 && rand() < 0.1) specks += 'M' + pt(p) + 'h0';
    }
    s += '<path d="' + dots + '" stroke="' + C.ink + '" stroke-opacity=".7" stroke-width="' + fx(1.45 * Math.max(1, W * 0.8)) + '" stroke-linecap="round"/>';
    s += '<path d="' + specks + '" stroke="' + C.speck + '" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>';

    // form-following hatching (meridians) + cross-hatch (latitudes) in the shadow
    var hatch = '', nzH = noiseFn(rand, 40);
    function runs(sampler, n, thr, wmax, nzk) {
      var seg = [], prevIn = false;
      for (var i = 0; i <= n; i++) {
        var q = sampler(i / n);
        var inside = q && q.dk > thr + 0.08 * nzk(i / n);
        if (inside) seg.push(q.p);
        if ((!inside || i === n) && seg.length) { if (seg.length > 3) hatch += '<path d="' + hatchStroke(seg, wmax) + '"/>'; seg = []; }
      }
    }
    var nm = Math.round(150 * Math.max(0.45, D));
    for (k = 0; k < nm; k++) {
      var phm = k / nm * TAU + rand() * 0.01, nzk = noiseFn(rand, 4);
      runs(function (t) { var th = 0.04 * PI + t * 0.93 * PI; if (!M.visible(th, phm)) return null; return { p: M.proj(th, phm), dk: M.dark(th, phm) }; }, 60, 0.33, 1.25 * Math.max(1, W * 0.75), nzk);
    }
    var nl = Math.round(70 * Math.max(0.45, D));
    for (k = 1; k < nl; k++) {
      var thl = k / nl * PI, nzk2 = noiseFn(rand, 6);
      runs(function (t) { var ph = t * TAU; if (!M.visible(thl, ph)) return null; return { p: M.proj(thl, ph), dk: M.dark(thl, ph) }; }, 140, 0.56, 1.1 * Math.max(1, W * 0.75), nzk2);
    }
    s += '<g class="melo-hatch" fill="' + C.ink + '" fill-opacity=".8">' + hatch + '</g>';

    // a few dry highlight strokes on the lit flank
    var hl = '';
    for (k = 0; k < 7; k++) {
      var phh = PI / 2 - 0.65 - k * 0.07 + rand() * 0.03, t0 = 0.2 + rand() * 0.06, t1 = t0 + 0.12 + rand() * 0.1, seg = [];
      for (i = 0; i <= 12; i++) { var thh = (t0 + (t1 - t0) * i / 12) * PI; seg.push(M.proj(thh, phh)); }
      hl += '<path d="' + hatchStroke(seg, 2.2) + '"/>';
    }
    s += '<g fill="' + C.speck + '" fill-opacity=".8">' + hl + '</g>';
    s += '</g>';
    return s;
  }

  function drawStem(M, ctx) {
    var C = ctx.pal, W = ctx.weight;
    var top = M.proj(0.012, PI / 2), c = [M.cx, M.cy];
    var d = [top[0] - c[0], top[1] - c[1]], l = Math.hypot(d[0], d[1]); d = [d[0] / l, d[1] / l];
    var pp = [-d[1], d[0]];
    var base = [top[0] - d[0] * 3, top[1] - d[1] * 3];
    var pts = crSample([base, [base[0] + d[0] * 9 + pp[0] * 1, base[1] + d[1] * 9 + pp[1] * 1], [base[0] + d[0] * 15 - pp[0] * 4, base[1] + d[1] * 15 - pp[1] * 4], [base[0] + d[0] * 17 - pp[0] * 10, base[1] + d[1] * 17 - pp[1] * 10]], 6);
    var s = '<g class="melo-stem">';
    // dimple ring at base
    var ring = ellipsePts(top[0], top[1] + 2, 9, 3.4, 30, Math.atan2(d[0], -d[1]) * -1);
    s += '<path d="' + stroke(ring.slice(4, 26), [0.6, 2.2 * W, 0.6]) + '" fill="' + C.ink + '" fill-opacity=".85"/>';
    s += '<g filter="url(#' + ctx.uid + '-rough)"><path d="' + tube(pts, function (t) { var w = lerp(3.4, 2.3, t) + 2.4 * W; return [w, w]; }, true, true) + '" fill="' + C.ink + '"/></g>';
    s += '<path d="' + tube(pts, function (t) { var w = lerp(3.4, 2.3, t); return [w, w]; }, true, true) + '" fill="' + C.stem + '"/>';
    s += '<path d="' + stroke(sub(pts, 0.1, 0.75).map(function (p) { return [p[0] + pp[0] * 0.8, p[1] + pp[1] * 0.8]; }), [0.3, 1.1, 0.3]) + '" fill="' + C.ink + '" fill-opacity=".7"/>';
    return s + '</g>';
  }

  // eye in local coords; outer corner at +x
  function eyeSVG(cfg, ctx, id) {
    var C = ctx.pal, W = ctx.weight, w = cfg.w, hw = w / 2, h = w * 0.5, s = '';
    var A = [-hw, 0.6], B = [hw, -1.6];
    var U1 = [-hw * 0.45, -h], U2 = [hw * 0.4, -h * 1.02], D1 = [-hw * 0.4, h * 0.7], D2 = [hw * 0.45, h * 0.5];
    var low = bez3(A, D1, D2, B, 24), up = bez3(A, U1, U2, B, 24);
    if (cfg.laugh) {
      var arc = bez3([-hw, 2.5], [-hw * 0.4, -5.5], [hw * 0.4, -6.5], [hw + 1, 0], 24);
      s += '<path d="' + stroke(arc, [1.6 * W, 4.4 * W, 1.6 * W]) + '"/>';
      s += '<path d="' + stroke(offsetPts(sub(low, 0.25, 0.85), 0, 3), [0.4, 1.6 * W, 0.4]) + '"/>';
      s += '<path d="' + stroke(bez2([hw + 3, 2], [hw + 6, 3], [hw + 8, 6], 8), [0.4, 1.4 * W, 0.3]) + '"/>';
      s += '<path d="' + stroke(bez2([hw + 3, -2], [hw + 7, -3], [hw + 9, -5], 8), [0.4, 1.4 * W, 0.3]) + '"/>';
      return s;
    }
    var c = clamp(cfg.lid, 0, 1);
    var ci = clamp(c + (cfg.tilt || 0), 0, 1), co = clamp(c - (cfg.tilt || 0) * 0.3, 0, 1);
    var K1 = lerp2(U1, D1, ci), K2 = lerp2(U2, D2, co);
    var lid = bez3(A, K1, K2, B, 24);
    var closed = c > 0.97;
    if (!closed) {
      var scl = lid.concat(low.slice().reverse());
      s += '<defs><clipPath id="' + id + '"><path d="' + pathOf(scl, true) + '"/></clipPath></defs>';
      s += '<path d="' + pathOf(scl, true) + '" fill="' + C.sclera + '"/>';
      var pr = w * (cfg.pr || 0.15), px = clamp(cfg.look[0], -1, 1) * hw * 0.5;
      var ly = yAtX(lid, px), lowy = yAtX(low, px);
      var py = Math.min(ly + pr * 0.55 + cfg.look[1] * 2, lowy - pr * 0.6);
      if (cfg.pr && cfg.pr < 0.12) py = (ly + lowy) / 2;
      s += '<g clip-path="url(#' + id + ')"><ellipse cx="' + fx(px) + '" cy="' + fx(py) + '" rx="' + fx(pr) + '" ry="' + fx(pr * 1.12) + '" fill="' + C.ink + '"/>' +
        '<path d="' + stroke(offsetPts(lid, 0, 1.6), [0.5, 2.2, 0.5]) + '" fill="' + C.ink + '" fill-opacity=".25"/></g>';
      s += '<path d="' + stroke(sub(low, 0.08, 0.95), [0.6, 2.1 * W, 0.8]) + '"/>';
    }
    // heavy upper lid with a dry flick past the outer corner
    var lidLine = [[A[0] - 1.5, A[1] + 0.6]].concat(lid).concat([[B[0] + 1.5, B[1] + 0.2]]);
    s += '<path d="' + stroke(lidLine, function (t) { return W * (t < 0.55 ? lerp(2.4, 5.2, t / 0.55) : lerp(5.2, 3.2, (t - 0.55) / 0.45)); }) + '"/>';
    if (c > 0.25 && !closed) s += '<path d="' + stroke(offsetPts(sub(up, 0.3, 0.8), 0, -3.6), [0.4, 1.8 * W, 0.4]) + '" fill-opacity=".8"/>';
    s += '<path d="' + stroke(offsetPts(sub(low, 0.3, 0.82), 0.5, 4.6), [0.3, 1.15 * W, 0.3]) + '" fill-opacity=".8"/>';
    return s;
  }
  function browSVG(cfg, w, ctx) {
    var hw = w / 2, raise = cfg[0], ang = cfg[1], arch = cfg[2] || 0, y0 = -w * 0.42 - 8 - raise;
    var inner = [-hw * 1.0, y0 + ang * 14], outer = [hw * 1.15, y0 - ang * 14 + 2.5], ctrl = [hw * 0.1, y0 - 1.5 - arch];
    var pts = bez2(inner, ctrl, outer, 20);
    return '<path d="' + stroke(pts, function (t) { return ctx.weight * (t < 0.12 ? lerp(5.5, 7, t / 0.12) : lerp(7, 2.2, (t - 0.12) / 0.88)); }) + '"/>';
  }
  function mouthSVG(E, open, ctx) {
    var C = ctx.pal, W = ctx.weight, m = E.mouth, s = '';
    var l = m.l.slice(), r = m.r.slice();
    var mid = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2];
    var cu = [mid[0], mid[1] + m.c * 2 - open * 3];
    var upper = bez2(l, cu, r, 24);
    if (m.wobble) upper = upper.map(function (p, i) { return [p[0], p[1] + Math.sin(i / 24 * PI * 3) * 0.9]; });
    if (open > 0.04) {
      var depth = 4 + 21 * open, wide = (r[0] - l[0]);
      var cl = [mid[0] + wide * 0.05, mid[1] + m.c * 2 + depth * 2];
      var lower = bez2(r, cl, l, 24);
      var inner = upper.concat(lower);
      var id = ctx.uid + '-mc';
      s += '<defs><clipPath id="' + id + '"><path d="' + pathOf(inner, true) + '"/></clipPath></defs>';
      s += '<path d="' + pathOf(inner, true) + '" fill="' + C.fleshDark + '"/>';
      s += '<g clip-path="url(#' + id + ')">';
      s += '<ellipse cx="' + fx(mid[0] + 2) + '" cy="' + fx(mid[1] + depth * 1.25 + 4) + '" rx="' + fx(wide * 0.42) + '" ry="' + fx(depth * 0.75) + '" fill="' + C.flesh + '"/>';
      if (open > 0.45) s += '<path d="M' + pt([mid[0] + 5, mid[1] + depth * 0.95]) + 'q2.2 -1.4 1.6 2.6q-2.4 0 -1.6 -2.6z" fill="' + C.seed + '"/>';
      s += '<path d="' + stroke(offsetPts(upper, 0, 2), [5.5, 6, 5.5], false) + '" fill="' + C.teeth + '"/>';
      s += '</g>';
      s += '<path d="' + stroke(lower, [1.1 * W, 2.4 * W, 1.1 * W]) + '"/>';
      s += '<path d="' + stroke(bez2([mid[0] - 4, mid[1] + depth + 6.5], [mid[0] + 1, mid[1] + depth + 8], [mid[0] + 5, mid[1] + depth + 6.2], 8), [0.3, 1.5 * W, 0.3]) + '" fill-opacity=".85"/>';
    }
    s += '<path d="' + stroke(upper, function (t) { return W * (1.6 + 2.6 * Math.sin(PI * t)); }) + '"/>';
    if (m.dimple) s += '<path d="' + stroke(bez2([r[0] + 0.5, r[1] - 3.5], [r[0] + 3.2, r[1] - 0.5], [r[0] + 1.6, r[1] + 3], 8), [0.4, 2 * W, 0.4]) + '"/>';
    if (!open || open < 0.04) s += '<path d="' + stroke(bez2([l[0] - 1.5, l[1] - 1.5], [l[0] - 3, l[1] + 0.5], [l[0] - 1.8, l[1] + 2.4], 6), [0.3, 1.3 * W, 0.3]) + '" fill-opacity=".8"/>';
    return s;
  }

  function drawFace(M, ctx, E, opts) {
    var W = ctx.weight, s = '<g class="melo-face" fill="' + ctx.pal.ink + '">';
    var phF = PI / 2 - 0.33 + (opts.turn || 0), es = 0.42;
    var lookArr = opts.look || E.look || [0, 0];
    var blink = clamp(opts.blink || 0, 0, 1);
    var eyes = [{ side: 'near', ph: phF + es, mir: -1, lid: E.lid ? E.lid[0] : 1, brow: E.brow.n }, { side: 'far', ph: phF - es, mir: 1, lid: E.lid ? E.lid[1] : 1, brow: E.brow.f }];
    eyes.forEach(function (e) {
      var fr = M.frame(0.47 * PI, e.ph), w = 33;
      var tr = 'translate(' + fx(fr.x) + ' ' + fx(fr.y) + ') rotate(' + fx(fr.ang) + ') scale(' + fx(fr.fs * e.mir * 100) / 100 + ' 1)';
      var lk = [lookArr[0] * e.mir, lookArr[1]];
      var lid = E.closed ? 1 : lerp(e.lid, 1, blink);
      s += '<g class="melo-brow-' + e.side + '" transform="' + tr + '">' + browSVG(e.brow, w, ctx) + '</g>';
      s += '<g class="melo-eye-' + e.side + '" transform="' + tr + '">' + eyeSVG({ w: w, lid: lid, tilt: E.tilt, look: lk, pr: E.pr, laugh: E.closed }, ctx, ctx.uid + '-e' + e.side) + '</g>';
      if (E.twitch && e.side === 'far') {
        s += '<g transform="' + tr + '"><path d="' + stroke(bez2([18, -6], [22, -8], [25, -12], 6), [0.3, 1.5 * W, 0.3]) + '"/><path d="' + stroke(bez2([19, -1], [23, -1], [27, -3], 6), [0.3, 1.5 * W, 0.3]) + '"/></g>';
      }
    });
    // nose: a short hooked tick, turned toward the face direction (not a long line)
    var nf = M.frame(0.555 * PI, phF + 0.02);
    s += '<g class="melo-nose" transform="translate(' + fx(nf.x) + ' ' + fx(nf.y) + ') rotate(' + fx(nf.ang) + ')">' +
      '<path d="' + stroke(bez3([-2, -13], [3, -7], [10, -1], [4, 3.2], 16), [0.8, 3.6 * W, 1.2]) + '"/>' +
      '<path d="' + stroke(bez2([4.5, 3], [0, 4.2], [-3, 1.5], 8), [1.8 * W, 1.6 * W, 0.4]) + '"/></g>';
    // mouth
    var mf = M.frame(0.655 * PI, phF + 0.03 - (E.mouth.shift || 0));
    var open = opts.mouthOpen != null ? clamp(opts.mouthOpen, 0, 1) : E.mouth.open;
    s += '<g class="melo-mouth" transform="translate(' + fx(mf.x) + ' ' + fx(mf.y) + ') rotate(' + fx(mf.ang) + ') scale(' + fx(mf.fs * 135) / 100 + ' 1.3)">' + mouthSVG(E, open, ctx) + '</g>';
    // seed-shaped mole on the far cheek
    var sf = M.frame(0.615 * PI, phF - 0.6);
    s += '<g class="melo-mole" transform="translate(' + fx(sf.x) + ' ' + fx(sf.y) + ') rotate(' + fx(sf.ang + 25) + ') scale(' + fx(sf.fs) + ' 1)">' +
      '<path d="M-2.6 0C-2.6 -2.2 0 -2.6 3.4 0C0 2.6 -2.6 2.2 -2.6 0Z" fill="' + ctx.pal.seed + '"/><circle cx="-0.8" cy="-0.7" r="0.6" fill="#8a7a5a" fill-opacity=".8"/></g>';
    return s + '</g>';
  }

  // the red pencil ("Rotstift") tucked behind the head like behind an ear; tip sticks out
  function drawPencil(M, ctx) {
    var C = ctx.pal, W = ctx.weight;
    var a = M.proj(0.36 * PI, PI / 2 + 1.5);
    var ang = 38 + (M.roll || 0);
    var L = 84, r = 4.8, g = '';
    var body = [[13, -r], [L - 12, -r], [L - 12, r], [13, r]];
    var outline = [[0, 0], [13, -r], [L, -r], [L + 3, -r + 1], [L + 3, r - 1], [L, r], [13, r]];
    g += '<g filter="url(#' + ctx.uid + '-rough)"><path d="' + pathOf(offsetClosed(outline, function (n) { return 2.6 * W * (0.8 + 0.5 * Math.max(0, n[1])); }), true) + '" fill="' + C.ink + '" stroke="' + C.ink + '" stroke-width="' + fx(1.4 * W) + '" stroke-linejoin="round"/></g>';
    g += '<path d="M0 0L13 ' + (-r) + 'L13 ' + r + 'Z" fill="' + C.wood + '"/>';
    g += '<path d="M3 -1.6L6 ' + (-r + 0.6) + 'M5 1.2L9 ' + (r - 0.6) + '" stroke="' + C.ink + '" stroke-width=".8" stroke-opacity=".6"/>';
    g += '<path d="M0 0L4.8 -1.85L4.8 1.85Z" fill="' + C.ink + '"/>';
    g += '<path d="' + pathOf(body, true) + '" fill="' + C.pencil + '"/>';
    g += '<path d="M13 1.7L' + (L - 12) + ' 1.7L' + (L - 12) + ' ' + r + 'L13 ' + r + 'Z" fill="' + C.pencilDark + '"/>';
    g += '<path d="M15 -2.6L' + (L - 16) + ' -2.6" stroke="#E9A592" stroke-width="1.1" stroke-opacity=".75"/>';
    g += '<path d="M13 ' + (-r) + 'Q10 0 13 ' + r + '" stroke="' + C.ink + '" stroke-width="1.4" fill="none"/>';
    return '<g class="melo-pencil" transform="translate(' + fx(a[0]) + ' ' + fx(a[1]) + ') rotate(' + fx(ang + 180) + ') translate(' + fx(-L * 0.42) + ' 0) scale(-1 1) translate(' + fx(-L) + ' 0)">' + g + '</g>';
  }

  // ───────────────────────── body ─────────────────────────
  var HANDS = {
    open:    { palm: [8, 0, 8.2, 7.4], f: [[[6, -4], [10, -11], [13.5, -16]], [[12, -4], [19, -8], [25, -11]], [[13, 0], [21, -0.5], [28.5, -1]], [[12, 4], [19, 6.5], [24.5, 8.5]]] },
    point:   { palm: [8, 0, 8.4, 7.6], f: [[[12, 1], [18.5, 2.5], [19, 6.5], [15, 7]], [[11.5, 5], [16.5, 7.5], [15.5, 10.5], [12, 10]], [[12, -3], [22, -4], [34, -4.5]], [[6, -5], [12, -9.5], [17.5, -9]]] },
    fist:    { palm: [9, 0, 9.6, 8.6], f: [[[11, 4.5], [18, 5.5], [16.5, 8.5]], [[11, -0.5], [19, 0.5], [18, 3.6]], [[11, -5.5], [18.5, -5], [18.5, -1.6]], [[4, -7], [11, -8.5], [15.5, -6]]] },
    relaxed: { palm: [8, 0, 8.2, 7.4], f: [[[11, 5], [16, 7.5], [17.5, 11.5]], [[12, 1], [19, 2.5], [22, 7.5]], [[12, -3], [19.5, -3], [24.5, 1.5]], [[6, -5], [12, -9.5], [16.5, -9.5]]] }
  };
  function handSVG(type, wrist, angDeg, mirror, ctx, cls, sc) {
    var C = ctx.pal, W = ctx.weight, h = HANDS[type] || HANDS.relaxed, fw = 4.6, lw = 2.5 * W, s = '';
    sc = sc || 1.38;
    var palm = ellipsePts(h.palm[0], h.palm[1], h.palm[2], h.palm[3], 28, 0);
    palm = palm.map(function (p) { return [p[0] + (p[0] > h.palm[0] ? 0.08 * (p[0] - h.palm[0]) * Math.abs(p[1]) / 4 : 0), p[1]]; });
    var fingers = h.f.map(function (c) { return crSample(c, 6); });
    var tr = 'translate(' + fx(wrist[0]) + ' ' + fx(wrist[1]) + ') rotate(' + fx(angDeg) + ') scale(' + sc + ' ' + fx(sc * mirror * 100) / 100 + ')';
    s += '<g class="' + cls + '" transform="' + tr + '">';
    var ink = '<path d="' + pathOf(offsetClosed(palm, function () { return lw; }), true) + '"/>';
    fingers.forEach(function (f) { ink += '<path d="' + tube(f, function () { return [fw / 2 + lw, fw / 2 + lw]; }, false, true) + '"/>'; });
    s += '<g fill="' + C.ink + '" filter="url(#' + ctx.uid + '-rough)">' + ink + '</g>';
    s += '<path d="' + pathOf(palm, true) + '" fill="' + C.limb + '"/>';
    fingers.forEach(function (f) {
      var d = sub(f, 0.3, 1);
      s += '<path d="' + tube(d, function () { return [fw / 2 + 1.1 * W, fw / 2 + 1.1 * W]; }, false, true) + '" fill="' + C.ink + '"/>';
      s += '<path d="' + tube(f, function () { return [fw / 2, fw / 2]; }, false, true) + '" fill="' + C.limb + '"/>';
    });
    // knuckle/palm crease
    s += '<path d="' + stroke(bez2([6, 3], [9, 5.5], [12, 4], 6), [0.3, 1 * W, 0.3]) + '" fill="' + C.ink + '" fill-opacity=".7"/>';
    return s + '</g>';
  }

  function limbSVG(ctrl, w0, w1, ctx, cls, opt) {
    opt = opt || {};
    var C = ctx.pal, W = ctx.weight, pts = crSample(ctrl, 14), nz = noiseFn(ctx.rand, 6), lw = (opt.lw || 2.7) * W, s = '';
    s += '<g class="' + cls + '">';
    s += '<g filter="url(#' + ctx.uid + '-rough)"><path d="' + tube(pts, function (t, n) {
      var w = lerp(w0, w1, t) / 2, d = n[0] * L2[0] + n[1] * L2[1], j = 1 + 0.25 * nz(t);
      return [w + lw * (0.6 + 1.0 * Math.max(0, -d)) * j, w + lw * (0.6 + 1.0 * Math.max(0, d)) * j];
    }, opt.capS !== false, opt.capE !== false) + '" fill="' + C.ink + '"/></g>';
    s += '<path d="' + tube(pts, function (t) { var w = lerp(w0, w1, t) / 2; return [w, w]; }, opt.capS !== false, opt.capE !== false) + '" fill="' + C.limb + '"/>';
    // thin inner contour along the shadow side (broken, like a second ink pass)
    if (ctx.detail > 0.3) {
      var segs = [[0.12, 0.42], [0.55, 0.88]], hs = '';
      segs.forEach(function (sg) {
        var part = sub(pts, sg[0], sg[1]), line = [];
        for (var i = 0; i < part.length; i++) {
          var a = part[Math.max(0, i - 1)], b = part[Math.min(part.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
          var n = [-ty / l, tx / l], d = n[0] * L2[0] + n[1] * L2[1], side = d > 0 ? -1 : 1, w = lerp(w0, w1, sg[0] + (sg[1] - sg[0]) * i / (part.length - 1)) / 2;
          line.push([part[i][0] + n[0] * side * w * 0.45, part[i][1] + n[1] * side * w * 0.45]);
        }
        hs += '<path d="' + hatchStroke(line, 1.1) + '"/>';
      });
      s += '<g fill="' + C.ink + '" fill-opacity=".55">' + hs + '</g>';
    }
    return s + '</g>';
  }

  function shoeSVG(ankle, dir, ctx, cls) {
    var C = ctx.pal, W = ctx.weight;
    var pts = crSample([[-8, -12], [3, -13.5], [11, -9.5], [21, -7.5], [29.5, -3.5], [31, 2.5], [26, 6.5], [6, 7], [-10, 6.5], [-13, 1.5], [-12, -6], [-8, -12]], 4);
    pts.pop();
    var s = '<g class="' + cls + '" transform="translate(' + fx(ankle[0]) + ' ' + fx(ankle[1] - 2) + ') scale(' + (dir * 1.22) + ' 1.22)">';
    s += '<g filter="url(#' + ctx.uid + '-rough)"><path d="' + pathOf(offsetClosed(pts, function (n) { return 2.6 * W * (0.7 + 0.8 * Math.max(0, n[1])); }), true) + '" fill="' + C.ink + '"/></g>';
    s += '<path d="' + pathOf(pts, true) + '" fill="' + C.shoe + '"/>';
    s += '<path d="' + stroke([[-12, 3.6], [8, 3.9], [30, 3]], [2.2, 2.6, 1.6], false) + '" fill="' + C.sole + '"/>';
    s += '<path d="' + stroke(bez2([1, -10], [8, -10], [13, -6.5], 8), [0.4, 1.3, 0.4]) + '" fill="' + C.sole + '" fill-opacity=".85"/>';
    s += '<path d="' + stroke(bez2([16, -4.5], [22, -4], [26, -1], 8), [0.3, 1.2, 0.3]) + '" fill="' + C.sole + '" fill-opacity=".5"/>';
    return s + '</g>';
  }

  function groundShadow(ctx) {
    var s = '', r = ctx.rand;
    for (var i = 0; i < 16; i++) {
      var y = 2 + (i % 4) * 2.2 + r(), half = 70 * Math.sqrt(1 - Math.pow((y - 5) / 7.5, 2)) * (0.7 + 0.3 * r()), x0 = -half + 6 + r() * 20, x1 = x0 + 18 + r() * 40;
      if (x1 > half + 8) x1 = half + 8;
      s += '<path d="' + hatchStroke([[x0, y], [(x0 + x1) / 2, y + 0.3], [x1, y]], 1.6) + '"/>';
    }
    return '<g class="melo-shadow" fill="' + ctx.pal.ink + '" fill-opacity=".55">' + s + '</g>';
  }

  // pose table: torso centreline, arms [shoulder, elbow, wrist], legs [hip, knee, ankle]
  var POSES = {
    idle: {
      torso: [[-12, -392], [-11, -352], [-3, -282], [6, -212]],
      armB: { p: [[-8, -360], [13, -288], [22, -204]], hand: 'relaxed', ha: 0, mir: -1 },
      armF: { p: [[-15, -360], [-60, -306], [-24, -254]], hand: 'fist', ha: -30, mir: 1 },
      legB: { p: [[11, -214], [34, -118], [48, -16]], foot: 1 },
      legF: { p: [[1, -214], [-6, -114], [-4, -16]], foot: 1 }
    },
    point: {
      torso: [[-3, -392], [-3, -350], [0, -280], [2, -212]],
      armB: { p: [[-8, -360], [-22, -292], [-20, -226]], hand: 'relaxed', ha: 0, mir: 1 },
      armF: { p: [[1, -360], [58, -368], [112, -396]], hand: 'point', ha: 0, mir: 1 },
      legB: { p: [[7, -216], [24, -116], [32, -16]], foot: 1 },
      legF: { p: [[-3, -216], [-12, -114], [-12, -16]], foot: -1 }
    },
    explain: {
      torso: [[-3, -392], [-3, -350], [0, -280], [2, -212]],
      armB: { p: [[1, -360], [40, -298], [76, -322]], hand: 'open', ha: -25, mir: 1 },
      armF: { p: [[-7, -360], [-40, -296], [-74, -318]], hand: 'open', ha: 25, mir: -1 },
      legB: { p: [[7, -216], [22, -116], [30, -16]], foot: 1 },
      legF: { p: [[-3, -216], [-12, -114], [-14, -16]], foot: -1 }
    },
    crossed: {
      torso: [[-6, -392], [-6, -350], [-1, -280], [4, -212]],
      armB: { p: [[0, -360], [34, -326], [-24, -338]], hand: 'fist', ha: 10, mir: -1 },
      armF: { p: [[-11, -360], [-42, -322], [20, -334]], hand: 'fist', ha: -8, mir: 1 },
      legB: { p: [[9, -216], [30, -116], [42, -16]], foot: 1 },
      legF: { p: [[-1, -216], [-8, -114], [-6, -16]], foot: 1 }
    },
    chin: {
      torso: [[-5, -392], [-5, -350], [-1, -280], [3, -212]],
      armB: { p: [[0, -360], [28, -300], [-22, -298]], hand: 'fist', ha: 0, mir: -1 },
      armF: { p: [[-9, -360], [-26, -300], [20, -396]], hand: 'fist', ha: -25, mir: 1, chin: true },
      legB: { p: [[8, -216], [26, -116], [36, -16]], foot: 1 },
      legF: { p: [[-2, -216], [-10, -114], [-8, -16]], foot: 1 }
    }
  };

  function armSVG(a, ctx, cls) {
    var p = a.p, s = limbSVG(p, 9.8, 8.4, ctx, cls);
    var e = p[p.length - 2], w = p[p.length - 1];
    var ang = Math.atan2(w[1] - e[1], w[0] - e[0]) * 180 / PI + (a.ha || 0);
    s += handSVG(a.hand, w, ang, a.mir, ctx, cls + '-hand melo-hand-' + a.hand);
    return s;
  }
  function legSVG(l, ctx, cls) {
    return limbSVG(l.p, 13, 10, ctx, cls) + shoeSVG(l.p[2], l.foot, ctx, cls + '-shoe');
  }

  // ───────────────────────── assembly ─────────────────────────
  var counter = 0;
  function group(opts) {
    opts = opts || {};
    var seed = opts.seed != null ? opts.seed : 7;
    var uid = 'ma' + (opts.id || (++counter)) + '_' + seed;
    var ctx = { pal: Object.assign({}, PAL, opts.palette || {}), rand: mulberry(seed * 9301 + 49297), weight: opts.weight || 1, detail: opts.detail != null ? opts.detail : 1, uid: uid };
    var E = Object.assign({}, EXPR[opts.expression] || EXPR.smirk);
    var pose = POSES[opts.pose] || POSES.idle;
    var defs = '<defs><filter id="' + uid + '-rough" x="-10%" y="-10%" width="120%" height="120%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + (opts.roughFreq || 0.06) + '" numOctaves="2" seed="' + (seed % 97) + '"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="' + (opts.rough != null ? opts.rough : 2.2) + '" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
    var headOnly = !!opts.headOnly;
    var neckTop = headOnly ? [0, 92] : pose.torso[0];
    var R = 70, H = 100;
    var M = HeadModel({ R: R, H: H, cx: neckTop[0] + 4, cy: neckTop[1] - H * (headOnly ? 0.92 : 1.08), pitch: 0.2, roll: -0.06 + (E.roll || 0) + (opts.tilt || 0) });
    M.roll = (E.roll || 0) * 180 / PI;

    var head = '<g class="melo-head">' + (opts.pencil === false ? '' : drawPencil(M, ctx)) + drawHead(M, ctx, E, opts) + drawStem(M, ctx) + drawFace(M, ctx, E, opts) + '</g>';
    var s = '<g class="melo melo-a">' + defs;
    if (headOnly) {
      s += limbSVG([[neckTop[0] - 2, neckTop[1] + 40], [neckTop[0], neckTop[1] + 14], [neckTop[0] + 1, neckTop[1] - 10]], 12, 10, ctx, 'melo-torso', { capS: false });
      s += head;
    } else {
      s += groundShadow(ctx);
      s += armSVG(pose.armB, ctx, 'melo-arm-back');
      s += legSVG(pose.legB, ctx, 'melo-leg-back');
      s += legSVG(pose.legF, ctx, 'melo-leg-front');
      s += limbSVG(pose.torso, 12.5, 15, ctx, 'melo-torso', { lw: 3 });
      s += head;
      s += armSVG(pose.armF, ctx, 'melo-arm-front');
    }
    return s + '</g>';
  }
  function svg(opts) {
    opts = opts || {};
    var vb = opts.viewBox || (opts.headOnly ? '-125 -140 250 270' : '-185 -655 370 680');
    var size = (opts.width ? ' width="' + opts.width + '"' : '') + (opts.height ? ' height="' + opts.height + '"' : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + size + '>' + group(opts) + '</svg>';
  }

  return { svg: svg, group: group, PALETTE: PAL, EXPRESSIONS: Object.keys(EXPR), POSES: Object.keys(POSES) };
});
