/*!
 * SetKitA — shared drawing helpers for Illustrator A's sets (engine/sets/<name>.js).
 * Same ink primitives as Melo and the banner (MeloB._Ink via SceneInk), plus:
 *  - baked ink wobble (MeloB.parts.displace) instead of the slow SVG displacement filter,
 *  - set-name–prefixed ids, per-layer <defs> (bg / fg strings are self-contained),
 *  - embedded fonts via SetFonts.css(markup) when engine/sets/fonts-embed.js is loaded,
 *  - SetKitA.define(name, def): static layers cached per seed/variant, ambient bits spliced in per frame.
 * Works in the browser (after melo-b.js + scene-ink.js) and in Node (requires them itself).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SetKitA = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (G) {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof require === 'function';
  var MeloB = G.MeloB;
  if (!MeloB && isNode) { MeloB = require('../../brand/concepts/b/melo-b.js'); G.MeloB = MeloB; }
  var SceneInk = G.SceneInk;
  if (!SceneInk && isNode) { SceneInk = require('../../brand/channel/scene-ink.js').SceneInk || G.SceneInk; }
  var Sets = G.Sets || (isNode ? require('./sets.js') : null);
  var U = MeloB._util, C = MeloB.PALETTE, P = MeloB.parts;

  // ───────── palette (banner + classroom set) ─────────
  var PAL = {
    ink: C.ink, paper: '#e9dfc4', paperL: '#f1e8d0', cream: '#efe5cc', card: '#f3ead3',
    red: '#c43d33', redD: '#9d2c27', redL: '#e9a596', mustard: '#dca842', ochre: '#d6a03c', yellow: '#f0c74e',
    green: '#3f6329', greenM: '#5f8c3c', greenL: '#6f9a49', sage: '#8fb3a6', olive: '#5b6a4a',
    navy: '#2c333b', navyL: '#46505a', slate: '#28322c', teal: '#3e6b6a',
    wood: '#b98a52', woodD: '#8d6236', woodL: '#c79a60', woodDD: '#5e3f22',
    wall: '#e0d2b0', floor: '#cdb98f', shadow: 'rgba(80,55,20,.22)', shadowD: 'rgba(23,19,15,.35)',
    night: '#1f2a33', nightD: '#141b22'
  };

  // ───────── baked ink wobble (cheap replacement for feTurbulence + feDisplacementMap) ─────────
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
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
  var FIELDS = {};
  function field(seed, amp) {
    var k = seed + ':' + amp;
    if (FIELDS[k]) return FIELDS[k];
    var nx = vnoise(seed * 11 + 1), ny = vnoise(seed * 13 + 2), gx = vnoise(seed * 17 + 3), gy = vnoise(seed * 19 + 4);
    var f = 0.02, ff = 0.4, A = 1.7 * amp, Gm = 0.35 * amp;
    return (FIELDS[k] = function (x, y) {
      return [A * (nx(x * f, y * f) + 0.5 * nx(x * f * 2.3 + 7, y * f * 2.3 + 3)) + Gm * gx(x * ff, y * ff),
              A * (ny(x * f, y * f) + 0.5 * ny(x * f * 2.3 + 5, y * f * 2.3 + 9)) + Gm * gy(x * ff, y * ff)];
    });
  }
  function withWobble(seed, amp, fn) {
    var prev = P.displace(amp > 0 ? field(seed, amp) : null);
    try { return fn(); } finally { P.displace(prev); }
  }

  // ───────── markup helpers ─────────
  function f1(n) { return U.f1(n); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // text: o = {size, fam, weight, fill, anchor, rot, ls, op, italic, stroke, sw}
  function text(x, y, s, o) {
    o = o || {};
    var fam = o.fam || 'Caveat', w = o.weight || (fam === 'Oswald' || fam === 'Caveat' || fam === 'Kalam' ? 700 : fam === 'Anton' ? 400 : 900);
    return '<text x="' + f1(x) + '" y="' + f1(y) + '"' + (o.rot ? ' transform="rotate(' + f1(o.rot) + ' ' + f1(x) + ' ' + f1(y) + ')"' : '') +
      ' font-family="' + fam + '" font-weight="' + w + '" font-size="' + (o.size || 32) + '"' + (o.italic ? ' font-style="italic"' : '') +
      ' text-anchor="' + (o.anchor || 'middle') + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      ' fill="' + (o.fill || PAL.ink) + '"' + (o.op != null ? ' opacity="' + o.op + '"' : '') +
      (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 2) + '" paint-order="stroke"' : '') + '>' + esc(s) + '</text>';
  }
  function g(inner, attrs) { return '<g' + (attrs ? ' ' + attrs : '') + '>' + inner + '</g>'; }
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function lin(id, x1, y1, x2, y2, stops) {
    return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops.map(function (s) {
      return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>';
    }).join('') + '</linearGradient>';
  }
  function rad(id, cx, cy, r, stops, units) {
    return '<radialGradient id="' + id + '"' + (units ? ' gradientUnits="userSpaceOnUse"' : '') + ' cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + stops.map(function (s) {
      return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>';
    }).join('') + '</radialGradient>';
  }

  // ───────── scene vocabulary (all take a SceneInk S) ─────────
  // soft contact shadow under an object
  function contact(S, cx, cy, rx, ry, op) {
    return S.fillOnly(S.ellipse(cx, cy, rx, ry, 36), 'rgba(40,26,10,' + (op == null ? 0.22 : op) + ')');
  }
  // engraved hatch shading on one side of a shape: side = unit vector of the dark side, k = threshold (-1..1)
  function shadeSide(S, pts, side, k, o) {
    o = o || {};
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
    var hw = (Math.max.apply(0, xs) - Math.min.apply(0, xs)) / 2 || 1, hh = (Math.max.apply(0, ys) - Math.min.apply(0, ys)) / 2 || 1;
    return S.hatch(pts, { ang: o.ang == null ? 60 : o.ang, gap: o.gap || 8, w: o.w || 1.3, op: o.op == null ? 0.5 : o.op, color: o.color,
      cond: function (X, Y) { return ((X - cx) / hw) * side[0] + ((Y - cy) / hh) * side[1] > k; } });
  }
  // box with outline + shadow-side hatch. o: {fill, w, extra, hatch:[sx,sy,k], ang, gap, op}
  function box(S, x, y, w, h, fill, o) {
    o = o || {};
    var r = S.rect(x, y, w, h, o.step || 30, o.jit == null ? 1 : o.jit);
    var s = S.shape(r, fill, { w: o.w || 3, extra: o.extra == null ? 3.5 : o.extra });
    if (o.hatch !== false) {
      var hs = o.hatch || [0.6, 0.8, 0.35];
      s += shadeSide(S, r, [hs[0], hs[1]], hs[2], { ang: o.ang, gap: o.gap, op: o.op });
    }
    return s;
  }
  // straight ink line helper
  function L(S, pts, w, color, o) {
    o = o || {};
    return S.line(pts, { w: w || 2.5, ta: o.ta == null ? 0.06 : o.ta, tb: o.tb == null ? 0.06 : o.tb, min: o.min == null ? 0.55 : o.min, jit: o.jit, smooth: o.smooth }, color, o.extra);
  }
  // perspective floor: boards / tiles converging to vp. o: {y0, y1, vp:[x,y], fill, gap (px at bottom), tiles:bool, rows}
  function floor(S, o) {
    var s = '', y0 = o.y0, y1 = o.y1 || 1100, vp = o.vp || [960, 500];
    var poly = [[-30, y0], [1950, y0], [1950, y1], [-30, y1]];
    s += S.fillOnly(poly, o.fill || PAL.floor);
    var lines = [], gap = o.gap || 150;
    for (var xb = -1600; xb <= 3600; xb += gap) {
      // line through vp and (xb, y1): clip to y0..y1
      var t0 = (y0 - vp[1]) / (y1 - vp[1]);
      var xa = vp[0] + (xb - vp[0]) * t0;
      if (Math.max(xa, xb) < -40 || Math.min(xa, xb) > 1960) continue;
      lines.push([[xa, y0 + 2], [xb, y1]]);
    }
    s += S.lines(lines, { w: o.lw || 1.8, ta: 0.05, tb: 0.05, min: 0.4 }, PAL.ink, ' opacity="' + (o.lop || 0.55) + '"');
    if (o.tiles) { // horizontal rows, spacing grows toward the viewer
      var rows = [], n = o.rows || 7;
      for (var i = 1; i <= n; i++) { var tt = Math.pow(i / n, 1.7), y = y0 + (y1 - y0) * tt; rows.push([[-30, y], [1950, y + 1]]); }
      s += S.lines(rows, { w: o.lw || 1.6, ta: 0.02, tb: 0.02, min: 0.4 }, PAL.ink, ' opacity="' + (o.lop || 0.5) + '"');
    } else {
      // board seams: short staggered cross lines
      var seams = [];
      for (var j = 0; j < 40; j++) {
        var yy = y0 + Math.pow(S.r(), 0.7) * (y1 - y0), xx = S.rand(-20, 1940);
        var tq = (yy - vp[1]) / (y1 - vp[1]), sw = gap * tq * 0.95;
        seams.push([[xx, yy], [xx + sw * 0.5, yy]]);
      }
      s += S.lines(seams, { w: 1.6, ta: 0.1, tb: 0.1 }, PAL.ink, ' opacity=".45"');
    }
    // ink edge at the wall + darkening toward the back
    s += S.line([[-30, y0], [1950, y0 + 1]], { w: 4.5, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.hatch([[-30, y0], [1950, y0], [1950, y0 + 40], [-30, y0 + 40]], { ang: 0, gap: 7, w: 1.2, op: 0.35 });
    return s;
  }
  // engraved hatch toward ceiling/top and the frame edges (banner's wallShade, 1920 frame)
  function wallShade(S, y1, o) {
    o = o || {};
    var R = [[-20, -20], [1940, -20], [1940, y1], [-20, y1]], top = o.top == null ? 34 : o.top, edge = o.edge == null ? 0.035 : o.edge;
    var s = S.hatch(R, { ang: 28, gap: 10, w: 1.4, op: o.op || 0.3, color: o.color, cond: function (X, Y) {
      var e = Math.min(X, 1920 - X) / 1920;
      return (Y < top + 16 * Math.sin(X / 170)) || (e < edge + 0.008 * Math.sin(Y / 60) && Y > 60);
    } });
    if (top > 0) s += S.hatch(R, { ang: -32, gap: 13, w: 1.2, op: (o.op || 0.3) * 0.7, color: o.color, cond: function (X, Y) { return Y < top * 0.6 + 12 * Math.sin(X / 130); } });
    return s;
  }
  // wallpaper: vertical stripes + small motif (o: {x0,x1,y0,y1,base,stripe,motif,gap})
  function wallpaper(S, o) {
    var s = S.fillOnly([[o.x0, o.y0], [o.x1, o.y0], [o.x1, o.y1], [o.x0, o.y1]], o.base);
    var gap = o.gap || 64, st = '';
    for (var x = o.x0 + gap / 2; x < o.x1; x += gap) {
      st += '<rect x="' + f1(x - gap * 0.18) + '" y="' + o.y0 + '" width="' + f1(gap * 0.36) + '" height="' + (o.y1 - o.y0) + '" fill="' + o.stripe + '"/>';
    }
    s += st;
    if (o.motif) {
      var d = '';
      for (x = o.x0 + gap; x < o.x1; x += gap) for (var y = o.y0 + 40 + ((x / gap) % 2) * 45; y < o.y1 - 10; y += 90) {
        // tiny four-petal flower / diamond
        d += 'M' + f1(x) + ' ' + f1(y - 7) + 'L' + f1(x + 5) + ' ' + f1(y) + 'L' + f1(x) + ' ' + f1(y + 7) + 'L' + f1(x - 5) + ' ' + f1(y) + 'Z';
      }
      s += '<path d="' + d + '" fill="' + o.motif + '" opacity=".75"/>';
    }
    return s;
  }
  // potted plant. o: {wilt:0..1, pot, leaf, n, h}
  function plant(S, x, y, o) {
    o = o || {};
    var s = '', h = o.h || 260, wilt = o.wilt || 0, pw = o.pw || 90, ph = o.ph || 96, leaf = o.leaf || PAL.greenL;
    var stems = '', leaves = '';
    var n = o.n || 9;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.7, len = h * S.rand(0.6, 1);
      var bx = x + (i / (n - 1) - 0.5) * pw * 0.5, by = y - ph + 6;
      var droop = wilt * S.rand(0.6, 1.2);
      var pts = [];
      for (var k = 0; k <= 8; k++) {
        var tt = k / 8, ang = a + droop * tt * tt * (Math.cos(a) >= 0 ? 2.4 : -2.4);
        var px = bx + Math.cos(a) * len * tt + Math.cos(ang) * 0, py = by + Math.sin(a) * len * tt;
        px += droop * tt * tt * len * 0.55 * (Math.cos(a) >= 0 ? 1 : -1);
        py += droop * tt * tt * tt * len * 0.9;
        pts.push([px, py]);
      }
      stems += S.line(U.catmull(pts, 3, false), { w: 3.2, ta: 0.05, tb: 0.5, min: 0.4 }, PAL.ink);
      // leaves along the stem
      for (k = 3; k <= 8; k += 2) {
        var p0 = pts[k], p1 = pts[Math.max(0, k - 1)], dir = Math.atan2(p0[1] - p1[1], p0[0] - p1[0]);
        var side = (k % 4 === 1 ? 1 : -1), la = dir + side * 0.9 + wilt * 0.9 * (Math.cos(dir) >= 0 ? 1 : -1);
        var ll = S.rand(30, 46) * (1 - wilt * 0.2), lw = ll * 0.38;
        var lp = [];
        for (var q = 0; q < 14; q++) {
          var u = q / 14 * Math.PI * 2, ux = (Math.cos(u) + 1) / 2 * ll, uy = Math.sin(u) * lw * Math.sin((Math.cos(u) + 1) / 2 * Math.PI) * 0.9;
          lp.push([p0[0] + ux * Math.cos(la) - uy * Math.sin(la), p0[1] + ux * Math.sin(la) + uy * Math.cos(la)]);
        }
        var col = wilt > 0.4 && S.r() < wilt * 0.5 ? '#b49a4a' : (S.r() < 0.3 ? PAL.green : leaf);
        leaves += S.shape(lp, col, { w: 1.6, extra: 1.8 });
        leaves += L(S, [p0, [p0[0] + ll * 0.8 * Math.cos(la), p0[1] + ll * 0.8 * Math.sin(la)]], 1.1, PAL.ink, { min: 0.3 });
      }
      // top leaf
      var pe = pts[8];
    }
    s += stems + leaves;
    // pot
    var pot = S.poly([[x - pw / 2, y - ph], [x + pw / 2, y - ph], [x + pw / 2 - 12, y], [x - pw / 2 + 12, y]], 16, 1);
    s += contact(S, x + 8, y + 2, pw * 0.62, 10);
    s += S.shape(pot, o.pot || '#b5562f', { w: 3, extra: 3.5 });
    s += shadeSide(S, pot, [1, 0.3], 0.2, { ang: 75, gap: 7 });
    s += S.shape(S.rect(x - pw / 2 - 6, y - ph - 4, pw + 12, 20, 20, 0.8), o.rim || '#c96a3c', { w: 2.6, extra: 2.4 });
    return s;
  }
  // window frame + panes. returns {s, inner:[x,y,w,h]}. Pane content via o.view(S, x, y, w, h) (clipped)
  function windowFrame(S, x, y, w, h, o) {
    o = o || {};
    var s = '', fw = o.fw || 22, inner = [x + fw, y + fw, w - 2 * fw, h - 2 * fw];
    s += S.fillOnly(S.rect(x + 12, y + 14, w, h), PAL.shadow);
    s += S.shape(S.rect(x, y, w, h, 40, 1), o.frame || PAL.cream, { w: 4, extra: 4.5 });
    var pane = S.rect(inner[0], inner[1], inner[2], inner[3], 40, 0.8);
    if (o.view) { var cid = S.clip(pane); s += '<g clip-path="url(#' + cid + ')">' + o.view(S, inner[0], inner[1], inner[2], inner[3]) + '</g>'; }
    else s += S.fillOnly(pane, o.sky || '#cfe0dc');
    s += S.shape(pane, null, { w: 2.6, extra: 2.4, dir: [-0.55, -0.83] });
    // mullions
    var mx = inner[0] + inner[2] / 2, my = inner[1] + inner[3] * (o.split || 0.42);
    var bar = o.bar || 14;
    s += S.shape(S.rect(mx - bar / 2, inner[1], bar, inner[3], 40, 0.6), o.frame || PAL.cream, { w: 2.2, extra: 2 });
    s += S.shape(S.rect(inner[0], my - bar / 2, inner[2], bar, 40, 0.6), o.frame || PAL.cream, { w: 2.2, extra: 2 });
    // sill
    s += S.shape(S.rect(x - 18, y + h - 6, w + 36, 24, 40, 0.8), o.frame || PAL.cream, { w: 3.2, extra: 3.5 });
    s += S.fillOnly(S.rect(x - 10, y + h + 18, w + 20, 10), PAL.shadow);
    return { s: s, inner: inner };
  }
  // framed picture on the wall. o: {frame, mat, art(S,x,y,w,h)}
  function picture(S, x, y, w, h, o) {
    o = o || {};
    var s = S.fillOnly(S.rect(x + 9, y + 11, w, h), PAL.shadow);
    s += S.shape(S.rect(x, y, w, h, 30, 0.8), o.frame || PAL.woodD, { w: 3, extra: 3 });
    var m = o.m || 12, ix = x + m, iy = y + m, iw = w - 2 * m, ih = h - 2 * m;
    var pane = S.rect(ix, iy, iw, ih, 30, 0.6);
    s += S.fillOnly(pane, o.mat || PAL.paperL);
    if (o.art) { var cid = S.clip(pane); s += '<g clip-path="url(#' + cid + ')">' + o.art(S, ix, iy, iw, ih) + '</g>'; }
    s += S.shape(pane, null, { w: 1.8, extra: 1.4, dir: [-0.55, -0.83] });
    return s;
  }
  // paper note with tape. o: {fill, rot, lines:[{t,size,fill,fam}], tape:true}
  function note(S, x, y, w, h, o) {
    o = o || {};
    var rot = o.rot || 0, s = '';
    var r = U.xf(S.rect(-w / 2, -h / 2, w, h, 24, 1.2), x, y, rot);
    s += S.fillOnly(U.xf(S.rect(-w / 2 + 6, -h / 2 + 8, w, h, 24, 1.2), x, y, rot), PAL.shadow);
    s += S.shape(r, o.fill || PAL.paperL, { w: 2.2, extra: 2.2 });
    var tx = '';
    (o.lines || []).forEach(function (l, i) {
      tx += text(0, -h / 2 + (l.dy != null ? l.dy : (h / ((o.lines.length) + 1)) * (i + 1) + (l.size || 30) * 0.35), l.t, { size: l.size || 30, fam: l.fam || 'Caveat', fill: l.fill || PAL.ink, ls: l.ls });
    });
    s += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ')">' + tx + '</g>';
    if (o.tape !== false) {
      [[-w / 2 + 4, -h / 2 + 2, -38], [w / 2 - 4, -h / 2 + 2, 34]].forEach(function (tp) {
        var t = U.xf(S.rect(-24, -9, 48, 18, 16, 0.6), 0, 0, tp[2]);
        t = U.xf(t, tp[0], tp[1], 0); t = U.xf(t, x, y, rot);
        s += S.fillOnly(t, 'rgba(236,226,190,.82)') + S.shape(t, null, { w: 0.9, extra: 0.6, color: 'rgba(90,70,40,.55)' });
      });
    }
    return s;
  }
  // light cone / sun shaft polygon (translucent)
  function shaft(pts, color, op) { return '<path d="' + U.polyD(pts, true) + '" fill="' + color + '" opacity="' + op + '"/>'; }

  // ───────── assembly: one self-contained SVG layer ─────────
  var ID_RE = /\b(id="|url\(#|href="#)sc(\d+)/g;
  function prefixIds(name, s) { return s.replace(ID_RE, function (m, a, n) { return a + name + '-c' + n; }); }
  function fontsCss(markup) {
    var SF = G.SetFonts || (isNode ? tryReq('./fonts-embed.js') : null);
    return SF && SF.css ? SF.css(markup) : '';
  }
  function tryReq(p) { try { return require(p); } catch (e) { return null; } }
  // build a layer: fn(S) returns markup; extraDefs optional string
  function layer(name, seed, fn, o) {
    o = o || {};
    var S = new SceneInk(seed);
    var res = withWobble(seed, o.wobble == null ? 1 : o.wobble, function () { return fn(S); });
    var body = typeof res === 'string' ? res : res.s;
    var defs = (typeof res === 'object' && res.defs ? res.defs : '') + S.defs;
    var out = prefixIds(name, (defs ? '<defs>' + defs + '</defs>' : '') + body);
    return out;
  }

  // define + register a set.
  // def = { slots, ambient?, variants?, build(K, opts) → { bg: S=>markup | {s,defs}, fg?: S=>…, amb?: {key: (t, opts)=>markup} } }
  // bg/fg markup may contain <!--amb:key--> tokens; they are replaced per frame by amb[key](t) (ambient sets only).
  function define(name, def) {
    var cache = {};
    function statics(opts) {
      var seed = opts.seed || 0, key = seed + '|' + (opts.variant || '');
      if (cache[key]) return cache[key];
      var t0 = now();
      var b = def.build(api, opts);
      var base = (def.seed || 1) * 1000 + seed * 7;
      var bg = layer(name, base + 1, b.bg, b);
      var fg = b.fg ? layer(name, base + 2, b.fg, b) : '';
      var fcss = fontsCss(bg + fg);
      var st = { bg: (fcss ? '<defs>' + fcss + '</defs>' : '') + bg, fg: fg ? (fontsCss(fg) ? '<defs>' + fontsCss(fg) + '</defs>' : '') + fg : '', amb: b.amb || {}, ms: now() - t0 };
      cache[key] = st;
      return st;
    }
    function splice(s, st, t, opts) {
      return s.replace(/<!--amb:(\w+)-->/g, function (m, k) { return st.amb[k] ? prefixIds(name, st.amb[k](t || 0, opts)) : ''; });
    }
    var full = {
      slots: def.slots, ambient: !!def.ambient, variants: def.variants || [],
      render: function (opts) {
        opts = opts || {};
        var st = statics(opts);
        if (!def.ambient) return { bg: splice(st.bg, st, 0, opts), fg: splice(st.fg, st, 0, opts) };
        return { bg: splice(st.bg, st, opts.t, opts), fg: splice(st.fg, st, opts.t, opts),
          still: { bg: st.bg.replace(/<!--amb:\w+-->/g, ''), fg: st.fg.replace(/<!--amb:\w+-->/g, '') } };
      },
      _statics: statics
    };
    if (Sets) Sets.register(name, full);
    return full;
  }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // per-frame ink helper for ambient bits (cheap: no hatching recommended)
  function inkAt(seed) { return new SceneInk(seed); }

  var api = {
    PAL: PAL, U: U, C: C, define: define, layer: layer, withWobble: withWobble, prefixIds: prefixIds, inkAt: inkAt,
    text: text, g: g, rect: rect, lin: lin, rad: rad, f1: f1, esc: esc,
    contact: contact, shadeSide: shadeSide, box: box, L: L, floor: floor, wallShade: wallShade, wallpaper: wallpaper,
    plant: plant, windowFrame: windowFrame, picture: picture, note: note, shaft: shaft
  };
  return api;
});
