/*!
 * Cast — supporting characters for "Deutsch mit Melo" (fruit-headed people in Melo's ink style).
 * Browser: window.Cast (load brand/concepts/b/melo-b.js first) · Node: require('engine/cast/cast.js')
 *
 *   var fr = Cast.render('kollegin', { expr, pose, talk, t, seed, flip, scale, id, prop, look, from, w,
 *                                     grain, rough, boil, fps });
 *   fr.svg      '<g class="cast cast-kollegin">…</g>' (own <defs>), character coords: feet at (0,0), +y down,
 *               same units as Melo (adult ≈ 470–560 tall); `scale` is applied inside the group.
 *   fr.anchors  { feet, headCenter, headTop, mouth, handL, handR, propTip, bbox:[x,y,w,h] } (already scaled/flipped)
 *   Cast.list() → ids · Cast.info(id) → { id, name, who, fruit, height, colours, defaults }
 *
 * Pure function of its inputs (frames can be rendered in any order / in parallel); static layers are cached
 * per boil variant. Ink roughness is baked into the geometry through MeloB.parts.displace (no slow filters),
 * plus the same cheap tiled-noise edge grain the Melo rig uses. See README.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../brand/concepts/b/melo-b.js'));
  else root.Cast = factory(root.MeloB);
})(typeof self !== 'undefined' ? self : this, function (MeloB) {
  'use strict';
  if (!MeloB || !MeloB.parts || !MeloB._Ink) throw new Error('Cast needs melo-b.js (with MeloB.parts / _Ink) loaded first');

  var U = MeloB._util, Ink = MeloB._Ink, PARTS = MeloB.parts, PAL = MeloB.PALETTE;
  var f1 = U.f1, catmull = U.catmull, cubic = U.cubic, polyD = U.polyD, normals = U.normals;
  var INK = PAL.ink, PAPER = PAL.paper;

  // ───────────────────────────── tuning ─────────────────────────────
  var T = {
    fps: 30, boilEvery: 4,
    roughFreq: 0.035, roughAmp: 0.75, grainFreq: 0.45, grainAmp: 0.32, grainAmpWithFilter: 0.12,
    grainTile: 24, grainTilePx: 32, grainFilter: 1.4,
    breathPeriod: 3.7, blinkSlot: 0.95, blinkChance: 0.3
  };

  // ───────────────────────────── utils ─────────────────────────────
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function add(a, b, s) { s = s == null ? 1 : s; return [a[0] + b[0] * s, a[1] + b[1] * s]; }
  function rad(d) { return d * Math.PI / 180; }
  function dirv(deg) { return [Math.cos(rad(deg)), Math.sin(rad(deg))]; }
  function rot(p, c, deg) { var r = rad(deg), cs = Math.cos(r), sn = Math.sin(r), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]; }
  function sc(pts, k, c) { c = c || [0, 0]; return pts.map(function (p) { return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; }); }
  function tr(pts, dx, dy) { return pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); }
  function mx(pts) { return pts.map(function (p) { return [-p[0], p[1]]; }); }
  function blendObj(a, b, w) {
    if (w <= 0) return clone(a);
    if (w >= 1) return clone(b);
    if (Array.isArray(a) && Array.isArray(b)) { var out = []; for (var i = 0; i < Math.max(a.length, b.length); i++) out.push(blendVal(a[i], b[i], w)); return out; }
    var o = {}, k;
    for (k in a) o[k] = blendVal(a[k], b[k], w);
    for (k in b) if (!(k in a)) o[k] = blendVal(undefined, b[k], w);
    return o;
  }
  function blendVal(x, y, w) {
    if ((typeof x === 'number' || x == null) && (typeof y === 'number' || y == null) && (typeof x === 'number' || typeof y === 'number')) return lerp(x || 0, y || 0, w);
    if (x && y && typeof x === 'object' && typeof y === 'object') return blendObj(x, y, w);
    return w < 0.5 ? (x === undefined ? y : x) : (y === undefined ? x : y);
  }
  var NOISE = {};
  function noise(seed) { return NOISE[seed] || (NOISE[seed] = U.noiseFn(hash(seed * 5 + 1))); }
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
  function dispField(seed, v, s, amp, gmul) {
    var nx = vnoise(seed * 101 + v * 7 + 1), ny = vnoise(seed * 103 + v * 7 + 2), gx = vnoise(seed * 107 + v * 7 + 3), gy = vnoise(seed * 109 + v * 7 + 4);
    var f = T.roughFreq * s, ff = T.grainFreq * s, A = T.roughAmp * amp / s, G = T.grainAmp * amp * gmul / s;
    return function (x, y) {
      return [A * (nx(x * f, y * f) + 0.5 * nx(x * f * 2.1 + 17, y * f * 2.1 + 5)) + G * gx(x * ff, y * ff),
              A * (ny(x * f, y * f) + 0.5 * ny(x * f * 2.1 + 9, y * f * 2.1 + 13)) + G * gy(x * ff, y * ff)];
    };
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(bytes) {
    var out = '', i, n;
    for (i = 0; i + 2 < bytes.length; i += 3) { n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; }
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
  var TILES = {};
  function grainFilter(fid, seed, v, amp, box) {
    var key = seed + ':' + v, url = TILES[key] || (TILES[key] = noiseTile(seed * 13 + v * 101 + 1, T.grainTilePx));
    return '<filter id="' + fid + '" filterUnits="userSpaceOnUse" x="' + f1(box[0]) + '" y="' + f1(box[1]) + '" width="' + f1(box[2]) + '" height="' + f1(box[3]) + '" color-interpolation-filters="sRGB">' +
      '<feImage href="' + url + '" x="0" y="0" width="' + T.grainTile + '" height="' + T.grainTile + '" preserveAspectRatio="none" result="t"/>' +
      '<feTile in="t" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="' + f1(T.grainFilter * amp) + '" xChannelSelector="R" yChannelSelector="G"/></filter>';
  }

  var CACHE = new Map();
  function cached(key, fn) {
    var v = CACHE.get(key);
    if (v === undefined) {
      v = fn();
      if (CACHE.size > 1500) CACHE.delete(CACHE.keys().next().value);
      CACHE.set(key, v);
    }
    return v;
  }
  var CUR_FIELD = null;
  function withDisp(field, fn) {
    var prev = PARTS.displace(field);
    try { return fn(); } finally { PARTS.displace(prev); }
  }

  // ───────────────────────────── ink helpers ─────────────────────────────
  // all helpers take the shadow direction SH explicitly (flipped characters are built with mirrored light)
  function stroke(ink, pts, o, fill) { return '<path d="' + ink.brush(pts, o) + '" fill="' + (fill || INK) + '"/>'; }
  function halo(ink, pts, o, col) {
    var h = {}; for (var k in o) h[k] = o[k]; h.w = o.w + 3.2; h.min = Math.max(o.min || 0.2, 0.45); h.jit = 0.1;
    return '<path d="' + ink.brush(pts, h) + '" fill="' + col + '" opacity="0.55"/>';
  }
  function shape(ink, pts, fill, SH, o) {
    o = o || {};
    return '<path d="' + polyD(pts, true) + '" fill="' + fill + '"' + (o.op ? ' opacity="' + o.op + '"' : '') + '/>' +
      '<path d="' + ink.ring(pts, { w: o.w || 1.6, extra: o.extra == null ? 1.8 : o.extra, dir: SH, jit: o.jit }) + '" fill="' + INK + '" fill-rule="evenodd"/>';
  }
  function ringEl(ink, pts, SH, o) { o = o || {}; return '<path d="' + ink.ring(pts, { w: o.w || 1.6, extra: o.extra == null ? 1.8 : o.extra, dir: SH, jit: o.jit }) + '" fill="' + INK + '" fill-rule="evenodd"/>'; }
  function tube(ink, pts, r, SH, o) { o = o || {}; o.dir = SH; return ink.tube(pts, r, o); }
  function ellipse(cx, cy, rx, ry, n, rot0) {
    var p = []; n = n || 40; rot0 = rot0 || 0;
    var c = Math.cos(rad(rot0)), s = Math.sin(rad(rot0));
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); p.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return p;
  }
  function dots(list, col, w, op) { return list ? '<path d="' + list + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (op != null ? ' opacity="' + op + '"' : '') + '/>' : ''; }
  function dot(x, y) { return 'M' + f1(x) + ' ' + f1(y) + 'h0'; }
  // hatch lines across a region (inside(x,y) && cond(x,y)), Melo's hatchLayer generalised
  function hatch(ink, ang, spacing, inside, cond, box, w, col, op) {
    var d = dirv(ang), nrm = [-d[1], d[0]], cx = box[0], cy = box[1], R = box[2], out = '';
    for (var o = -R; o <= R; o += spacing) {
      var run = null, jitter = (ink.r() - 0.5) * 1.2;
      for (var t = -R; t <= R + 1.6; t += 1.6) {
        var x = cx + nrm[0] * (o + jitter) + d[0] * t, y = cy + nrm[1] * (o + jitter) + d[1] * t;
        var ok = t <= R && inside(x, y) && cond(x, y);
        if (ok) { if (!run) run = []; run.push([x, y]); }
        else if (run) {
          if (run.length > 2) {
            var c0 = Math.floor(ink.r() * 2), c1 = run.length - Math.floor(ink.r() * 2);
            out += ink.brush(run.slice(c0, Math.max(c0 + 2, c1)), { w: w, ta: 0.12, tb: 0.35, min: 0.15, jit: 0.25 });
          }
          run = null;
        }
      }
    }
    return out ? '<path d="' + out + '" fill="' + (col || INK) + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>' : '';
  }
  // radial profile of a star-shaped closed polygon around c → inside test + sphere-ish shading
  function radial(sil, c) {
    var N = 256, tab = new Float32Array(N), n = sil.length;
    for (var k = 0; k < N; k++) {
      var a = k / N * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), best = 0;
      for (var i = 0; i < n; i++) {
        var p = sil[i], q = sil[(i + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1], wx = p[0] - c[0], wy = p[1] - c[1];
        var den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        var t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
        if (u >= 0 && u <= 1 && t > best) best = t;
      }
      tab[k] = best;
    }
    return function (a) { var x = ((a / (Math.PI * 2)) % 1 + 1) % 1 * N, i = Math.floor(x), f = x - i; return tab[i % N] * (1 - f) + tab[(i + 1) % N] * f; };
  }
  function lightVec(D) { var l = [-0.5 * D, -0.56, 0.66], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; }

  // ───────────────────────────── expressions ─────────────────────────────
  // b = brow {dy, ang (+ raises outer end), arch}, e = eye {up, lo, px, py, pr, bag, laugh, closed}
  // m = mouth {l, r, u, d, open, teeth, tongue, lowerLip, wave}, fx = {blush, sweat, lines, shock, tears, drunk}
  var EXPR = {
    neutral: { bL: { dy: 0, ang: -2, arch: 2 }, bR: { dy: -1, ang: 0, arch: 2 }, eL: { up: 4.6, lo: 3.8, px: 0.8, py: 0.3 }, eR: { up: 4.6, lo: 3.8, px: 0.8, py: 0.3 },
      m: { l: [-13, 1], r: [13, 0], u: [0.8, 0.8], d: [0.8, 0.8], lowerLip: 1 }, tilt: 0 },
    happy: { bL: { dy: -3, ang: 2, arch: 3.5 }, bR: { dy: -4, ang: 3, arch: 3.5 }, eL: { up: 3.6, lo: 1.6, px: 0.5, py: 0, crease: 1 }, eR: { up: 3.6, lo: 1.6, px: 0.5, py: 0, crease: 1 },
      m: { l: [-18, -4], r: [18, -5], u: [4.5, 4.5], d: [5, 5], lowerLip: 1, cheeks: 1 }, tilt: -3 },
    laughing: { bL: { dy: -8, ang: -5, arch: 4 }, bR: { dy: -9, ang: -4, arch: 4 }, eL: { laugh: 1 }, eR: { laugh: 1 },
      m: { l: [-22, -5], r: [23, -6], u: [3.5, 3.5], d: [6, 6], teeth: 1, tongue: 1, cheeks: 1 }, open: 1, tilt: -8 },
    surprised: { bL: { dy: -9, ang: 4, arch: 8 }, bR: { dy: -9, ang: 6, arch: 8 }, eL: { up: 7.2, lo: 6, px: 0, py: 0, pr: 2.4 }, eR: { up: 7.4, lo: 6, px: 0, py: 0, pr: 2.4 },
      m: { l: [-8, 2], r: [8, 1], u: [-4, -4], d: [3, 3], round: 0.7 }, open: 0.45, tilt: 3 },
    shocked: { bL: { dy: -12, ang: 10, arch: 9 }, bR: { dy: -12, ang: 10, arch: 9 }, eL: { up: 8.4, lo: 7.4, px: 0, py: 0.5, pr: 1.6 }, eR: { up: 8.4, lo: 7.4, px: 0, py: 0.5, pr: 1.6 },
      m: { l: [-14, 6], r: [14, 6], u: [-3, -3], d: [6, 6], teeth: 1, tongue: 1 }, open: 0.95, tilt: -2, fx: { shock: 1 } },
    confused: { bL: { dy: -8, ang: 6, arch: 6 }, bR: { dy: 3, ang: -6, arch: 0.5 }, eL: { up: 5.6, lo: 4, px: -1.8, py: -1.2 }, eR: { up: 3.6, lo: 3.6, px: -1.8, py: -1.2 },
      m: { l: [-12, 3], r: [12, -2], u: [-2.5, 2.5], d: [-2.5, 2.5], wave: 1 }, tilt: 7 },
    annoyed: { bL: { dy: 4, ang: 18, arch: -1 }, bR: { dy: 3, ang: 16, arch: -1 }, eL: { up: 3.2, lo: 2.4, px: 0, py: 0.5, bag: 1 }, eR: { up: 3.4, lo: 2.4, px: 0, py: 0.5, bag: 1 },
      m: { l: [-15, 4], r: [15, 2], u: [-2, -1.5], d: [1.5, 2], teeth: 2 }, open: 0.22, tilt: 0, fx: { lines: 1 } },
    skeptical: { bL: { dy: 1, ang: -4, arch: 1 }, bR: { dy: -9, ang: 8, arch: 3 }, eL: { up: 2.6, lo: 3.4, px: 4.2, py: 1, bag: 1 }, eR: { up: 3.6, lo: 3.6, px: 4.2, py: 1, bag: 1 },
      m: { l: [-8, 2], r: [15, -1], u: [1, 1.4], d: [1, 1.4], lowerLip: 1, tick: 1 }, tilt: -4 },
    tired: { bL: { dy: 3, ang: -9, arch: 1 }, bR: { dy: 2, ang: -8, arch: 1 }, eL: { up: 1.5, lo: 3, px: 0, py: 1.4, bag: 2 }, eR: { up: 1.7, lo: 3, px: 0, py: 1.4, bag: 2 },
      m: { l: [-12, 4], r: [12, 4], u: [-1.5, -1.5], d: [1, 1], lowerLip: 1 }, tilt: 5 },
    embarrassed: { bL: { dy: -4, ang: -11, arch: 3 }, bR: { dy: -4, ang: -10, arch: 3 }, eL: { up: 3.8, lo: 3.2, px: -3.4, py: 1.8 }, eR: { up: 3.8, lo: 3.2, px: -3.4, py: 1.8 },
      m: { l: [-11, 2], r: [11, 1], u: [1.5, -1.5], d: [1.5, -1.5], wave: 1 }, tilt: 6, fx: { blush: 1, sweat: 1 } },
    sweaty: { bL: { dy: -3, ang: -7, arch: 2 }, bR: { dy: -3, ang: -6, arch: 2 }, eL: { up: 4.2, lo: 3.4, px: 0.5, py: 0.6, bag: 1 }, eR: { up: 4.2, lo: 3.4, px: 0.5, py: 0.6, bag: 1 },
      m: { l: [-14, 3], r: [14, 3], u: [-1, -1], d: [2, 2], teeth: 2 }, open: 0.18, tilt: 2, fx: { sweat: 2 } },
    drunk: { bL: { dy: -4, ang: 4, arch: 3 }, bR: { dy: 0, ang: -2, arch: 2 }, eL: { up: 2.6, lo: 2.4, px: 1.5, py: 1 }, eR: { up: 1.8, lo: 2.6, px: -1.5, py: 1.4 },
      m: { l: [-17, -2], r: [16, -5], u: [3.5, 3.5], d: [3.5, 3.5], lowerLip: 1, wave: 0.5 }, tilt: 9, fx: { blush: 2, drunk: 1 } },
    sad: { bL: { dy: -3, ang: -13, arch: 2 }, bR: { dy: -3, ang: -12, arch: 2 }, eL: { up: 4, lo: 4.2, px: 0, py: 1.6 }, eR: { up: 4, lo: 4.2, px: 0, py: 1.6 },
      m: { l: [-12, 5], r: [12, 5], u: [-3, -3], d: [-1, -1], lowerLip: 1 }, tilt: 4 },
    smug: { bL: { dy: 2, ang: -5, arch: 1.5 }, bR: { dy: -7, ang: 12, arch: 6 }, eL: { up: 3, lo: 2, px: -1.6, py: 0.2 }, eR: { up: 5.6, lo: 4, px: -1.6, py: 0.2 },
      m: { l: [-15, 2], r: [18, -7], u: [3.5, 2.5], d: [3.5, 2.5], lowerLip: 1, dimple: 1 }, tilt: -5 }
  };
  var EXPR_ALIAS = { talking: 'neutral', deadpan: 'neutral', smirk: 'smug', unimpressed: 'skeptical', angry: 'annoyed', scared: 'shocked' };
  function exprOf(name) { return EXPR[name] || EXPR[EXPR_ALIAS[name]] || EXPR.neutral; }

  // ───────────────────────────── poses (Melo units: shoulder y −270, hip −168, ankle −14) ─────────────────────────────
  // a = viewer-left arm/leg (when not flipped), b = viewer-right. hand.g = hand shape, ang = hand direction, flip = thumb side
  var LEGS = { la: { hip: [-6, -168], kn: [-11, -86], an: [-14, -14], foot: -1 }, lb: { hip: [6, -168], kn: [12, -86], an: [18, -14], foot: 1 } };
  var TORSO = [[0, -284], [1, -236], [0, -168]];
  var ARM_IDLE_A = { sh: [-14, -270], el: [-22, -218], wr: [-26, -164], hand: { g: 'relaxed', ang: 96, flip: 0 } };
  var ARM_IDLE_B = { sh: [14, -270], el: [22, -218], wr: [27, -164], hand: { g: 'relaxed', ang: 84, flip: 1 } };
  var POSES = {
    idle: { a: ARM_IDLE_A, b: ARM_IDLE_B, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: 0 },
    talk: { a: { sh: [-14, -270], el: [-36, -216], wr: [-52, -206], hand: { g: 'palm', ang: 170, flip: 1 } },
            b: { sh: [14, -270], el: [44, -214], wr: [74, -236], hand: { g: 'palm', ang: -24, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: 1 },
    point: { a: ARM_IDLE_A, b: { sh: [13, -272], el: [58, -262], wr: [100, -296], hand: { g: 'point', ang: -40, flip: 0 } },
             la: LEGS.la, lb: LEGS.lb, torso: [[0, -284], [2, -236], [-1, -168]], tilt: 4 },
    'arms-crossed': { a: { sh: [-13, -272], el: [-28, -214], wr: [16, -228], hand: { g: 'fist', ang: -10, flip: 1 } },
                      b: { sh: [13, -272], el: [27, -218], wr: [-18, -236], hand: { g: 'tuck', ang: 190, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: -4 },
    'hands-up': { a: { sh: [-14, -272], el: [-52, -262], wr: [-58, -322], hand: { g: 'open', ang: -98, flip: 1 } },
                  b: { sh: [14, -272], el: [52, -262], wr: [58, -322], hand: { g: 'open', ang: -82, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: -2 },
    facepalm: { a: { sh: [-14, -270], el: [-30, -220], wr: [-8, -196], hand: { g: 'relaxed', ang: 20, flip: 1 } },
                b: { sh: [14, -270], el: [52, -246], wr: [0, 0], wrFace: [24, 8], hand: { g: 'open', ang: -128, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: 6 },
    hold: { a: ARM_IDLE_A, b: { sh: [14, -270], el: [40, -216], wr: [32, -236], hand: { g: 'hold', ang: -70, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: 0 },
    sit: { a: { sh: [-14, -214], el: [-27, -160], wr: [-16, -126], hand: { g: 'relaxed', ang: 50, flip: 0 } },
           b: { sh: [14, -214], el: [27, -160], wr: [17, -124], hand: { g: 'relaxed', ang: 130, flip: 1 } },
           la: { hip: [-7, -112], kn: [-19, -104], an: [-21, -14], foot: -1 }, lb: { hip: [7, -112], kn: [20, -104], an: [24, -14], foot: 1 },
           torso: [[0, -228], [1, -180], [0, -112]], tilt: 0, sit: 1 },
    wave: { a: ARM_IDLE_A, b: { sh: [14, -272], el: [52, -266], wr: [60, -326], hand: { g: 'open', ang: -78, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: -3 },
    shrug: { a: { sh: [-13, -272], el: [-52, -246], wr: [-66, -290], hand: { g: 'palm', ang: 230, flip: 1 } },
             b: { sh: [13, -272], el: [52, -246], wr: [66, -290], hand: { g: 'palm', ang: -50, flip: 0 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: -6 },
    think: { a: { sh: [-13, -272], el: [-26, -212], wr: [26, -214], hand: { g: 'fist', ang: -15, flip: 1 } },
             b: { sh: [13, -272], el: [34, -214], wr: [0, 0], wrFace: [16, 40], hand: { g: 'chin', ang: -100, flip: 1 } }, la: LEGS.la, lb: LEGS.lb, torso: TORSO, tilt: 6 },
    'hands-hips': { a: { sh: [-14, -270], el: [-46, -226], wr: [-20, -184], hand: { g: 'fist', ang: 60, flip: 0 } },
                    b: { sh: [14, -270], el: [46, -226], wr: [20, -184], hand: { g: 'fist', ang: 120, flip: 1 } }, la: LEGS.la, lb: { hip: [6, -168], kn: [16, -86], an: [26, -14], foot: 1 }, torso: TORSO, tilt: -3 }
  };
  var POSE_ALIAS = { crossed: 'arms-crossed', explain: 'talk', gesture: 'talk', 'hands_up': 'hands-up', chin: 'think', finger: 'point' };
  // how much each arm drifts / gestures (talk pose is driven by t; others only breathe)
  var GEST = { idle: [0.08, 0.12], talk: [0.8, 1], point: [0.1, 0.2], 'arms-crossed': [0.04, 0.04], 'hands-up': [0.25, 0.25], facepalm: [0.1, 0],
    hold: [0.1, 0.12], sit: [0.25, 0.3], wave: [0.1, 0], shrug: [0.3, 0.3], think: [0.05, 0], 'hands-hips': [0.03, 0.03] };

  var HANDS = clone(MeloB._HANDS);
  HANDS.hold = { f: [[-8, 13, 80], [2, 14, 85], [12, 13, 90], [22, 11, 95]], t: [-40, 11, 50] };
  HANDS.pinch = { f: [[-10, 15, 40], [0, 15, 70], [10, 14, 90], [20, 12, 95]], t: [-30, 12, 30] };

  // ───────────────────────────── props (drawn at the grip point, prop-local coords: +y = "up the hand") ─────────────────────────────
  // arm: preferred arm for the hold pose (Melo units), at: grip offset in hand coords, behind: drawn before the hand
  var PROPS = {
    notepad: { arm: { el: [42, -214], wr: [30, -230], hand: { g: 'hold', ang: -62, flip: 0 } }, rot: 30 },
    mic: { arm: { el: [44, -222], wr: [30, -262], hand: { g: 'hold', ang: -96, flip: 0 } }, rot: 0 },
    phone: { arm: { el: [40, -214], wr: [22, -244], hand: { g: 'hold', ang: -80, flip: 0 } }, rot: 6 },
    plate: { arm: { el: [44, -214], wr: [58, -232], hand: { g: 'palm', ang: -12, flip: 0 } }, rot: 0, palm: 1 },
    bowl: { arm: { el: [44, -214], wr: [56, -234], hand: { g: 'palm', ang: -12, flip: 0 } }, rot: 0, palm: 1 },
    cup: { arm: { el: [44, -214], wr: [34, -236], hand: { g: 'hold', ang: -74, flip: 0 } }, rot: 16 },
    beer: { arm: { el: [46, -220], wr: [40, -248], hand: { g: 'hold', ang: -80, flip: 0 } }, rot: 10 },
    clipboard: { arm: { el: [42, -214], wr: [28, -228], hand: { g: 'hold', ang: -58, flip: 0 } }, rot: 26 },
    fan: { arm: { el: [44, -222], wr: [42, -262], hand: { g: 'hold', ang: -88, flip: 0 } }, rot: 0, anim: 1 },
    glass: { arm: { el: [44, -214], wr: [34, -238], hand: { g: 'hold', ang: -74, flip: 0 } }, rot: 16 },
    none: { arm: { el: [40, -216], wr: [32, -236], hand: { g: 'hold', ang: -70, flip: 0 } } }
  };

  function drawProp(ink, name, SH, t) {
    var s = '';
    switch (name) {
      case 'notepad': {
        var pad = [[-15, -42], [15, -42], [15, 8], [-15, 8]];
        s += shape(ink, pad, '#efe6cc', SH, { w: 1.4, extra: 1.6 });
        s += shape(ink, [[-15, -42], [15, -42], [15, -35], [-15, -35]], '#b5473a', SH, { w: 1.2, extra: 1 });
        for (var i = 0; i < 5; i++) s += stroke(ink, [[-10, -28 + i * 6.5], [10 - (i === 4 ? 8 : 0), -28 + i * 6.5]], { w: 0.8, ta: 0.2, tb: 0.3 }, '#7d8a99');
        for (i = 0; i < 5; i++) s += '<circle cx="' + (-11 + i * 5.5) + '" cy="-42" r="1.6" fill="none" stroke="' + INK + '" stroke-width="1"/>';
        return s;
      }
      case 'clipboard': {
        s += shape(ink, [[-17, -50], [17, -50], [17, 8], [-17, 8]], '#a87a48', SH, { w: 1.4, extra: 1.8 });
        s += shape(ink, [[-13, -44], [13, -44], [13, 3], [-13, 3]], '#f1ead6', SH, { w: 1, extra: 0.6 });
        s += shape(ink, [[-7, -54], [7, -54], [7, -46], [-7, -46]], '#9aa1a6', SH, { w: 1.1, extra: 0.8 });
        for (i = 0; i < 5; i++) s += stroke(ink, [[-9, -36 + i * 7], [9 - (i % 2) * 5, -36 + i * 7]], { w: 0.9, ta: 0.2, tb: 0.3 });
        return s;
      }
      case 'mic': {
        s += tube(ink, [[0, 8], [0, -10], [0, -26]], function (u) { return lerp(3.2, 4.4, u); }, SH, { ink: 1.3, extra: 1.4, fill: '#2a2826', hatch: false });
        var head = ellipse(0, -34, 8.5, 9.5, 28);
        s += shape(ink, head, '#8f969b', SH, { w: 1.4, extra: 1.6 });
        s += stroke(ink, [[-7, -36], [7, -36]], { w: 0.7 }) + stroke(ink, [[-6, -31], [6, -31]], { w: 0.7 }) + stroke(ink, [[-3, -42], [-3, -26]], { w: 0.7 }) + stroke(ink, [[3, -42], [3, -26]], { w: 0.7 });
        s += '<path d="M-4 -40q2 -3 5 -2" stroke="#eef" stroke-width="1.4" fill="none" opacity="0.8"/>';
        s += shape(ink, [[-4.5, -25], [4.5, -25], [4, -20], [-4, -20]], '#b8902f', SH, { w: 1, extra: 0.6 });
        return s;
      }
      case 'phone': {
        s += shape(ink, [[-9, -34], [9, -34], [9, 4], [-9, 4]], '#232527', SH, { w: 1.3, extra: 1.6 });
        s += '<path d="M-6.5 -30H6.5V0H-6.5Z" fill="#8fb8c9"/><path d="M-6.5 -30L6.5 -12V-30Z" fill="#cfe4ea" opacity="0.6"/>';
        return s;
      }
      case 'plate': {
        var pl = ellipse(0, -4, 30, 8, 36);
        s += shape(ink, pl, '#f2ecdb', SH, { w: 1.4, extra: 1.6 });
        s += '<path d="' + polyD(ellipse(0, -5, 20, 4.8, 30), true) + '" fill="none" stroke="#c9bfa4" stroke-width="1.2"/>';
        s += shape(ink, catmull([[-12, -6], [-8, -14], [2, -17], [12, -12], [14, -6]], 4, false).concat([[0, -3]]), '#d9a441', SH, { w: 1.1, extra: 1 });
        s += dots(dot(-4, -10) + dot(3, -12) + dot(8, -9) + dot(-8, -8), '#6f8f3a', 2.2);
        return s;
      }
      case 'bowl': {
        var rim = ellipse(0, -18, 26, 6.5, 36);
        var body = catmull([[-27, -18], [-22, -4], [-10, 3], [10, 3], [22, -4], [27, -18]], 5, false);
        s += shape(ink, body, '#e8e0cc', SH, { w: 1.5, extra: 2 });
        s += stroke(ink, [[-24, -10], [24, -10]], { w: 1.4, ta: 0.1, tb: 0.1 }, '#3c6e9a');
        s += '<path d="' + polyD(rim, true) + '" fill="#f1ead8"/>';
        // potato salad: a heap of pale yellow cubes with green specks
        var heap = catmull([[-23, -18], [-18, -27], [-8, -32], [4, -33], [15, -28], [23, -19]], 4, false);
        s += shape(ink, heap.concat([[0, -16]]), '#e2c96a', SH, { w: 1.1, extra: 1.2 });
        var cub = '';
        [[-14, -24], [-5, -28], [5, -27], [13, -23], [-2, -22], [8, -21]].forEach(function (p) { cub += 'M' + p[0] + ' ' + p[1] + 'h4v3h-4z'; });
        s += '<path d="' + cub + '" fill="#f0dc8c" stroke="' + INK + '" stroke-width="0.8"/>';
        s += dots(dot(-10, -27) + dot(0, -30) + dot(10, -26) + dot(-17, -21) + dot(3, -24), '#5f8a3c', 2);
        s += ringEl(ink, rim, SH, { w: 1.2, extra: 1 });
        return s;
      }
      case 'cup': {
        var mug = [[-11, -30], [11, -30], [10, 2], [-10, 2]];
        s += shape(ink, [[10, -24], [19, -22], [19, -8], [10, -6], [10, -10], [15, -11], [15, -19], [10, -20]], '#b84a3a', SH, { w: 1.2, extra: 1.2 });
        s += shape(ink, mug, '#b84a3a', SH, { w: 1.4, extra: 1.8 });
        s += '<path d="' + polyD(ellipse(0, -30, 11, 3, 24), true) + '" fill="#4a2a1c"/>';
        var st = Math.sin(t * 2.2) * 2;
        s += stroke(ink, catmull([[-3, -36], [-6 + st, -44], [-2, -52], [-5 - st, -60]], 4, false), { w: 1.2, ta: 0.3, tb: 0.5 }, '#8b8478');
        s += stroke(ink, catmull([[4, -37], [2 - st, -45], [6, -53]], 4, false), { w: 1.1, ta: 0.3, tb: 0.5 }, '#8b8478');
        return s;
      }
      case 'glass': {
        s += shape(ink, [[-10, -38], [10, -38], [8, 2], [-8, 2]], '#cfe2e6', SH, { w: 1.2, extra: 1.2, op: 0.9 });
        s += '<path d="M-9.4 -26H9.4L8 2H-8Z" fill="#9cc6d3" opacity="0.6"/>';
        s += '<path d="M-6 -33V-4" stroke="#fff" stroke-width="1.6" opacity="0.7"/>';
        return s;
      }
      case 'beer': {
        s += shape(ink, [[10, -36], [20, -33], [20, -10], [10, -7], [10, -12], [16, -14], [16, -29], [10, -30]], '#d8e3df', SH, { w: 1.1, extra: 1 });
        s += shape(ink, [[-12, -44], [12, -44], [11, 3], [-11, 3]], '#e0a93b', SH, { w: 1.4, extra: 1.8 });
        s += shape(ink, catmull([[-13, -42], [-10, -50], [-2, -52], [6, -50], [13, -46], [12, -40]], 4, false), '#f5efe0', SH, { w: 1.2, extra: 1 });
        s += '<path d="M-7 -36V-4M0 -36V-4M7 -36V-4" stroke="#b07d22" stroke-width="1.2" opacity="0.7"/>';
        return s;
      }
      case 'fan': { // folded paper hand fan, flaps with t
        var open = 54 + Math.sin(t * 9) * 8, ribs = 9, pts = [[0, 0]];
        for (i = 0; i <= ribs; i++) { var a = -90 - open + i * (2 * open / ribs); pts.push([Math.cos(rad(a)) * 46, Math.sin(rad(a)) * 46]); }
        s += shape(ink, pts, '#e7d9b0', SH, { w: 1.3, extra: 1.4 });
        for (i = 1; i < ribs; i++) { var a2 = -90 - open + i * (2 * open / ribs); s += stroke(ink, [[0, -4], [Math.cos(rad(a2)) * 44, Math.sin(rad(a2)) * 44]], { w: 0.8, ta: 0.1, tb: 0.2 }, (i % 2 ? '#b5473a' : '#8a7a58')); }
        return s;
      }
    }
    return s;
  }

  // ───────────────────────────── body parts ─────────────────────────────
  function hand(ink, g, flip, fill) {
    var H = (g && typeof g === 'object') ? g : (HANDS[g] || HANDS.relaxed), s = '';
    var bases = [[17, -6.2], [19, -2], [18.4, 2.4], [16.4, 6.2]];
    var shade = flip ? [0.2, -0.98] : [0.2, 0.98];
    for (var i = 3; i >= 0; i--) {
      var f = H.f[i], b = bases[i], len = f[1] * (i === 3 ? 0.9 : 1);
      var m = add(b, dirv(f[0]), len * 0.55), tt = add(m, dirv(f[0] + f[2]), len * 0.45);
      s += ink.tube(catmull([b, m, tt], 5, false), i === 3 ? 2.7 : 3.1, { ink: 1.25, extra: 1.1, dir: shade, hatch: false, fill: fill });
    }
    var palm = catmull([[-2, -5.5], [7, -8.2], [16, -8], [21, -3], [20.5, 4], [15, 8.6], [5, 8.4], [-2, 4.8]], 4, true);
    s += shape(ink, palm, fill, shade, { w: 1.3, extra: 1.6 });
    s += stroke(ink, [[13, 5.5], [9, 4.5]], { w: 0.8 }) + stroke(ink, [[14, 3], [10.5, 2.2]], { w: 0.7 });
    var Th = H.t, tb = [8, -6.5], tm = add(tb, dirv(Th[0]), Th[1] * 0.55), tt2 = add(tm, dirv(Th[0] + Th[2]), Th[1] * 0.45);
    s += ink.tube(catmull([tb, tm, tt2], 5, false), 3.2, { ink: 1.25, extra: 1.1, dir: shade, hatch: false, fill: fill });
    return s;
  }
  function handXform(A, hk) { return 'translate(' + f1(A.wr[0]) + ' ' + f1(A.wr[1]) + ') rotate(' + f1(A.hand.ang) + ') scale(' + f1(1.22 * hk * 100) / 100 + ' ' + f1((A.hand.flip ? -1.22 : 1.22) * hk * 100) / 100 + ')'; }

  function sleeveSvg(ink, pts, sl, SH, k) {
    var s = '';
    if (!sl) return s;
    var n = pts.length;
    if (sl.type === 'long') {
      var m = Math.max(3, Math.round((n - 1) * (sl.len || 0.84)));
      var sp = pts.slice(0, m + 1);
      s += tube(ink, sp, function (u) { return lerp(sl.r0 || 8, sl.r1 || 6.6, u) * k; }, SH, { ink: 1.4, extra: 1.9, fill: sl.col, hw: 1, hstep: 2.8 });
      // cuff
      var e = sp[sp.length - 1], q = sp[sp.length - 3], dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1, uu = [(e[0] - q[0]) / dl, (e[1] - q[1]) / dl], nn = [-uu[1], uu[0]];
      var c0 = add(e, uu, -5 * k), rr = (sl.r1 || 6.6) * k + 0.6;
      s += stroke(ink, [add(c0, nn, -rr), add(c0, nn, rr)], { w: 1.1, ta: 0.2, tb: 0.2 });
      if (sl.cuff) s += '<path d="' + polyD([add(c0, nn, -rr), add(c0, nn, rr), add(e, nn, rr), add(e, nn, -rr)], true) + '" fill="' + sl.cuff + '"/>';
      if (sl.shine) s += stroke(ink, [add(pts[2], nn, -2), add(pts[Math.round(m * 0.7)], nn, -2.5)], { w: 1.6, ta: 0.3, tb: 0.4 }, sl.shine);
    } else { // short or wide sleeve (upper arm only)
      var A0 = pts[0], m2 = Math.round((n - 1) * (sl.len || 0.3)), E = pts[m2];
      var dl2 = Math.hypot(E[0] - A0[0], E[1] - A0[1]) || 1, u2 = [(E[0] - A0[0]) / dl2, (E[1] - A0[1]) / dl2];
      var sp2 = [add(A0, u2, 1), add(A0, u2, dl2 * 0.5), add(A0, u2, dl2)];
      s += tube(ink, sp2, function (u) { return lerp(sl.r0 || 6.4, sl.r1 || 7, u) * k; }, SH, { ink: 1.4, extra: 2, fill: sl.col, hw: 1, hstep: 2.6 });
      var e2 = add(A0, u2, dl2 * 0.82), n2 = [-u2[1], u2[0]];
      s += stroke(ink, [add(e2, n2, -(sl.r1 || 7) * k + 1), add(add(e2, u2, 0.8), n2, 0), add(e2, n2, (sl.r1 || 7) * k - 1)], { w: 1, ta: 0.3, tb: 0.3 }, sl.light || 'rgba(255,255,255,.35)');
    }
    return s;
  }
  function armSvg(ink, A, ch, SH, cls, propSvg) {
    var k = ch.limbK, pts = catmull([A.sh, A.el, A.wr], 10, false);
    var s = tube(ink, pts, function (u) { return lerp(4.6, 4.0, u) * k; }, SH, { ink: 1.5, extra: 1.7, fill: ch.col.limb });
    s += sleeveSvg(ink, pts, ch.outfit.sleeve, SH, k);
    var hs = '<g class="cast-hand cast-hand-' + cls + '" transform="' + handXform(A, ch.handK) + '">' + hand(ink, A.hand.spec || A.hand.g, A.hand.flip, ch.col.limb) + '</g>';
    if (propSvg) s += propSvg.behind ? propSvg.svg + hs : hs + propSvg.svg;
    else s += hs;
    return '<g class="cast-arm cast-arm-' + cls + '">' + s + '</g>';
  }

  function shoe(ink, an, dir, st, SH, S) {
    var x = an[0], y = an[1], k = st.k || 1, sz = Math.max(0.7, S) * k;
    var T2 = function (p) { return p.map(function (q) { return [x + q[0] * dir * sz, y + q[1] * sz]; }); };
    var s = '';
    if (st.slipper) {
      var sl = catmull([[-10, 10], [-11, 1], [-4, -6], [10, -6], [26, -2], [33, 5], [32, 11]], 4, true);
      s += shape(ink, T2(sl), st.col, SH, { w: 1.4, extra: 1.6 });
      s += shape(ink, T2([[-12, 9], [34, 9], [35, 13], [-11, 13.5]]), st.sole || '#8a7a68', SH, { w: 1.2, extra: 1.4 });
      var fz = ''; for (var i = 0; i < 7; i++) fz += 'M' + polyD(T2([[2 + i * 4, -4 + Math.abs(3 - i) * 0.6], [3 + i * 4, -7 + Math.abs(3 - i) * 0.6]]), false).slice(1);
      s += '<path d="' + fz + '" stroke="' + INK + '" stroke-width="0.9" stroke-linecap="round" opacity="0.6"/>';
      return '<g class="cast-shoe">' + s + '</g>';
    }
    if (st.heel) {
      var up = catmull([[-8, 7], [-8, 0], [-5, -4], [2, -3], [8, 1], [18, 4], [24, 6.5], [25, 9]], 4, true);
      s += shape(ink, T2(up), st.col, SH, { w: 1.3, extra: 1.3 });
      s += shape(ink, T2([[-8, 7], [25, 9], [25, 10.5], [4, 10], [-3, 13.5], [-7, 13.5]]), st.sole || st.col, SH, { w: 1.2, extra: 1.4 });
      s += shape(ink, T2([[-7, 10], [-3, 10], [-4, 14], [-7, 14]]), st.col, SH, { w: 1, extra: 1 });
      s += '<path d="' + polyD(T2([[0, -1], [10, 3]]), false) + '" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.35"/>';
      return '<g class="cast-shoe">' + s + '</g>';
    }
    var upper = catmull([[-9, 9], [-10, 0], [-6, -6], [2, -6], [7, -1], [16, 2], [27, 3.5], [33, 7], [33, 10]], 4, true);
    var sole = catmull([[-12, 8.5], [34, 8.5], [36.5, 11], [34, 14], [-10, 14], [-13, 11.5]], 3, true);
    s += shape(ink, T2(upper), st.col, SH, { w: 1.4, extra: 1.4 });
    s += shape(ink, T2(sole), st.sole || PAL.sole, SH, { w: 1.5, extra: 2.2 });
    if (st.laces !== false) s += '<path d="' + polyD(T2([[3, -3], [10, 3]]), false) + ' ' + polyD(T2([[8, -1], [14, 4.5]]), false) + '" stroke="' + (st.lace || PAL.sole) + '" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>';
    if (st.stripe) s += '<path d="' + polyD(T2([[12, 7], [20, -1]]), false) + '" stroke="' + st.stripe + '" stroke-width="2.2" stroke-linecap="round"/>';
    return '<g class="cast-shoe">' + s + '</g>';
  }
  function legSvg(ink, L, ch, SH) {
    var pts = catmull([L.hip, L.kn, L.an], 10, false), k = ch.limbK, lo = ch.outfit.legs || { type: 'bare' }, s = '';
    var bare = function () { return tube(ink, pts, function (u) { return lerp(5.2, 4.4, u) * k; }, SH, { ink: 1.6, extra: 1.8, fill: ch.col.limb }); };
    if (lo.type === 'pants') {
      s += tube(ink, pts, function (u) { return lerp(lo.r0 || 8.6, lo.r1 || 7.2, u) * k; }, SH, { ink: 1.6, extra: 2, fill: lo.col, hw: 1, hstep: 3 });
      if (lo.crease) s += stroke(ink, pts.slice(3, pts.length - 2), { w: 0.9, ta: 0.3, tb: 0.3 }, lo.crease);
    } else {
      s += bare();
      if (lo.type === 'shorts') {
        var m = Math.round((pts.length - 1) * (lo.len || 0.42));
        s += tube(ink, pts.slice(0, m + 1), function (u) { return lerp(9.5, 9, u) * k; }, SH, { ink: 1.5, extra: 2, fill: lo.col, hw: 1, hstep: 3 });
      }
      if (lo.socks) {
        var n = pts.length, sp = pts.slice(Math.round(n * (lo.sockLen || 0.8)));
        s += tube(ink, sp, function (u) { return lerp(6.4, 6, u) * k; }, SH, { ink: 1.3, extra: 1.6, fill: lo.socks, hatch: false });
        for (var i = 1; i < 3; i++) { var q = sp[Math.min(sp.length - 1, i)]; s += stroke(ink, [[q[0] - 5 * k, q[1]], [q[0] + 5 * k, q[1] + 0.5]], { w: 0.8, ta: 0.2, tb: 0.2 }, 'rgba(0,0,0,.45)'); }
      }
    }
    s += shoe(ink, L.an, L.foot, ch.outfit.shoes || { col: PAL.shoe }, SH, ch.S);
    return '<g class="cast-leg">' + s + '</g>';
  }
  function shadowSvg(ink, S) {
    var gs = '';
    for (var i = 0; i < 9; i++) {
      var yy = -3 + i * 2.1, half = 70 * S * Math.sqrt(Math.max(0, 1 - Math.pow((yy - 5) / 11, 2)));
      if (half < 6) continue;
      var x0 = -half + ink.r() * 8 + 4, x1 = half - ink.r() * 8 + 4;
      gs += ink.brush([[x0, yy], [x1, yy + 0.5]], { w: 1.2, ta: 0.2, tb: 0.2 });
    }
    return '<g class="cast-shadow"><path d="' + gs + '" fill="' + INK + '" opacity="0.55"/></g>';
  }

  // ───────────────────────────── garments ─────────────────────────────
  // ctx: { ink, tp (torso polyline), sa, sb (shoulders), hip, S, k (width scale), SH, side (+1 = shadow flank x sign), uid }
  function cxAt(tp, y) { var best = tp[0]; for (var i = 0; i < tp.length; i++) if (Math.abs(tp[i][1] - y) < Math.abs(best[1] - y)) best = tp[i]; return y > tp[tp.length - 1][1] ? tp[tp.length - 1][0] : best[0]; }
  // o: { neck, chest, waist, hem, hemY (Melo units below hip), flare, shoulder (pad), round (hem curve) }
  function topPoly(c, o) {
    var tp = c.tp, n0 = tp[0], hip = tp[tp.length - 1], k = c.k, S = c.S;
    var yC = lerp(n0[1], hip[1], 0.3), yW = lerp(n0[1], hip[1], 0.68), yH = hip[1] + (o.hemY || 0) * S;
    var sp = (o.shoulder || 0) * k, wc = (o.chest || 15) * k, ww = (o.waist || 14) * k, wh = (o.hem || 15.5) * k, nk = (o.neck || 8) * k;
    var cC = cxAt(tp, yC), cW = cxAt(tp, yW), cH = cxAt(tp, yH);
    var pts = [
      [n0[0] - nk, n0[1] + 1.5], [c.sa[0] - 6 * k - sp, c.sa[1] - 2.5], [c.sa[0] - 10.5 * k - sp, c.sa[1] + 4], [cC - wc, yC],
      [cW - ww, yW], [cH - wh, yH - 2], [cH - wh * 0.4, yH + (o.round || 2)], [cH + wh * 0.4, yH + (o.round || 2)], [cH + wh, yH - 2],
      [cW + ww, yW], [cC + wc, yC], [c.sb[0] + 10.5 * k + sp, c.sb[1] + 4], [c.sb[0] + 6 * k + sp, c.sb[1] - 2.5], [n0[0] + nk, n0[1] + 1.5],
      [n0[0] + 3, n0[1] + (o.neckDip || 5)], [n0[0] - 3, n0[1] + (o.neckDip || 5)]
    ];
    return { poly: catmull(pts, 4, true), yC: yC, yW: yW, yH: yH, cC: cC, cW: cW, cH: cH, n0: n0, wc: wc, ww: ww, wh: wh };
  }
  function flankHatch(c, g, y0, y1, w, col) {
    var h = '', side = c.side, ink = c.ink;
    for (var y = y0; y < y1; y += 3.4) {
      var f = (y - g.n0[1]) / (g.yH - g.n0[1]), half = f < 0.3 ? g.wc : f < 0.68 ? lerp(g.wc, g.ww, (f - 0.3) / 0.38) : lerp(g.ww, g.wh, (f - 0.68) / 0.32);
      var x1 = cxAt(c.tp, y) + side * (half - 0.5), x0 = x1 - side * (w + 3 * Math.sin((y - y0) / 30));
      h += ink.brush([[x0, y + 2], [x1, y - 1]], { w: 0.9, ta: 0.1, tb: 0.5 });
    }
    return '<path d="' + h + '" fill="' + (col || INK) + '" opacity="0.85"/>';
  }
  function garment(c, o, fill) {
    var g = topPoly(c, o);
    g.svg = '<path d="' + polyD(g.poly, true) + '" fill="' + fill + '"/>';
    g.svg += flankHatch(c, g, g.n0[1] + 10, g.yH - 4, o.hatchW || 6);
    g.outline = ringEl(c.ink, g.poly, c.SH, { w: 1.6, extra: 2.6 });
    return g;
  }
  function clipDef(c, name, pts) { var id = c.uid + '-' + name; c.defs += '<clipPath id="' + id + '"><path d="' + polyD(pts, true) + '"/></clipPath>'; return 'url(#' + id + ')'; }
  function gridPattern(x0, y0, x1, y1, step, col, w, op) {
    var d = '';
    for (var x = x0; x <= x1; x += step) d += 'M' + f1(x) + ' ' + f1(y0) + 'V' + f1(y1);
    for (var y = y0; y <= y1; y += step) d += 'M' + f1(x0) + ' ' + f1(y) + 'H' + f1(x1);
    return '<path d="' + d + '" stroke="' + col + '" stroke-width="' + w + '" opacity="' + op + '"/>';
  }
  function buttons(c, x, ys, r, col) { var s = ''; ys.forEach(function (y) { s += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + r + '" fill="' + (col || INK) + '"/>'; }); return s; }
  function collarWings(c, n0, col, w, len) {
    var s = '', ink = c.ink;
    [-1, 1].forEach(function (sd) {
      var p = [[n0[0] + sd * 1, n0[1] + 7], [n0[0] + sd * (w || 9), n0[1] - 1], [n0[0] + sd * ((w || 9) + 2), n0[1] + 2], [n0[0] + sd * 5, n0[1] + (len || 13)]];
      s += shape(ink, p, col, c.SH, { w: 1.2, extra: 1.2 });
    });
    return s;
  }
  function lapels(c, n0, yV, col, w) { // V-neck jacket lapels
    var s = '', ink = c.ink;
    [-1, 1].forEach(function (sd) {
      var p = [[n0[0] + sd * 6, n0[1] - 1], [n0[0] + sd * (w + 5), n0[1] + 4], [n0[0] + sd * (w + 2), n0[1] + 22], [n0[0] + sd * (w + 7), n0[1] + 27], [n0[0] + sd * 1, yV]];
      s += shape(ink, p, col, c.SH, { w: 1.2, extra: 1.4 });
    });
    return s;
  }
  function vNeck(c, n0, yV, w, col) { return shape(c.ink, [[n0[0] - w, n0[1] + 1], [n0[0] + w, n0[1] + 1], [n0[0], yV]], col, c.SH, { w: 1, extra: 0.8 }); }
  function bowtie(c, p, col, w) {
    w = w || 1; var ink = c.ink, s = '';
    s += shape(ink, [[p[0], p[1]], [p[0] - 10 * w, p[1] - 5 * w], [p[0] - 10 * w, p[1] + 5 * w]], col, c.SH, { w: 1.1, extra: 1 });
    s += shape(ink, [[p[0], p[1]], [p[0] + 10 * w, p[1] - 5 * w], [p[0] + 10 * w, p[1] + 5 * w]], col, c.SH, { w: 1.1, extra: 1 });
    s += shape(ink, ellipse(p[0], p[1], 2.8 * w, 3 * w, 12), col, c.SH, { w: 1, extra: 0.6 });
    return s;
  }
  function stripes(y0, y1, x0, x1, step, col, op) { var d = ''; for (var y = y0; y <= y1; y += step) d += 'M' + f1(x0) + ' ' + f1(y) + 'H' + f1(x1); return '<path d="' + d + '" stroke="' + col + '" stroke-width="' + f1(step / 2) + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; }
  function skirtPoly(c, y0, y1, w0, w1, sit) {
    var cx = c.hip[0];
    if (sit) { y1 = c.knee[1] + 6; w1 = Math.max(w1, Math.abs(c.knee[0] - cx) + 12 * c.S); }
    return catmull([[cx - w0, y0], [cx + w0, y0], [cx + w1 * 0.98, y1 - 2], [cx + w1 * 0.5, y1 + 1.5], [cx - w1 * 0.5, y1 + 1.5], [cx - w1 * 0.98, y1 - 2]], 4, true);
  }

  // ───────────────────────────── face ─────────────────────────────
  function brow(ink, cx, cy, p, side, F) {
    var len = F.browLen || 26, arch = p.arch || 0;
    var pts = cubic([-len * 0.42, 0], [-len * 0.15, -arch * 1.3], [len * 0.25, -arch * 1.3], [len * 0.58, 1.5], 14);
    var a = rad(-(p.ang || 0)), cs = Math.cos(a), sn = Math.sin(a), dy = (p.dy || 0) - (p.lift || 0);
    pts = pts.map(function (q) { return [cx + (q[0] * cs - q[1] * sn) * side, cy + dy + q[0] * sn + q[1] * cs]; });
    var innerFirst = side > 0;
    if (side < 0) pts.reverse();
    var col = F.browCol || INK;
    return stroke(ink, pts, { w: F.browW || 7.2, ta: 0.15, tb: 0.5, min: 0.2, jit: 0.15, wf: function (t) { var ti = innerFirst ? t : 1 - t; return 1.15 - 0.55 * ti; } }, col);
  }
  function eye(ink, cx, cy, p, side, blink, look, cid, F, addDef) {
    var w = F.eyeW || 24, hw = w / 2, s = '<g transform="translate(' + f1(cx) + ' ' + f1(cy) + ') scale(' + side + ' 1)">';
    if (p.laugh) {
      s += stroke(ink, cubic([-hw, 2], [-hw * 0.4, -7], [hw * 0.4, -7], [hw + 1, 1.5], 14), { w: 3.8, ta: 0.25, tb: 0.25, min: 0.25 });
      s += stroke(ink, cubic([-hw * 0.5, 7], [-hw * 0.1, 9.5], [hw * 0.4, 9.5], [hw * 0.8, 6.5], 8), { w: 1.3, ta: 0.4, tb: 0.4 });
      s += stroke(ink, [[hw + 3, -2], [hw + 8, -5]], { w: 1.5, ta: 0, tb: 0.6 }) + stroke(ink, [[hw + 3.5, 1.5], [hw + 9, 1.5]], { w: 1.5, ta: 0, tb: 0.6 });
      return s + '</g>';
    }
    var bias = F.lid || 0;
    var up = Math.max(0.6, lerp(p.up + bias, 0.4, blink)), lo = lerp(p.lo, 0.4, blink);
    if (F.round) { up = lerp(p.up * 1.25 + 1.5, 0.4, blink); lo = lerp(p.lo * 1.2 + 1.5, 0.4, blink); }
    if (blink > 0.85) {
      s += stroke(ink, cubic([-hw - 1, 0], [-hw * 0.4, 3.5], [hw * 0.4, 3.5], [hw + 2, -0.5], 14), { w: 3.4, ta: 0.2, tb: 0.35, min: 0.25 });
      if (F.lash) s += stroke(ink, [[hw + 1, -0.5], [hw + 6, -3.5]], { w: 1.6, ta: 0, tb: 0.7 });
      return s + '</g>';
    }
    var Up = cubic([-hw, 0.8], [-hw * 0.55, -up * 1.3], [hw * 0.5, -up * 1.32], [hw, 0.2], 14);
    var Dn = cubic([hw, -0.4], [hw * 0.4, lo * 1.33], [-hw * 0.45, lo * 1.3], [-hw, 0.6], 14);
    var white = Up.concat(Dn.slice(1));
    addDef('<clipPath id="' + cid + '"><path d="' + polyD(white, true) + '"/></clipPath>');
    s += '<path d="' + polyD(white, true) + '" fill="' + (F.eyeCol || PAL.eye) + '"/>';
    var px = ((look ? look[0] * 4.5 : p.px) || 0) * side, py = (look ? look[1] * 2 : p.py) || 0;
    var pr = (p.pr || 3.8) * (F.pupil || 1);
    s += '<g clip-path="url(#' + cid + ')"><path d="' + polyD(Up.map(function (q) { return [q[0], q[1] + 1.6]; }), false) + '" stroke="' + PAL.eyeShade + '" stroke-width="3" fill="none"/>';
    s += '<circle cx="' + f1(px) + '" cy="' + f1(py - Math.max(0, up - lo) * 0.25) + '" r="' + f1(pr) + '" fill="' + INK + '"/>';
    if (F.glint) s += '<circle cx="' + f1(px - pr * 0.35) + '" cy="' + f1(py - pr * 0.4) + '" r="' + f1(pr * 0.3) + '" fill="' + PAL.eye + '"/>';
    s += '</g>';
    var lid = [[-hw - 1.2, 1.4]].concat(Up, [[hw + 1.6, 0.9]]);
    s += stroke(ink, lid, { w: F.lidW || 4.3, ta: 0.14, tb: 0.16, min: 0.3, jit: 0.18 });
    s += stroke(ink, Up.length ? Dn.slice(1, 12) : [], { w: 1.25, ta: 0.3, tb: 0.4, min: 0.15 });
    if (F.lash) s += stroke(ink, [[hw + 0.5, 0.6], [hw + 6, -3.2]], { w: 1.7, ta: 0, tb: 0.75 }) + stroke(ink, [[hw - 2.5, -up * 0.9], [hw + 2, -up * 0.9 - 4.5]], { w: 1.4, ta: 0, tb: 0.75 });
    if (p.crease || F.crease) s += stroke(ink, cubic([-hw * 0.55, -up - 3.4], [-hw * 0.1, -up - 5.4], [hw * 0.5, -up - 5], [hw * 0.95, -up - 2.6], 10), { w: 1.0, ta: 0.4, tb: 0.4, min: 0.1 });
    var bag = Math.max(p.bag || 0, F.bag || 0);
    if (bag) s += stroke(ink, cubic([-hw * 0.35, lo + 4.4], [-hw * 0.05, lo + 6.4], [hw * 0.45, lo + 6], [hw * 0.8, lo + 3.4], 10), { w: 1.0, ta: 0.45, tb: 0.45, min: 0.1 });
    if (bag > 1) s += stroke(ink, cubic([-hw * 0.2, lo + 8], [hw * 0.1, lo + 10], [hw * 0.5, lo + 9.6], [hw * 0.75, lo + 7.4], 8), { w: 0.9, ta: 0.45, tb: 0.45, min: 0.1 });
    return s + '</g>';
  }
  function nose(ink, x, y, F) {
    var style = F.nose || 'hook', s = '', hc = F.halo;
    if (style === 'button') {
      var b = catmull([[x - 4, y + 1], [x - 1, y + 5], [x + 4, y + 4.5], [x + 5.5, y + 1]], 4, false);
      return stroke(ink, b, { w: 2.4, ta: 0.3, tb: 0.3, min: 0.2 }) + stroke(ink, [[x - 1.5, y - 4], [x + 0.5, y - 1]], { w: 1, ta: 0.3, tb: 0.3 });
    }
    if (style === 'long') {
      var l = catmull([[x - 2, y - 16], [x + 2, y - 6], [x + 7, y + 3], [x + 5, y + 6.5], [x - 0.5, y + 6], [x - 3.6, y + 3.6]], 5, false);
      return (hc ? halo(ink, l, { w: 2.6, ta: 0.35, tb: 0.25 }, hc) : '') + stroke(ink, l, { w: 2.6, ta: 0.35, tb: 0.25, min: 0.15, wf: function (t) { return 0.7 + 0.5 * Math.sin(t * Math.PI); } }) +
        stroke(ink, [[x + 5, y + 9.5], [x + 9.5, y + 8]], { w: 1.0, ta: 0.3, tb: 0.3 });
    }
    if (style === 'pointy') {
      var pp = catmull([[x - 1, y - 9], [x + 3, y - 2], [x + 8, y + 3.5], [x + 2.5, y + 5], [x - 2.5, y + 3]], 5, false);
      return (hc ? halo(ink, pp, { w: 2.4, ta: 0.35, tb: 0.25 }, hc) : '') + stroke(ink, pp, { w: 2.4, ta: 0.35, tb: 0.3, min: 0.15 });
    }
    if (style === 'bulb') {
      var bb = ellipse(x + 1.5, y + 2, 7.5, 6, 24);
      return '<path d="' + polyD(bb, true) + '" fill="' + (F.noseCol || 'rgba(0,0,0,.12)') + '"/>' + stroke(ink, catmull([[x - 6, y - 1], [x - 4, y + 6], [x + 3, y + 8.5], [x + 8.5, y + 5], [x + 8, y - 2]], 4, false), { w: 2.2, ta: 0.25, tb: 0.25, min: 0.2 }) +
        stroke(ink, [[x - 1, y - 9], [x - 3, y - 3]], { w: 1.2, ta: 0.3, tb: 0.3 });
    }
    var tip = catmull([[x - 1.5, y - 10], [x + 2.5, y - 3.5], [x + 6.5, y + 1.2], [x + 4.2, y + 4.6], [x - 0.5, y + 4.2], [x - 3.6, y + 2.2]], 5, false);
    s = (hc ? halo(ink, tip, { w: 2.7, ta: 0.35, tb: 0.25 }, hc) : '') + stroke(ink, tip, { w: 2.7, ta: 0.35, tb: 0.25, min: 0.15, wf: function (t) { return 0.7 + 0.5 * Math.sin(t * Math.PI); } });
    s += stroke(ink, [[x + 4.6, y + 7.5], [x + 8.5, y + 6.2]], { w: 1.0, ta: 0.3, tb: 0.3 });
    return s;
  }
  function mouth(ink, x, y, m, open, id, F, addDef) {
    var rnd = m.round || 0, wide = m.wide || 0, lipIn = m.lipIn || 0, mw = F.mouthW || 1;
    var ml = [m.l[0] * mw, m.l[1]], mr = [m.r[0] * mw, m.r[1]];
    var hw0 = (mr[0] - ml[0]) / 2, pull = hw0 * (0.36 * rnd * Math.min(1, open * 4) - 0.12 * wide);
    var l = [x + ml[0] + open * 2 + pull, y + ml[1] + rnd * open * 2], r = [x + mr[0] - open * 2 - pull, y + mr[1] + rnd * open * 2];
    function ctrl(t, off) { return [lerp(l[0], r[0], t), lerp(l[1], r[1], t) + off]; }
    var H = 20 * open * (1 + 0.35 * rnd) * (1 - 0.55 * lipIn), lift = open * 1.5 + rnd * open * 4;
    var Up, s = '';
    if (m.wave && open < 0.06) { // wobbly mouth: s-curve
      var wv = m.wave;
      Up = catmull([l, ctrl(0.3, -2.4 * wv + m.u[0] * 0.3), ctrl(0.5, 0.5), ctrl(0.72, 2.4 * wv + m.u[1] * 0.3), r], 4, false);
    } else Up = cubic(l, ctrl(1 / 3, m.u[0] - lift), ctrl(2 / 3, m.u[1] - lift), r, 16);
    var lipCol = F.lip;
    if (open > 0.06) {
      var Dn = cubic(r, ctrl(2 / 3, m.d[1] + H), ctrl(1 / 3, m.d[0] + H), l, 16);
      var inner = Up.concat(Dn.slice(1)), mid = id + '-m';
      addDef('<clipPath id="' + mid + '"><path d="' + polyD(inner, true) + '"/></clipPath>');
      s += '<path d="' + polyD(inner, true) + '" fill="' + PAL.mouth + '"/><g clip-path="url(#' + mid + ')">';
      if (m.tongue) { var bm = Dn[8]; s += '<ellipse cx="' + f1(bm[0] + 2) + '" cy="' + f1(bm[1] + 1) + '" rx="' + f1(Math.abs(r[0] - l[0]) * 0.32) + '" ry="' + f1(4 + 4 * open) + '" fill="' + PAL.tongue + '"/>'; }
      if (m.teeth) {
        var th = m.teeth === 2 ? 30 : 3.4 + lipIn * 3, Tt = Up.map(function (q) { return [q[0], q[1] + th]; }).reverse();
        s += '<path d="' + polyD(Up.concat(Tt), true) + '" fill="' + PAL.teeth + '"/>';
        if (m.teeth === 2) s += '<path d="M' + f1(l[0] - 2) + ' ' + f1((l[1] + r[1]) / 2 + 2.2) + 'L' + f1(r[0] + 2) + ' ' + f1((l[1] + r[1]) / 2 + 1.4) + '" stroke="' + INK + '" stroke-width="1.1"/>';
        if (F.gap && m.teeth === 1) { var gm = Up[8]; s += '<path d="M' + f1(gm[0] - 1.6) + ' ' + f1(gm[1]) + 'h3.2v5h-3.2z" fill="' + PAL.mouth + '"/>'; }
      }
      s += '</g>';
      if (lipCol) s += stroke(ink, Dn, { w: 4.2, ta: 0.25, tb: 0.25, min: 0.3 }, lipCol);
      s += stroke(ink, Up, { w: lipCol ? 3.8 : 3.4, ta: 0.15, tb: 0.15, min: 0.35 }, lipCol ? INK : null);
      s += stroke(ink, Dn, { w: 1.9, ta: 0.2, tb: 0.2, min: 0.3 });
      var lm = Dn[8];
      s += stroke(ink, [[lm[0] - 6, lm[1] + 4.5], [lm[0] + 1, lm[1] + 5.8], [lm[0] + 7, lm[1] + 4.2]], { w: 1.1, ta: 0.4, tb: 0.4 });
    } else {
      if (lipCol) {
        var low = Up.map(function (q, i) { var u = i / (Up.length - 1); return [q[0], q[1] + Math.sin(u * Math.PI) * 5.5]; }).reverse();
        var upl = Up.map(function (q, i) { var u = i / (Up.length - 1); return [q[0], q[1] - Math.sin(u * Math.PI) * 3.2 * (1 - 0.6 * Math.abs(Math.sin(u * Math.PI * 2)))]; });
        s += '<path d="' + polyD(upl.concat(low), true) + '" fill="' + lipCol + '"/>';
      }
      s += (F.halo ? halo(ink, Up, { w: 3.6, ta: 0.2, tb: 0.2, min: 0.3 }, F.halo) : '') + stroke(ink, Up, { w: 3.4, ta: 0.2, tb: 0.2, min: 0.3 });
      if (m.lowerLip && !lipCol) { var mm = Up[8]; s += stroke(ink, cubic([mm[0] - 6, mm[1] + 6], [mm[0] - 2, mm[1] + 8], [mm[0] + 3, mm[1] + 8], [mm[0] + 6, mm[1] + 5.5], 8), { w: 1.2, ta: 0.4, tb: 0.4 }); }
    }
    if (m.dimple) s += stroke(ink, catmull([[r[0] + 1.5, r[1] - 5.5], [r[0] + 4.5, r[1] - 0.5], [r[0] + 3, r[1] + 4.5]], 4, false), { w: 1.9, ta: 0.3, tb: 0.5 });
    if (m.tick) s += stroke(ink, [[r[0] + 1, r[1] - 2.5], [r[0] + 3.2, r[1] + 2.5]], { w: 1.6, ta: 0.2, tb: 0.5 });
    if (m.cheeks || F.lines) {
      s += stroke(ink, catmull([[l[0] - 3, l[1] - 9], [l[0] - 6, l[1] - 2], [l[0] - 4, l[1] + 4]], 4, false), { w: 1.4, ta: 0.3, tb: 0.5 });
      s += stroke(ink, catmull([[r[0] + 3, r[1] - 9], [r[0] + 6, r[1] - 2], [r[0] + 4, r[1] + 4]], 4, false), { w: 1.4, ta: 0.3, tb: 0.5 });
    }
    if (F.chin) s += stroke(ink, cubic([x - 6, y + 22 + open * 12], [x - 2, y + 24.5 + open * 12], [x + 3, y + 24.5 + open * 12], [x + 7, y + 22 + open * 12], 8), { w: 1.2, ta: 0.4, tb: 0.4 });
    return s;
  }
  function faceSvg(ink, ch, ex, st, uid, addDef) {
    var F = ch.face, s = '', fx = 3, my = F.mouthY || 30, ey = F.eyeY || 0, EX = F.eyeX || 27;
    var fxs = ex.fx || {};
    // behind-features effects
    if (fxs.blush || F.blush) {
      var bl = fxs.blush ? 1 : 0.45, bc = F.blushCol || '#d9534a';
      [-1, 1].forEach(function (sd) {
        s += '<ellipse cx="' + f1(fx + sd * (EX + 6)) + '" cy="' + f1(ey + 15) + '" rx="13" ry="6" fill="' + bc + '" opacity="' + f1(0.42 * bl * 10) / 10 + '"/>';
        if (fxs.blush) for (var i = 0; i < 4; i++) s += stroke(ink, [[fx + sd * (EX + 6) - 8 + i * 5, ey + 19], [fx + sd * (EX + 6) - 5 + i * 5, ey + 11]], { w: 1.1, ta: 0.3, tb: 0.3 }, '#8e2a22');
      });
    }
    if (fxs.shock) { // dread lines over the forehead
      var sl = '';
      for (var j = 0; j < 9; j++) { var xx = -36 + j * 9; sl += ink.brush([[xx, -46 + (j % 2) * 4], [xx + 0.5, -24 - (j % 3) * 3]], { w: 1.3, ta: 0.05, tb: 0.8, min: 0.1 }); }
      s += '<path d="' + sl + '" fill="' + INK + '" opacity="0.7"/>';
    }
    s += '<g class="cast-brows">' + brow(ink, fx - EX, ey - 12.5 - (F.browGap || 0), ex.bL, -1, F) + brow(ink, fx + EX, ey - 12.5 - (F.browGap || 0), ex.bR, 1, F) + '</g>';
    s += '<g class="cast-eyes">' + eye(ink, fx - EX, ey, ex.eL, -1, st.blink, st.look, uid + 'el', F, addDef) + eye(ink, fx + EX, ey, ex.eR, 1, st.blink, st.look, uid + 'er', F, addDef) + '</g>';
    if (F.glasses) {
      var gr = F.glasses.r || 16, gl = '', gc = F.glasses.col || INK;
      [-1, 1].forEach(function (sd) { gl += '<path d="' + ink.ring(ellipse(fx + sd * EX, ey + 1, gr, gr * 0.86, 30), { w: 1.6, extra: 1.2, dir: [0.55, 0.83] }) + '" fill="' + gc + '" fill-rule="evenodd"/>'; gl += '<path d="M' + f1(fx + sd * EX - 8) + ' ' + f1(ey - 7) + 'l5 -4" stroke="#fff" stroke-width="1.6" opacity="0.7"/>'; });
      gl += stroke(ink, catmull([[fx - EX + gr - 1, ey - 1], [fx, ey - 4], [fx + EX - gr + 1, ey - 1]], 4, false), { w: 1.6, ta: 0.1, tb: 0.1 }, gc);
      gl += stroke(ink, [[fx - EX - gr, ey - 1], [fx - EX - gr - 12, ey - 3]], { w: 1.5, ta: 0.1, tb: 0.5 }, gc) + stroke(ink, [[fx + EX + gr, ey - 1], [fx + EX + gr + 12, ey - 3]], { w: 1.5, ta: 0.1, tb: 0.5 }, gc);
      if (F.glasses.chain) gl += '<path d="M' + f1(fx - EX - gr - 2) + ' ' + f1(ey) + 'q-8 40 -2 70M' + f1(fx + EX + gr + 2) + ' ' + f1(ey) + 'q8 40 2 70" stroke="#b8902f" stroke-width="1" stroke-dasharray="1.6 1.6" fill="none"/>';
      s += '<g class="cast-glasses">' + gl + '</g>';
    }
    s += '<g class="cast-nose">' + nose(ink, fx + 3, ey + 16, F) + '</g>';
    if (fxs.drunk) s += '<ellipse cx="' + (fx + 6) + '" cy="' + (ey + 19) + '" rx="7" ry="5" fill="#d9534a" opacity="0.5"/>';
    if (F.stubble) s += F._stubble || '';
    if (F.moustache) {
      var mu = F.moustache, my0 = ey + my - 7;
      [-1, 1].forEach(function (sd) {
        var p = catmull([[fx + sd * 1.5, my0], [fx + sd * 9, my0 - 1.5], [fx + sd * 16, my0 + 0.5], [fx + sd * 20, my0 - 3.5]], 5, false);
        s += stroke(ink, p, { w: mu.w || 3.4, ta: 0.15, tb: 0.75, min: 0.2 }, mu.col || INK);
      });
    }
    s += '<g class="cast-mouth">' + mouth(ink, fx, ey + my, ex.m, clamp(ex.open || 0, 0, 1), uid + 'mo', F, addDef) + '</g>';
    if (F.headMirror) { // ENT head mirror on a band across the forehead
      var hmY = ey - 42, hb = catmull([[fx - 62, hmY + 10], [fx - 20, hmY - 4], [fx + 30, hmY - 4], [fx + 66, hmY + 10]], 5, false);
      s += stroke(ink, hb, { w: 4.2, ta: 0.05, tb: 0.05, min: 0.8, jit: 0.05 }, '#2b2a28');
      var mc = [fx - 24, hmY - 6];
      s += shape(ink, ellipse(mc[0], mc[1], 15, 13, 28), '#c9cdd0', [0.55, 0.83], { w: 1.5, extra: 1.6 });
      s += '<circle cx="' + mc[0] + '" cy="' + mc[1] + '" r="3.2" fill="' + INK + '"/><path d="M' + (mc[0] - 9) + ' ' + (mc[1] - 4) + 'q4 -6 10 -6" stroke="#fff" stroke-width="2" fill="none" opacity="0.85"/>';
    }
    if (fxs.lines) s += stroke(ink, [[fx + 58, ey - 30], [fx + 66, ey - 38]], { w: 2 }) + stroke(ink, [[fx + 62, ey - 22], [fx + 73, ey - 26]], { w: 2 }) + stroke(ink, [[fx + 52, ey - 36], [fx + 54, ey - 47]], { w: 2 });
    if (fxs.sweat) {
      var drops = fxs.sweat > 1 ? [[-50, -28, 1], [56, -12, 0.85], [-44, 2, 0.7]] : [[54, -26, 1]];
      drops.forEach(function (d0) {
        var k = d0[2], xx = fx + d0[0], yy = ey + d0[1] + ((st.t * 6 + d0[0]) % 6) * 0.6;
        var dp = catmull([[xx, yy - 9 * k], [xx + 4.5 * k, yy + 1], [xx + 3 * k, yy + 5 * k], [xx, yy + 6 * k], [xx - 3 * k, yy + 5 * k], [xx - 4.5 * k, yy + 1]], 4, true);
        s += shape(ink, dp, '#cfe6ee', [0.55, 0.83], { w: 1.2, extra: 1.2 }) + '<path d="M' + f1(xx - 1.5 * k) + ' ' + f1(yy) + 'l0 2.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>';
      });
    }
    return s;
  }

  // ───────────────────────────── heads ─────────────────────────────
  // head spec: { sil: [[x,y]…] (local, centre (0,0) = head centre, chin at y = bottom), c: lighting centre, bottom, top,
  //   col: {base, lit, shade, light (mottle), dark (stipple)}, tex(ctx), back(ctx), front(ctx), gloss, hatch: opacity }
  function headStatic(ch, D, bv, uid, seed) {
    var H = ch.head, ink = new Ink(seed * 3 + 11), tex = new Ink(seed * 31 + 5), K = H.k || 1;
    var sil = sc(H.sil, K), c = sc([H.c || [0, 0]], K)[0], R = radial(sil, c), L = lightVec(D), SH = [0.55 * D, 0.83];
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    sil.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var Rb = Math.max(maxx - minx, maxy - miny) / 2 + 6, box = [(minx + maxx) / 2, (miny + maxy) / 2, Rb];
    function inside(x, y) { var dx = x - c[0], dy = y - c[1]; return Math.hypot(dx, dy) < R(Math.atan2(dy, dx)); }
    // texture / extra builders work in the unscaled design coords (wrapped in scale(K))
    function insideU(x, y) { return inside(x * K, y * K); }
    function lumU(x, y) { return lum(x * K, y * K); }
    function qU(x, y) { return q(x * K, y * K); }
    function wrapK(svg) { return K === 1 || !svg ? svg : '<g transform="scale(' + K + ')">' + svg + '</g>'; }
    function q(x, y) { var dx = x - c[0], dy = y - c[1]; return Math.hypot(dx, dy) / (R(Math.atan2(dy, dx)) || 1); }
    function lum(x, y) {
      var dx = x - c[0], dy = y - c[1], a = Math.atan2(dy, dx), qq = Math.min(0.999, Math.hypot(dx, dy) / (R(a) || 1));
      var nx = Math.cos(a) * qq, ny = Math.sin(a) * qq, nz = Math.sqrt(1 - qq * qq);
      return nx * L[0] + ny * L[1] + nz * L[2];
    }
    var defs = '', clip = uid + '-hd';
    defs += '<clipPath id="' + clip + '"><path d="' + polyD(sil, true) + '"/></clipPath>';
    var ctx = { ink: ink, tex: tex, inside: insideU, lum: lumU, q: qU, R: R, c: H.c || [0, 0], sil: H.sil, D: D, SH: SH, L: L, uid: uid, box: box, clip: 'url(#' + clip + ')', defs: '', minx: minx / K, maxx: maxx / K, miny: miny / K, maxy: maxy / K, K: K,
      ha: function (a) { return D > 0 ? a : 180 - a; } };
    var col = H.col, s = '';
    if (H.back) s += wrapK(H.back(ctx));
    s += '<g class="cast-skull"><path d="' + polyD(sil, true) + '" fill="' + col.shade + '"/>';
    var w = maxx - minx, h = maxy - miny;
    var lit = sc(sil, 0.9, [c[0] - 0.07 * w * D, c[1] - 0.06 * h]);
    var tx = '<path d="' + polyD(lit, true) + '" fill="' + col.base + '"/>';
    if (H.tex) tx += wrapK(H.tex(ctx));
    // mottling + stipple following the light
    var nd = Math.round(2400 * (w * h) / (168 * 192)), dk = '', lt = '';
    for (var i = 0; i < nd; i++) {
      var x = minx + tex.r() * w, y = miny + tex.r() * h;
      if (!inside(x, y)) continue;
      var lv = lum(x, y), pr = clamp((0.62 - lv) * 1.15, 0, 1);
      if (tex.r() < pr * (H.stipple == null ? 0.7 : H.stipple)) dk += dot(x, y);
      else if (lv > 0.55 && tex.r() < 0.25) lt += dot(x, y);
    }
    tx += dots(lt, col.light, 2.1, 0.8) + dots(dk, col.dark || INK, 1.15, 0.9);
    var hop = H.hatch == null ? 1 : H.hatch;
    tx += hatch(ink, ctx.ha(52), 3.6, inside, function (x, y) { return lum(x, y) < 0.16; }, box, 1.15, INK, hop);
    tx += hatch(ink, ctx.ha(-38), 4.2, inside, function (x, y) { return lum(x, y) < -0.12 && q(x, y) < 0.965; }, box, 1.05, INK, hop);
    tx += hatch(ink, ctx.ha(10), 3.8, inside, function (x, y) { return lum(x, y) < -0.36 && q(x, y) < 0.95; }, box, 0.95, INK, hop);
    if (H.gloss) tx += wrapK(H.gloss(ctx));
    s += '<g clip-path="url(#' + clip + ')">' + tx + '</g>';
    s += ringEl(ink, sil, SH, { w: 2.4, extra: 4.6, jit: 0.35 });
    s += '</g>';
    if (H.front) s += wrapK(H.front(ctx));
    return { svg: s, defs: defs + ctx.defs };
  }

  // ───────────────────────────── characters ─────────────────────────────
  function closed(pts, steps) { return catmull(pts, steps || 6, true); }
  var CH = {};

  // —— kollegin: pear, powder-blue blouse, red lanyard, charcoal pencil skirt ——
  CH.kollegin = {
    name: 'Kollegin', who: 'office colleague', fruit: 'pear (Birne)',
    S: 1, legK: 1, torsoK: 1, wK: 0.95, armK: 1, neck: 8, limbK: 0.95, handK: 0.97,
    col: { limb: '#b4ac4a', skin: '#c8bf4e', outfit: '#8eabc0', accent: '#c0392b' },
    defaults: { expr: 'neutral', pose: 'idle', prop: 'cup' },
    head: {
      sil: closed([[6, -126], [22, -120], [32, -98], [40, -64], [62, -34], [80, 2], [82, 42], [66, 78], [34, 98], [0, 103], [-36, 98], [-66, 78], [-82, 42], [-78, 2], [-58, -32], [-38, -62], [-27, -96], [-14, -120]]),
      k: 0.84, c: [0, 18], bottom: 101, top: -126,
      col: { base: '#cbc153', shade: '#99993d', light: '#e6dc8a', dark: '#4f4a1e' },
      tex: function (c) { // lenticels + russet around the top
        var s = '', tk = c.tex, sp = '';
        for (var i = 0; i < 140; i++) { var x = c.minx + tk.r() * (c.maxx - c.minx), y = c.miny + tk.r() * (c.maxy - c.miny); if (c.inside(x, y) && c.q(x, y) < 0.92) sp += 'M' + f1(x) + ' ' + f1(y) + 'l1.3 0.4'; }
        s += '<path d="' + sp + '" stroke="#7a5a2a" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>';
        var ru = '';
        for (i = 0; i < 260; i++) { var a = tk.r() * Math.PI * 2, rr = Math.pow(tk.r(), 0.7) * 30; var x2 = 4 + Math.cos(a) * rr * 1.1, y2 = -118 + Math.sin(a) * rr * 0.9 + 6; if (c.inside(x2, y2)) ru += dot(x2, y2); }
        s += dots(ru, '#8a6a34', 1.7, 0.75);
        // soft blush on the lit cheek
        s += '<ellipse cx="' + (-30 * c.D) + '" cy="44" rx="26" ry="20" fill="#d98a4a" opacity="0.22"/>';
        return s;
      },
      front: function (c) { // stem + leaf "hair clip"
        var s = '', ink = c.ink;
        s += tube(ink, catmull([[4, -118], [5, -132], [12, -146], [20, -152]], 5, false), function (u) { return lerp(3.6, 2.4, u); }, c.SH, { ink: 1.4, extra: 1.2, fill: '#6b4a2a', hatch: false });
        var leaf = catmull([[8, -134], [20, -146], [40, -150], [58, -140], [42, -128], [22, -126]], 5, true);
        s += shape(ink, leaf, '#6f9a45', c.SH, { w: 1.5, extra: 1.8 });
        s += stroke(ink, catmull([[10, -133], [30, -139], [54, -140]], 4, false), { w: 1.1, ta: 0.2, tb: 0.6 });
        s += stroke(ink, [[26, -137], [32, -146]], { w: 0.8 }) + stroke(ink, [[38, -139], [44, -146]], { w: 0.8 }) + stroke(ink, [[30, -137], [34, -131]], { w: 0.8 });
        return s;
      }
    },
    face: { c: [2, 34], s: 1.36, eyeX: 26, lash: 1, browW: 5.6, browLen: 24, nose: 'pointy', mouthW: 0.92, lip: '#a8483a', halo: '#e6dc8a' },
    outfit: {
      sleeve: { type: 'long', col: '#8eabc0', r0: 8, r1: 6.4, len: 0.84 },
      legs: { type: 'bare' }, shoes: { col: '#1d1a17', heel: 1, k: 0.95 },
      lower: function (c) { // pencil skirt to the knee
        var p = skirtPoly(c, c.hip[1] - 10, c.knee[1] + 4, 16 * c.k, 18.5 * c.k, c.sit);
        var s = shape(c.ink, p, '#33363b', c.SH, { w: 1.6, extra: 2.4 });
        if (!c.sit) s += stroke(c.ink, [[c.hip[0] + 9 * c.side, c.knee[1] - 12], [c.hip[0] + 10 * c.side, c.knee[1] + 4]], { w: 1.1, ta: 0.2, tb: 0.1 });
        return s;
      },
      top: function (c) {
        var g = garment(c, { neck: 7.5, chest: 15.5, waist: 12.5, hem: 15.5, hemY: -4 }, '#8eabc0');
        var s = g.svg;
        // soft folds
        s += stroke(c.ink, [[g.cW - 8, g.yW + 6], [g.cW - 2, g.yW + 10], [g.cW + 3, g.yW + 9]], { w: 1, ta: 0.3, tb: 0.4 }, '#c9d8e2');
        s += stroke(c.ink, [[g.cC, g.n0[1] + 12], [cxAt(c.tp, g.yH), g.yH - 2]], { w: 0.9, ta: 0.2, tb: 0.2 });
        s += buttons(c, g.cC + 2.5, [g.n0[1] + 22, g.n0[1] + 38, g.n0[1] + 54], 1.4, '#e9eef1');
        s += g.outline + collarWings(c, g.n0, '#a9c1d1', 9.5, 13);
        // lanyard + badge
        var b = [g.cC + 3, g.n0[1] + 46], ink = c.ink;
        s += stroke(ink, catmull([[g.n0[0] - 6, g.n0[1] + 2], [g.n0[0] - 5, g.n0[1] + 22], [b[0] - 2, b[1] - 6]], 4, false), { w: 2.2, ta: 0.05, tb: 0.05, min: 0.8, jit: 0.05 }, '#c0392b');
        s += stroke(ink, catmull([[g.n0[0] + 6, g.n0[1] + 2], [g.n0[0] + 7, g.n0[1] + 22], [b[0] + 2, b[1] - 6]], 4, false), { w: 2.2, ta: 0.05, tb: 0.05, min: 0.8, jit: 0.05 }, '#c0392b');
        s += shape(ink, [[b[0] - 8, b[1] - 5], [b[0] + 8, b[1] - 5], [b[0] + 8, b[1] + 15], [b[0] - 8, b[1] + 15]], '#f3eedf', c.SH, { w: 1.2, extra: 1.2 });
        s += '<path d="M' + f1(b[0] - 5) + ' ' + f1(b[1] - 1) + 'h6v7h-6z" fill="#7d8a99"/><path d="M' + f1(b[0] - 5) + ' ' + f1(b[1] + 10) + 'h10M' + f1(b[0] + 2.5) + ' ' + f1(b[1] + 1) + 'h3M' + f1(b[0] + 2.5) + ' ' + f1(b[1] + 4.5) + 'h3" stroke="' + INK + '" stroke-width="1"/>';
        s += '<path d="M' + f1(b[0] - 8) + ' ' + f1(b[1] - 5) + 'h16v3h-16z" fill="#c0392b"/>';
        return s;
      }
    }
  };

  // —— schwiegermutter: red apple, mustard cardigan, pearls, gingham apron over a blue dress ——
  CH.schwiegermutter = {
    name: 'Schwiegermutter', who: 'mother-in-law', fruit: 'red apple',
    S: 0.97, legK: 0.96, torsoK: 1, wK: 1.12, armK: 1, neck: 6, limbK: 1, handK: 1,
    col: { limb: '#b5473a', skin: '#b8352b', outfit: '#c8922f', accent: '#f3eedf' },
    defaults: { expr: 'skeptical', pose: 'idle', prop: 'bowl' },
    head: {
      sil: closed([[0, -74], [20, -90], [50, -90], [76, -68], [90, -30], [89, 12], [77, 50], [52, 80], [24, 92], [0, 88], [-24, 92], [-52, 80], [-77, 50], [-89, 12], [-90, -30], [-76, -68], [-50, -90], [-20, -90]]),
      k: 0.86, c: [0, 0], bottom: 90, top: -92,
      col: { base: '#bd3a2c', shade: '#8a2620', light: '#e47b52', dark: '#3a0f0c' },
      tex: function (c) { // streaks along the meridians
        var s = '', tk = c.tex, lt = '', dk = '';
        for (var k = 0; k < 26; k++) {
          var th = (tk.r() * 2 - 1) * 1.45, y0 = -80 + tk.r() * 40, y1 = y0 + 40 + tk.r() * 90, pts = [];
          for (var y = y0; y <= y1; y += 6) { var hw = 90 * Math.sqrt(Math.max(0, 1 - Math.pow(y / 92, 2))); pts.push([hw * Math.sin(th) * (1 - 0.12 * Math.cos(y / 30)), y]); }
          if (pts.length < 3) continue;
          var d = tk.brush(pts, { w: 1.6 + tk.r() * 2.2, ta: 0.4, tb: 0.5, min: 0.1, jit: 0.4 });
          if (k % 3 === 0) dk += d; else lt += d;
        }
        s += '<path d="' + lt + '" fill="#e2744a" opacity="0.55"/><path d="' + dk + '" fill="#7a1f1a" opacity="0.5"/>';
        // russet/yellow freckles near the top dip
        var fr = '';
        for (var i = 0; i < 70; i++) { var a = tk.r() * Math.PI * 2, rr = 8 + tk.r() * 26; fr += dot(Math.cos(a) * rr * 1.3, -72 + Math.sin(a) * rr * 0.45); }
        s += dots(fr, '#e8b45a', 1.6, 0.8);
        return s;
      },
      gloss: function (c) {
        var D = c.D, g = catmull([[-58 * D, -46], [-46 * D, -66], [-26 * D, -76]], 4, false);
        return stroke(c.ink, g, { w: 6, ta: 0.4, tb: 0.4, min: 0.2 }, '#f6d8c4') + '<ellipse cx="' + (-62 * D) + '" cy="-26" rx="4" ry="7" fill="#f6d8c4" opacity="0.8"/>';
      },
      front: function (c) {
        var s = '', ink = c.ink;
        s += '<path d="' + polyD(catmull([[-14, -80], [0, -70], [14, -80]], 4, false), false) + '" stroke="' + INK + '" stroke-width="1.6" fill="none"/>';
        s += tube(ink, catmull([[0, -74], [-2, -92], [4, -110]], 5, false), function (u) { return lerp(3.6, 2.6, u); }, c.SH, { ink: 1.4, extra: 1.2, fill: '#5e3f22', hatch: false });
        var leaf = catmull([[2, -100], [14, -116], [34, -122], [44, -114], [30, -100], [14, -96]], 5, true);
        s += shape(ink, leaf, '#5f8c3c', c.SH, { w: 1.4, extra: 1.6 }) + stroke(ink, catmull([[4, -100], [22, -110], [40, -114]], 4, false), { w: 1, ta: 0.2, tb: 0.6 });
        return s;
      }
    },
    face: { c: [2, 16], s: 1.42, eyeX: 26, lash: 1, lid: -0.6, browW: 4.6, browLen: 25, browGap: 2, nose: 'hook', mouthW: 0.9, lip: '#7a1712', halo: '#e47b52', lines: 1, crease: 1 },
    outfit: {
      sleeve: { type: 'long', col: '#c8922f', r0: 8.6, r1: 7.4, len: 0.86, cuff: '#b07d22' },
      legs: { type: 'bare' }, shoes: { col: '#5a3a24', heel: 1, k: 1 },
      lower: function (c) { // dress to mid-calf
        var p = skirtPoly(c, c.hip[1] - 12, lerp(c.knee[1], c.ank[1], 0.42), 17 * c.k, 25 * c.k, c.sit);
        return shape(c.ink, p, '#5f7895', c.SH, { w: 1.6, extra: 2.4 }) + (c.sit ? '' : stroke(c.ink, [[c.hip[0] - 10 * c.k, c.knee[1] - 10], [c.hip[0] - 13 * c.k, lerp(c.knee[1], c.ank[1], 0.4)]], { w: 0.9, ta: 0.3, tb: 0.3 }));
      },
      top: function (c) {
        var ink = c.ink;
        var g = garment(c, { neck: 8, chest: 16.5, waist: 16, hem: 17.5, hemY: 14, shoulder: 1 }, '#c8922f');
        var s = g.svg;
        // knit rib at the hem
        var rib = '';
        for (var x = g.cH - g.wh + 2; x < g.cH + g.wh - 1; x += 2.6) rib += 'M' + f1(x) + ' ' + f1(g.yH - 6) + 'v6';
        s += '<path d="' + rib + '" stroke="' + INK + '" stroke-width="0.7" opacity="0.6"/>';
        s += g.outline;
        // dress neckline
        s += vNeck(c, g.n0, g.n0[1] + 14, 6, '#5f7895');
        // apron (bib + skirt) with gingham, clipped
        var top = g.n0[1] + 26, waistY = c.hip[1] - 6, hemY = c.sit ? c.knee[1] - 2 : c.knee[1] + 2, cx0 = cxAt(c.tp, top), cx1 = c.hip[0];
        var ap = catmull([[cx0 - 7.5 * c.k, top], [cx0 + 7.5 * c.k, top], [cx1 + 9 * c.k, waistY - 8], [cx1 + 15 * c.k, waistY], [cx1 + 17 * c.k, hemY - 3], [cx1, hemY + 1], [cx1 - 17 * c.k, hemY - 3], [cx1 - 15 * c.k, waistY], [cx1 - 9 * c.k, waistY - 8]], 4, true);
        var cl = clipDef(c, 'apron', ap);
        s += '<path d="' + polyD(ap, true) + '" fill="#f1ead8"/>';
        s += '<g clip-path="' + cl + '">' + gridPattern(cx1 - 30, top - 4, cx1 + 30, hemY + 4, 8, '#b5332b', 3.6, 0.5) + '</g>';
        s += ringEl(ink, ap, c.SH, { w: 1.4, extra: 2 });
        // waist tie + pocket
        s += stroke(ink, [[cx1 - 17 * c.k, waistY], [cx1 + 17 * c.k, waistY]], { w: 3, ta: 0.05, tb: 0.05, min: 0.8 }, '#c0392b');
        s += shape(ink, [[cx1 - 8, waistY + 14], [cx1 + 8, waistY + 14], [cx1 + 7, waistY + 26], [cx1 - 7, waistY + 26]], '#f1ead8', c.SH, { w: 1, extra: 0.8 });
        // pearls
        var pr = '';
        for (var i = 0; i <= 10; i++) { var u = i / 10, a = Math.PI * (0.08 + 0.84 * u); var px = g.n0[0] - Math.cos(a) * 11 * c.k, py = g.n0[1] + 6 + Math.sin(a) * 14; pr += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="2.4" fill="#f6f1e4" stroke="' + INK + '" stroke-width="0.9"/>'; }
        s += pr;
        return s;
      }
    }
  };


  // —— kellner: banana head, tall and slightly bent; white shirt, black vest, bow tie, long bistro apron ——
  CH.kellner = {
    name: 'Kellner', who: 'waiter', fruit: 'banana',
    S: 1, legK: 1.14, torsoK: 1.08, wK: 0.95, armK: 1.06, neck: 7, limbK: 0.95, handK: 1, bend: [8, 3], headTilt: 4,
    col: { limb: '#d6b13c', skin: '#e3bf42', outfit: '#24211e', accent: '#f0eadb' },
    defaults: { expr: 'tired', pose: 'idle', prop: 'notepad' },
    head: {
      sil: closed([[12, -150], [26, -142], [40, -112], [48, -66], [50, -16], [48, 34], [40, 74], [22, 98], [0, 104], [-22, 98], [-38, 76], [-45, 36], [-44, -14], [-38, -62], [-26, -104], [-8, -136]]),
      c: [2, 4], bottom: 102, top: -176,
      col: { base: '#e5c343', shade: '#b48e2a', light: '#f7e08a', dark: '#4e3a0c' },
      tex: function (c) {
        var s = '', tk = c.tex;
        // facet ridges following the bend
        [[-14, 0.6], [20, 0.45]].forEach(function (r) {
          var pts = []; for (var y = -128; y <= 92; y += 8) { var u = (y + 128) / 220; pts.push([r[0] * Math.sin(u * Math.PI) + 10 * (1 - u) * (1 - u), y]); }
          s += stroke(c.ink, pts, { w: 1.3, ta: 0.3, tb: 0.3, min: 0.2, jit: 0.3 }, '#7a5a14');
          s += '<path d="' + polyD(pts.map(function (p) { return [p[0] - 2.2, p[1]]; }), false) + '" stroke="#f7e08a" stroke-width="1.4" fill="none" opacity="' + r[1] + '"/>';
        });
        // sugar spots
        var sp = '';
        for (var i = 0; i < 22; i++) { var x = (tk.r() * 2 - 1) * 40, y = -120 + tk.r() * 200; if (!c.inside(x, y)) continue; var rr = 1 + tk.r() * 2.2; sp += '<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + f1(rr) + '" ry="' + f1(rr * 0.7) + '" fill="#5e3e12" opacity="0.7"/>'; }
        s += sp;
        // green tinge near the stem
        s += '<ellipse cx="14" cy="-128" rx="22" ry="22" fill="#9aa83a" opacity="0.35"/>';
        return s;
      },
      front: function (c) {
        var ink = c.ink, st = [[10, -146], [14, -158], [20, -170], [24, -174]];
        var s = tube(ink, catmull(st, 4, false), function (u) { return lerp(6.5, 5, u); }, c.SH, { ink: 1.5, extra: 1.4, fill: '#6b5a2a', hatch: false });
        s += shape(ink, ellipse(24.5, -175, 5.2, 3.2, 14, -40), '#2a1f12', c.SH, { w: 1, extra: 0.8 });
        return s;
      }
    },
    face: { c: [2, 16], s: 1.16, eyeX: 21, eyeW: 22, lid: -1.4, browW: 5, browLen: 22, nose: 'long', mouthW: 0.82, chin: 1, halo: '#f7e08a', moustache: { w: 3.6 }, bag: 1, mouthY: 33 },
    outfit: {
      sleeve: { type: 'long', col: '#efe8d6', r0: 7.8, r1: 6.6, len: 0.82, cuff: '#e2d9c2' },
      legs: { type: 'pants', col: '#24211e', r0: 8, r1: 6.8 }, shoes: { col: '#1a1715', laces: false },
      lower: function (c) { // long bistro apron
        var hy = c.hip[1] - 6, bot = c.sit ? c.knee[1] + 8 : lerp(c.knee[1], c.ank[1], 0.62);
        var ap = catmull([[c.hip[0] - 19 * c.k, hy], [c.hip[0] + 19 * c.k, hy], [c.hip[0] + 22 * c.k, bot - 2], [c.hip[0], bot + 1.5], [c.hip[0] - 22 * c.k, bot - 2]], 4, true);
        var s = shape(c.ink, ap, '#f1ebdc', c.SH, { w: 1.5, extra: 2.2 });
        s += stroke(c.ink, [[c.hip[0] + 6 * c.side, hy + 12], [c.hip[0] + 8 * c.side, bot - 6]], { w: 0.9, ta: 0.3, tb: 0.3 }, '#b9ae94');
        s += stroke(c.ink, [[c.hip[0] - 10 * c.side, hy + 30], [c.hip[0] - 11 * c.side, bot - 10]], { w: 0.8, ta: 0.3, tb: 0.3 }, '#b9ae94');
        s += stroke(c.ink, [[c.hip[0] - 20 * c.k, hy + 1], [c.hip[0] + 20 * c.k, hy + 1]], { w: 2.2, ta: 0.05, tb: 0.05, min: 0.8 }, '#d8cfb8');
        return s;
      },
      top: function (c) {
        var shirt = garment(c, { neck: 7, chest: 14.5, waist: 13, hem: 15, hemY: -2 }, '#efe8d6');
        var vest = garment(c, { neck: 9, chest: 15.5, waist: 13.5, hem: 15.5, hemY: 4, neckDip: 4 }, '#24211e');
        var n0 = vest.n0, s = shirt.svg + shirt.outline + vest.svg;
        s += vNeck(c, n0, n0[1] + 42, 7.5, '#efe8d6');
        s += vest.outline;
        s += buttons(c, cxAt(c.tp, n0[1] + 50), [n0[1] + 50, n0[1] + 62, n0[1] + 74], 1.5, '#9a8f78');
        s += stroke(c.ink, [[cxAt(c.tp, vest.yW) + 4, vest.yW - 4], [cxAt(c.tp, vest.yW) + 11, vest.yW - 5]], { w: 1.2, ta: 0.1, tb: 0.1 }, '#9a8f78');
        s += bowtie(c, [n0[0], n0[1] + 6], '#1a1715', 0.9);
        return s;
      }
    }
  };

  // —— kumpel: kiwi with the top cut off (green flesh, black seeds), rust hoodie, jeans, sneakers ——
  (function () {
    var rx = 78, ry = 94, cutK = 0.46, yc = -cutK * ry, rxT = rx * Math.sqrt(1 - cutK * cutK), kk = 0.3, ryT = rxT * kk;
    var a0 = Math.PI + Math.asin(cutK), a1 = -Math.asin(cutK), sph = [], top = [];
    for (var i = 0; i <= 56; i++) { var a = lerp(a0, a1, i / 56); sph.push([rx * Math.cos(a) * (1 - 0.06 * Math.max(0, Math.sin(a))), ry * Math.sin(a)]); }
    for (i = 1; i < 32; i++) { var b = lerp(0, -Math.PI, i / 32); top.push([rxT * Math.cos(b), yc + ryT * Math.sin(b)]); }
    function ell(r, dy) { var p = []; for (var i = 0; i < 64; i++) { var a = i / 64 * Math.PI * 2; p.push([r * Math.cos(a), yc + (dy || 0) + r * kk * Math.sin(a)]); } return p; }
    CH.kumpel = {
      name: 'Kumpel', who: 'buddy', fruit: 'kiwi (cut top)',
      S: 1, legK: 1, torsoK: 1, wK: 1.14, armK: 1, neck: 6, limbK: 1.05, handK: 1.05,
      col: { limb: '#8a6a44', skin: '#8a6a44', outfit: '#b85c38', accent: '#7aa83a' },
      defaults: { expr: 'happy', pose: 'idle', prop: 'beer' },
      head: {
        sil: sph.concat(top), c: [0, 6], bottom: 92, top: yc - ryT - 4,
        col: { base: '#8f6e48', shade: '#5f4528', light: '#bf9d72', dark: '#2a1c0c' },
        tex: function (c) { // fuzz texture: short hair dashes
          var tk = c.tex, lt = '', dk = '';
          for (var i = 0; i < 420; i++) {
            var x = (tk.r() * 2 - 1) * rx, y = yc + tk.r() * (ry - yc);
            if (!c.inside(x, y) || y < yc + ryT * 0.6) continue;
            var a = Math.atan2(y - 10, x) + (tk.r() - 0.5) * 0.8, l = 2 + tk.r() * 2.5, p = [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]];
            var d = tk.brush(p, { w: 0.9, ta: 0.2, tb: 0.6, min: 0.2 });
            if (c.lum(x, y) > 0.3) lt += d; else dk += d;
          }
          return '<path d="' + lt + '" fill="#c9a77a" opacity="0.7"/><path d="' + dk + '" fill="#2a1c0c" opacity="0.55"/>';
        },
        front: function (c) {
          var ink = c.ink, tk = c.tex, s = '', i;
          // fuzz along the outline
          var fz = '';
          for (i = 2; i < sph.length - 2; i += 1) {
            var p = sph[i], nrm = [p[0] / rx, p[1] / ry], nl = Math.hypot(nrm[0], nrm[1]) || 1; nrm = [nrm[0] / nl, nrm[1] / nl];
            for (var j = 0; j < 2; j++) {
              var t0 = (tk.r() - 0.5) * 3, base = add(add(p, nrm, -1.5), [-nrm[1], nrm[0]], t0), tipp = add(add(base, nrm, 3 + tk.r() * 3.5), [-nrm[1], nrm[0]], (tk.r() - 0.5) * 3);
              fz += ink.brush([base, tipp], { w: 1.1, ta: 0.1, tb: 0.8, min: 0.15 });
            }
          }
          s += '<path d="' + fz + '" fill="' + INK + '"/>';
          // the cut: skin rim, green flesh, rays, cream core, ring of seeds
          s += '<path d="' + polyD(ell(rxT), true) + '" fill="#4e3a22"/>';
          s += '<path d="' + polyD(ell(rxT - 3), true) + '" fill="#7cae3a"/>';
          s += '<path d="' + polyD(ell(rxT - 9, -0.6), true) + '" fill="#93c24a" opacity="0.8"/>';
          var rays = '';
          for (i = 0; i < 40; i++) { var a = i / 40 * Math.PI * 2 + tk.r() * 0.05, r0 = rxT * 0.24, r1 = rxT * (0.7 + tk.r() * 0.18); rays += tk.brush([[r0 * Math.cos(a), yc + r0 * kk * Math.sin(a)], [r1 * Math.cos(a), yc + r1 * kk * Math.sin(a)]], { w: 1.1, ta: 0.3, tb: 0.6, min: 0.1 }); }
          s += '<path d="' + rays + '" fill="#e2eeb0" opacity="0.6"/>';
          s += '<path d="' + polyD(ell(rxT * 0.24, -0.3), true) + '" fill="#ebe7bd"/>';
          var sd = '';
          for (i = 0; i < 26; i++) {
            var sa = i / 26 * Math.PI * 2 + (tk.r() - 0.5) * 0.15, sr = rxT * (0.36 + tk.r() * 0.1), cx = sr * Math.cos(sa), cy = yc + sr * kk * Math.sin(sa);
            var ca = Math.cos(sa), sn = Math.sin(sa), pts = [];
            for (var q = 0; q < 10; q++) { var t = q / 10 * Math.PI * 2, u = Math.cos(t) * 3.4, v = Math.sin(t) * 1.6 * (0.6 + 0.4 * (1 + Math.cos(t)) / 2); pts.push([cx + u * ca - v * sn, cy + (u * sn + v * ca) * kk * 1.4]); }
            sd += polyD(pts, true);
          }
          s += '<path d="' + sd + '" fill="' + INK + '"/>';
          var dk = '';
          for (i = 0; i < 200; i++) { var fx = (tk.r() * 2 - 1) * rxT, fy = yc + (tk.r() * 2 - 1) * rxT * kk; if ((fx * fx) / (rxT * rxT) + ((fy - yc) * (fy - yc)) / (rxT * rxT * kk * kk) > 0.85) continue; if (tk.r() < clamp((fx * c.D / rxT) * 0.6 + ((fy - yc) / (rxT * kk)) * 0.5, 0, 1) * 0.7) dk += dot(fx, fy); }
          s += dots(dk, '#4f7a24', 1.5, 0.8);
          s += ringEl(ink, ell(rxT), [0.35 * c.D, 0.94], { w: 1.6, extra: 2.6 });
          s += stroke(ink, ell(rxT - 3).slice(2, 30), { w: 1.2, ta: 0.2, tb: 0.2, min: 0.2 });
          return s;
        }
      },
      face: { c: [2, 30], s: 1.42, eyeX: 26, browW: 8.6, browLen: 27, nose: 'bulb', noseCol: 'rgba(40,20,5,.25)', mouthW: 1.05, chin: 1, stubble: 1, stubbleCol: 'rgba(23,19,15,.5)', halo: '#bf9d72', lid: 0.3 },
      outfit: {
        sleeve: { type: 'long', col: '#b85c38', r0: 9.6, r1: 8, len: 0.86, cuff: '#9e4a2c' },
        legs: { type: 'pants', col: '#4d6178', r0: 9, r1: 8, crease: '#7f93a8' }, shoes: { col: '#efe8d8', sole: '#d8d0bf', lace: '#8a8070', stripe: '#c0392b' },
        lower: function (c) { // jeans seat block
          var y0 = c.hip[1] - 12, pts = catmull([[c.hip[0] - 18 * c.k, y0], [c.hip[0] + 18 * c.k, y0], [c.hip[0] + 15 * c.k, y0 + 22], [c.hip[0], y0 + 26], [c.hip[0] - 15 * c.k, y0 + 22]], 4, true);
          return shape(c.ink, pts, '#4d6178', c.SH, { w: 1.4, extra: 2 }) + stroke(c.ink, [[c.hip[0], y0 + 6], [c.hip[0] + 1, y0 + 24]], { w: 0.9, ta: 0.2, tb: 0.2 }, '#c9a24a');
        },
        top: function (c) {
          var ink = c.ink, n0 = c.tp[0];
          // hood (behind the head)
          var hood = catmull([[n0[0] - 26 * c.k, n0[1] + 6], [n0[0] - 30 * c.k, n0[1] - 10], [n0[0] - 14, n0[1] - 22], [n0[0] + 14, n0[1] - 22], [n0[0] + 30 * c.k, n0[1] - 10], [n0[0] + 26 * c.k, n0[1] + 6]], 5, true);
          c.behindHead = shape(ink, hood, '#9e4a2c', c.SH, { w: 1.5, extra: 2 });
          var g = garment(c, { neck: 10, chest: 17.5, waist: 17, hem: 18, hemY: 10, shoulder: 2, round: 1 }, '#b85c38');
          var s = g.svg;
          // kangaroo pocket
          var py = g.yW + 4, pc = g.cW;
          s += shape(ink, catmull([[pc - 13, py], [pc + 13, py], [pc + 16, py + 18], [pc - 16, py + 18]], 2, true), '#ad5434', c.SH, { w: 1.1, extra: 1 });
          // rib hem
          s += stroke(ink, [[g.cH - g.wh + 1, g.yH - 7], [g.cH + g.wh - 1, g.yH - 7]], { w: 1, ta: 0.1, tb: 0.1 });
          s += g.outline;
          // hood rim around the neck + drawstrings
          s += stroke(ink, catmull([[n0[0] - 12, n0[1] - 1], [n0[0], n0[1] + 8], [n0[0] + 12, n0[1] - 1]], 4, false), { w: 3.2, ta: 0.1, tb: 0.1, min: 0.6 }, '#7e3a22');
          s += stroke(ink, [[n0[0] - 5, n0[1] + 6], [n0[0] - 6, n0[1] + 30]], { w: 1.6, ta: 0.05, tb: 0.3 }, '#efe8d8') + stroke(ink, [[n0[0] + 5, n0[1] + 6], [n0[0] + 7, n0[1] + 26]], { w: 1.6, ta: 0.05, tb: 0.3 }, '#efe8d8');
          return s;
        }
      }
    };
  })();

  // —— mitbewohnerin: strawberry, oversized mustard tee, slouch socks, slippers ——
  CH.mitbewohnerin = {
    name: 'Mitbewohnerin', who: 'flatmate', fruit: 'strawberry',
    S: 0.97, legK: 0.98, torsoK: 1, wK: 0.95, armK: 1, neck: 7, limbK: 0.95, handK: 0.97,
    col: { limb: '#c4473c', skin: '#c7342e', outfit: '#e0a93b', accent: '#5f8c3c' },
    defaults: { expr: 'tired', pose: 'idle', prop: 'phone' },
    head: {
      k: 0.92,
      sil: closed([[0, -86], [30, -94], [62, -86], [82, -60], [88, -20], [80, 20], [62, 58], [38, 86], [14, 101], [0, 104], [-14, 101], [-38, 86], [-62, 58], [-80, 20], [-88, -20], [-82, -60], [-62, -86], [-30, -94]]),
      c: [0, -6], bottom: 102, top: -122,
      col: { base: '#cc3a31', shade: '#8f2320', light: '#ee7a66', dark: '#3a0c0a' },
      hatch: 0.85,
      tex: function (c) { // achenes in dimples, staggered rows, foreshortened toward the rim
        var s = '', pits = '', seeds = '';
        for (var row = 0; row < 14; row++) {
          var y = -80 + row * 13.5;
          for (var col = -8; col <= 8; col++) {
            var x = col * 13 + (row % 2) * 6.5;
            if (!c.inside(x, y)) continue;
            var qq = c.q(x, y); if (qq > 0.93) continue;
            var f = Math.sqrt(1 - qq * qq), ax = 2.2 * (0.45 + 0.55 * f), ay = 3.2;
            pits += polyD(ellipse(x + 0.6, y + 1.2, ax + 1.1, ay + 1, 10), true);
            seeds += polyD([[x, y - ay], [x + ax, y + 0.4], [x, y + ay * 0.9], [x - ax, y + 0.4]], true);
          }
        }
        s += '<path d="' + pits + '" fill="#7a1b18" opacity="0.6"/><path d="' + seeds + '" fill="#efd27a"/>';
        return s;
      },
      gloss: function (c) { return stroke(c.ink, catmull([[-62 * c.D, -30], [-52 * c.D, -56], [-34 * c.D, -72]], 4, false), { w: 4.5, ta: 0.4, tb: 0.4, min: 0.2 }, '#f7c9bb'); },
      front: function (c) { // calyx = messy bangs, stem with a hair tie
        var ink = c.ink, s = '', sep = [[-78, -66, -150], [-52, -90, -125], [-20, -100, -100], [14, -102, -80], [46, -94, -58], [74, -70, -35], [-4, -86, 92], [34, -82, 70], [-40, -80, 112]];
        var stem = catmull([[2, -92], [4, -112], [10, -126]], 4, false);
        s += tube(ink, stem, function (u) { return lerp(4.6, 3.6, u); }, c.SH, { ink: 1.4, extra: 1.2, fill: '#5f8c3c', hatch: false });
        sep.forEach(function (q, i) {
          var base = [q[0] * 0.28, -88 + Math.abs(q[0]) * 0.05], tip = [q[0], q[1] + (i > 5 ? 26 : 0)], mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 - 6], nn = [-(tip[1] - base[1]), tip[0] - base[0]], nl = Math.hypot(nn[0], nn[1]) || 1;
          nn = [nn[0] / nl * 7, nn[1] / nl * 7];
          var leaf = catmull([base, add(mid, nn), tip, add(mid, nn, -1)], 4, true);
          s += shape(ink, leaf, i % 2 ? '#4f7a32' : '#6c9a42', c.SH, { w: 1.3, extra: 1.5 });
          s += stroke(ink, [base, mid, tip], { w: 0.8, ta: 0.2, tb: 0.6 });
        });
        s += shape(ink, ellipse(6, -112, 7.5, 3.6, 16), '#e0a93b', c.SH, { w: 1.1, extra: 1 }); // hair tie on the stem
        return s;
      }
    },
    face: { c: [2, 8], s: 1.36, eyeX: 26, eyeW: 25, lash: 1, browW: 5.2, browLen: 24, nose: 'button', mouthW: 0.95, bag: 1, halo: '#ee7a66' },
    outfit: {
      sleeve: { type: 'short', col: '#e0a93b', r0: 9.5, r1: 10.5, len: 0.48, light: 'rgba(255,255,255,.4)' },
      legs: { type: 'bare', socks: '#9a9890', sockLen: 0.72 }, shoes: { slipper: 1, col: '#c9b8d6', sole: '#8a7a96' },
      top: function (c) {
        var g = garment(c, { neck: 9, chest: 19, waist: 19, hem: 21, hemY: 30, shoulder: 3, round: 3 }, '#e0a93b');
        var s = g.svg, ink = c.ink, p = [g.cC + 1, g.yC + 18];
        // print: a tiny pizza slice doodle
        s += shape(ink, [[p[0] - 8, p[1] - 6], [p[0] + 8, p[1] - 6], [p[0], p[1] + 10]], '#f3dc8e', c.SH, { w: 1.1, extra: 0.8 });
        s += stroke(ink, [[p[0] - 8.5, p[1] - 6.5], [p[0] + 8.5, p[1] - 6.5]], { w: 2.4, ta: 0.1, tb: 0.1 }, '#b07d22');
        s += '<circle cx="' + f1(p[0] - 2) + '" cy="' + f1(p[1] - 1) + '" r="1.7" fill="#c0392b"/><circle cx="' + f1(p[0] + 2.5) + '" cy="' + f1(p[1] + 3) + '" r="1.5" fill="#c0392b"/>';
        // big folds
        s += stroke(ink, [[g.cW - 12, g.yW + 8], [g.cW - 6, g.yH - 4]], { w: 1, ta: 0.3, tb: 0.4 }) + stroke(ink, [[g.cW + 10 * c.side, g.yW + 2], [g.cW + 14 * c.side, g.yH - 8]], { w: 1, ta: 0.3, tb: 0.4 });
        s += g.outline + stroke(ink, catmull([[g.n0[0] - 9, g.n0[1] + 1.5], [g.n0[0], g.n0[1] + 7], [g.n0[0] + 9, g.n0[1] + 1.5]], 4, false), { w: 2, ta: 0.2, tb: 0.2 });
        return s;
      }
    }
  };

  // —— kind: cherry, child (≈ 60 % height), backwards-ish cap with the stem poking out, striped tee, shorts ——
  CH.kind = {
    name: 'Kind', who: 'small child', fruit: 'cherry',
    S: 0.6, legK: 0.95, torsoK: 0.92, wK: 1.1, armK: 1, neck: 6, limbK: 0.85, handK: 0.78,
    col: { limb: '#a83440', skin: '#9e1f2c', outfit: '#2f5d8a', accent: '#efe6cc' },
    defaults: { expr: 'happy', pose: 'idle', prop: 'glass' },
    head: {
      sil: closed([[0, -56], [18, -70], [44, -68], [64, -48], [72, -12], [66, 26], [46, 56], [20, 69], [0, 70], [-20, 69], [-46, 56], [-66, 26], [-72, -12], [-64, -48], [-44, -68], [-18, -70]]),
      c: [0, 0], bottom: 69, top: -130,
      col: { base: '#a3202e', shade: '#6a1420', light: '#d4525c', dark: '#24040a' },
      gloss: function (c) {
        var D = c.D;
        return '<path d="' + polyD(catmull([[-50 * D, -30], [-42 * D, -50], [-24 * D, -58], [-30 * D, -44], [-44 * D, -28]], 4, true), true) + '" fill="#f4c2c6" opacity="0.85"/>' +
          '<ellipse cx="' + (-54 * D) + '" cy="-12" rx="3" ry="5" fill="#f4c2c6" opacity="0.7"/>';
      },
      front: function (c) { // cap with bill + stem poking out of the button
        var ink = c.ink, D = 1, s = '';
        var stem = catmull([[4, -62], [8, -90], [20, -112], [34, -124]], 5, false);
        s += tube(ink, stem, function (u) { return lerp(3, 2.2, u); }, c.SH, { ink: 1.3, extra: 1, fill: '#5f7a32', hatch: false });
        s += shape(ink, catmull([[30, -122], [44, -134], [62, -132], [54, -120], [40, -116]], 4, true), '#6f9a45', c.SH, { w: 1.3, extra: 1.4 });
        var crown = catmull([[-64, -36], [-62, -60], [-40, -80], [0, -88], [40, -80], [62, -60], [64, -36], [30, -44], [-30, -44]], 5, true);
        var bill = catmull([[30, -42], [66, -44], [100, -36], [98, -28], [62, -30], [28, -34]], 4, true);
        s += shape(ink, bill, '#24476b', c.SH, { w: 1.5, extra: 2 });
        s += shape(ink, crown, '#2f5d8a', c.SH, { w: 1.6, extra: 2.4 });
        s += stroke(ink, catmull([[0, -86], [-4, -64], [-2, -44]], 4, false), { w: 1, ta: 0.2, tb: 0.2 }) + stroke(ink, catmull([[-30, -80], [-40, -60], [-44, -42]], 4, false), { w: 1, ta: 0.2, tb: 0.2 });
        s += stroke(ink, catmull([[-62, -46], [0, -52], [62, -46]], 4, false), { w: 4, ta: 0.05, tb: 0.05, min: 0.8 }, '#efe6cc');
        s += shape(ink, ellipse(2, -88, 6, 3, 12), '#c0392b', c.SH, { w: 1, extra: 0.6 });
        var h = ''; for (var x = 14; x < 58; x += 4) h += ink.brush([[x, -78 + (x - 14) * 0.5], [x + 3, -50]], { w: 0.8, ta: 0.1, tb: 0.5 });
        s += '<path d="' + h + '" fill="' + INK + '" opacity="0.7"/>';
        return s;
      }
    },
    face: { c: [2, 14], s: 1.2, eyeX: 25, eyeW: 23, round: 1, pupil: 1.35, glint: 1, browW: 4.4, browLen: 20, browGap: -1, nose: 'button', mouthW: 0.9, gap: 1, blush: 1, blushCol: '#e0606a', halo: '#d4525c', mouthY: 31 },
    outfit: {
      sleeve: { type: 'short', col: '#efe6cc', r0: 7.4, r1: 7.8, len: 0.42 },
      legs: { type: 'shorts', col: '#b39a68', len: 0.5, socks: '#efe6cc', sockLen: 0.82 }, shoes: { col: '#c0392b', sole: '#efe6cc', lace: '#efe6cc', k: 1.25 },
      top: function (c) {
        var g = garment(c, { neck: 7, chest: 15, waist: 15, hem: 16, hemY: 8, shoulder: 1.5 }, '#efe6cc');
        var cl = clipDef(c, 'tee', g.poly), s = g.svg;
        s += '<g clip-path="' + cl + '">' + stripes(g.n0[1] + 6, g.yH + 4, g.cH - 40, g.cH + 40, 9, '#2f5d8a') + '</g>';
        s += flankHatch(c, g, g.n0[1] + 8, g.yH - 3, 5);
        s += g.outline + stroke(c.ink, catmull([[g.n0[0] - 7, g.n0[1] + 1.5], [g.n0[0], g.n0[1] + 5.5], [g.n0[0] + 7, g.n0[1] + 1.5]], 4, false), { w: 2, ta: 0.2, tb: 0.2 });
        return s;
      }
    }
  };

  // —— chefin: pineapple (crown = hairdo), navy blazer with lapels, trousers, heels ——
  (function () {
    var rx = 70, ry = 90, AL = 0.019, STEP = 0.42;
    function hw(y) { return rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry))); }
    var LEAVES = [ // [base x, angle (deg, -90 = up), length, width, colour, front]
      [-14, -150, 70, 13, '#3f6329', 0], [16, -32, 74, 13, '#3f6329', 0], [-6, -120, 92, 15, '#4f7a32', 0], [8, -66, 96, 15, '#4f7a32', 0],
      [0, -96, 120, 17, '#5f8c3c', 0], [-20, -135, 66, 13, '#6c9a42', 1], [22, -52, 70, 13, '#6c9a42', 1], [-4, -104, 84, 14, '#7aa84a', 1], [8, -84, 78, 14, '#6c9a42', 1]
    ];
    function leaf(c, L) {
      var b = [L[0], -ry + 8], a = rad(L[1] + 4 * Math.sin(L[0])), tip = [b[0] + Math.cos(a) * L[2], b[1] + Math.sin(a) * L[2]];
      var bend = L[1] < -96 ? -1 : 1, mid = [(b[0] + tip[0]) / 2 + bend * L[2] * 0.08, (b[1] + tip[1]) / 2 + L[2] * 0.06];
      var nn = [-(tip[1] - b[1]), tip[0] - b[0]], nl = Math.hypot(nn[0], nn[1]); nn = [nn[0] / nl, nn[1] / nl];
      var pts = catmull([add(b, nn, L[3] / 2), add(mid, nn, L[3] * 0.4), tip, add(mid, nn, -L[3] * 0.4), add(b, nn, -L[3] / 2)], 5, true);
      var s = shape(c.ink, pts, L[4], c.SH, { w: 1.3, extra: 1.6 });
      s += stroke(c.ink, catmull([b, mid, tip], 4, false), { w: 0.9, ta: 0.1, tb: 0.7 }, 'rgba(23,19,15,.6)');
      // small serrations
      var sr = ''; for (var u = 0.25; u < 0.9; u += 0.18) { var q = catmull([b, mid, tip], 4, false)[Math.floor(u * 8)]; var e = add(q, nn, L[3] * 0.42 * (1 - u)); sr += c.ink.brush([e, add(e, nn, 2.6)], { w: 0.8, ta: 0.1, tb: 0.6 }); }
      return s + '<path d="' + sr + '" fill="' + INK + '" opacity="0.7"/>';
    }
    CH.chefin = {
      name: 'Chefin', who: 'boss', fruit: 'pineapple',
      S: 1.02, legK: 1.02, torsoK: 1, wK: 1.08, armK: 1, neck: 7, limbK: 0.95, handK: 0.97,
      col: { limb: '#c08a34', skin: '#d49a3a', outfit: '#2e3d5c', accent: '#f1ead8' },
      defaults: { expr: 'skeptical', pose: 'arms-crossed', prop: 'clipboard' },
      head: {
        k: 0.92,
        sil: closed((function () { var p = []; for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2; p.push([rx * Math.cos(a), ry * Math.sin(a) * (Math.sin(a) > 0 ? 1 : 0.96)]); } return p; })(), 3),
        c: [0, 0], bottom: 89, top: -200,
        col: { base: '#d49a3a', shade: '#9a6424', light: '#f0c868', dark: '#2e1c06' },
        hatch: 0.8,
        back: function (c) { var s = ''; LEAVES.forEach(function (L) { if (!L[5]) s += leaf(c, L); }); return s; },
        tex: function (c) { // diamond lattice of fruitlets
          var d1 = '', d2 = '', eyes = '', hl = '';
          for (var k = -9; k <= 9; k++) {
            [1, -1].forEach(function (sg) {
              var pts = [];
              for (var y = -ry; y <= ry; y += 5) { var th = k * STEP + sg * y * AL; if (Math.abs(th) > Math.PI / 2) { if (pts.length > 1) { (sg > 0 ? (d1 += c.ink.brush(pts, { w: 1.3, ta: 0.1, tb: 0.1, min: 0.3 })) : (d2 += c.ink.brush(pts, { w: 1.3, ta: 0.1, tb: 0.1, min: 0.3 }))); } pts = []; continue; } pts.push([hw(y) * Math.sin(th), y]); }
              if (pts.length > 1) { if (sg > 0) d1 += c.ink.brush(pts, { w: 1.3, ta: 0.1, tb: 0.1, min: 0.3 }); else d2 += c.ink.brush(pts, { w: 1.3, ta: 0.1, tb: 0.1, min: 0.3 }); }
            });
          }
          for (var i = -10; i <= 10; i++) for (var j = -10; j <= 10; j++) {
            var y2 = (j - i) * STEP / (2 * AL), th2 = (i + j) * STEP / 2;
            if (Math.abs(y2) > ry * 0.94 || Math.abs(th2) > 1.35) continue;
            var x2 = hw(y2) * Math.sin(th2), yy = y2 + STEP / (2 * AL) * 0.5, xx = hw(yy) * Math.sin(th2);
            if (!c.inside(xx, yy)) continue;
            var f = Math.cos(th2);
            eyes += 'M' + f1(xx - 3 * f) + ' ' + f1(yy + 1.5) + 'L' + f1(xx) + ' ' + f1(yy - 3) + 'L' + f1(xx + 3 * f) + ' ' + f1(yy + 1.5);
            hl += dot(xx - 2 * f, yy - 6);
          }
          return '<path d="' + d1 + d2 + '" fill="#6b4316" opacity="0.75"/><path d="' + eyes + '" stroke="' + INK + '" stroke-width="1.3" fill="none" stroke-linejoin="round" opacity="0.85"/>' + dots(hl, '#f7dc8c', 2.2, 0.8);
        },
        front: function (c) { var s = ''; LEAVES.forEach(function (L) { if (L[5]) s += leaf(c, L); }); return s; }
      },
      face: { c: [2, 16], s: 1.28, eyeX: 24, lash: 1, lid: -0.5, browW: 5.4, browLen: 24, nose: 'pointy', mouthW: 0.9, lip: '#8a1f2a', halo: '#f0c868' },
      outfit: {
        sleeve: { type: 'long', col: '#2e3d5c', r0: 8.4, r1: 7, len: 0.86, cuff: '#f1ead8' },
        legs: { type: 'pants', col: '#2e3d5c', r0: 8, r1: 6.6, crease: '#4c5d80' }, shoes: { col: '#17130f', heel: 1 },
        lower: function (c) {
          var y0 = c.hip[1] - 12, pts = catmull([[c.hip[0] - 17 * c.k, y0], [c.hip[0] + 17 * c.k, y0], [c.hip[0] + 14 * c.k, y0 + 22], [c.hip[0], y0 + 26], [c.hip[0] - 14 * c.k, y0 + 22]], 4, true);
          return shape(c.ink, pts, '#2e3d5c', c.SH, { w: 1.4, extra: 2 });
        },
        top: function (c) {
          var ink = c.ink, g = garment(c, { neck: 9, chest: 16, waist: 13.5, hem: 17, hemY: 16, shoulder: 3.5, round: 1 }, '#2e3d5c');
          var s = g.svg, n0 = g.n0;
          s += vNeck(c, n0, n0[1] + 40, 8, '#f1ead8');
          s += g.outline + lapels(c, n0, n0[1] + 44, '#3a4b6e', 9);
          s += buttons(c, cxAt(c.tp, g.yW) + 2, [g.yW + 4], 2, '#c9a24a');
          s += stroke(ink, [[g.cW - 15, g.yW + 16], [g.cW - 5, g.yW + 16]], { w: 1.1, ta: 0.1, tb: 0.1 }, '#4c5d80') + stroke(ink, [[g.cW + 5, g.yW + 16], [g.cW + 15, g.yW + 16]], { w: 1.1, ta: 0.1, tb: 0.1 }, '#4c5d80');
          s += shape(ink, ellipse(g.cC - 14 * c.k, g.yC + 2, 3.2, 3.2, 10), '#d6a03c', c.SH, { w: 1, extra: 0.6 }); // brooch
          return s;
        }
      }
    };
  })();

  // —— oma: plum with a little bun, round glasses on a chain, sage cardigan, tweed skirt ——
  CH.oma = {
    name: 'Oma', who: 'grandma', fruit: 'plum',
    S: 0.88, legK: 0.94, torsoK: 0.95, wK: 1.1, armK: 1, neck: 3, limbK: 0.95, handK: 0.95, bend: [4, 2], headTilt: 3,
    col: { limb: '#7a4a7a', skin: '#6e3a6e', outfit: '#8a9a74', accent: '#c9b8d6' },
    defaults: { expr: 'happy', pose: 'idle', prop: 'plate' },
    head: {
      k: 0.94,
      sil: closed([[0, -88], [30, -86], [58, -66], [74, -30], [76, 10], [66, 48], [44, 76], [16, 90], [-14, 90], [-44, 76], [-66, 46], [-74, 8], [-70, -32], [-54, -66], [-28, -86]]),
      c: [0, 0], bottom: 89, top: -126,
      col: { base: '#74407a', shade: '#4a2048', light: '#b49ac4', dark: '#1e0a1e' },
      tex: function (c) { // dusty bloom + suture seam
        var tk = c.tex, b = '';
        for (var i = 0; i < 900; i++) { var x = (tk.r() * 2 - 1) * 76, y = -88 + tk.r() * 176; if (!c.inside(x, y)) continue; if (c.lum(x, y) > 0.2 && tk.r() < 0.6) b += dot(x, y); }
        var s = dots(b, '#b9b3cc', 2.4, 0.45);
        var seam = catmull([[-6, -86], [-22, -60], [-30, -20], [-26, 30], [-14, 74]], 5, false).map(function (p) { return [p[0] * c.D, p[1]]; });
        s += stroke(c.ink, seam, { w: 1.6, ta: 0.3, tb: 0.5, min: 0.2 }, '#2e0f2e') + '<path d="' + polyD(seam.map(function (p) { return [p[0] - 2.5 * c.D, p[1]]; }), false) + '" stroke="#a585b5" stroke-width="1.4" fill="none" opacity="0.6"/>';
        return s;
      },
      front: function (c) { // bun + hairpin
        var ink = c.ink, s = '';
        s += tube(ink, [[2, -84], [3, -96]], 4, c.SH, { ink: 1.3, extra: 1, fill: '#5a3a24', hatch: false });
        var bun = ellipse(4, -110, 17, 14, 30);
        s += shape(ink, bun, '#5e2e5c', c.SH, { w: 1.5, extra: 2 });
        s += stroke(ink, catmull([[-8, -112], [0, -120], [12, -116], [10, -106], [0, -104]], 5, false), { w: 1.1, ta: 0.2, tb: 0.4 }, '#2e0f2e');
        s += stroke(ink, [[-14, -100], [22, -122]], { w: 2, ta: 0.05, tb: 0.05, min: 0.8 }, '#c9a24a');
        return s;
      }
    },
    face: { c: [2, 14], s: 1.32, eyeX: 25, eyeW: 21, browW: 4.2, browLen: 22, browCol: '#d9d2c4', nose: 'bulb', noseCol: 'rgba(200,120,150,.35)', mouthW: 0.85, halo: '#b49ac4', lines: 1, crease: 1, blush: 1, blushCol: '#e08aa0', glasses: { r: 16, col: '#3a2a1a', chain: 1 } },
    outfit: {
      sleeve: { type: 'long', col: '#8a9a74', r0: 8.8, r1: 7.6, len: 0.86, cuff: '#7a8a64' },
      legs: { type: 'bare' }, shoes: { col: '#6b4a2a', heel: 0, laces: false },
      lower: function (c) {
        var p = skirtPoly(c, c.hip[1] - 10, lerp(c.knee[1], c.ank[1], 0.4), 17 * c.k, 22 * c.k, c.sit);
        var s = shape(c.ink, p, '#7a6a58', c.SH, { w: 1.6, extra: 2.4 });
        var cl = clipDef(c, 'tweed', p);
        s += '<g clip-path="' + cl + '">' + gridPattern(c.hip[0] - 40, c.hip[1] - 12, c.hip[0] + 40, c.ank[1], 5, '#5a4a3a', 0.8, 0.5) + '</g>';
        return s;
      },
      top: function (c) {
        var ink = c.ink, g = garment(c, { neck: 8, chest: 16.5, waist: 16, hem: 18, hemY: 8, shoulder: 1 }, '#8a9a74');
        var s = g.svg, n0 = g.n0;
        s += vNeck(c, n0, n0[1] + 30, 8, '#c9b8d6');
        var rib = ''; for (var x = g.cH - g.wh + 2; x < g.cH + g.wh - 1; x += 2.6) rib += 'M' + f1(x) + ' ' + f1(g.yH - 6) + 'v6';
        s += '<path d="' + rib + '" stroke="' + INK + '" stroke-width="0.7" opacity="0.6"/>';
        s += buttons(c, cxAt(c.tp, n0[1] + 36) + 1, [n0[1] + 36, n0[1] + 50, n0[1] + 64, n0[1] + 78], 1.8, '#e9e2cf');
        s += g.outline + collarWings(c, n0, '#f1ead8', 8, 11);
        // tissue peeking out of the sleeve pocket: small handkerchief in the chest pocket
        s += shape(ink, [[g.cC + 6 * c.side, g.yC + 2], [g.cC + 13 * c.side, g.yC + 2], [g.cC + 12 * c.side, g.yC + 10], [g.cC + 7 * c.side, g.yC + 10]], '#7a8a64', c.SH, { w: 1, extra: 0.8 });
        s += shape(ink, [[g.cC + 7 * c.side, g.yC + 2], [g.cC + 9 * c.side, g.yC - 4], [g.cC + 12 * c.side, g.yC + 2]], '#e08aa0', c.SH, { w: 0.9, extra: 0.6 });
        return s;
      }
    }
  };

  // —— arzt: coconut, fibre tuft, head mirror, white coat, stethoscope, blue shirt + tie ——
  CH.arzt = {
    name: 'Arzt', who: 'doctor', fruit: 'coconut',
    S: 1.02, legK: 1.02, torsoK: 1.02, wK: 1.06, armK: 1, neck: 7, limbK: 1, handK: 1,
    col: { limb: '#7a5636', skin: '#6e4c30', outfit: '#f2ecdc', accent: '#8fb0c8' },
    defaults: { expr: 'tired', pose: 'idle', prop: 'clipboard' },
    head: {
      k: 0.92,
      sil: closed([[0, -90], [36, -86], [66, -62], [82, -22], [82, 20], [70, 56], [44, 82], [14, 92], [-16, 92], [-46, 80], [-70, 54], [-82, 18], [-80, -24], [-64, -62], [-34, -86]]),
      c: [0, 0], bottom: 91, top: -128,
      col: { base: '#73502f', shade: '#4a3020', light: '#a88058', dark: '#1a0f06' },
      tex: function (c) { // fibres along the meridians
        var tk = c.tex, lt = '', dk = '';
        for (var i = 0; i < 260; i++) {
          var th = (tk.r() * 2 - 1) * 1.5, y = -86 + tk.r() * 170, len = 8 + tk.r() * 16, pts = [];
          for (var u = 0; u <= 1.001; u += 0.25) { var yy = y + u * len, h = 82 * Math.sqrt(Math.max(0, 1 - (yy / 92) * (yy / 92))); pts.push([h * Math.sin(th + u * 0.05), yy]); }
          var d = tk.brush(pts, { w: 0.9 + tk.r() * 0.8, ta: 0.3, tb: 0.5, min: 0.1, jit: 0.4 });
          if (tk.r() < 0.55) lt += d; else dk += d;
        }
        return '<path d="' + lt + '" fill="#b58c5e" opacity="0.6"/><path d="' + dk + '" fill="#2a180a" opacity="0.5"/>';
      },
      front: function (c) { // fibre tuft on top
        var ink = c.ink, tk = c.tex, d = '', d2 = '';
        for (var i = 0; i < 46; i++) {
          var x = (tk.r() * 2 - 1) * 34, y = -80 - Math.cos(x / 34 * 1.4) * 8, a = -90 + x * 0.9 + (tk.r() - 0.5) * 40, l = 18 + tk.r() * 26;
          var p = catmull([[x, y], [x + Math.cos(rad(a)) * l * 0.5, y + Math.sin(rad(a)) * l * 0.5], [x + Math.cos(rad(a + (x > 0 ? 25 : -25))) * l, y + Math.sin(rad(a + (x > 0 ? 25 : -25))) * l]], 3, false);
          var dd = ink.brush(p, { w: 2 + tk.r() * 1.6, ta: 0.1, tb: 0.8, min: 0.1, jit: 0.4 });
          if (i % 3) d += dd; else d2 += dd;
        }
        return '<path d="' + d + '" fill="#4a3020"/><path d="' + d2 + '" fill="#a88058"/>';
      }
    },
    face: { c: [2, 20], s: 1.36, eyeX: 26, browW: 9, browLen: 27, browCol: '#d8d0c0', nose: 'long', mouthW: 0.95, chin: 1, bag: 1, halo: '#a88058', headMirror: 1 },
    outfit: {
      sleeve: { type: 'long', col: '#f2ecdc', r0: 9, r1: 7.6, len: 0.86 },
      legs: { type: 'pants', col: '#5a5f66', r0: 8.4, r1: 7.2, crease: '#7c828a' }, shoes: { col: '#17130f', laces: false },
      lower: function (c) { // coat skirt (open), drawn over the trousers
        var y0 = c.hip[1] - 14, y1 = c.sit ? c.knee[1] + 4 : lerp(c.hip[1], c.knee[1], 0.92), cx = c.hip[0], s = '';
        [-1, 1].forEach(function (sd) {
          var p = catmull([[cx + sd * 2, y0], [cx + sd * 19 * c.k, y0], [cx + sd * 24 * c.k, y1], [cx + sd * 4, y1 + 1.5]], 3, true);
          s += shape(c.ink, p, '#f2ecdc', c.SH, { w: 1.5, extra: 2.2 });
        });
        return s;
      },
      top: function (c) {
        var ink = c.ink, g = garment(c, { neck: 9, chest: 16, waist: 15, hem: 17, hemY: 6, shoulder: 1.5 }, '#f2ecdc');
        var s = g.svg, n0 = g.n0, yV = g.yW + 4;
        // shirt + tie in the open front
        s += shape(ink, [[n0[0] - 9, n0[1] + 1], [n0[0] + 9, n0[1] + 1], [cxAt(c.tp, yV) + 6, yV], [cxAt(c.tp, g.yH) + 6, g.yH], [cxAt(c.tp, g.yH) - 6, g.yH], [cxAt(c.tp, yV) - 6, yV]], '#9db8cf', c.SH, { w: 1.1, extra: 0.8 });
        s += shape(ink, [[n0[0] - 3, n0[1] + 6], [n0[0] + 3, n0[1] + 6], [n0[0] + 4.5, n0[1] + 40], [n0[0], n0[1] + 46], [n0[0] - 4.5, n0[1] + 40]], '#8e2a2a', c.SH, { w: 1, extra: 0.8 });
        s += g.outline + lapels(c, n0, yV, '#e8e0cc', 10);
        // breast pocket with pens
        var px = g.cC + 10 * c.side;
        s += stroke(ink, [[px - 6, g.yC + 6], [px + 6, g.yC + 6]], { w: 1.1, ta: 0.1, tb: 0.1 });
        s += '<path d="M' + f1(px - 3) + ' ' + f1(g.yC + 6) + 'v-8M' + f1(px + 1.5) + ' ' + f1(g.yC + 6) + 'v-6" stroke="#2f5d8a" stroke-width="2.2"/>';
        // stethoscope around the neck
        var st = catmull([[n0[0] - 14, n0[1] - 2], [n0[0] - 16, n0[1] + 20], [n0[0] - 10, n0[1] + 40], [n0[0] - 6, n0[1] + 52]], 5, false);
        var st2 = catmull([[n0[0] + 14, n0[1] - 2], [n0[0] + 16, n0[1] + 22], [n0[0] + 12, n0[1] + 34]], 5, false);
        s += stroke(ink, st, { w: 3.4, ta: 0.02, tb: 0.02, min: 0.9, jit: 0.05 }, '#2b2a28') + stroke(ink, st2, { w: 3.4, ta: 0.02, tb: 0.02, min: 0.9, jit: 0.05 }, '#2b2a28');
        s += shape(ink, ellipse(n0[0] - 6, n0[1] + 57, 6, 6, 16), '#c9cdd0', c.SH, { w: 1.3, extra: 1.2 }) + '<circle cx="' + f1(n0[0] - 6) + '" cy="' + f1(n0[1] + 57) + '" r="2.4" fill="#8a9196"/>';
        return s;
      }
    }
  };

  // —— moderator: orange, slick leaf quiff, shiny purple suit, red bow tie, microphone ——
  CH.moderator = {
    name: 'Moderator', who: 'game-show host', fruit: 'orange',
    S: 1, legK: 1, torsoK: 1, wK: 1.12, armK: 1, neck: 7, limbK: 1, handK: 1,
    col: { limb: '#d9742a', skin: '#e07a24', outfit: '#5b3a8c', accent: '#c0392b' },
    defaults: { expr: 'happy', pose: 'hold', prop: 'mic' },
    head: {
      k: 0.9,
      sil: closed([[0, -84], [34, -80], [64, -60], [82, -26], [84, 12], [74, 48], [50, 76], [18, 88], [-16, 88], [-50, 76], [-74, 48], [-84, 12], [-82, -26], [-64, -60], [-34, -80]]),
      c: [0, 2], bottom: 87, top: -116,
      col: { base: '#e3802a', shade: '#a8531a', light: '#f8b56a', dark: '#3a1a06' },
      stipple: 0.55,
      tex: function (c) { // pores
        var tk = c.tex, d = '', l = '';
        for (var i = 0; i < 1300; i++) { var x = (tk.r() * 2 - 1) * 84, y = -84 + tk.r() * 172; if (!c.inside(x, y) || c.q(x, y) > 0.95) continue; if (tk.r() < 0.5) d += 'M' + f1(x) + ' ' + f1(y) + 'a1 1 0 1 0 0.1 0'; else l += dot(x, y); }
        return '<path d="' + d + '" fill="none" stroke="#a8531a" stroke-width="0.9" opacity="0.7"/>' + dots(l, '#fbd09a', 1.4, 0.6);
      },
      gloss: function (c) {
        var D = c.D;
        return '<path d="' + polyD(catmull([[-56 * D, -26], [-50 * D, -48], [-30 * D, -62], [-36 * D, -46], [-48 * D, -24]], 4, true), true) + '" fill="#fff4dc" opacity="0.9"/><circle cx="' + (-60 * D) + '" cy="-6" r="3.2" fill="#fff4dc" opacity="0.8"/>';
      },
      front: function (c) { // navel star + slick leaf quiff
        var ink = c.ink, s = '', st = '';
        for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; st += ink.brush([[2, -80], [2 + Math.cos(a) * 9, -80 + Math.sin(a) * 4]], { w: 2, ta: 0.1, tb: 0.6 }); }
        s += '<path d="' + st + '" fill="#4f7a32"/>';
        var lf = catmull([[0, -82], [-10, -104], [10, -128], [46, -134], [72, -118], [44, -112], [20, -98]], 5, true);
        s += shape(ink, lf, '#4f7a32', c.SH, { w: 1.5, extra: 1.8 });
        s += stroke(ink, catmull([[2, -86], [14, -114], [58, -124]], 4, false), { w: 1.1, ta: 0.2, tb: 0.6 });
        s += stroke(ink, catmull([[10, -116], [30, -126], [56, -126]], 4, false), { w: 2.2, ta: 0.3, tb: 0.5 }, '#9cc46a');
        return s;
      }
    },
    face: { c: [2, 18], s: 1.4, eyeX: 27, browW: 6.6, browLen: 27, browGap: 3, nose: 'hook', mouthW: 1.1, chin: 1, glint: 1, grin: 1, halo: '#f8b56a', crease: 1 },
    outfit: {
      sleeve: { type: 'long', col: '#5b3a8c', r0: 8.8, r1: 7.4, len: 0.86, cuff: '#f1ead8', shine: '#c9b2ec' },
      legs: { type: 'pants', col: '#5b3a8c', r0: 8.4, r1: 7.2, crease: '#8a6ab8' }, shoes: { col: '#17130f', laces: false, sole: '#2a2622' },
      lower: function (c) {
        var y0 = c.hip[1] - 12, pts = catmull([[c.hip[0] - 18 * c.k, y0], [c.hip[0] + 18 * c.k, y0], [c.hip[0] + 15 * c.k, y0 + 22], [c.hip[0], y0 + 26], [c.hip[0] - 15 * c.k, y0 + 22]], 4, true);
        return shape(c.ink, pts, '#5b3a8c', c.SH, { w: 1.4, extra: 2 });
      },
      top: function (c) {
        var ink = c.ink, g = garment(c, { neck: 9, chest: 17, waist: 14.5, hem: 17.5, hemY: 14, shoulder: 3 }, '#5b3a8c');
        var s = g.svg, n0 = g.n0, yV = g.yW + 2;
        s += vNeck(c, n0, yV, 8.5, '#f1ead8');
        // shine streaks (satin)
        s += stroke(ink, [[g.cC - 12 * c.side, g.yC - 2], [g.cW - 10 * c.side, g.yW + 14]], { w: 2.6, ta: 0.3, tb: 0.4, min: 0.2 }, '#c9b2ec');
        s += stroke(ink, [[g.cC - 7 * c.side, g.yC + 4], [g.cW - 6 * c.side, g.yW - 4]], { w: 1.2, ta: 0.3, tb: 0.4 }, '#efe2ff');
        s += g.outline + lapels(c, n0, yV + 2, '#2a1a40', 9.5);
        s += stroke(ink, [[n0[0] - 7, n0[1] + 10], [n0[0] - 2, yV - 6]], { w: 1.2, ta: 0.3, tb: 0.3 }, '#8a6ab8');
        s += bowtie(c, [n0[0], n0[1] + 6], '#c0392b', 1);
        s += buttons(c, cxAt(c.tp, yV + 8), [yV + 8], 2, '#d6a03c');
        // pocket square + sparkle
        var px = g.cC + 11 * c.side;
        s += shape(ink, [[px - 5, g.yC + 3], [px - 2, g.yC - 4], [px + 1, g.yC + 1], [px + 4, g.yC - 4], [px + 6, g.yC + 3]], '#c0392b', c.SH, { w: 0.9, extra: 0.6 });
        s += '<path d="M' + f1(g.cC - 12 * c.side) + ' ' + f1(g.yW - 10) + 'm0 -5v10m-5 -5h10" stroke="#fff" stroke-width="1.4" opacity="0.9"/>';
        return s;
      }
    }
  };

  // ───────────────────────────── character setup ─────────────────────────────
  function charOf(id) { var ch = CH[id]; if (!ch) throw new Error('Cast: unknown character "' + id + '"'); return ch; }
  function poseOf(name) { return POSES[name] || POSES[POSE_ALIAS[name]] || POSES.idle; }
  function poseName(name) { return POSES[name] ? name : POSE_ALIAS[name] && POSES[POSE_ALIAS[name]] ? POSE_ALIAS[name] : 'idle'; }

  // map a Melo-unit pose to this character's proportions
  function mapPose(ch, P, headInfo) {
    var S = ch.S, lk = ch.legK, tk = ch.torsoK, wk = ch.wK, ak = ch.armK;
    var hipY = P.torso[2][1];
    function LY(y) { return -14 * S + (y + 14) * S * lk; }
    var hipM = LY(hipY);
    function MT(p) { return [p[0] * S * wk, hipM + (p[1] - hipY) * S * tk]; }
    function ML(p) { return [p[0] * S, LY(p[1])]; }
    var o = { torso: P.torso.map(MT), tilt: P.tilt || 0, sit: !!P.sit };
    if (ch.bend) { o.torso[0][0] += ch.bend[0]; o.torso[1][0] += ch.bend[1]; }
    ['la', 'lb'].forEach(function (k) { var L = P[k]; o[k] = { hip: ML(L.hip), kn: ML(L.kn), an: ML(L.an), foot: L.foot }; });
    ['a', 'b'].forEach(function (k) {
      var A = P[k], sh = MT(A.sh);
      if (ch.bend) sh[0] += ch.bend[0] * 0.85;
      var el = add(sh, [(A.el[0] - A.sh[0]) * S * ak * wk, (A.el[1] - A.sh[1]) * S * ak]);
      var wr = add(el, [(A.wr[0] - A.el[0]) * S * ak, (A.wr[1] - A.el[1]) * S * ak]);
      o[k] = { sh: sh, el: el, wr: wr, wrFace: A.wrFace, hand: clone(A.hand) };
    });
    return o;
  }

  function blinkAt(t, seed) {
    var slot = Math.floor(t / T.blinkSlot), v = 0;
    for (var s = slot - 1; s <= slot; s++) {
      var h = hash(seed * 7919 + s * 131 + 17), hp = hash(seed * 7919 + (s - 1) * 131 + 17);
      if ((h % 1000) / 1000 >= T.blinkChance) continue;
      if ((hp % 1000) / 1000 < T.blinkChance && (h >>> 20) % 4 !== 0) continue; // avoid back-to-back except rare double blinks
      var bt = s * T.blinkSlot + ((h >>> 10) % 1000) / 1000 * (T.blinkSlot - 0.25), dt = t - bt;
      var b = dt < 0 ? 0 : dt < 0.05 ? dt / 0.05 : dt < 0.09 ? 1 : dt < 0.21 ? 1 - (dt - 0.09) / 0.12 : 0;
      v = Math.max(v, b);
    }
    return v;
  }

  function qp(p) { return [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]; }

  // ───────────────────────────── render ─────────────────────────────
  function render(id, opts) {
    opts = opts || {};
    var ch = charOf(id);
    var t = +opts.t || 0, seed = opts.seed == null ? (hash(id.length * 977 + id.charCodeAt(0) * 31 + id.charCodeAt(id.length - 1)) % 1000) : (opts.seed | 0);
    var D = opts.flip ? -1 : 1, scale = opts.scale == null ? 1 : +opts.scale;
    var uid = (opts.id || ('c' + id.slice(0, 4) + seed)) + (D < 0 ? 'm' : '');
    var talk = clamp(+opts.talk || 0, 0, 1), fps = opts.fps || T.fps;
    var rough = opts.rough == null ? 1 : +opts.rough, grain = rough > 0 && opts.grain !== false;
    var SH = [0.55 * D, 0.83];
    var exprN = opts.expr || ch.defaults.expr, pName = poseName(opts.pose || ch.defaults.pose);
    var ex = clone(exprOf(exprN));
    var P0 = poseOf(pName), propName = opts.prop != null ? opts.prop : (pName === 'hold' ? ch.defaults.prop : null);
    if (pName === 'hold' && propName && PROPS[propName]) { P0 = clone(P0); var pa = PROPS[propName].arm; P0.b = { sh: P0.b.sh, el: pa.el, wr: pa.wr, hand: clone(pa.hand) }; }
    // optional blend from a previous state (engine-driven transitions): opts.from = {expr, pose}, opts.w = 0..1
    if (opts.from && opts.w != null && opts.w < 1) {
      var w = ease(opts.w);
      if (opts.from.expr && opts.from.expr !== exprN) {
        var ea = exprOf(opts.from.expr), la = !!ea.eL.laugh, lb = !!ex.eL.laugh;
        ex = blendObj(ea, ex, w);
        if (la !== lb) { ex.eL = clone(w < 0.5 ? ea.eL : exprOf(exprN).eL); ex.eR = clone(w < 0.5 ? ea.eR : exprOf(exprN).eR); }
        ex.fx = w < 0.5 ? ea.fx : exprOf(exprN).fx;
      }
      if (opts.from.pose && poseName(opts.from.pose) !== pName) {
        var pf = poseOf(poseName(opts.from.pose));
        var pb = blendObj(pf, P0, w);
        ['a', 'b'].forEach(function (k) { var ha = pf[k].hand, hb = P0[k].hand; var da = ((hb.ang - ha.ang) % 360 + 540) % 360 - 180; pb[k].hand.ang = ha.ang + da * w; pb[k].hand.flip = w < 0.5 ? ha.flip : hb.flip; pb[k].hand.g = w < 0.5 ? ha.g : hb.g; pb[k].wrFace = w < 0.5 ? pf[k].wrFace : P0[k].wrFace; });
        pb.sit = w < 0.5 ? pf.sit : P0.sit;
        P0 = pb;
      }
    }
    var P = mapPose(ch, P0);
    var H = ch.head, F = ch.face, HK = H.k || 1, Hb = H.bottom * HK, Ht = (H.top || -100) * HK;

    // life: breathing, sway, head motion, blink
    var n = noise(seed + 2), br = Math.sin((t / T.breathPeriod + (seed % 97) / 97) * Math.PI * 2);
    var sway = n(t * 0.11 + 70) * 0.5;
    var headTilt = n(t * 0.23) * 1.3 + talk * n(t * 2.3 + 40) * 2.4 + (ch.headTilt || 0);
    var headDy = -br * 1.1 * ch.S, headDx = n(t * 0.17 + 20) * 1.1;
    var blink = blinkAt(t, seed);
    var st = { t: t, blink: blink, look: opts.look || null };

    // mouth: talk drives openness; narrow mouths widen, teeth/tongue appear
    var restOpen = ex.open || 0, lipOpen = talk > 0.04 ? Math.pow(talk, 0.8) * 0.85 : 0;
    if (lipOpen > 0) {
      var m = ex.m, kw = clamp(lipOpen * 3, 0, 1) * 0.6;
      m.l = [lerp(m.l[0], Math.min(m.l[0], -13), kw), m.l[1]]; m.r = [lerp(m.r[0], Math.max(m.r[0], 14), kw), m.r[1]];
      m.round = clamp(0.35 + n(t * 7.3 + 5) * 0.8, 0, 1) * clamp(lipOpen * 4, 0, 1);
      m.wide = clamp(n(t * 5.1 + 9) * 0.9, -0.6, 0.8) * clamp(lipOpen * 4, 0, 1);
      m.teeth = m.teeth === 2 && lipOpen < 0.2 ? 2 : 1; m.tongue = lipOpen > 0.3 ? 1 : 0; m.wave = 0;
      ex.open = Math.max(lipOpen, restOpen * 0.3);
    } else ex.open = restOpen;
    if (F.grin && (exprN === 'happy' || exprN === 'smug') && lipOpen === 0) { ex.open = Math.max(ex.open, 0.32); ex.m.teeth = 1; ex.m.l = [ex.m.l[0] - 2, ex.m.l[1] - 1]; ex.m.r = [ex.m.r[0] + 2, ex.m.r[1] - 1]; }
    if (pName === 'facepalm') { ex.eL.up = Math.min(ex.eL.up || 3, 2); ex.eR.up = Math.min(ex.eR.up || 3, 2); }

    // gestures
    var gw = GEST[pName] || [0.1, 0.1];
    ['a', 'b'].forEach(function (k, si) {
      var A = P[k], amp = gw[si] * ch.S, o = si * 50;
      var dx = (n(t * 0.8 + o) * 7 + n(t * 1.9 + o + 7) * 2.5) * amp, dy = (n(t * 0.7 + o + 3) * 8 + talk * -4 * gw[si]) * amp;
      A.wr = [A.wr[0] + dx * (si ? 1 : -1), A.wr[1] + dy]; A.el = [A.el[0] + dx * 0.35 * (si ? 1 : -1), A.el[1] + dy * 0.3];
      A.hand.ang += n(t * 1.1 + o + 11) * 10 * amp;
      A.sh[1] += -br * 0.9 * ch.S; A.el[1] += -br * 0.5 * ch.S;
    });
    if (pName === 'wave') { var wv = Math.sin(t * Math.PI * 2 * 1.4); P.b.hand.ang += wv * 18; P.b.wr[0] += wv * 3; }

    // head placement
    var neckTop = P.torso[0], attach = [neckTop[0] + headDx, neckTop[1] - ch.neck * ch.S + headDy];
    var hc = [attach[0], attach[1] - Hb];
    var tilt = (P.tilt || 0) + (ex.tilt || 0) + headTilt;
    function headPt(p) { return rot([hc[0] + p[0], hc[1] + p[1]], attach, tilt); }
    var fcx = F.c[0] * HK, fcy = F.c[1] * HK, FS = F.s * HK;
    ['a', 'b'].forEach(function (k) {
      var A = P[k];
      if (A.wrFace) {
        A.wr = headPt([fcx + A.wrFace[0] * FS / 1.4, fcy + A.wrFace[1] * FS / 1.4]);
        if (A.hand.g === 'open') A.hand.ang = -128 + tilt;
        A.el = [Math.max(A.el[0], A.wr[0] + 26 * ch.S), A.el[1]];
      }
    });

    // boil variant + displacement fields
    var block = Math.floor(t * fps / T.boilEvery + 1e-6), bv = opts.boil === false ? 0 : [0, 2, 1, 3][((block % 4) + 4) % 4];
    var rk = id + '|' + seed + '|' + D + '|' + bv + '|' + rough + (grain ? 'g' : '') + '|';
    var fields = rough > 0 ? cached(rk + 'field', function () {
      var ga = grain ? T.grainAmpWithFilter / T.grainAmp : 1;
      return { body: dispField(seed, bv, 1, rough, ga), face: dispField(seed, bv, F.s * (H.k || 1), rough, ga) };
    }) : { body: null, face: null };
    var defs = '';

    // static head
    var head = cached(rk + uid + '|head', function () { return withDisp(fields.body, function () { return headStatic(ch, D, bv, uid, seed); }); });
    defs += head.defs;
    var shadow = cached(rk + 'shadow' + P0.sit, function () { return withDisp(fields.body, function () { return shadowSvg(new Ink(seed + 3), ch.S); }); });

    // garments + legs (cached on quantised geometry)
    var LQ = { la: { hip: qp(P.la.hip), kn: qp(P.la.kn), an: qp(P.la.an), foot: P.la.foot }, lb: { hip: qp(P.lb.hip), kn: qp(P.lb.kn), an: qp(P.lb.an), foot: P.lb.foot } };
    var TQ = { torso: P.torso.map(qp), sa: qp(P.a.sh0 || P.a.sh), sb: qp(P.b.sh0 || P.b.sh) };
    // shoulders for the garment are taken without breathing (breathing = transform)
    var poseSh = mapPose(ch, P0); TQ.sa = qp(poseSh.a.sh); TQ.sb = qp(poseSh.b.sh);
    var gctx = function (ink) {
      var tp = catmull(TQ.torso, 8, false), hip = TQ.torso[2];
      var knee = [(LQ.la.kn[0] + LQ.lb.kn[0]) / 2, (LQ.la.kn[1] + LQ.lb.kn[1]) / 2], ank = [(LQ.la.an[0] + LQ.lb.an[0]) / 2, (LQ.la.an[1] + LQ.lb.an[1]) / 2];
      return { ink: ink, tp: tp, sa: TQ.sa, sb: TQ.sb, hip: hip, knee: knee, ank: ank, S: ch.S, k: ch.S * ch.wK, SH: SH, side: D, uid: uid + 'g', defs: '', sit: !!P.sit, t: t };
    };
    var lower = cached(rk + uid + 'lower' + JSON.stringify(LQ) + JSON.stringify(TQ.torso[2]), function () {
      return withDisp(fields.body, function () {
        var ink = new Ink(seed + 5), s = legSvg(ink, LQ.la, ch, SH) + legSvg(ink, LQ.lb, ch, SH), c = gctx(ink);
        if (ch.outfit.lower) s += ch.outfit.lower(c);
        return { svg: s, defs: c.defs };
      });
    });
    defs += lower.defs;
    var upper = cached(rk + uid + 'upper' + JSON.stringify(TQ) + JSON.stringify(LQ.la.kn) + P.sit, function () {
      return withDisp(fields.body, function () {
        var c = gctx(new Ink(seed + 7));
        c.uid = uid + 'u';
        var s = ch.outfit.top(c);
        return { svg: s, defs: c.defs, behindHead: c.behindHead || '' };
      });
    });
    defs += upper.defs;
    var hipY = TQ.torso[2][1];
    var torsoG = '<g transform="translate(0 ' + f1(hipY) + ') scale(1 ' + (1 + br * 0.006).toFixed(4) + ') translate(0 ' + f1(-hipY) + ')">' + upper.svg + '</g>';

    // per-frame parts: neck, face, arms, props
    var neck = withDisp(fields.body, function () { return tube(new Ink(seed + 9), [[neckTop[0], neckTop[1] + 6], [attach[0], attach[1] + 4]], 4.6 * ch.limbK, SH, { ink: 1.6, extra: 1.5, hatch: false, fill: ch.col.limb }); });
    var faceDefs = '';
    var face = withDisp(fields.face, function () { return faceSvg(new Ink(seed + 13), ch, ex, st, uid + 'f', function (x) { faceDefs += x; }); });
    defs += faceDefs;
    var faceG = '<g class="cast-face" transform="translate(' + f1(fcx) + ' ' + f1(fcy) + ') scale(' + f1(FS * 100) / 100 + ')">' + face + '</g>';
    var headG = '<g class="cast-head" transform="translate(' + f1(hc[0]) + ' ' + f1(hc[1]) + ') rotate(' + f1(tilt) + ' 0 ' + f1(Hb) + ')">' + head.svg + faceG + (H.over ? H.over : '') + '</g>';

    var prop = null, propTip = null;
    if (pName === 'hold' && propName && propName !== 'none' && PROPS[propName]) {
      var B = P.b, ang = B.hand.ang, hk = ch.handK * 1.22;
      var grip = add(B.wr, dirv(ang), 13 * hk);
      var pr = PROPS[propName], pang = ang + 90 + (pr.rot || 0);
      if (pr.palm) { grip = add(add(B.wr, dirv(ang), 14 * hk), dirv(ang - 90), 9); pang = 0; }
      var psvg = withDisp(fields.body, function () { return drawProp(new Ink(seed + 23), propName, SH, t); });
      prop = { svg: '<g class="cast-prop cast-prop-' + propName + '" transform="translate(' + f1(grip[0]) + ' ' + f1(grip[1]) + ') rotate(' + f1(pang) + ') scale(' + f1(ch.S * 100) / 100 + ')">' + psvg + '</g>', behind: !pr.palm };
      propTip = rot([grip[0], grip[1] - 40 * ch.S], grip, pang);
    }
    var armA = withDisp(fields.body, function () { return armSvg(new Ink(seed + 17), P.a, ch, SH, 'a', null); });
    var armB = withDisp(fields.body, function () { return armSvg(new Ink(seed + 19), P.b, ch, SH, 'b', prop); });

    // bbox (local, before flip/scale)
    var top = hc[1] + Ht - 34, bx0 = -70 * ch.S, bx1 = 70 * ch.S;
    [P.a.wr, P.b.wr, P.a.el, P.b.el].forEach(function (p) { bx0 = Math.min(bx0, p[0] - 40); bx1 = Math.max(bx1, p[0] + 40); });
    bx0 = Math.min(bx0, hc[0] - 100); bx1 = Math.max(bx1, hc[0] + 100);
    var box = [bx0, top, bx1 - bx0, 30 - top];
    if (grain) defs += grainFilter(uid + '-gr', seed, bv, rough, [box[0] - 10, box[1] - 10, box[2] + 20, box[3] + 20]);

    var order = pName === 'arms-crossed' ? armA + armB : armA + armB;
    var body = '<g class="cast-body">' + shadow + lower.svg + (upper.behindHead || '') + neck + torsoG + '</g>';
    var inner = '<g transform="rotate(' + sway.toFixed(2) + ')">' + body + headG + '<g class="cast-arms">' + order + '</g></g>';
    var xf0 = (scale !== 1 ? 'scale(' + scale + ') ' : '') + (D < 0 ? 'scale(-1 1)' : '');
    var svg = '<g class="cast cast-' + id + '" data-expr="' + exprN + '" data-pose="' + pName + '"' + (xf0 ? ' transform="' + xf0.trim() + '"' : '') + '><defs>' + defs + '</defs>' +
      '<g' + (grain ? ' filter="url(#' + uid + '-gr)"' : '') + '>' + inner + '</g></g>';

    // anchors (scaled + flipped to the caller's coords)
    function A(p) { var q = rot(p, [0, 0], sway); return [Math.round(q[0] * D * scale * 10) / 10, Math.round(q[1] * scale * 10) / 10]; }
    var wA = A(P.a.wr), wB = A(P.b.wr);
    var anchors = {
      feet: [0, 0], headCenter: A(headPt([0, 0])), headTop: A(headPt([0, Ht])), mouth: A(headPt([fcx + 3 * FS, fcy + (F.mouthY || 30) * FS])),
      eyes: A(headPt([fcx + 3 * FS, fcy])), handL: D > 0 ? wA : wB, handR: D > 0 ? wB : wA, propTip: propTip ? A(propTip) : null,
      bbox: D > 0 ? [box[0] * scale, box[1] * scale, box[2] * scale, box[3] * scale] : [-(box[0] + box[2]) * scale, box[1] * scale, box[2] * scale, box[3] * scale]
    };
    return { svg: svg, anchors: anchors, state: { id: id, expr: exprN, pose: pName, prop: propName, talk: talk, blink: Math.round(blink * 100) / 100, boil: bv } };
  }

  // prepare per-character derived data (stubble etc.)
  function prep(ch) {
    if (ch.face.stubble && !ch.face._stubble) {
      var r = U.rng(hash(ch.name.length * 31 + 7)), d = '';
      for (var i = 0; i < 90; i++) { var a = r() * Math.PI, rr = 18 + r() * 22; var x = 3 + Math.cos(a) * rr * 1.25, y = (ch.face.mouthY || 30) + Math.sin(a) * rr * 0.75 - 4; if (Math.abs(x - 3) < 14 && y < (ch.face.mouthY || 30) + 6) continue; d += dot(x, y); }
      ch.face._stubble = dots(d, ch.face.stubbleCol || 'rgba(23,19,15,.55)', 1.3);
    }
  }

  function list() { return Object.keys(CH); }
  function info(id) {
    var ch = charOf(id); prep(ch);
    var fr = render(id, { t: 0, grain: false, boil: false });
    var bb = fr.anchors.bbox;
    return { id: id, name: ch.name, who: ch.who, fruit: ch.fruit, height: Math.round(-fr.anchors.headTop[1]), headCenter: fr.anchors.headCenter,
      colours: clone(ch.col), defaults: clone(ch.defaults), bbox: bb };
  }
  function renderPub(id, opts) { prep(charOf(id)); return render(id, opts); }

  return {
    render: renderPub, list: list, info: info, tuning: T,
    EXPRESSIONS: Object.keys(EXPR), POSES: Object.keys(POSES), PROPS: Object.keys(PROPS).filter(function (p) { return p !== 'none'; }),
    _CH: CH, _EXPR: EXPR, _POSES: POSES, _clearCache: function () { CACHE.clear(); }
  };
});
