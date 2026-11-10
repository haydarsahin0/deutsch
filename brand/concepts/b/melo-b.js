/*!
 * Melo — Konzept B "Der Angeschnittene" (the cut-open one)
 * Procedural ink-illustration SVG generator. No dependencies.
 * Browser: window.MeloB.svg(opts)  ·  Node: require('./melo-b.js').svg(opts)
 *
 * opts = {
 *   expression: 'deadpan'|'smirk'|'talking'|'surprised'|'unimpressed'|'annoyed'|'laughing'
 *   mouthOpen:  0..1  (added on top of the expression, for lip sync)
 *   blink:      0..1  (1 = eyes shut)
 *   pose:       'idle'|'point'|'explain'|'crossed'|'chin'|'shrug'
 *   view:       'full'|'bust'|'head'   (crop)
 *   seed:       integer – line jitter / texture placement
 *   pencil:     bool – signature pencil stuck in the "hair"
 *   look:       [dx,dy] pupil override (-1..1)
 *   headTilt:   degrees, added to the pose/expression tilt
 *   rough:      ink roughness multiplier (0 = off)
 *   width/height: optional svg size attributes, id: optional prefix
 * }
 * Coordinates: feet anchor at (0,0), +y down. Head centre ≈ (0,-352).
 * Every part is its own <g class="mb-…"> so it can be animated later.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeloB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C = {
    ink: '#17130f', paper: '#ebe1c8',
    rind: '#5f8c3c', rindLight: '#8db15e', rindDark: '#3f6329', stripe: '#253f1f',
    skin: '#2f4d26',
    pith: '#e8e3b3', pithShade: '#c9c58c',
    flesh: '#d2433a', fleshLight: '#ee7663', fleshDark: '#9d2c27',
    eye: '#f1e8cd', eyeShade: '#c9bd98',
    mouth: '#35110e', tongue: '#8e3027', teeth: '#eee4c8',
    limb: '#6a9644', shoe: '#1d1a17', sole: '#ebe2c8',
    pencil: '#e2b13b', pencilDark: '#a97b23', wood: '#e9c99a', eraser: '#d9877b', ferrule: '#a8a594',
    ochre: '#d6a03c', shirt: '#2c333b', shirtLight: '#46505a'
  };

  // ───────────────────────────── math utils ─────────────────────────────
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noiseFn(seed) {
    var r = rng(seed), tab = [];
    for (var i = 0; i < 256; i++) tab.push(r() * 2 - 1);
    return function (x) {
      var i = Math.floor(x), f = x - i, a = tab[i & 255], b = tab[(i + 1) & 255];
      var u = f * f * (3 - 2 * f);
      return a + (b - a) * u;
    };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function P(p) { return f1(p[0]) + ' ' + f1(p[1]); }
  function polyD(pts, close) {
    var s = 'M' + P(pts[0]);
    for (var i = 1; i < pts.length; i++) s += 'L' + P(pts[i]);
    return s + (close ? 'Z' : '');
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(e) { e = clamp(e, 0, 1); return e * e * (3 - 2 * e); }
  function rad(d) { return d * Math.PI / 180; }
  function dirv(deg) { return [Math.cos(rad(deg)), Math.sin(rad(deg))]; }
  function add(a, b, s) { s = s == null ? 1 : s; return [a[0] + b[0] * s, a[1] + b[1] * s]; }

  function catmull(pts, steps, closed) {
    var out = [], n = pts.length, segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], p1 = pts[i],
          p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
      for (var s = 0; s < steps; s++) {
        var t = s / steps, t2 = t * t, t3 = t2 * t, q = [];
        for (var k = 0; k < 2; k++) {
          q.push(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
            (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
        }
        out.push(q);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function cubic(p0, p1, p2, p3, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  function sub(pts, a, b) { // sub-range of a polyline by fraction
    var n = pts.length - 1, i0 = Math.round(a * n), i1 = Math.round(b * n);
    return pts.slice(i0, i1 + 1);
  }
  function normals(pts, closed) {
    var n = pts.length, N = [];
    for (var i = 0; i < n; i++) {
      var a = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      N.push([-dy / l, dx / l]);
    }
    return N;
  }
  function area(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  function xf(pts, tx, ty, deg, sx, sy) { // transform points
    var c = Math.cos(rad(deg || 0)), s = Math.sin(rad(deg || 0));
    sx = sx == null ? 1 : sx; sy = sy == null ? 1 : sy;
    return pts.map(function (p) { var x = p[0] * sx, y = p[1] * sy; return [tx + x * c - y * s, ty + x * s + y * c]; });
  }

  var SHADOW = [0.55, 0.83];
  var HEAD = { rx: 84, ry: 96, cut: 0.48, face: 1.6 };
  var HEAD_Y = -292 - HEAD.ry + 2; // light from top-left → ink gets heavier bottom-right

  // ───────────────────────────── ink primitives ─────────────────────────────
  function Ink(seed) { this.r = rng(seed); this.n = noiseFn(seed * 13 + 7); }

  // tapered brush stroke along a polyline → filled path d
  Ink.prototype.brush = function (pts, o) {
    var n = pts.length; if (n < 2) return '';
    var N = normals(pts, false), L = [], R = [], off = this.r() * 200;
    var ta = o.ta == null ? 0.25 : o.ta, tb = o.tb == null ? 0.3 : o.tb, mn = o.min == null ? 0.18 : o.min;
    var j = o.jit == null ? 0.28 : o.jit, fq = o.freq || 5, ws = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var e = Math.min(1, ta > 0 ? t / ta : 1, tb > 0 ? (1 - t) / tb : 1);
      var w = o.w * (mn + (1 - mn) * smooth(e)) * (1 + j * this.n(off + t * fq));
      if (o.wf) w *= o.wf(t);
      w = Math.max(w, 0.25) / 2; ws.push(w);
      L.push(add(pts[i], N[i], w)); R.push(add(pts[i], N[i], -w));
    }
    var d = 'M' + P(L[0]);
    for (i = 1; i < n; i++) d += 'L' + P(L[i]);
    d += 'A' + f1(ws[n - 1]) + ' ' + f1(ws[n - 1]) + ' 0 0 0 ' + P(R[n - 1]);
    for (i = n - 2; i >= 0; i--) d += 'L' + P(R[i]);
    d += 'A' + f1(ws[0]) + ' ' + f1(ws[0]) + ' 0 0 0 ' + P(L[0]) + 'Z';
    return d;
  };
  // pale under-stroke so a face line survives on a dark stripe
  Ink.prototype.halo = function (pts, o) {
    var h = {}; for (var k in o) h[k] = o[k]; h.w = o.w + 3.2; h.min = Math.max(o.min || 0.2, 0.45); h.jit = 0.1;
    return '<path d="' + this.brush(pts, h) + '" fill="' + C.rindLight + '" opacity="0.55"/>';
  };
  Ink.prototype.stroke = function (pts, o, fill) {
    return '<path d="' + this.brush(pts, o) + '" fill="' + (fill || C.ink) + '"/>';
  };
  // closed outline with shadow-side weight → evenodd ring path d
  Ink.prototype.ring = function (pts, o) {
    var N = normals(pts, true), sg = area(pts) > 0 ? -1 : 1, off = this.r() * 200, O = [], I = [];
    var dir = o.dir || SHADOW, n = pts.length, j = o.jit == null ? 0.3 : o.jit;
    for (var i = 0; i < n; i++) {
      var out = [N[i][0] * sg, N[i][1] * sg];
      var dt = Math.max(0, out[0] * dir[0] + out[1] * dir[1]);
      var w = (o.w + (o.extra || 0) * Math.pow(dt, 1.4)) * (1 + j * this.n(off + i / n * (o.freq || 9)));
      if (o.wf) w *= o.wf(i / n, pts[i]);
      O.push(add(pts[i], out, w * 0.6)); I.push(add(pts[i], out, -w * 0.4));
    }
    return polyD(O, true) + polyD(I, true);
  };
  Ink.prototype.ringEl = function (pts, o) {
    return '<path d="' + this.ring(pts, o) + '" fill="' + C.ink + '" fill-rule="evenodd"/>';
  };
  // outlined tube (limbs, fingers): returns svg (ink under, fill over, shadow hatch)
  Ink.prototype.tube = function (pts, r, o) {
    o = o || {};
    var N = normals(pts, false), n = pts.length, off = this.r() * 200, dir = o.dir || SHADOW;
    var FL = [], FR = [], IL = [], IR = [], self = this;
    var rf = typeof r === 'function' ? r : function () { return r; };
    var iw = o.ink == null ? 1.6 : o.ink, ex = o.extra == null ? 1.6 : o.extra;
    function ow(nv, t) {
      var dt = Math.max(0, nv[0] * dir[0] + nv[1] * dir[1]);
      return (iw + ex * dt) * (1 + 0.3 * self.n(off + t * 6));
    }
    var rs = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), rr = rf(t), nl = N[i], nr = [-N[i][0], -N[i][1]];
      FL.push(add(pts[i], nl, rr)); FR.push(add(pts[i], nr, rr));
      IL.push(add(pts[i], nl, rr + ow(nl, t))); IR.push(add(pts[i], nr, rr + ow(nr, t)));
      rs.push(rr);
    }
    function shape(Lp, Rp, r0, r1) {
      var d = 'M' + P(Lp[0]);
      for (var i = 1; i < n; i++) d += 'L' + P(Lp[i]);
      d += 'A' + f1(r1) + ' ' + f1(r1) + ' 0 0 0 ' + P(Rp[n - 1]);
      for (i = n - 2; i >= 0; i--) d += 'L' + P(Rp[i]);
      d += 'A' + f1(r0) + ' ' + f1(r0) + ' 0 0 0 ' + P(Lp[0]) + 'Z';
      return d;
    }
    var w0 = (Math.hypot(IL[0][0] - IR[0][0], IL[0][1] - IR[0][1])) / 2;
    var w1 = (Math.hypot(IL[n - 1][0] - IR[n - 1][0], IL[n - 1][1] - IR[n - 1][1])) / 2;
    var s = '<path d="' + shape(IL, IR, w0, w1) + '" fill="' + C.ink + '"/>';
    s += '<path d="' + shape(FL, FR, rs[0], rs[n - 1]) + '" fill="' + (o.fill || C.limb) + '"/>';
    if (o.hatch !== false) { // little shadow-side hatch marks
      var acc = 0, step = o.hstep || 3.2, h = '';
      for (i = 1; i < n - 1; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < step) continue; acc = 0;
        var sN = N[i][0] * dir[0] + N[i][1] * dir[1] > 0 ? N[i] : [-N[i][0], -N[i][1]];
        var dt = sN[0] * dir[0] + sN[1] * dir[1]; if (dt < 0.25) continue;
        var rr2 = rs[i], tg = [N[i][1], -N[i][0]];
        var a = add(pts[i], sN, rr2 * 0.95), b = add(add(pts[i], sN, rr2 * (0.95 - 0.75 * dt)), tg, 1.6);
        h += this.brush([a, b], { w: o.hw || 0.9, ta: 0, tb: 0.9, min: 0.2, jit: 0.2 });
      }
      if (h) s += '<path d="' + h + '" fill="' + C.ink + '" opacity="0.85"/>';
    }
    return s;
  };
  // closed filled shape with variable ink outline
  Ink.prototype.shape = function (pts, fill, o) {
    o = o || {};
    return '<path d="' + polyD(pts, true) + '" fill="' + fill + '"/>' + this.ringEl(pts, { w: o.w || 1.6, extra: o.extra == null ? 1.8 : o.extra, dir: o.dir, jit: o.jit });
  };

  // ───────────────────────────── expressions ─────────────────────────────
  // eyes: up = upper-lid height, lo = lower-lid depth, px/py pupil offset (px is screen space)
  // brows: dy offset, ang (+ raises the outer end), arch
  // mouth: l/r corners, u/d cubic control offsets for upper/lower lip, open 0..1
  var EXPR = {
    deadpan: {
      browL: { dy: 1, ang: -3, arch: 1.5 }, browR: { dy: -1, ang: 1, arch: 2 },
      eyeL: { up: 4.2, lo: 3.8, px: 1, py: 0.6, crease: 1, bag: 1 }, eyeR: { up: 4.4, lo: 3.8, px: 1, py: 0.6, crease: 1, bag: 1 },
      mouth: { l: [-15, 1], r: [15, -0.5], u: [0.6, 0.8], d: [0.6, 0.8], lowerLip: 1, tickR: 1 }, tilt: 0
    },
    smirk: {
      browL: { dy: 2, ang: -5, arch: 1.5 }, browR: { dy: -7.5, ang: 12, arch: 7 },
      eyeL: { up: 3.2, lo: 2.0, px: -1.6, py: 0.2, crease: 1, bag: 1 }, eyeR: { up: 6.2, lo: 4.4, px: -1.6, py: 0.2, crease: 2 },
      mouth: { l: [-16, 2], r: [19, -7], u: [3.5, 2.5], d: [3.5, 2.5], dimple: 1, lowerLip: 1 }, tilt: -5
    },
    talking: {
      browL: { dy: -4, ang: 1, arch: 3 }, browR: { dy: -7, ang: 4, arch: 3.5 },
      eyeL: { up: 5.2, lo: 4, px: 0.5, py: 0, crease: 1 }, eyeR: { up: 5.6, lo: 4, px: 0.5, py: 0, crease: 1 },
      mouth: { l: [-15, 0], r: [16, -2.5], u: [-2.5, -3], d: [4, 3], teeth: 1, tongue: 1 }, open: 0.6, tilt: 2
    },
    surprised: {
      browL: { dy: -7.5, ang: 4, arch: 8 }, browR: { dy: -7.5, ang: 6, arch: 8 },
      eyeL: { up: 7.2, lo: 6, px: 0, py: 0, pr: 2.3, crease: 1 }, eyeR: { up: 7.4, lo: 6, px: 0, py: 0, pr: 2.3, crease: 1 },
      mouth: { l: [-9, 2], r: [9, 1], u: [-4, -4], d: [3, 3] }, open: 0.6, tilt: 3
    },
    unimpressed: {
      browL: { dy: 0, ang: -3, arch: 1 }, browR: { dy: -6, ang: 7, arch: 2.5 },
      eyeL: { up: 2.8, lo: 3.8, px: 4.2, py: 1, crease: 1, bag: 1 }, eyeR: { up: 3.1, lo: 3.8, px: 4.2, py: 1, crease: 1, bag: 1 },
      mouth: { l: [-7, 1], r: [16, 2.5], u: [1, 1.3], d: [1, 1.3], lowerLip: 1, tickR: 1 }, tilt: -3
    },
    annoyed: {
      browL: { dy: 4, ang: 18, arch: -1 }, browR: { dy: 3, ang: 16, arch: -1 },
      eyeL: { up: 3.2, lo: 2.4, px: 0, py: 0.5, bag: 1 }, eyeR: { up: 3.4, lo: 2.4, px: 0, py: 0.5, bag: 1 },
      mouth: { l: [-16, 4], r: [16, 2], u: [-2, -1.5], d: [1.5, 2], teeth: 2 }, open: 0.22, tilt: 0, lines: 1
    },
    laughing: {
      browL: { dy: -8, ang: -5, arch: 4 }, browR: { dy: -9, ang: -4, arch: 4 },
      eyeL: { laugh: 1 }, eyeR: { laugh: 1 },
      mouth: { l: [-24, -5], r: [25, -7], u: [3.5, 3.5], d: [6, 6], teeth: 1, tongue: 1 }, open: 1, tilt: -8
    }
  };

  // ───────────────────────────── poses ─────────────────────────────
  // a = viewer-left arm/leg, b = viewer-right. hand.g = gesture, hand.ang = override angle, flip mirrors thumb
  var POSES = {
    idle: {
      a: { sh: [-14, -270], el: [-52, -232], wr: [-25, -200], hand: { g: 'fist', ang: 70, flip: 0 } },
      b: { sh: [13, -272], el: [27, -218], wr: [33, -160], hand: { g: 'relaxed', ang: 92, flip: 1 } },
      la: { hip: [-6, -168], kn: [-14, -86], an: [-17, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [17, -86], an: [27, -14], foot: 1 },
      torso: [[0, -284], [3, -236], [0, -168]], tilt: -3, order: 'ab'
    },
    finger: {
      a: { sh: [-14, -270], el: [-52, -232], wr: [-25, -200], hand: { g: 'fist', ang: 70, flip: 0 } },
      b: { sh: [14, -270], el: [50, -232], wr: [60, -290], hand: { g: 'point', ang: -84, flip: 0 } },
      la: { hip: [-6, -168], kn: [-14, -86], an: [-17, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [17, -86], an: [27, -14], foot: 1 },
      torso: [[0, -284], [3, -236], [0, -168]], tilt: -2, order: 'ab'
    },
    point: {
      a: { sh: [-14, -270], el: [-52, -232], wr: [-25, -200], hand: { g: 'fist', ang: 70, flip: 0 } },
      b: { sh: [13, -272], el: [58, -262], wr: [100, -300], hand: { g: 'point', ang: -40, flip: 0 } },
      la: { hip: [-6, -168], kn: [-14, -86], an: [-17, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [17, -86], an: [27, -14], foot: 1 },
      torso: [[0, -284], [2, -236], [-1, -168]], tilt: 4, order: 'ab'
    },
    explain: {
      a: { sh: [-13, -272], el: [-46, -214], wr: [-82, -236], hand: { g: 'palm', ang: 200, flip: 1 } },
      b: { sh: [13, -272], el: [44, -212], wr: [80, -240], hand: { g: 'palm', ang: -20, flip: 0 } },
      la: { hip: [-6, -168], kn: [-12, -86], an: [-20, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [14, -86], an: [24, -14], foot: 1 },
      torso: [[0, -284], [1, -236], [0, -168]], tilt: 0, order: 'ab'
    },
    crossed: {
      a: { sh: [-13, -272], el: [-28, -214], wr: [16, -228], hand: { g: 'fist', ang: -10, flip: 1 } },
      b: { sh: [13, -272], el: [27, -218], wr: [-18, -236], hand: { g: 'tuck', ang: 190, flip: 0 } },
      la: { hip: [-6, -168], kn: [-13, -86], an: [-19, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [15, -86], an: [25, -14], foot: 1 },
      torso: [[0, -284], [0, -236], [0, -168]], tilt: -4, order: 'ab'
    },
    chin: {
      a: { sh: [-13, -272], el: [-26, -212], wr: [26, -214], hand: { g: 'fist', ang: -15, flip: 1 } },
      b: { sh: [13, -272], el: [34, -214], wr: [20, -282], hand: { g: 'chin', ang: -100, flip: 1 } },
      la: { hip: [-6, -168], kn: [-12, -86], an: [-16, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [16, -86], an: [26, -14], foot: 1 },
      torso: [[0, -284], [2, -236], [0, -168]], tilt: 6, order: 'ab'
    },
    shrug: {
      a: { sh: [-13, -272], el: [-52, -246], wr: [-66, -290], hand: { g: 'palm', ang: 230, flip: 1 } },
      b: { sh: [13, -272], el: [52, -246], wr: [66, -290], hand: { g: 'palm', ang: -50, flip: 0 } },
      la: { hip: [-6, -168], kn: [-12, -86], an: [-18, -14], foot: -1 },
      lb: { hip: [6, -168], kn: [14, -86], an: [22, -14], foot: 1 },
      torso: [[0, -284], [0, -236], [0, -168]], tilt: -6, order: 'ab'
    }
  };

  // finger specs: [angle, length, curl] — thumb last
  var HANDS = {
    relaxed: { f: [[-12, 15, 28], [-2, 17, 34], [8, 16, 38], [18, 13, 42]], t: [-58, 11, 18] },
    open:    { f: [[-30, 17, 6], [-10, 19, 5], [10, 18, 6], [28, 15, 8]], t: [-78, 13, 0] },
    palm:    { f: [[-26, 16, 14], [-9, 18, 12], [7, 17, 14], [22, 14, 16]], t: [-72, 12, 6] },
    point:   { f: [[-4, 23, 0], [38, 9, 115], [52, 8, 115], [66, 7, 110]], t: [-18, 11, 45] },
    fist:    { f: [[18, 8, 125], [32, 8, 125], [46, 8, 120], [60, 7, 115]], t: [-8, 10, 70] },
    chin:    { f: [[-16, 19, 6], [10, 11, 95], [24, 10, 100], [38, 9, 100]], t: [-58, 11, 30] },
    tuck:    { f: [[8, 12, 30], [16, 12, 34], [24, 11, 38], [32, 10, 40]], t: [-40, 9, 30] }
  };

  // ───────────────────────────── builder ─────────────────────────────
  var UID = 0;

  function svg(opts) {
    opts = opts || {};
    var seed = opts.seed == null ? 7 : opts.seed;
    var ink = new Ink(seed);
    var tex = new Ink(seed * 31 + 5); // texture rng independent of expression (stable skin)
    var id = (opts.id || 'mb') + (++UID);
    var exprName = opts.expression || 'smirk';
    var ex = JSON.parse(JSON.stringify(EXPR[exprName] || EXPR.smirk));
    var view = opts.view || 'full';
    var pose = POSES[opts.pose || 'idle'] || POSES.idle;
    var defs = '', body = '';

    // ——— head (local coords, centre 0,0) ———
    var head = buildHead(ink, tex, ex, opts, id, function (d) { defs += d; });

    if (view === 'head') {
      body = '<g class="mb-head" transform="rotate(' + f1((ex.tilt || 0) + (opts.headTilt || 0)) + ' 0 ' + HEAD.ry + ')">' + head + '</g>';
    } else {
      body = buildBody(ink, pose, ex, opts, head);
    }

    var vb = opts.viewBox || (view === 'head' ? '-106 -112 212 212' : view === 'bust' ? '-150 -505 300 360' : '-180 -512 360 534');
    var rough = opts.rough == null ? 1 : opts.rough;
    defs += '<filter id="' + id + '-rough" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="' + (seed % 97) + '" result="n1"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n1" scale="' + f1(2.6 * rough) + '" xChannelSelector="R" yChannelSelector="G" result="d1"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="' + (seed % 89 + 3) + '" result="n2"/>' +
      '<feDisplacementMap in="d1" in2="n2" scale="' + f1(1.1 * rough) + '" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    var size = (opts.width ? ' width="' + opts.width + '"' : '') + (opts.height ? ' height="' + opts.height + '"' : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + size + ' class="melo-b" data-expression="' + exprName + '">' +
      '<defs>' + defs + '</defs><g filter="url(#' + id + '-rough)">' + body + '</g></svg>';
  }

  // ───────────────────────────── head ─────────────────────────────
  function buildHead(ink, tex, ex, opts, id, addDef) {
    var rx = HEAD.rx, ry = HEAD.ry, cutK = HEAD.cut;
    var yc = -cutK * ry, rxT = rx * Math.sqrt(1 - cutK * cutK), k = 0.32, ryT = rxT * k;
    var L = [-0.5, -0.56, 0.66], ll = Math.hypot(L[0], L[1], L[2]); L = L.map(function (v) { return v / ll; });
    function lum(x, y) {
      var nx = x / rx, ny = y / ry, q = 1 - nx * nx - ny * ny;
      var nz = Math.sqrt(Math.max(0, q));
      return nx * L[0] + ny * L[1] + nz * L[2];
    }
    function inSkin(x, y) {
      var nx = x / rx, ny = y / ry; if (nx * nx + ny * ny > 1) return false;
      var e = Math.abs(x) < rxT ? yc + ryT * Math.sqrt(1 - (x / rxT) * (x / rxT)) : yc;
      return y > e + 1.5;
    }
    // silhouette
    var a0 = Math.PI + Math.asin(cutK), a1 = -Math.asin(cutK), sph = [];
    for (var i = 0; i <= 64; i++) { var a = lerp(a0, a1, i / 64); sph.push([rx * Math.cos(a), ry * Math.sin(a)]); }
    var top = [];
    for (i = 1; i < 40; i++) { var b = lerp(0, -Math.PI, i / 40); top.push([rxT * Math.cos(b), yc + ryT * Math.sin(b)]); }
    var sil = sph.concat(top);
    addDef('<clipPath id="' + id + '-skin"><path d="' + polyD(sph, true) + '"/></clipPath>');

    var s = '<g class="mb-skull">';
    s += '<path d="' + polyD(sil, true) + '" fill="' + C.rind + '"/>';
    var tx = '';
    // stripes wrapping the volume
    var NS = 11, phase = 0.05;
    for (var kq = 0; kq < NS; kq++) {
      var th = (kq / NS) * Math.PI * 2 + phase; if (th > Math.PI) th -= Math.PI * 2;
      if (Math.abs(th) > Math.PI / 2 + 0.25) continue;
      var le = [], ri = [];
      for (var y = yc - 6; y <= ry + 0.1; y += 2.2) {
        var hwid = rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
        var saw = Math.abs(((y * 0.075 + kq * 0.37) % 1 + 1) % 1 - 0.5) * 2;
        var w1 = 0.1 + 0.05 * tex.n(y * 0.07 + kq * 11) + 0.045 * saw;
        var w2 = 0.1 + 0.05 * tex.n(y * 0.07 + kq * 11 + 50) + 0.045 * (1 - saw);
        var taper = smooth((ry - y) / 26);
        w1 *= 0.4 + 0.6 * taper; w2 *= 0.4 + 0.6 * taper;
        le.push([hwid * Math.sin(clamp(th - w1, -Math.PI / 2, Math.PI / 2)), y]);
        ri.push([hwid * Math.sin(clamp(th + w2, -Math.PI / 2, Math.PI / 2)), y]);
      }
      tx += '<path d="' + polyD(le.concat(ri.reverse()), true) + '" fill="' + C.stripe + '"/>';
    }
    // light mottling + dark stipple (density follows shadow)
    var dots = '', ldots = '';
    for (i = 0; i < 2600; i++) {
      var x = (tex.r() * 2 - 1) * rx, yy = yc - 4 + tex.r() * (ry - yc + 4);
      if (!inSkin(x, yy)) continue;
      var lv = lum(x, yy), pr = clamp((0.62 - lv) * 1.15, 0, 1);
      if (tex.r() < pr * 0.75) dots += 'M' + f1(x) + ' ' + f1(yy) + 'h0';
      else if (lv > 0.55 && tex.r() < 0.25) ldots += 'M' + f1(x) + ' ' + f1(yy) + 'h0';
    }
    tx += '<path d="' + ldots + '" stroke="' + C.rindLight + '" stroke-width="2.1" stroke-linecap="round" opacity="0.8"/>';
    tx += '<path d="' + dots + '" stroke="' + C.ink + '" stroke-width="1.15" stroke-linecap="round" opacity="0.9"/>';
    // hatching layers
    tx += hatchLayer(ink, 52, 3.6, function (x, y) { return lum(x, y) < 0.16; }, rx, ry, yc, inSkin, 1.15);
    tx += hatchLayer(ink, -38, 4.2, function (x, y) { var l = lum(x, y); return l < -0.12 && Math.hypot(x / rx, y / ry) < 0.965; }, rx, ry, yc, inSkin, 1.05);
    tx += hatchLayer(ink, 10, 3.8, function (x, y) { var l = lum(x, y); return l < -0.36 && Math.hypot(x / rx, y / ry) < 0.95; }, rx, ry, yc, inSkin, 0.95);
    s += '<g clip-path="url(#' + id + '-skin)">' + tx + '</g>';
    s += ink.ringEl(sph.concat(top), { w: 2.4, extra: 4.6, jit: 0.35 });
    s += '</g>';

    // ——— the cut: rind ring, pith, flesh, seeds = the "haircut" ———
    var cut = '<g class="mb-cut">';
    function ell(r, dy) { var p = []; for (var i = 0; i < 72; i++) { var a = i / 72 * Math.PI * 2; p.push([r * Math.cos(a), yc + (dy || 0) + r * k * Math.sin(a)]); } return p; }
    var rOuter = rxT, rPith = rxT - 3.2, rFlesh = rxT - 11;
    cut += '<path d="' + polyD(ell(rOuter), true) + '" fill="' + C.skin + '"/>';
    cut += '<path d="' + polyD(ell(rPith), true) + '" fill="' + C.pith + '"/>';
    // pith shade at front edge (inner wall seen from above)
    var fl = ell(rFlesh, -1.2);
    addDef('<clipPath id="' + id + '-flesh"><path d="' + polyD(fl, true) + '"/></clipPath>');
    cut += '<path d="' + polyD(fl, true) + '" fill="' + C.flesh + '"/>';
    var ft = '';
    // radial fibres
    for (i = 0; i < 45; i++) {
      var ang = tex.r() * Math.PI * 2, r0 = rFlesh * (0.12 + tex.r() * 0.4), r1 = r0 + rFlesh * (0.15 + tex.r() * 0.3);
      var pa = [r0 * Math.cos(ang), yc - 1.2 + r0 * k * Math.sin(ang)], pb = [r1 * Math.cos(ang), yc - 1.2 + r1 * k * Math.sin(ang)];
      ft += tex.brush([pa, pb], { w: 1.3, ta: 0.4, tb: 0.5, min: 0.1 });
    }
    cut += '<g clip-path="url(#' + id + '-flesh)"><path d="' + ft + '" fill="' + C.fleshLight + '" opacity="0.5"/>';
    // highlight back-left, darker front-right
    var fd = '';
    for (i = 0; i < 700; i++) {
      var fx = (tex.r() * 2 - 1) * rFlesh, fy = yc - 1.2 + (tex.r() * 2 - 1) * rFlesh * k;
      if ((fx * fx) / (rFlesh * rFlesh) + ((fy - yc + 1.2) * (fy - yc + 1.2)) / (rFlesh * rFlesh * k * k) > 1) continue;
      var shade = (fx / rFlesh) * 0.6 + ((fy - yc) / (rFlesh * k)) * 0.5;
      if (tex.r() < clamp(shade, 0, 1) * 0.8) fd += 'M' + f1(fx) + ' ' + f1(fy) + 'h0';
    }
    cut += '<path d="' + fd + '" stroke="' + C.fleshDark + '" stroke-width="1.6" stroke-linecap="round"/>';
    cut += '</g>';
    // seeds: ring of teardrops pointing to the centre
    var seeds = '', hl = '', NSd = 13;
    for (i = 0; i < NSd; i++) {
      var sa = i / NSd * Math.PI * 2 + 0.3 + (tex.r() - 0.5) * 0.25, sr = rFlesh * (0.56 + (tex.r() - 0.5) * 0.14);
      seeds += seedShape(tex, sr * Math.cos(sa), yc - 1.2 + sr * k * Math.sin(sa), sa, 14, 7.6, k, function (h) { hl += h; });
    }
    for (i = 0; i < 4; i++) {
      var sa2 = tex.r() * Math.PI * 2, sr2 = rFlesh * (0.2 + tex.r() * 0.15);
      seeds += seedShape(tex, sr2 * Math.cos(sa2), yc - 1.2 + sr2 * k * Math.sin(sa2), sa2, 9, 5, k, function (h) { hl += h; });
    }
    cut += seeds + '<path d="' + hl + '" fill="' + C.pith + '" opacity="0.85"/>';
    // ink: outer rim ring, inner pith/flesh line (front half heavier)
    cut += ink.ringEl(ell(rOuter), { w: 1.6, extra: 2.6, dir: [0.35, 0.94] });
    var front = ell(rFlesh, -1.2).slice(2, 34);
    cut += ink.stroke(front, { w: 1.4, ta: 0.2, tb: 0.2, min: 0.2 });
    var back = ell(rFlesh, -1.2).slice(40, 70);
    cut += ink.stroke(back, { w: 0.9, ta: 0.3, tb: 0.3, min: 0.1 });
    if (opts.pencil) cut += pencil(ink, rxT * 0.42, yc - 4);
    cut += '</g>';

    // ——— face ———
    var face = buildFace(ink, ex, opts, id, addDef);
    return '<g class="mb-head-inner">' + s + cut + face + '</g>';
  }

  function seedShape(r, cx, cy, ang, len, wid, k, hlOut) {
    // teardrop in disc coords, tip toward centre, then foreshortened
    var pts = [], ca = Math.cos(ang), sa = Math.sin(ang);
    for (var i = 0; i < 24; i++) {
      var t = i / 24 * Math.PI * 2;
      var u = Math.cos(t) * len / 2, v = Math.sin(t) * wid / 2 * (0.55 + 0.45 * (1 + Math.cos(t)) / 2);
      // u axis radial (positive outward)
      var x = u * ca - v * sa, y = u * sa + v * ca;
      pts.push([cx + x, cy + y * k * 1.35]);
    }
    var hx = cx + (len * 0.12) * ca - 1, hy = cy + (len * 0.12) * sa * k - 0.8;
    hlOut('M' + f1(hx - 1) + ' ' + f1(hy) + 'a1 0.5 0 1 0 2 0a1 0.5 0 1 0 -2 0Z');
    return '<path d="' + polyD(pts, true) + '" fill="' + C.ink + '"/>';
  }

  function hatchLayer(ink, angDeg, spacing, cond, rx, ry, yc, inSkin, w) {
    var d = dirv(angDeg), nrm = [-d[1], d[0]], R = Math.max(rx, ry) + 4, out = '';
    for (var o = -R; o <= R; o += spacing) {
      var run = null, jitter = (ink.r() - 0.5) * 1.2;
      for (var t = -R; t <= R + 1.6; t += 1.6) {
        var x = nrm[0] * (o + jitter) + d[0] * t, y = nrm[1] * (o + jitter) + d[1] * t;
        var ok = t <= R && inSkin(x, y) && cond(x, y);
        if (ok) { if (!run) run = []; run.push([x, y]); }
        else if (run) {
          if (run.length > 2) {
            var cut0 = Math.floor(ink.r() * 2), cut1 = run.length - Math.floor(ink.r() * 2);
            var rr = run.slice(cut0, Math.max(cut0 + 2, cut1));
            out += ink.brush(rr, { w: w, ta: 0.12, tb: 0.35, min: 0.15, jit: 0.25 });
          }
          run = null;
        }
      }
    }
    return '<path d="' + out + '" fill="' + C.ink + '"/>';
  }

  function pencil(ink, x, y) {
    var ang = -62, L = 62, w = 7.5, s = '<g class="mb-pencil" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + ang + ')">';
    // drawn along +x: buried end at 0, eraser at L
    var bodyP = [[-2, -w / 2], [L - 12, -w / 2], [L - 12, w / 2], [-2, w / 2]];
    s += ink.shape(bodyP, C.pencil, { w: 1.3, extra: 1.6, dir: [0, 1] });
    s += '<path d="M2 ' + f1(w / 6) + 'H' + (L - 13) + '" stroke="' + C.pencilDark + '" stroke-width="1.6"/>';
    s += ink.shape([[L - 12, -w / 2 - 0.4], [L - 5, -w / 2 - 0.4], [L - 5, w / 2 + 0.4], [L - 12, w / 2 + 0.4]], C.ferrule, { w: 1.2, extra: 1.2, dir: [0, 1] });
    s += ink.shape(catmull([[L - 5, -w / 2], [L + 1, -w / 2 + 0.6], [L + 2.4, 0], [L + 1, w / 2 - 0.6], [L - 5, w / 2]], 4, true), C.eraser, { w: 1.2, extra: 1.2, dir: [0, 1] });
    s += ink.stroke([[L - 9.5, -w / 2 + 0.6], [L - 9.5, w / 2 - 0.6]], { w: 0.8, ta: 0.2, tb: 0.2 });
    s += ink.stroke([[L - 7.5, -w / 2 + 0.6], [L - 7.5, w / 2 - 0.6]], { w: 0.8, ta: 0.2, tb: 0.2 });
    s += '</g>';
    return s;
  }

  // ───────────────────────────── face ─────────────────────────────
  function buildFace(ink, ex, opts, id, addDef) {
    var fx = 3, ey = 0, S = HEAD.face, FY = 27;
    var blink = clamp(opts.blink || 0, 0, 1);
    var s = '<g class="mb-face" transform="translate(' + fx * (1 - S) + ' ' + FY + ') scale(' + S + ')">';
    // brows
    s += '<g class="mb-brows">' + brow(ink, fx - 27, ey - 12.5, ex.browL, -1) + brow(ink, fx + 27, ey - 12.5, ex.browR, 1) + '</g>';
    // eyes
    var look = opts.look;
    s += '<g class="mb-eyes">' + eye(ink, fx - 27, ey, ex.eyeL, -1, blink, look, id + 'l', addDef) +
      eye(ink, fx + 27, ey, ex.eyeR, 1, blink, look, id + 'r', addDef) + '</g>';
    // nose
    s += '<g class="mb-nose">' + nose(ink, fx + 3, ey + 16) + '</g>';
    // mouth
    s += '<g class="mb-mouth">' + mouth(ink, fx, ey + 30, ex.mouth, clamp((ex.open || 0) + (opts.mouthOpen || 0), 0, 1), id, addDef) + '</g>';
    // signature seed beauty mark on the cheek
    if (opts.mark) s += '<g class="mb-mark">' + seedShapeFlat(fx - 35, ey + 19, 40) + '</g>';
    if (ex.lines) s += '<g class="mb-fx">' + ink.stroke([[fx + 58, ey - 30], [fx + 66, ey - 38]], { w: 2 }) + ink.stroke([[fx + 62, ey - 22], [fx + 73, ey - 26]], { w: 2 }) + ink.stroke([[fx + 52, ey - 36], [fx + 54, ey - 47]], { w: 2 }) + '</g>';
    s += '</g>';
    return s;
  }
  function seedShapeFlat(x, y, rot) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(0.9)"><path d="M0 -6.5C3.6 -3 4 2.2 2.4 4.6C1 6.4 -1 6.4 -2.4 4.6C-4 2.2 -3.6 -3 0 -6.5Z" fill="' + C.ink + '"/>' +
      '<path d="M-1.2 -1.5C-0.6 -2.8 0.2 -3 0.4 -2.2C0.4 -0.8 -0.4 0.6 -1 0.6C-1.5 0.4 -1.5 -0.6 -1.2 -1.5Z" fill="' + C.pith + '" opacity="0.8"/></g>';
  }

  function brow(ink, cx, cy, p, side) {
    var len = p.len || 26, pts = cubic([-len * 0.42, 0], [-len * 0.15, -(p.arch || 0) * 1.3], [len * 0.25, -(p.arch || 0) * 1.3], [len * 0.58, 1.5], 14);
    pts = xf(pts, 0, 0, -(p.ang || 0), 1, 1);
    var dy = Math.max(p.dy || 0, -6.5);
    pts = pts.map(function (q) { return [cx + q[0] * side, cy + dy + q[1]]; });
    if (side < 0) pts.reverse(); // keep inner end first? draw left→right
    var innerFirst = side > 0;
    return ink.stroke(pts, {
      w: p.w || 7.2, ta: 0.15, tb: 0.5, min: 0.2, jit: 0.15,
      wf: function (t) { var ti = innerFirst ? t : 1 - t; return 1.15 - 0.55 * ti; }
    });
  }

  function eye(ink, cx, cy, p, side, blink, look, cid, addDef) {
    var w = 24, hw = w / 2, s = '<g transform="translate(' + f1(cx) + ' ' + f1(cy) + ') rotate(' + f1((p.tilt || 0) * side) + ') scale(' + side + ' 1)">';
    if (p.laugh) {
      var arc = cubic([-hw, 2], [-hw * 0.4, -7], [hw * 0.4, -7], [hw + 1, 1.5], 14);
      s += ink.stroke(arc, { w: 3.8, ta: 0.25, tb: 0.25, min: 0.25 });
      s += ink.stroke(cubic([-hw * 0.5, 7], [-hw * 0.1, 9.5], [hw * 0.4, 9.5], [hw * 0.8, 6.5], 8), { w: 1.3, ta: 0.4, tb: 0.4 });
      s += ink.stroke([[hw + 3, -2], [hw + 8, -5]], { w: 1.5, ta: 0, tb: 0.6 }) + ink.stroke([[hw + 3.5, 1.5], [hw + 9, 1.5]], { w: 1.5, ta: 0, tb: 0.6 }) + ink.stroke([[hw + 3, 5], [hw + 7.5, 8]], { w: 1.5, ta: 0, tb: 0.6 });
      return s + '</g>';
    }
    var up = lerp(p.up, 0.4, blink), lo = lerp(p.lo, 0.4, blink);
    if (blink > 0.85) {
      var cl = cubic([-hw - 1, 0], [-hw * 0.4, 3.5], [hw * 0.4, 3.5], [hw + 2, -0.5], 14);
      s += ink.stroke(cl, { w: 3.4, ta: 0.2, tb: 0.35, min: 0.25 });
      s += ink.stroke([[hw + 1, -0.5], [hw + 5, -3]], { w: 1.4, ta: 0, tb: 0.7 });
      return s + '</g>';
    }
    var U = cubic([-hw, 0.8], [-hw * 0.55, -up * 1.3], [hw * 0.5, -up * 1.32], [hw, 0.2], 16);
    var D = cubic([hw, -0.4], [hw * 0.4, lo * 1.33], [-hw * 0.45, lo * 1.3], [-hw, 0.6], 16);
    var white = U.concat(D.slice(1));
    addDef('<clipPath id="' + cid + '"><path d="' + polyD(white, true) + '"/></clipPath>');
    s += '<path d="' + polyD(white, true) + '" fill="' + C.eye + '"/>';
    var px = ((look ? look[0] * 4.5 : p.px) || 0) * side, py = (look ? look[1] * 2 : p.py) || 0;
    var pr = p.pr || 3.8;
    s += '<g clip-path="url(#' + cid + ')">';
    s += '<path d="' + polyD(U.map(function (q) { return [q[0], q[1] + 1.6]; }), false) + '" stroke="' + C.eyeShade + '" stroke-width="3" fill="none"/>';
    s += '<circle cx="' + f1(px) + '" cy="' + f1(py - Math.max(0, up - lo) * 0.25) + '" r="' + pr + '" fill="' + C.ink + '"/>';
    s += '</g>';
    // heavy upper lid with outer flick
    var lid = [[-hw - 1.2, 1.4]].concat(U, [[hw + 1.6, 0.9]]);
    s += ink.stroke(lid, { w: 4.3, ta: 0.14, tb: 0.16, min: 0.3, jit: 0.18 });
    // lower lid (partial, thin)
    s += ink.stroke(sub(D, 0.08, 0.8), { w: 1.25, ta: 0.3, tb: 0.4, min: 0.15 });
    if (p.crease === 2) s += ink.stroke(cubic([-hw * 0.55, -up - 3.4], [-hw * 0.1, -up - 5.4], [hw * 0.5, -up - 5], [hw * 0.95, -up - 2.6], 10), { w: 1.05, ta: 0.4, tb: 0.4, min: 0.1 });
    if (p.bag) s += ink.stroke(cubic([-hw * 0.35, lo + 4.4], [-hw * 0.05, lo + 6.4], [hw * 0.45, lo + 6], [hw * 0.8, lo + 3.4], 10), { w: 1.0, ta: 0.45, tb: 0.45, min: 0.1 });
    return s + '</g>';
  }

  function nose(ink, x, y) {
    // a small hooked nose: bridge hint + rounded tip + nostril, opens to the left
    var tip = catmull([[x - 1.5, y - 10], [x + 2.5, y - 3.5], [x + 6.5, y + 1.2], [x + 4.2, y + 4.6], [x - 0.5, y + 4.2], [x - 3.6, y + 2.2]], 5, false);
    var s = ink.halo(tip, { w: 2.7, ta: 0.35, tb: 0.25 }) + ink.stroke(tip, { w: 2.7, ta: 0.35, tb: 0.25, min: 0.15, wf: function (t) { return 0.7 + 0.5 * Math.sin(t * Math.PI); } });
    s += ink.stroke([[x + 4.6, y + 7.5], [x + 8.5, y + 6.2]], { w: 1.0, ta: 0.3, tb: 0.3 });
    s += ink.stroke([[x + 6, y + 9.4], [x + 9.4, y + 8.2]], { w: 0.9, ta: 0.3, tb: 0.3 });
    return s;
  }

  function mouth(ink, x, y, m, open, id, addDef) {
    var l = [x + m.l[0] + open * 2, y + m.l[1]], r = [x + m.r[0] - open * 2, y + m.r[1]];
    function ctrl(t, off) { return [lerp(l[0], r[0], t), lerp(l[1], r[1], t) + off]; }
    var H = 20 * open;
    var U = cubic(l, ctrl(1 / 3, m.u[0] - open * 1.5), ctrl(2 / 3, m.u[1] - open * 1.5), r, 18);
    var D = cubic(r, ctrl(2 / 3, m.d[1] + H), ctrl(1 / 3, m.d[0] + H), l, 18);
    var s = '';
    if (open > 0.06) {
      var inner = U.concat(D.slice(1)), mid = 'url(#' + id + '-m)';
      addDef('<clipPath id="' + id + '-m"><path d="' + polyD(inner, true) + '"/></clipPath>');
      s += '<path d="' + polyD(inner, true) + '" fill="' + C.mouth + '"/>';
      s += '<g clip-path="' + mid + '">';
      if (m.tongue) {
        var bm = D[9];
        s += '<ellipse cx="' + f1(bm[0] + 2) + '" cy="' + f1(bm[1] + 1) + '" rx="' + f1(Math.abs(r[0] - l[0]) * 0.32) + '" ry="' + f1(4 + 4 * open) + '" fill="' + C.tongue + '"/>';
      }
      if (m.teeth) {
        var th = m.teeth === 2 ? 30 : 3.4;
        var T = U.map(function (q) { return [q[0], q[1] + th]; }).reverse();
        s += '<path d="' + polyD(U.concat(T), true) + '" fill="' + C.teeth + '"/>';
        if (m.teeth === 2) s += '<path d="M' + f1(l[0] - 2) + ' ' + f1((l[1] + r[1]) / 2 + 2.2) + 'L' + f1(r[0] + 2) + ' ' + f1((l[1] + r[1]) / 2 + 1.4) + '" stroke="' + C.ink + '" stroke-width="1.1"/>';
      }
      s += '</g>';
      s += ink.stroke(U, { w: 3.4, ta: 0.15, tb: 0.15, min: 0.35 });
      s += ink.stroke(D, { w: 1.9, ta: 0.2, tb: 0.2, min: 0.3 });
      // lower lip shadow
      var lm = D[9];
      s += ink.stroke([[lm[0] - 6, lm[1] + 4.5], [lm[0] + 1, lm[1] + 5.8], [lm[0] + 7, lm[1] + 4.2]], { w: 1.1, ta: 0.4, tb: 0.4 });
    } else {
      s += ink.halo(U, { w: 3.6, ta: 0.2, tb: 0.2, min: 0.3 }) + ink.stroke(U, { w: 3.6, ta: 0.2, tb: 0.2, min: 0.3 });
      if (m.lowerLip) {
        var mm = U[9];
        s += ink.stroke(cubic([mm[0] - 6, mm[1] + 6], [mm[0] - 2, mm[1] + 8], [mm[0] + 3, mm[1] + 8], [mm[0] + 6, mm[1] + 5.5], 8), { w: 1.2, ta: 0.4, tb: 0.4 });
      }
    }
    if (m.dimple) s += ink.stroke(catmull([[r[0] + 1.5, r[1] - 5.5], [r[0] + 4.5, r[1] - 0.5], [r[0] + 3, r[1] + 4.5]], 4, false), { w: 1.9, ta: 0.3, tb: 0.5 });
    if (m.tickR) s += ink.stroke([[r[0] + 1, r[1] - 2.5], [r[0] + 3.2, r[1] + 2.5]], { w: 1.6, ta: 0.2, tb: 0.5 });
    // chin mark
    s += ink.stroke(cubic([x - 6, y + 22 + open * 12], [x - 2, y + 24.5 + open * 12], [x + 3, y + 24.5 + open * 12], [x + 7, y + 22 + open * 12], 8), { w: 1.2, ta: 0.4, tb: 0.4 });
    return s;
  }

  // ───────────────────────────── body ─────────────────────────────
  function buildBody(ink, pose, ex, opts, head) {
    var s = '';
    // ground shadow (hatched)
    var gs = '';
    for (var i = 0; i < 9; i++) {
      var yy = -3 + i * 2.1, half = 70 * Math.sqrt(Math.max(0, 1 - Math.pow((yy - 5) / 11, 2)));
      if (half < 6) continue;
      var x0 = -half + ink.r() * 8 + 4, x1 = half - ink.r() * 8 + 4;
      gs += ink.brush([[x0, yy], [x1, yy + 0.5]], { w: 1.2, ta: 0.2, tb: 0.2 });
    }
    s += '<g class="mb-shadow"><path d="' + gs + '" fill="' + C.ink + '" opacity="0.55"/></g>';
    // legs
    s += '<g class="mb-legs">' + leg(ink, pose.la) + leg(ink, pose.lb) + '</g>';
    // torso + neck
    var tp = catmull(pose.torso, 8, false), tee = opts.outfit !== 'none';
    var top = pose.torso[0];
    var hx = top[0] + (pose.headOff ? pose.headOff[0] : 0), hy = HEAD_Y;
    s += '<g class="mb-neck">' + ink.tube([[top[0], top[1] + 6], [hx, HEAD_Y + HEAD.ry - 6]], 4.6, { ink: 1.6, extra: 1.5, hatch: false }) + '</g>';
    s += '<g class="mb-torso">' + (tee ? shirt(ink, pose, tp) : ink.tube(tp, function (t) { return lerp(7.6, 6.2, t); }, { ink: 1.7, extra: 2 })) + '</g>';
    var tilt = (pose.tilt || 0) + (ex.tilt || 0) + (opts.headTilt || 0);
    var headG = '<g class="mb-head" transform="translate(' + f1(hx) + ' ' + hy + ') rotate(' + f1(tilt) + ' 0 ' + HEAD.ry + ')">' + head + '</g>';
    var armA = arm(ink, pose.a, 'a', tee), armB = arm(ink, pose.b, 'b', tee);
    s += headG + armA + armB;
    return s;
  }

  function shirt(ink, pose, tp) {
    function cx(y) { // torso centre x at y
      var best = tp[0];
      for (var i = 0; i < tp.length; i++) if (Math.abs(tp[i][1] - y) < Math.abs(best[1] - y)) best = tp[i];
      return best[0];
    }
    var n0 = tp[0], hip = tp[tp.length - 1], sl = pose.a.sh, sr = pose.b.sh;
    var pts = [
      [n0[0] - 8, n0[1] + 1.5], [sl[0] - 6, sl[1] - 2.5], [sl[0] - 10.5, sl[1] + 4], [cx(-246) - 15, -246],
      [cx(-210) - 14, -210], [cx(-178) - 15.5, -175], [cx(-172) - 4, -171.5], [cx(-172) + 5, -171], [cx(-178) + 15.5, -175.5],
      [cx(-210) + 14.5, -210], [cx(-246) + 15.5, -246], [sr[0] + 10.5, sr[1] + 4], [sr[0] + 6, sr[1] - 2.5], [n0[0] + 8, n0[1] + 1.5],
      [n0[0] + 3, n0[1] + 5], [n0[0] - 3, n0[1] + 5]
    ];
    var poly = catmull(pts, 4, true);
    var s = '<path d="' + polyD(poly, true) + '" fill="' + C.shirt + '"/>';
    // shadow hatch on the right flank + folds
    var h = '';
    for (var y = -262; y < -180; y += 3.4) {
      var x1 = cx(y) + 14.5, x0 = x1 - 6 - 3 * Math.sin((y + 262) / 30);
      h += ink.brush([[x0, y + 2], [x1, y - 1]], { w: 0.9, ta: 0.1, tb: 0.5 });
    }
    s += '<path d="' + h + '" fill="' + C.ink + '" opacity="0.9"/>';
    s += ink.stroke([[cx(-200) - 9, -197], [cx(-200) - 2, -192], [cx(-200) + 4, -193]], { w: 1.1, ta: 0.3, tb: 0.4 }, C.shirtLight);
    s += ink.stroke([[cx(-186) - 6, -184], [cx(-186) + 1, -181]], { w: 1, ta: 0.3, tb: 0.4 }, C.shirtLight);
    // collar
    s += ink.stroke(catmull([[n0[0] - 7, n0[1] + 1.5], [n0[0], n0[1] + 6.5], [n0[0] + 7, n0[1] + 1.5]], 4, false), { w: 2, ta: 0.2, tb: 0.2 });
    s += ink.ringEl(poly, { w: 1.6, extra: 2.6 });
    // chest print: a small "ß"
    s += eszett(ink, cx(-240) - 4, -244);
    return s;
  }
  function eszett(ink, x, y) {
    var p = catmull([[x - 3, y + 10], [x - 3, y - 2], [x - 1, y - 7], [x + 3, y - 7.5], [x + 5.4, y - 4.6], [x + 3.6, y - 1.2], [x + 0.6, y - 0.4],
      [x + 5.2, y + 1.6], [x + 6.2, y + 5.6], [x + 3.4, y + 8.6], [x + 0.2, y + 8.4]], 4, false);
    p = p.map(function (q) { return [x + (q[0] - x) * 1.25, y + (q[1] - y) * 1.25]; });
    return ink.stroke(p, { w: 2.4, ta: 0.1, tb: 0.15, min: 0.5, jit: 0.1 }, C.pith);
  }

  function leg(ink, L) {
    var pts = catmull([L.hip, L.kn, L.an], 10, false);
    var s = ink.tube(pts, function (t) { return lerp(5.2, 4.4, t); }, { ink: 1.6, extra: 1.8 });
    s += shoe(ink, L.an, L.foot);
    return '<g class="mb-leg">' + s + '</g>';
  }

  function shoe(ink, an, dir) {
    var x = an[0], y = an[1];
    var upper = catmull([[-9, 9], [-10, 0], [-6, -6], [2, -6], [7, -1], [16, 2], [27, 3.5], [33, 7], [33, 10]], 4, true);
    var sole = catmull([[-12, 8.5], [34, 8.5], [36.5, 11], [34, 14], [-10, 14], [-13, 11.5]], 3, true);
    var T = function (p) { return xf(p, x, y, 0, dir, 1); };
    var s = ink.shape(T(upper), C.shoe, { w: 1.4, extra: 1.4 });
    s += ink.shape(T(sole), C.sole, { w: 1.5, extra: 2.2 });
    s += '<path d="' + polyD(T([[3, -3], [10, 3]]), false) + ' ' + polyD(T([[8, -1], [14, 4.5]]), false) + '" stroke="' + C.sole + '" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>';
    s += '<path d="' + polyD(T([[22, 5], [30, 6.5]]), false) + '" stroke="' + C.sole + '" stroke-width="1" stroke-linecap="round" opacity="0.5"/>';
    return '<g class="mb-shoe">' + s + '</g>';
  }

  function arm(ink, A, cls, tee) {
    var pts = catmull([A.sh, A.el, A.wr], 10, false);
    var s = ink.tube(pts, function (t) { return lerp(4.6, 4.0, t); }, { ink: 1.5, extra: 1.7 });
    if (tee) { // short sleeve
      var dl = Math.hypot(A.el[0] - A.sh[0], A.el[1] - A.sh[1]), u = [(A.el[0] - A.sh[0]) / dl, (A.el[1] - A.sh[1]) / dl];
      var sp = [add(A.sh, u, 1), add(A.sh, u, 9), add(A.sh, u, 17)];
      s += ink.tube(sp, function (t) { return lerp(6.4, 7, t); }, { ink: 1.4, extra: 2, fill: C.shirt, hw: 1, hstep: 2.6 });
      var e = add(A.sh, u, 14.5), nn = [-u[1], u[0]];
      s += ink.stroke([add(e, nn, -6), add(add(e, u, 0.8), nn, 0), add(e, nn, 6)], { w: 1, ta: 0.3, tb: 0.3 }, C.shirtLight);
    }
    var h = A.hand || { g: 'relaxed' };
    var ang = h.ang != null ? h.ang : Math.atan2(A.wr[1] - A.el[1], A.wr[0] - A.el[0]) * 180 / Math.PI;
    var hs = hand(ink, h.g, h.flip);
    return '<g class="mb-arm mb-arm-' + cls + '">' + s + '<g class="mb-hand mb-hand-' + cls + '" transform="translate(' + f1(A.wr[0]) + ' ' + f1(A.wr[1]) + ') rotate(' + f1(ang) + ') scale(1.22 ' + (h.flip ? -1.22 : 1.22) + ')">' + hs + '</g></g>';
  }

  function hand(ink, g, flip) {
    var H = HANDS[g] || HANDS.relaxed, s = '';
    var bases = [[17, -6.2], [19, -2], [18.4, 2.4], [16.4, 6.2]];
    var shade = flip ? [0.2, -0.98] : [0.2, 0.98];
    for (var i = 3; i >= 0; i--) {
      var f = H.f[i], b = bases[i], len = f[1] * (i === 3 ? 0.9 : 1);
      var m = add(b, dirv(f[0]), len * 0.55), t = add(m, dirv(f[0] + f[2]), len * 0.45);
      s += ink.tube(catmull([b, m, t], 5, false), i === 3 ? 2.7 : 3.1, { ink: 1.25, extra: 1.1, dir: shade, hatch: false });
    }
    var palm = catmull([[-2, -5.5], [7, -8.2], [16, -8], [21, -3], [20.5, 4], [15, 8.6], [5, 8.4], [-2, 4.8]], 4, true);
    s += ink.shape(palm, C.limb, { w: 1.3, extra: 1.6, dir: shade });
    // knuckle hatch
    s += ink.stroke([[13, 5.5], [9, 4.5]], { w: 0.8 }) + ink.stroke([[14, 3], [10.5, 2.2]], { w: 0.7 });
    var T = H.t, tb = [8, -6.5], tm = add(tb, dirv(T[0]), T[1] * 0.55), tt = add(tm, dirv(T[0] + T[2]), T[1] * 0.45);
    s += ink.tube(catmull([tb, tm, tt], 5, false), 3.2, { ink: 1.25, extra: 1.1, dir: shade, hatch: false });
    return s;
  }

  return { svg: svg, EXPRESSIONS: Object.keys(EXPR), POSES: Object.keys(POSES), PALETTE: C, _EXPR: EXPR, _POSES: POSES };
});
