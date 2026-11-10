/*!
 * Melo — the watermelon-headed mascot of "Deutsch mit Melo".
 * Pure-JS, dependency-free SVG generator. Works in the browser (window.Melo)
 * and in Node / bundlers (module.exports). See README.md for the full API.
 *
 * COORDINATE SYSTEM (character units, before `scale`):
 *   origin (0,0)      = ground point between the feet (the "feet anchor")
 *   +x                = screen right, +y = down (normal SVG)
 *   head centre       ≈ (0, -213), head radii 72 × 63
 *   neck / shoulders  = (0, -158) / (0, -146), hip = (0, -80)
 *   full figure fits  x ∈ [-160, 160], y ∈ [-350, 14]
 *   headOnly mode     = head centre at (0,0), fits x ∈ [-110,110], y ∈ [-130, 92]
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Melo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────────── palette ─────────────────────────────
  var PALETTE = {
    ink: '#1E1E1E',
    paper: '#FBF8F1',
    rind: '#5DB04E',        // watermelon skin
    rindLight: '#8ED07A',   // highlight tint
    stripe: '#2E7D32',      // dark zig-zag stripes
    flesh: '#F0524F',       // mouth inside
    fleshDark: '#C93A41',   // mouth inner shadow
    pith: '#E9F5CF',        // pale rind band between skin and flesh
    seed: '#1E1E1E',
    cheek: '#FF9AA2',
    blush: '#FF6F7D',
    stem: '#7A5A2B',
    tendril: '#4E8F35',
    leaf: '#79C452',
    leafDark: '#3E8A34',
    scarf: '#FF7A59',
    scarfDark: '#E2553C',
    sweat: '#8FD3F4',
    marker: '#2F6FB5',
    white: '#FFFFFF'
  };

  // ───────────────────────────── geometry ────────────────────────────
  var G = {
    headRx: 72, headRy: 63,
    neckY: -158, shoulderY: -143, hipY: -80,
    upperArm: 48, foreArm: 45, thigh: 40, shin: 38,
    limbW: 6.2, outlineW: 4.6
  };
  G.headCy = G.neckY - G.headRy + 4; // -217

  // ───────────────────────────── utils ───────────────────────────────
  function f(n) { return (Math.round(n * 10) / 10).toString(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rad(d) { return d * Math.PI / 180; }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function deepMerge(a, b) {
    var out = {}, k;
    for (k in a) out[k] = isObj(a[k]) ? deepMerge(a[k], {}) : a[k];
    if (b) for (k in b) {
      if (b[k] === undefined) continue;
      out[k] = isObj(b[k]) && isObj(out[k]) ? deepMerge(out[k], b[k]) : (isObj(b[k]) ? deepMerge(b[k], {}) : b[k]);
    }
    return out;
  }
  /** numeric deep lerp (non-numbers snap at t>=0.5) */
  function deepLerp(a, b, t) {
    var out = {}, k, keys = {};
    for (k in a) keys[k] = 1;
    for (k in b) keys[k] = 1;
    for (k in keys) {
      var va = a[k], vb = b[k];
      if (va === undefined) out[k] = vb;
      else if (vb === undefined) out[k] = va;
      else if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, t);
      else if (isObj(va) && isObj(vb)) out[k] = deepLerp(va, vb, t);
      else out[k] = t < 0.5 ? va : vb;
    }
    return out;
  }

  // smooth periodic noise for wobble: returns fn(u) in ~[-1,1]
  function noise1(seed, key) {
    var r = rng((seed * 7919) ^ hashStr(key)), h = [];
    for (var k = 0; k < 4; k++) h.push({ f: k + 1, p: r() * Math.PI * 2, a: (0.45 + r() * 0.55) / (k + 1) });
    return function (u) {
      var s = 0;
      for (var i = 0; i < h.length; i++) s += h[i].a * Math.sin(h[i].f * u * Math.PI * 2 + h[i].p);
      return s / 1.4;
    };
  }

  // Catmull-Rom → cubic Bezier path
  function crPath(pts, closed) {
    var n = pts.length;
    if (n < 2) return '';
    var get = function (i) {
      if (closed) return pts[((i % n) + n) % n];
      return pts[clamp(i, 0, n - 1)];
    };
    var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    var segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' +
        f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + (closed ? 'Z' : '');
  }

  // wobbly ellipse points
  function ellipsePts(ctx, key, cx, cy, rx, ry, n, amp) {
    var nz = noise1(ctx.seed, key), pts = [];
    amp = (amp == null ? 1 : amp) * ctx.wobble;
    for (var i = 0; i < n; i++) {
      var u = i / n, a = u * Math.PI * 2;
      var k = 1 + (nz(u) * amp) / Math.max(rx, ry);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }

  // densify a polyline
  function densify(pts, per) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      for (var j = 0; j < per; j++) {
        var t = j / per;
        out.push([lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // wobble an open polyline along its normals
  function wobbleLine(ctx, key, pts, amp) {
    var nz = noise1(ctx.seed, key), n = pts.length, out = [];
    amp = (amp == null ? 1 : amp) * ctx.wobble;
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      var o = nz(i / Math.max(1, n - 1) * 0.5) * amp;
      out.push([pts[i][0] - dy / L * o, pts[i][1] + dx / L * o]);
    }
    return out;
  }

  // filled, tapered brush stroke along a centre line
  function taper(pts, wMax, wMin, color, extra) {
    var n = pts.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var t = i / (n - 1), w = (wMin + (wMax - wMin) * Math.pow(Math.sin(Math.PI * t), 0.55)) / 2;
      L.push([pts[i][0] - dy / len * w, pts[i][1] + dx / len * w]);
      R.push([pts[i][0] + dy / len * w, pts[i][1] - dx / len * w]);
    }
    var poly = L.concat(R.reverse());
    return '<path d="' + crPath(poly, true) + '" fill="' + color + '"' + (extra || '') + '/>';
  }

  function stroke(d, color, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + f(w) +
      '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }

  // 2D affine helpers (for anchors)
  function M(a, b, c, d, e, f2) { return [a, b, c, d, e, f2]; }
  function mul(m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }
  function apply(m, p) { return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]; }
  function rotAbout(deg, cx, cy) {
    var c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
  }
  function mstr(m) { return 'matrix(' + m.map(function (v) { return f(v * 1000) / 1000; }).join(' ') + ')'; }
  var ID = M(1, 0, 0, 1, 0, 0);

  // ─────────────────────────── expressions ───────────────────────────
  // All expression params are numeric → engine can tween with Melo.blend().
  var BASE_FACE = {
    eyeL: { open: 1, lower: 0, tilt: 0, closed: -1, size: 1 },
    eyeR: { open: 1, lower: 0, tilt: 0, closed: -1, size: 1 },
    browL: { y: 0, tilt: 0, curve: 0.35 },
    browR: { y: 0, tilt: 0, curve: 0.35 },
    pupil: 1, sparkle: 0,
    mouth: { smile: 0.5, open: 0, width: 1, round: 0, skew: 0, wavy: 0 },
    cheeks: 0.65, blush: 0, sweat: 0, seedPop: 0, leafDroop: 0,
    look: { x: 0, y: 0 }, headTilt: 0
  };
  function E(o) { return deepMerge(BASE_FACE, o); }
  var EXPRESSIONS = {
    neutral: E({}),
    happy: E({
      eyeL: { lower: 0.38, closed: 1 }, eyeR: { lower: 0.38, closed: 1 },
      browL: { y: -3, curve: 0.55 }, browR: { y: -3, curve: 0.55 },
      mouth: { smile: 1, open: 0.45, width: 1.0 }, cheeks: 0.95
    }),
    laughing: E({
      eyeL: { open: 0, closed: 1, lower: 0.3 }, eyeR: { open: 0, closed: 1, lower: 0.3 },
      browL: { y: -6, tilt: 0.25, curve: 0.6 }, browR: { y: -6, tilt: 0.25, curve: 0.6 },
      mouth: { smile: 1, open: 1, width: 1.12 }, cheeks: 1, headTilt: -4
    }),
    surprised: E({
      eyeL: { open: 1.18, size: 1.08 }, eyeR: { open: 1.18, size: 1.08 }, pupil: 0.78,
      browL: { y: -10, curve: 0.8 }, browR: { y: -10, curve: 0.8 },
      mouth: { smile: 0, open: 0.72, width: 0.95, round: 1 }, cheeks: 0.45, seedPop: 0.62
    }),
    thinking: E({
      eyeL: { open: 0.92 }, eyeR: { open: 0.72, tilt: -0.25 },
      look: { x: 0.65, y: -0.7 },
      browL: { y: -8, curve: 0.65, tilt: 0.1 }, browR: { y: 1, tilt: -0.45, curve: 0.2 },
      mouth: { smile: 0.05, width: 0.62, skew: 0.75 }, headTilt: 4, cheeks: 0.5
    }),
    wink: E({
      eyeL: { open: 1, lower: 0.2 }, eyeR: { open: 0, closed: 1, lower: 0.3 },
      browL: { y: -5, curve: 0.55 }, browR: { y: 2, tilt: -0.15, curve: 0.4 },
      mouth: { smile: 1, open: 0.28, skew: 0.25 }, cheeks: 0.95, look: { x: 0.15, y: 0 }
    }),
    sad: E({
      eyeL: { open: 0.82, tilt: 0.55 }, eyeR: { open: 0.82, tilt: 0.55 },
      look: { x: 0, y: 0.55 },
      browL: { y: -3, tilt: 0.95, curve: 0.1 }, browR: { y: -3, tilt: 0.95, curve: 0.1 },
      mouth: { smile: -0.75, width: 0.8 }, cheeks: 0.3, leafDroop: 1
    }),
    confused: E({
      eyeL: { open: 1.05 }, eyeR: { open: 0.84 }, look: { x: -0.35, y: -0.35 },
      browL: { y: -9, tilt: 0.2, curve: 0.65 }, browR: { y: 1, tilt: -0.5, curve: 0.1 },
      mouth: { smile: -0.05, width: 0.85, skew: -0.3, wavy: 1 }, sweat: 1, cheeks: 0.5
    }),
    excited: E({
      eyeL: { open: 1.12, size: 1.06 }, eyeR: { open: 1.12, size: 1.06 }, pupil: 1.12, sparkle: 1,
      browL: { y: -9, curve: 0.7 }, browR: { y: -9, curve: 0.7 },
      mouth: { smile: 1, open: 0.8, width: 1.1 }, cheeks: 1
    }),
    proud: E({
      eyeL: { open: 0, closed: -1, lower: 0 }, eyeR: { open: 0, closed: -1, lower: 0 },
      browL: { y: -6, tilt: -0.25, curve: 0.5 }, browR: { y: -6, tilt: -0.25, curve: 0.5 },
      mouth: { smile: 1, open: 0, width: 1.0, skew: 0.3 }, headTilt: -7, cheeks: 0.9
    }),
    embarrassed: E({
      eyeL: { open: 0.9, lower: 0.15 }, eyeR: { open: 0.9, lower: 0.15 }, look: { x: 0.7, y: 0.35 },
      browL: { y: -3, tilt: 0.65, curve: 0.2 }, browR: { y: -3, tilt: 0.65, curve: 0.2 },
      mouth: { smile: 0.35, width: 0.85, wavy: 0.7, skew: 0.2 }, blush: 1, sweat: 0.85, cheeks: 1
    }),
    skeptical: E({
      eyeL: { open: 0.62 }, eyeR: { open: 0.95 }, look: { x: -0.3, y: 0 },
      browL: { y: 2, tilt: -0.4, curve: 0.1 }, browR: { y: -9, tilt: 0.1, curve: 0.7 },
      mouth: { smile: -0.15, width: 0.7, skew: -0.6 }, cheeks: 0.4
    })
  };

  // mouth shapes / visemes → partial mouth params (open overrides expression)
  var MOUTHS = {
    closed: { open: 0 },
    small: { open: 0.25, width: 0.8 },
    open: { open: 0.55 },
    wide: { open: 1, width: 1.12 },
    O: { open: 0.62, round: 1, width: 0.75 },
    U: { open: 0.3, round: 1, width: 0.5 },
    E: { open: 0.35, width: 1.18, smileAdd: 0.3 },
    smile: { open: 0, smileAdd: 0.6 },
    M: { open: 0, width: 0.85, smileAdd: -0.3 }
  };

  // ───────────────────────────── poses ───────────────────────────────
  // Arms: a = shoulder angle (deg, 0 = straight down, + = outward/up, 90 = horizontal out,
  //       180 = straight up), e = elbow bend (deg, forearm angle = a + e).
  //       armL is the SCREEN-LEFT arm (when flip=false), armR screen-right; both use the
  //       same mirrored convention, so presets are symmetric.
  // Legs: a = hip angle (deg, + = outward), k = knee bend (deg, + = shin swings outward).
  // hand: 'rest' | 'fist' | 'open' | 'point' | 'thumb' | 'hold' | 'peace'
  // front: true draws that arm in front of the head (hand on chin etc.).
  var IDLE_L = { a: 17, e: -12, hand: 'rest' }, IDLE_R = { a: 17, e: -12, hand: 'rest' };
  var LEGS = { legL: { a: 8, k: 0 }, legR: { a: 8, k: 0 } };
  function P(o) { return deepMerge({ armL: IDLE_L, armR: IDLE_R, legL: LEGS.legL, legR: LEGS.legR, lean: 0, shrug: 0 }, o); }
  var POSES = {
    idle: P({}),
    wave: P({ armR: { a: 86, e: 56, hand: 'open' } }),
    pointRight: P({ armR: { a: 82, e: 10, hand: 'point' }, lean: 3 }),
    pointLeft: P({ armL: { a: 82, e: 10, hand: 'point' }, lean: -3 }),
    pointUpRight: P({ armR: { a: 118, e: 8, hand: 'point' } }),
    pointUpLeft: P({ armL: { a: 118, e: 8, hand: 'point' } }),
    explain: P({ armL: { a: 38, e: 62, hand: 'open' }, armR: { a: 38, e: 62, hand: 'open' } }),
    thinking: P({ armR: { a: 48, e: -195, hand: 'fist', front: true }, armL: { a: 52, e: -88, hand: 'rest' } }),
    thumbsUp: P({ armR: { a: 78, e: 62, hand: 'thumb' } }),
    shrug: P({ armL: { a: 42, e: 58, hand: 'open' }, armR: { a: 42, e: 58, hand: 'open' }, shrug: 1 }),
    celebrate: P({ armL: { a: 115, e: 15, hand: 'fist' }, armR: { a: 115, e: 15, hand: 'fist' },
      legL: { a: 13, k: 0 }, legR: { a: 13, k: 0 } }),
    handsOnHips: P({ armL: { a: 52, e: -88, hand: 'rest' }, armR: { a: 52, e: -88, hand: 'rest' },
      legL: { a: 11, k: 0 }, legR: { a: 11, k: 0 } }),
    present: P({ armR: { a: 70, e: 25, hand: 'open' }, lean: 2 }),
    holdMarker: P({ armR: { a: 40, e: 75, hand: 'hold' } }),
    writeRight: P({ armR: { a: 95, e: 35, hand: 'hold' }, lean: 4 })
  };

  /** walk cycle helper: phase 0..1 → partial pose (front-facing "bouncy" walk) */
  function walk(phase) {
    var s = Math.sin(phase * Math.PI * 2);
    return {
      legL: { a: 6 + s * 10, k: Math.max(0, -s) * 25 }, legR: { a: 6 - s * 10, k: Math.max(0, s) * 25 },
      armL: { a: 14 - s * 14, e: -10, hand: 'rest' }, armR: { a: 14 + s * 14, e: -10, hand: 'rest' },
      bob: -Math.abs(Math.cos(phase * Math.PI * 2)) * 4
    };
  }

  // ─────────────────────────── head drawing ──────────────────────────
  // head-local coords: centre (0,0). `turn` (-1..1) rotates features around the sphere.
  function proj(x, y, turn) {
    var rx = G.headRx, ry = G.headRy;
    var c = Math.sqrt(Math.max(0.05, 1 - (y / ry) * (y / ry)));
    var th = Math.asin(clamp(x / (rx * c), -1, 1)) + turn * 0.42;
    th = clamp(th, -1.45, 1.45);
    return { x: rx * c * Math.sin(th), k: clamp(Math.cos(th) / Math.max(0.2, Math.cos(th - turn * 0.42)), 0.5, 1.15) };
  }

  function drawEye(ctx, side, p, face, turn) {
    var bx = side * 25, by = -1;
    var pr = proj(bx, by, turn);
    var size = p.size;
    var rx = 12.6 * size * pr.k, ryBase = 16 * size;
    var o = p.open;
    var ry = ryBase * Math.max(1, o);
    var ex = pr.x, ey = by - (o > 1 ? (ry - ryBase) * 0.6 : 0);
    var oc = Math.min(1, o);
    var lidBase = ey - ry + (1 - oc) * 2 * ry;
    var lowBase = ey + ry;
    var tilt = p.tilt, lower = p.lower;
    function lid(x) {
      var q = (x - ex) / rx;
      return lidBase + tilt * (q * side) * ry * 0.5 - (1 - q * q) * ry * 0.12 * oc;
    }
    function low(x) {
      var q = (x - ex) / rx;
      return lowBase - lower * ry * (0.55 + 0.75 * (1 - q * q));
    }
    var minGap = Infinity;
    for (var s = -0.6; s <= 0.6; s += 0.3) {
      var xx = ex + s * rx; minGap = Math.min(minGap, low(xx) - lid(xx));
    }
    var key = 'eye' + side, out = '';
    if (minGap < 3.2) {
      // closed eye: arc. closed>0 → ∩ (happy ^), closed<0 → ∪ (relaxed)
      var yc = Math.min(ey + ry * 0.15, (lid(ex) + low(ex)) / 2);
      var cc = p.closed, pts = [];
      for (var i = 0; i <= 10; i++) {
        var q = -1 + i / 5, x = ex + q * rx * 1.02;
        var bend = cc > 0 ? (1 - Math.pow(Math.abs(q), 1.6)) : (1 - q * q);
        pts.push([x, yc - cc * ry * 0.42 * bend + tilt * q * side * ry * 0.3]);
      }
      pts = wobbleLine(ctx, key + 'c', pts, 0.4);
      return taper(pts, 5.6, 2.4, PALETTE.ink);
    }
    var raw = ellipsePts(ctx, key, ex, ey, rx, ry, 30, 0.35), pts2 = [];
    for (var j = 0; j < raw.length; j++) {
      var X = raw[j][0], Y = raw[j][1];
      pts2.push([X, clamp(Y, lid(X), Math.max(lid(X), low(X)))]);
    }
    var d = crPath(pts2, true), cid = ctx.id + '-eye' + (side < 0 ? 'L' : 'R');
    out += '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath>';
    out += '<path d="' + d + '" fill="' + PALETTE.white + '"/>';
    // pupil
    var look = face.look;
    var pRad = 8.1 * face.pupil * size * (o > 1 ? 0.95 : 1);
    var px = ex + clamp(look.x, -1, 1) * rx * 0.42, py = ey + clamp(look.y, -1, 1) * ry * 0.38 + (1 - oc) * ry * 0.25;
    var pk = pr.k; // foreshorten
    out += '<g clip-path="url(#' + cid + ')">';
    out += '<ellipse cx="' + f(px) + '" cy="' + f(py) + '" rx="' + f(pRad * pk) + '" ry="' + f(pRad) + '" fill="' + PALETTE.ink + '"/>';
    var sh = 1 + face.sparkle * 0.35;
    out += '<circle cx="' + f(px + 2.7 * size) + '" cy="' + f(py - 3.1 * size) + '" r="' + f(2.75 * size * sh) + '" fill="#fff"/>';
    out += '<circle cx="' + f(px - 2.6 * size) + '" cy="' + f(py + 2.9 * size) + '" r="' + f(1.25 * size * sh) + '" fill="#fff"/>';
    if (face.sparkle > 0.05) {
      var sx = px - 2.2 * size, sy = py - 3.6 * size, sr = 2.6 * face.sparkle * size;
      out += '<path d="M' + f(sx) + ' ' + f(sy - sr) + 'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx + sr) + ' ' + f(sy) +
        'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx) + ' ' + f(sy + sr) + 'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx - sr) + ' ' + f(sy) +
        'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx) + ' ' + f(sy - sr) + 'Z" fill="#fff"/>';
    }
    out += '</g>';
    out += stroke(d, PALETTE.ink, 3.2);
    // upper lid accent (a thicker marker stroke along the lid edge)
    var lidPts = [];
    for (var m = 0; m <= 8; m++) {
      var qq = -0.92 + m * 0.23, X2 = ex + qq * rx;
      var yy = Math.max(lid(X2), ey - ry * Math.sqrt(Math.max(0, 1 - qq * qq)));
      lidPts.push([X2, Math.min(yy, low(X2))]);
    }
    out += taper(wobbleLine(ctx, key + 'lid', lidPts, 0.3), 4.4, 2.6, PALETTE.ink);
    return out;
  }

  function drawBrow(ctx, side, b, turn) {
    var bx = side * 25, by = -31 + b.y;
    var pts = [], len = 21;
    for (var i = 0; i <= 6; i++) {
      var t = i / 6, q = (t - 0.5) * 2;            // -1 inner … +1 outer
      var x = bx + side * q * len / 2;
      var y = by - b.tilt * (-q) * 5 - b.curve * 4.5 * (1 - q * q);
      var pr = proj(x, y, turn);
      pts.push([pr.x, y]);
    }
    pts = wobbleLine(ctx, 'brow' + side, pts, 0.35);
    return taper(pts, 6.2, 2.6, PALETTE.ink);
  }

  function seedShape(cx, cy, s, rotDeg, color) {
    // teardrop seed, pointy end up (before rotation)
    var d = 'M0 ' + f(-4.6 * s) + 'C' + f(2.6 * s) + ' ' + f(-1.6 * s) + ' ' + f(2.7 * s) + ' ' + f(2.8 * s) + ' 0 ' + f(3 * s) +
      'C' + f(-2.7 * s) + ' ' + f(2.8 * s) + ' ' + f(-2.6 * s) + ' ' + f(-1.6 * s) + ' 0 ' + f(-4.6 * s) + 'Z';
    return '<g transform="translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(rotDeg) + ')"><path d="' + d + '" fill="' + color + '"/>' +
      '<ellipse cx="' + f(-0.8 * s) + '" cy="' + f(-0.6 * s) + '" rx="' + f(0.6 * s) + '" ry="' + f(1.2 * s) + '" fill="#fff" opacity="0.55"/></g>';
  }

  function drawMouth(ctx, face, turn) {
    var m = face.mouth;
    var open = clamp(m.open, 0, 1.2), round = clamp(m.round, 0, 1), smile = clamp(m.smile, -1, 1.2);
    var cy = 27, cx0 = m.skew * 7;
    var pr = proj(cx0, cy, turn);
    var w = 16.5 * m.width * (1 + 0.1 * open) * (1 - 0.42 * round) * pr.k;
    var cx = pr.x;
    var c = smile * 5.5 * (1 - round);                 // corner lift
    var skewY = m.skew * 2.4;
    var cornerL = [cx - w, cy - c + skewY], cornerR = [cx + w, cy - c - skewY];
    var key = 'mouth';
    if (open < 0.05) {
      var pts = [], n = 12;
      for (var i = 0; i <= n; i++) {
        var q = -1 + 2 * i / n, x = cx + q * w;
        var y = lerp(cornerL[1], cornerR[1], (q + 1) / 2) + c * 1.15 * (1 - q * q);
        y += m.wavy * 2.3 * Math.sin(q * Math.PI * 2.2);
        pts.push([x, y]);
      }
      pts = wobbleLine(ctx, key, pts, 0.35);
      var o = taper(pts, 4.8, 2.6, PALETTE.ink);
      if (smile > 0.55 && m.wavy < 0.3) { // little dimple ticks at the corners
        var dl = pts[0], dr = pts[pts.length - 1];
        o += stroke('M' + f(dl[0] - 2.2) + ' ' + f(dl[1] - 2.6) + 'Q' + f(dl[0] - 0.8) + ' ' + f(dl[1] + 0.2) + ' ' + f(dl[0] - 2.6) + ' ' + f(dl[1] + 2.4), PALETTE.ink, 2.2);
        o += stroke('M' + f(dr[0] + 2.2) + ' ' + f(dr[1] - 2.6) + 'Q' + f(dr[0] + 0.8) + ' ' + f(dr[1] + 0.2) + ' ' + f(dr[0] + 2.6) + ' ' + f(dr[1] + 2.4), PALETTE.ink, 2.2);
      }
      return o;
    }
    var H = 3.5 + open * 19;
    var topAmp = lerp(c * 0.55, -H * 0.42, round);      // + means top lip dips down in the middle
    var botAmp = lerp(H + Math.max(0, c) * 0.4, H * 0.58, round);
    var yC = cy - c;
    if (round > 0) yC = lerp(yC, cy + H * 0.05, round);
    var top = [], bot = [], N = 14;
    for (var j = 0; j <= N; j++) {
      var qq = -1 + 2 * j / N, xx = cx + qq * w;
      var base = lerp(yC + skewY, yC - skewY, (qq + 1) / 2);
      var ell = Math.sqrt(Math.max(0, 1 - qq * qq));
      var wav = m.wavy * 1.6 * Math.sin(qq * Math.PI * 2);
      top.push([xx, base + topAmp * lerp(1 - qq * qq, ell, round) + wav]);
      bot.push([xx, base + botAmp * lerp(Math.pow(ell, 0.85), ell, round) + wav * 0.5]);
    }
    var poly = top.concat(bot.slice(1, N).reverse());
    poly = poly.map(function (p, i) {
      var nz = noise1(ctx.seed, 'mw' + (i % 5));
      return [p[0] + nz(0.1) * 0.25 * ctx.wobble, p[1] + nz(0.6) * 0.25 * ctx.wobble];
    });
    var d = crPath(poly, true), cid = ctx.id + '-mouth', out = '';
    out += '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath>';
    out += '<path d="' + d + '" fill="' + PALETTE.flesh + '"/>';
    out += '<g clip-path="url(#' + cid + ')">';
    // inner shadow under the upper lip
    var tp = top.map(function (p) { return [p[0], p[1] + Math.min(5, H * 0.22)]; });
    out += '<path d="' + crPath(top.concat(tp.slice().reverse()), true) + '" fill="' + PALETTE.fleshDark + '" opacity="0.55"/>';
    // seeds — appear as the mouth opens
    var seedVis = clamp((H - 7) / 7, 0, 1);
    if (seedVis > 0) {
      var S = [[-0.48, 0.62, -22], [0.04, 0.78, 6], [0.5, 0.58, 24], [-0.12, 0.42, -6]];
      for (var k = 0; k < S.length; k++) {
        if (k === 3 && (H < 17 || round > 0.5)) continue;
        var u = S[k][0], idx = Math.round((u + 1) / 2 * N);
        var yT = top[idx][1], yB = bot[idx][1];
        var sx = cx + u * w * 0.95, sy = lerp(yT, yB, S[k][1]);
        out += seedShape(sx, sy, (0.75 + 0.25 * seedVis) * clamp(w / 15, 0.65, 1.05), S[k][2], PALETTE.seed);
      }
    }
    // pale rind band (watermelon slice look)
    out += '<path d="' + d + '" fill="none" stroke="' + PALETTE.pith + '" stroke-width="' + f(clamp(H * 0.2, 2.4, 4.2)) + '"/>';
    out += '</g>';
    out += stroke(d, PALETTE.ink, 3.4);
    return out;
  }

  function drawStripes(ctx, turn) {
    var rx = G.headRx, ry = G.headRy, out = '';
    var bands = [-90, -60, -30, 0, 30, 60, 90, 120, -120];
    for (var b = 0; b < bands.length; b++) {
      var phi = rad(bands[b]) + turn * 0.42;
      if (Math.cos(phi) < 0.02) continue;
      var r = rng(hashStr('stripe' + b) ^ (ctx.seed * 31));
      var ph = r() * 6.28, L = [], R = [], N = 26;
      for (var i = 0; i <= N; i++) {
        var y = -ry * 1.02 + (2.04 * ry) * i / N;
        var cl = Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
        var x = rx * Math.sin(phi) * cl;
        var hw = (7.2 * Math.cos(phi) + 1.2) * (0.25 + 0.75 * cl);
        // zig-zag edge: triangle-ish wave
        var zz = Math.asin(Math.sin(y * 0.42 + ph)) / 1.5708;
        var zz2 = Math.asin(Math.sin(y * 0.42 + ph + 1.7)) / 1.5708;
        var amp = 3.1 * cl * Math.cos(phi) + 0.6;
        L.push([x - hw + zz * amp, y]);
        R.push([x + hw + zz2 * amp, y]);
      }
      out += '<path d="' + crPath(L.concat(R.reverse()), true) + '" fill="' + PALETTE.stripe + '"/>';
    }
    return out;
  }

  function drawStemLeaf(ctx, face, layer) {
    var ry = G.headRy, out = '';
    var top = [3, -ry + 3];
    if (layer === 'back') {
      // stem
      var st = wobbleLine(ctx, 'stem', [[top[0], top[1] + 6], [top[0] + 1, top[1] - 4], [top[0] - 1.5, top[1] - 12]], 0.3);
      out += stroke(crPath(st, false), PALETTE.ink, 9.6);
      out += stroke(crPath(st, false), PALETTE.stem, 5.2);
      return out;
    }
    // curly tendril (left)
    var Sx = top[0] - 2, Sy = top[1] - 9, tp = [[Sx + 1, Sy + 4]];
    for (var i = 0; i <= 30; i++) {
      var t = i / 30, a = t * Math.PI * 3.3, rr = 6.5 * (1 - 0.72 * t);
      tp.push([Sx - 6.5 + Math.cos(a) * rr - t * 2, Sy - 4 - Math.sin(a) * rr]);
    }
    out += stroke(crPath(wobbleLine(ctx, 'tendril', tp, 0.25), false), PALETTE.ink, 2.7);
    // leaf (right) — droops with face.leafDroop
    var ang = -38 + face.leafDroop * 72;
    var lx = top[0] + 2, ly = top[1] - 3;
    var lw = 33, lh = 8.5;
    var leafPts = [];
    for (var j = 0; j <= 16; j++) {
      var u = j / 16;
      leafPts.push([u * lw, -Math.sin(Math.PI * Math.pow(u, 0.8)) * lh - u * 2]);
    }
    for (var k = 15; k >= 1; k--) {
      var v = k / 16;
      leafPts.push([v * lw, Math.sin(Math.PI * Math.pow(v, 0.8)) * lh * 0.95 - v * 2]);
    }
    var nz = noise1(ctx.seed, 'leaf');
    leafPts = leafPts.map(function (p, idx) { return [p[0], p[1] + nz(idx / leafPts.length) * 0.5 * ctx.wobble]; });
    var ld = crPath(leafPts, true);
    out += '<g transform="translate(' + f(lx) + ' ' + f(ly) + ') rotate(' + f(ang) + ')">';
    out += '<path d="' + ld + '" fill="' + PALETTE.leaf + '" stroke="' + PALETTE.ink + '" stroke-width="3" stroke-linejoin="round"/>';
    out += stroke('M3 -0.6Q' + f(lw * 0.5) + ' -3 ' + f(lw * 0.86) + ' ' + f(-2.2), PALETTE.leafDark, 2);
    out += stroke('M' + f(lw * 0.35) + ' -2Q' + f(lw * 0.42) + ' -5 ' + f(lw * 0.48) + ' -6.5', PALETTE.leafDark, 1.2);
    out += stroke('M' + f(lw * 0.55) + ' -2.4Q' + f(lw * 0.6) + ' 0.5 ' + f(lw * 0.66) + ' 2.6', PALETTE.leafDark, 1.2);
    out += '<path d="M6 -3.5Q' + f(lw * 0.3) + ' -8 ' + f(lw * 0.5) + ' -7" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round"/>';
    out += '</g>';
    return out;
  }

  function drawFx(ctx, face) {
    var out = '', rx = G.headRx, ry = G.headRy;
    if (face.sweat > 0.02) {
      var s = face.sweat, x = rx * 0.8, y = -ry * 0.42;
      var d = 'M' + f(x) + ' ' + f(y - 11 * s) + 'C' + f(x + 5 * s) + ' ' + f(y - 3 * s) + ' ' + f(x + 7 * s) + ' ' + f(y + 2 * s) + ' ' + f(x + 4.5 * s) + ' ' + f(y + 5 * s) +
        'C' + f(x + 2 * s) + ' ' + f(y + 8 * s) + ' ' + f(x - 3 * s) + ' ' + f(y + 7.5 * s) + ' ' + f(x - 4.5 * s) + ' ' + f(y + 4 * s) +
        'C' + f(x - 6.5 * s) + ' ' + f(y) + ' ' + f(x - 3 * s) + ' ' + f(y - 4 * s) + ' ' + f(x) + ' ' + f(y - 11 * s) + 'Z';
      out += '<path d="' + d + '" fill="' + PALETTE.sweat + '" stroke="' + PALETTE.ink + '" stroke-width="2.6" stroke-linejoin="round"/>';
      out += stroke('M' + f(x - 2 * s) + ' ' + f(y + 1 * s) + 'Q' + f(x - 2.4 * s) + ' ' + f(y + 3.5 * s) + ' ' + f(x - 0.5 * s) + ' ' + f(y + 4.5 * s), '#fff', 1.8);
    }
    if (face.seedPop > 0.02) {
      var t = clamp(face.seedPop, 0, 1);
      var p0 = [-20, -ry + 6], p1 = [-38, -ry - 54], p2 = [-64, -ry - 34];
      var bx = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
      var by = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
      out += seedShape(bx, by, 1.6, 30 - t * 260, PALETTE.seed);
      // motion arc & pop burst
      if (t < 0.95) {
        var mt = Math.max(0, t - 0.35), mx = (1 - mt) * (1 - mt) * p0[0] + 2 * (1 - mt) * mt * p1[0] + mt * mt * p2[0];
        var my = (1 - mt) * (1 - mt) * p0[1] + 2 * (1 - mt) * mt * p1[1] + mt * mt * p2[1];
        out += stroke('M' + f(mx + 4) + ' ' + f(my + 6) + 'Q' + f((mx + bx) / 2 + 5) + ' ' + f((my + by) / 2 + 2) + ' ' + f(bx + 7) + ' ' + f(by + 3), PALETTE.ink, 2.2, ' opacity="0.8"');
        out += stroke('M' + f(mx - 3) + ' ' + f(my + 8) + 'Q' + f((mx + bx) / 2 - 2) + ' ' + f((my + by) / 2 + 7) + ' ' + f(bx + 2) + ' ' + f(by + 8), PALETTE.ink, 2.2, ' opacity="0.6"');
      }
      if (t < 0.8) {
        var a = 1 - t / 0.8;
        [[-50, 9], [-15, 11], [20, 9]].forEach(function (r2) {
          var aa = rad(r2[0] - 105), r0 = 8, r1 = 8 + r2[1] * a;
          out += stroke('M' + f(p0[0] + Math.cos(aa) * r0) + ' ' + f(p0[1] + Math.sin(aa) * r0) + 'L' + f(p0[0] + Math.cos(aa) * r1) + ' ' + f(p0[1] + Math.sin(aa) * r1), PALETTE.ink, 2.4, ' opacity="' + f(a) + '"');
        });
      }
    }
    return out;
  }

  function drawHead(ctx, face) {
    var rx = G.headRx, ry = G.headRy, turn = ctx.turn, out = '';
    var pts = ellipsePts(ctx, 'head', 0, 0, rx, ry, 44, 1.1);
    var d = crPath(pts, true), cid = ctx.id + '-head', gid = ctx.id + '-shade', bid = ctx.id + '-blush';
    out += '<defs><clipPath id="' + cid + '"><path d="' + d + '"/></clipPath>' +
      '<radialGradient id="' + gid + '" cx="0.36" cy="0.3" r="0.78"><stop offset="0.55" stop-color="#103d14" stop-opacity="0"/><stop offset="1" stop-color="#103d14" stop-opacity="0.32"/></radialGradient>' +
      '<radialGradient id="' + bid + '"><stop offset="0.35" stop-color="' + PALETTE.cheek + '" stop-opacity="0.95"/><stop offset="1" stop-color="' + PALETTE.cheek + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + ctx.id + '-lt"><stop offset="0" stop-color="' + PALETTE.rindLight + '" stop-opacity="0.42"/><stop offset="1" stop-color="' + PALETTE.rindLight + '" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    out += drawStemLeaf(ctx, face, 'back');
    out += '<path d="' + d + '" fill="' + PALETTE.rind + '"/>';
    out += '<g clip-path="url(#' + cid + ')">';
    out += drawStripes(ctx, turn);
    // soft light tint top-left
    out += '<ellipse cx="' + f(-rx * 0.32) + '" cy="' + f(-ry * 0.42) + '" rx="' + f(rx * 0.55) + '" ry="' + f(ry * 0.42) + '" fill="url(#' + ctx.id + '-lt)"/>';
    out += '<ellipse cx="0" cy="0" rx="' + rx + '" ry="' + ry + '" fill="url(#' + gid + ')"/>';
    // marker hatch shading, lower right
    var hatch = '';
    for (var i = 0; i < 4; i++) {
      var ha = rad(28 + i * 11), hx = Math.cos(ha) * rx * 0.86, hy = Math.sin(ha) * ry * 0.86;
      hatch += 'M' + f(hx - 7) + ' ' + f(hy + 9) + 'L' + f(hx + 7) + ' ' + f(hy - 9);
    }
    out += stroke(hatch, '#0f3a14', 3, ' opacity="0.2"');
    out += '</g>';
    // shine (white marker highlight strokes, upper-left)
    var sh = [];
    for (var a = 200; a <= 238; a += 6) sh.push([Math.cos(rad(a)) * (rx - 10), Math.sin(rad(a)) * (ry - 10)]);
    out += stroke(crPath(wobbleLine(ctx, 'shine', sh, 0.3), false), '#fff', 5.2, ' opacity="0.8"');
    out += '<circle cx="' + f(Math.cos(rad(247)) * (rx - 12)) + '" cy="' + f(Math.sin(rad(247)) * (ry - 12)) + '" r="2.7" fill="#fff" opacity="0.8"/>';
    // outline, with a slight marker overshoot
    out += stroke(d, PALETTE.ink, G.outlineW);
    // cheeks
    if (face.blush > 0.02) {
      // blush band across the face (pink, opaque enough not to go muddy on green)
      var bb = clamp(face.blush, 0, 1);
      out += '<ellipse cx="' + f(proj(0, 16, turn).x) + '" cy="16" rx="66" ry="22" fill="url(#' + bid + ')" opacity="' + f(bb) + '"/>';
    }
    var ch = clamp(face.cheeks + face.blush * 0.6, 0, 1.6);
    if (face.cheeks > 0.02 || face.blush > 0.02) {
      [-1, 1].forEach(function (s) {
        var pr = proj(s * 45, 16, turn);
        var cs = 0.7 + 0.3 * clamp(face.cheeks, 0, 1), crx = (10.5 * cs + face.blush * 5) * pr.k, cry = 6.3 * cs + face.blush * 2.6;
        out += '<ellipse cx="' + f(pr.x) + '" cy="16" rx="' + f(crx) + '" ry="' + f(cry) + '" fill="' + PALETTE.cheek + '" opacity="' + f(clamp(0.78 + 0.2 * ch, 0, 0.97)) + '"/>';
        if (face.blush > 0.4) {
          var bl = '';
          for (var j = -1; j <= 1; j++) bl += 'M' + f(pr.x + j * 5 + 2) + ' ' + f(12.5) + 'L' + f(pr.x + j * 5 - 1.5) + ' ' + f(19.5);
          out += stroke(bl, '#D9455A', 1.8, ' opacity="' + f(clamp((face.blush - 0.4) * 1.6, 0, 1)) + '"');
        }
      });
    }
    // face
    out += drawBrow(ctx, -1, face.browL, turn) + drawBrow(ctx, 1, face.browR, turn);
    out += drawEye(ctx, -1, face.eyeL, face, turn) + drawEye(ctx, 1, face.eyeR, face, turn);
    out += drawMouth(ctx, face, turn);
    out += drawStemLeaf(ctx, face, 'front');
    out += drawFx(ctx, face);
    return out;
  }

  // ─────────────────────────── body drawing ──────────────────────────
  function limbDir(side, deg) { return [side * Math.sin(rad(deg)), Math.cos(rad(deg))]; }

  function drawHand(ctx, key, H, dir, type, side, prop) {
    var px = -dir[1] * side, py = dir[0] * side; // perpendicular, mirrored per side
    function L(lx, ly) { return [H[0] + dir[0] * ly + px * lx, H[1] + dir[1] * ly + py * lx]; }
    var ink = PALETTE.ink, out = '';
    function dot(p, r) { return '<path d="' + crPath(ellipsePts(ctx, key + 'd', p[0], p[1], r, r, 10, 0.25), true) + '" fill="' + ink + '"/>'; }
    function finger(a, len, w, from) {
      var o = from || L(0, 5), ar = rad(a);
      var dx = dir[0] * Math.cos(ar) + px * Math.sin(ar), dy = dir[1] * Math.cos(ar) + py * Math.sin(ar);
      return stroke('M' + f(o[0]) + ' ' + f(o[1]) + 'L' + f(o[0] + dx * len) + ' ' + f(o[1] + dy * len), ink, w || 3.6);
    }
    if (prop === 'marker' || type === 'hold') {
      // marker pen held in the fist, tip forward
      var ma = Math.atan2(dir[1], dir[0]) - side * rad(55), c = Math.cos(ma), s = Math.sin(ma), C = L(0, 5);
      var mk = function (a, b) { return [C[0] + c * a - s * b, C[1] + s * a + c * b]; };
      var body = [mk(-13, -3.6), mk(9, -3.6), mk(9, 3.6), mk(-13, 3.6)];
      out += '<path d="M' + body.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z" fill="#fff" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>';
      var cap = [mk(-13, -3.8), mk(-6, -3.8), mk(-6, 3.8), mk(-13, 3.8)];
      out += '<path d="M' + cap.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z" fill="' + PALETTE.marker + '" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>';
      var tip = [mk(9, -2.4), mk(15, -0.9), mk(15, 0.9), mk(9, 2.4)];
      out += '<path d="M' + tip.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z" fill="' + ink + '" stroke="' + ink + '" stroke-width="1.6" stroke-linejoin="round"/>';
      out += dot(L(0, 4.5), 6.6);
      ctx.anchors[key + 'Tip'] = mk(15, 0);
      return out;
    }
    switch (type) {
      case 'fist': out += dot(L(0, 4.5), 6.8); break;
      case 'open':
        out += dot(L(0, 5), 6.1);
        out += finger(-32, 10.5, 4) + finger(0, 12, 4) + finger(32, 10.5, 4) + finger(-88, 8.5, 4, L(0, 3));
        break;
      case 'point':
        out += dot(L(0, 4.5), 6.2);
        out += finger(0, 15, 3.9, L(0, 6));
        out += finger(-80, 6.5, 3.6, L(0, 3));
        break;
      case 'peace':
        out += dot(L(0, 4.5), 6.2) + finger(-14, 14, 3.8, L(0, 6)) + finger(14, 14, 3.8, L(0, 6));
        break;
      case 'thumb':
        var Cc = L(0, 4.5);
        out += dot(Cc, 7);
        out += stroke('M' + f(Cc[0]) + ' ' + f(Cc[1] - 3) + 'L' + f(Cc[0] + 0.5) + ' ' + f(Cc[1] - 16), ink, 5.6);
        break;
      default: out += dot(L(0, 3.5), 5.6);
    }
    return out;
  }

  function drawArm(ctx, name, side, arm, S) {
    var d1 = limbDir(side, arm.a), d2 = limbDir(side, arm.a + arm.e);
    var El = [S[0] + d1[0] * G.upperArm, S[1] + d1[1] * G.upperArm];
    var H = [El[0] + d2[0] * G.foreArm, El[1] + d2[1] * G.foreArm];
    var pts = [S, [lerp(S[0], El[0], 0.4), lerp(S[1], El[1], 0.4)], [lerp(S[0], El[0], 0.8), lerp(S[1], El[1], 0.8)], El,
      [lerp(El[0], H[0], 0.2), lerp(El[1], H[1], 0.2)], [lerp(El[0], H[0], 0.6), lerp(El[1], H[1], 0.6)], H];
    pts = wobbleLine(ctx, name, pts, 0.7);
    ctx.anchors[name + 'Hand'] = H; ctx.anchors[name + 'Elbow'] = El;
    return stroke(crPath(pts, false), PALETTE.ink, G.limbW) + drawHand(ctx, name, H, d2, arm.hand || 'rest', side, arm.prop);
  }

  function drawLeg(ctx, name, side, leg, Hp) {
    var d1 = limbDir(side, leg.a), d2 = limbDir(side, leg.a + (leg.k || 0));
    var K = [Hp[0] + d1[0] * G.thigh, Hp[1] + d1[1] * G.thigh];
    var A = [K[0] + d2[0] * G.shin, K[1] + d2[1] * G.shin];
    var pts = wobbleLine(ctx, name, [Hp, [lerp(Hp[0], K[0], 0.5), lerp(Hp[1], K[1], 0.5)], K, [lerp(K[0], A[0], 0.5), lerp(K[1], A[1], 0.5)], A], 0.6);
    var out = stroke(crPath(pts, false), PALETTE.ink, G.limbW);
    // shoe: rounded sneaker pointing outward
    var x = A[0], y = A[1] + 1.5, s = side, rot = (leg.foot || 0);
    var shoe = [[x - s * 6, y - 4], [x + s * 4, y - 6.2], [x + s * 12.5, y - 3.6], [x + s * 15, y + 1.8], [x + s * 11, y + 4.6], [x - s * 6.5, y + 4.6], [x - s * 8.2, y + 0.4]];
    out += '<g transform="rotate(' + f(rot * s) + ' ' + f(x) + ' ' + f(y) + ')">';
    out += '<path d="' + crPath(wobbleLine(ctx, name + 'shoe', shoe, 0.2), true) + '" fill="' + PALETTE.ink + '"/>';
    out += stroke('M' + f(x - s * 5.5) + ' ' + f(y + 2.2) + 'L' + f(x + s * 11) + ' ' + f(y + 2.2), '#fff', 1.4, ' opacity="0.55"');
    out += '</g>';
    ctx.anchors[name + 'Foot'] = [x, y + 4.6];
    return out;
  }

  function drawScarf(ctx, wind, shrugDy) {
    var y = G.neckY + 7 + shrugDy * 0.5, out = '', w = wind || 0;
    function tail(key, x0, y0, len, ang, wid) {
      var a = rad(ang + w * 40), pts = [];
      for (var i = 0; i <= 6; i++) {
        var t = i / 6, wave = Math.sin(t * 3.5 + w * 2) * (1.2 + w * 3) * t;
        pts.push([x0 + Math.sin(a) * len * t + Math.cos(a) * wave, y0 + Math.cos(a) * len * t - Math.sin(a) * wave]);
      }
      var L = [], R = [];
      for (var j = 0; j < pts.length; j++) {
        var k = j / (pts.length - 1), hw = wid * (1 - 0.12 * k);
        L.push([pts[j][0] - hw * Math.cos(a), pts[j][1] + hw * Math.sin(a)]);
        R.push([pts[j][0] + hw * Math.cos(a), pts[j][1] - hw * Math.sin(a)]);
      }
      var poly = wobbleLine(ctx, key, L.concat(R.reverse()), 0.2), o = '';
      o += '<path d="' + crPath(poly, true) + '" fill="' + PALETTE.scarf + '" stroke="' + PALETTE.ink + '" stroke-width="3" stroke-linejoin="round"/>';
      var c = pts[4], hw2 = wid * 0.78;
      o += stroke('M' + f(c[0] - hw2 * Math.cos(a)) + ' ' + f(c[1] + hw2 * Math.sin(a)) + 'L' + f(c[0] + hw2 * Math.cos(a)) + ' ' + f(c[1] - hw2 * Math.sin(a)), PALETTE.scarfDark, 3);
      var end = pts[pts.length - 1];
      for (var fI = -1; fI <= 1; fI++) {
        var fx = end[0] + fI * wid * 0.62 * Math.cos(a), fy = end[1] - fI * wid * 0.62 * Math.sin(a);
        o += stroke('M' + f(fx) + ' ' + f(fy) + 'L' + f(fx + Math.sin(a) * 4.5) + ' ' + f(fy + Math.cos(a) * 4.5), PALETTE.ink, 2.2);
      }
      return o;
    }
    out += tail('scarfT2', 10, y + 5, 19, 40, 4.2);
    // chunky band wrapped under the chin (sagging crescent)
    var cl = [];
    for (var i = 0; i <= 10; i++) { var q = -1 + i / 5; cl.push([q * 20, y + 1 + 4.5 * (1 - q * q)]); }
    var Lb = [], Rb = [];
    for (var j = 0; j < cl.length; j++) {
      var q2 = -1 + j / 5, th = 4.6 + 1.2 * (1 - q2 * q2);
      var dx = (j < cl.length - 1 ? cl[j + 1][0] - cl[j][0] : cl[j][0] - cl[j - 1][0]), dy = (j < cl.length - 1 ? cl[j + 1][1] - cl[j][1] : cl[j][1] - cl[j - 1][1]);
      var L2 = Math.hypot(dx, dy);
      Lb.push([cl[j][0] - dy / L2 * th, cl[j][1] + dx / L2 * th]);
      Rb.push([cl[j][0] + dy / L2 * th, cl[j][1] - dx / L2 * th]);
    }
    var band = wobbleLine(ctx, 'scarfB', Lb.concat(Rb.reverse()), 0.25);
    out += '<path d="' + crPath(band, true) + '" fill="' + PALETTE.scarf + '" stroke="' + PALETTE.ink + '" stroke-width="3.2" stroke-linejoin="round"/>';
    // knit ticks
    var ticks = '';
    [-0.62, -0.25].forEach(function (q) { var c = [q * 20, y + 1 + 4.5 * (1 - q * q)]; ticks += 'M' + f(c[0] - 0.8) + ' ' + f(c[1] - 3.2) + 'L' + f(c[0] + 0.8) + ' ' + f(c[1] + 3.2); });
    out += stroke(ticks, PALETTE.scarfDark, 2.4);
    out += tail('scarfT1', 7, y + 6, 27, 18, 5.0);
    out += '<path d="' + crPath(ellipsePts(ctx, 'knot', 8.5, y + 5.5, 5.6, 5, 10, 0.2), true) + '" fill="' + PALETTE.scarf + '" stroke="' + PALETTE.ink + '" stroke-width="2.8"/>';
    return out;
  }

  // ───────────────────────────── main API ────────────────────────────
  var counter = 0;

  function resolveFace(opts) {
    var ex = opts.expression;
    var face;
    if (typeof ex === 'string') face = EXPRESSIONS[ex] || EXPRESSIONS.neutral;
    else if (isObj(ex)) face = deepMerge(BASE_FACE, ex);
    else face = EXPRESSIONS.neutral;
    if (opts.face) face = deepMerge(face, opts.face);
    face = deepMerge(face, {});
    // mouth shape / lip sync
    var mshape = opts.mouth;
    if (typeof mshape === 'string' && MOUTHS[mshape]) {
      var ms = MOUTHS[mshape];
      for (var k in ms) if (k !== 'smileAdd') face.mouth[k] = ms[k];
      if (ms.smileAdd) face.mouth.smile = clamp(face.mouth.smile + ms.smileAdd, -1, 1.1);
    } else if (typeof mshape === 'number') opts.mouthOpen = mshape;
    if (typeof opts.mouthOpen === 'number') {
      var mo = clamp(opts.mouthOpen, 0, 1);
      face.mouth.open = mo;
      // talking shapes: slightly narrower & less smiley as the jaw drops, so a single
      // 0..1 amplitude produces varied, natural shapes
      face.mouth.width *= 1 - 0.1 * Math.sin(mo * Math.PI) * (1 - face.mouth.round);
      face.mouth.round = Math.max(face.mouth.round, 0.25 * Math.sin(mo * Math.PI));
      face.mouth.smile = lerp(face.mouth.smile, Math.max(0.35, face.mouth.smile * 0.7), mo);
    }
    if (typeof opts.blink === 'number' && opts.blink > 0) {
      var b = clamp(opts.blink, 0, 1);
      ['eyeL', 'eyeR'].forEach(function (e) {
        face[e].open = face[e].open * (1 - b);
        if (b > 0.5 && face[e].closed > 0 && face[e].open < 0.1) { /* keep happy arcs */ } else if (b > 0.5) face[e].closed = -0.35;
      });
    }
    if (opts.look) face.look = { x: opts.look.x != null ? opts.look.x : face.look.x, y: opts.look.y != null ? opts.look.y : face.look.y };
    ['blush', 'sweat', 'seedPop', 'leafDroop', 'cheeks'].forEach(function (k) { if (typeof opts[k] === 'number') face[k] = opts[k]; });
    return face;
  }

  function resolvePose(opts) {
    var p = opts.pose;
    var pose;
    if (typeof p === 'string') pose = POSES[p] || POSES.idle;
    else if (isObj(p)) pose = deepMerge(POSES.idle, p);
    else pose = POSES.idle;
    ['armL', 'armR', 'legL', 'legR'].forEach(function (k) { if (opts[k]) pose = deepMerge(pose, (function () { var o = {}; o[k] = opts[k]; return o; })()); });
    if (opts.prop) {
      var which = opts.propHand || 'armR';
      pose = deepMerge(pose, {}); pose[which] = deepMerge(pose[which], { prop: opts.prop });
    }
    return pose;
  }

  /**
   * Render Melo as an SVG <g> string.
   * @returns {{svg:string, anchors:Object, face:Object, pose:Object}}
   */
  function render(opts) {
    opts = opts || {};
    var ctx = {
      seed: (opts.seed == null ? 1 : opts.seed) | 0,
      wobble: opts.wobble == null ? 1 : opts.wobble,
      id: opts.id || ('melo' + (++counter)),
      turn: clamp(opts.turn || 0, -1, 1),
      anchors: {}
    };
    var face = resolveFace(opts);
    var pose = resolvePose(opts);
    var scale = opts.scale == null ? 1 : opts.scale;
    var flip = !!opts.flip;
    var x = opts.x || 0, y = opts.y || 0;
    var headTilt = face.headTilt + (opts.headTilt || 0);
    var lean = (pose.lean || 0) + (opts.lean || 0);
    var shrug = clamp((pose.shrug || 0) + (opts.shrug || 0), 0, 1);
    var bob = (opts.bob || 0) + (pose.bob || 0);

    // root transform: translate → scale → flip
    var root = mul(M(1, 0, 0, 1, x, y), M(flip ? -scale : scale, 0, 0, scale, 0, 0));
    var out = '';

    if (opts.headOnly) {
      var hm = rotAbout(headTilt, 0, G.headRy);
      out += '<g transform="' + mstr(mul(root, hm)) + '">' + drawHead(ctx, face) + '</g>';
      var anH = {};
      anH.headCenter = apply(mul(root, hm), [0, 0]);
      anH.mouth = apply(mul(root, hm), [0, 27]);
      return { svg: '<g class="melo">' + out + '</g>', anchors: anH, face: face, pose: pose };
    }

    var hip = [0, G.hipY + bob];
    var upper = mul(M(1, 0, 0, 1, 0, 0), rotAbout(lean, hip[0], hip[1]));
    var shrugDy = -shrug * 7;
    var neck = [0, G.neckY + bob];
    var S = [0, G.shoulderY + bob + shrugDy];
    var headM = mul(upper, mul(rotAbout(headTilt, neck[0], neck[1]), M(1, 0, 0, 1, 0, G.headCy + bob + shrug * 5)));

    // legs (not leaned)
    var body = '';
    body += drawLeg(ctx, 'legL', -1, pose.legL, hip) + drawLeg(ctx, 'legR', 1, pose.legR, hip);
    // torso + arms in the leaned frame
    var torso = wobbleLine(ctx, 'torso', [neck, [0.6, lerp(neck[1], hip[1], 0.35)], [-0.4, lerp(neck[1], hip[1], 0.7)], hip], 0.7);
    var up = stroke(crPath(torso, false), PALETTE.ink, G.limbW + 0.4);
    var backArms = '', frontArms = '';
    var aL = drawArm(ctx, 'armL', -1, pose.armL, [S[0] - 1, S[1]]);
    var aR = drawArm(ctx, 'armR', 1, pose.armR, [S[0] + 1, S[1]]);
    if (pose.armL.front) frontArms += aL; else backArms += aL;
    if (pose.armR.front) frontArms += aR; else backArms += aR;
    up += backArms + drawScarf(ctx, opts.wind || 0, shrugDy);
    body += '<g transform="' + mstr(upper) + '">' + up + '</g>';
    body += '<g transform="' + mstr(headM) + '">' + drawHead(ctx, face) + '</g>';
    if (frontArms) body += '<g transform="' + mstr(upper) + '">' + frontArms + '</g>';

    out += '<g transform="' + mstr(root) + '">' + body + '</g>';

    // anchors in output coordinates
    var an = {};
    function A(name, m, p) { an[name] = apply(mul(root, m), p); }
    A('feet', ID, [0, 0]);
    A('hip', ID, hip);
    A('neck', upper, neck);
    A('headCenter', headM, [0, 0]);
    A('headTop', headM, [0, -G.headRy]);
    A('mouth', headM, [0, 27]);
    A('handL', upper, ctx.anchors.armLHand); A('handR', upper, ctx.anchors.armRHand);
    A('elbowL', upper, ctx.anchors.armLElbow); A('elbowR', upper, ctx.anchors.armRElbow);
    A('footL', ID, ctx.anchors.legLFoot); A('footR', ID, ctx.anchors.legRFoot);
    if (ctx.anchors.armLTip) A('markerTipL', upper, ctx.anchors.armLTip);
    if (ctx.anchors.armRTip) A('markerTipR', upper, ctx.anchors.armRTip);
    if (flip) { var t = an.handL; an.handL = an.handR; an.handR = t; an.screenSwapped = true; }
    return { svg: '<g class="melo">' + out + '</g>', anchors: an, face: face, pose: pose };
  }

  /** Bounds (character units, pre-scale) used by svg(). */
  function bounds(opts) {
    if (opts && opts.headOnly) return { x: -110, y: -132, w: 220, h: 226 };
    return { x: -165, y: -352, w: 330, h: 368 };
  }

  /** Full standalone <svg> string. opts.width/height (px) optional; opts.background optional. */
  function svg(opts) {
    opts = opts || {};
    var o = deepMerge(opts, {}); o.x = 0; o.y = 0; o.scale = 1;
    var b = opts.viewBox || bounds(o);
    var r = render(o);
    var w = opts.width || b.w * (opts.scale || 1), h = opts.height || b.h * (opts.scale || 1);
    var bg = opts.background ? '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" fill="' + opts.background + '"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [b.x, b.y, b.w, b.h].join(' ') + '" width="' + f(w) + '" height="' + f(h) + '">' + bg + r.svg + '</svg>';
  }

  /** Map a raw audio amplitude (0..1, e.g. RMS normalised) to mouthOpen with a noise gate. */
  function mouthFromAmplitude(amp, gate, gain) {
    gate = gate == null ? 0.06 : gate; gain = gain == null ? 1.6 : gain;
    var v = clamp((amp - gate) * gain / (1 - gate), 0, 1);
    return Math.pow(v, 0.8);
  }

  /** Blend two expressions (names or objects) → expression object (pass as opts.expression). */
  function blend(a, b, t) {
    var A2 = typeof a === 'string' ? EXPRESSIONS[a] : deepMerge(BASE_FACE, a);
    var B2 = typeof b === 'string' ? EXPRESSIONS[b] : deepMerge(BASE_FACE, b);
    return deepLerp(A2, B2, clamp(t, 0, 1));
  }
  /** Blend two poses (names or objects) → pose object (pass as opts.pose). */
  function blendPose(a, b, t) {
    var A2 = typeof a === 'string' ? POSES[a] : deepMerge(POSES.idle, a);
    var B2 = typeof b === 'string' ? POSES[b] : deepMerge(POSES.idle, b);
    return deepLerp(A2, B2, clamp(t, 0, 1));
  }

  return {
    version: '1.0.0',
    render: render, group: function (o) { return render(o).svg; }, svg: svg, bounds: bounds,
    blend: blend, blendPose: blendPose, walk: walk, mouthFromAmplitude: mouthFromAmplitude,
    expressions: EXPRESSIONS, poses: POSES, mouths: MOUTHS, palette: PALETTE, geometry: G,
    expressionNames: Object.keys(EXPRESSIONS), poseNames: Object.keys(POSES)
  };
});
