/*!
 * SceneInk — small helper for drawing props/scenery in Melo's ink style
 * (tapered brush lines, weighted outlines, clipped hatching, stipple).
 * Built on MeloB._Ink so the line quality matches the character.
 * Browser only: needs melo-b.js loaded first.  new SceneInk(seed)
 */
(function (root) {
  'use strict';
  var U = MeloB._util, C = MeloB.PALETTE;
  var INK = C.ink;
  var CLIP = 0;

  function SceneInk(seed) {
    this.ink = new MeloB._Ink(seed || 1);
    this.r = this.ink.r;
    this.defs = '';
  }
  var p = SceneInk.prototype;

  p.rand = function (a, b) { return a + (b - a) * this.r(); };

  // tapered brush stroke (open polyline). o: {w, ta, tb, min, jit, smooth}
  p.line = function (pts, o, color, extra) {
    o = o || {};
    var q = o.smooth ? U.catmull(pts, o.smooth, false) : pts;
    var opt = { w: o.w || 3, ta: o.ta, tb: o.tb, min: o.min, jit: o.jit, freq: o.freq };
    return '<path d="' + this.ink.brush(q, opt) + '" fill="' + (color || INK) + '"' + (extra || '') + '/>';
  };
  // many brush strokes merged into one path (faster, smaller)
  p.lines = function (list, o, color, extra) {
    var d = '', self = this;
    list.forEach(function (pts) {
      var q = o.smooth ? U.catmull(pts, o.smooth, false) : pts;
      d += self.ink.brush(q, { w: o.w || 2, ta: o.ta, tb: o.tb, min: o.min, jit: o.jit });
    });
    return '<path d="' + d + '" fill="' + (color || INK) + '"' + (extra || '') + '/>';
  };
  // filled closed shape with weighted ink ring (heavier on the shadow side)
  p.shape = function (pts, fill, o) {
    o = o || {};
    var s = fill ? '<path d="' + U.polyD(pts, true) + '" fill="' + fill + '"/>' : '';
    if (o.w !== 0) s += '<path d="' + this.ink.ring(pts, { w: o.w || 3, extra: o.extra == null ? 3 : o.extra, dir: o.dir, jit: o.jit }) + '" fill="' + (o.color || INK) + '" fill-rule="evenodd"/>';
    return s;
  };
  p.fillOnly = function (pts, fill, extra) { return '<path d="' + U.polyD(pts, true) + '" fill="' + fill + '"' + (extra || '') + '/>'; };

  // subdivided, slightly wobbly rectangle / polygon outline points
  p.poly = function (corners, step, jit) {
    step = step || 30; jit = jit == null ? 1.2 : jit;
    var out = [], n = corners.length;
    for (var i = 0; i < n; i++) {
      var a = corners[i], b = corners[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / step));
      for (var j = 0; j < k; j++) {
        var t = j / k;
        out.push([a[0] + (b[0] - a[0]) * t + (j ? (this.r() - 0.5) * jit : 0), a[1] + (b[1] - a[1]) * t + (j ? (this.r() - 0.5) * jit : 0)]);
      }
    }
    return out;
  };
  p.rect = function (x, y, w, h, step, jit) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], step, jit); };
  p.ellipse = function (cx, cy, rx, ry, n, jit, a0, a1) {
    n = n || 64; jit = jit || 0; a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1;
    var out = [], closed = a1 - a0 >= Math.PI * 2 - 1e-6;
    for (var i = 0; i < (closed ? n : n + 1); i++) {
      var a = a0 + (a1 - a0) * i / n, rr = 1 + (this.r() - 0.5) * jit;
      out.push([cx + rx * rr * Math.cos(a), cy + ry * rr * Math.sin(a)]);
    }
    return out;
  };

  p.clip = function (pts) {
    var id = 'sc' + (++CLIP);
    this.defs += '<clipPath id="' + id + '"><path d="' + U.polyD(pts, true) + '"/></clipPath>';
    return id;
  };
  // hatching lines at angle inside a polygon (clipped). o: {ang, gap, w, color, op, len:[a,b] fraction of each line, cond(x,y)}
  p.hatch = function (pts, o) {
    o = o || {};
    var id = this.clip(pts), xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    var a = (o.ang == null ? 45 : o.ang) * Math.PI / 180, d = [Math.cos(a), Math.sin(a)], nr = [-d[1], d[0]];
    var gap = o.gap || 8, d2 = '';
    for (var off = -R; off <= R; off += gap) {
      var oo = off + (this.r() - 0.5) * gap * 0.3;
      var t0 = -R, t1 = R;
      if (o.cond) { // keep only the part of the line where cond holds (sampled)
        var run = null, step = 4;
        for (var t = -R; t <= R + step; t += step) {
          var X = cx + nr[0] * oo + d[0] * t, Y = cy + nr[1] * oo + d[1] * t, ok = t <= R && o.cond(X, Y);
          if (ok) { if (!run) run = [t, t]; run[1] = t; }
          else if (run) { if (run[1] - run[0] > 6) d2 += this.ink.brush([[cx + nr[0] * oo + d[0] * run[0], cy + nr[1] * oo + d[1] * run[0]], [cx + nr[0] * oo + d[0] * run[1], cy + nr[1] * oo + d[1] * run[1]]], { w: o.w || 1.6, ta: 0.15, tb: 0.35, min: 0.2, jit: 0.25 }); run = null; }
        }
        continue;
      }
      d2 += this.ink.brush([[cx + nr[0] * oo + d[0] * t0, cy + nr[1] * oo + d[1] * t0], [cx + nr[0] * oo + d[0] * t1, cy + nr[1] * oo + d[1] * t1]], { w: o.w || 1.6, ta: 0.08, tb: 0.08, min: 0.3, jit: 0.25 });
    }
    return '<g clip-path="url(#' + id + ')"><path d="' + d2 + '" fill="' + (o.color || INK) + '" opacity="' + (o.op == null ? 0.85 : o.op) + '"/></g>';
  };
  // stipple dots inside polygon (rejection by cond)
  p.stipple = function (pts, n, o) {
    o = o || {};
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var d = '', id = this.clip(pts);
    for (var i = 0; i < n; i++) {
      var x = x0 + this.r() * (x1 - x0), y = y0 + this.r() * (y1 - y0);
      if (o.cond && this.r() > o.cond(x, y)) continue;
      d += 'M' + U.f1(x) + ' ' + U.f1(y) + 'h0';
    }
    return '<g clip-path="url(#' + id + ')"><path d="' + d + '" stroke="' + (o.color || INK) + '" stroke-width="' + (o.r || 2.2) + '" stroke-linecap="round" opacity="' + (o.op == null ? 0.8 : o.op) + '"/></g>';
  };
  // watermelon seed (teardrop), tip pointing along angle (deg)
  p.seed = function (cx, cy, len, ang, color) {
    var pts = [], a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), wid = len * 0.56;
    for (var i = 0; i < 28; i++) {
      var t = i / 28 * Math.PI * 2, u = Math.cos(t) * len / 2, v = Math.sin(t) * wid / 2 * (0.5 + 0.5 * (1 - Math.cos(t)) / 2);
      pts.push([cx + u * ca - v * sa, cy + u * sa + v * ca]);
    }
    var hx = cx - len * 0.12 * ca, hy = cy - len * 0.12 * sa;
    return '<path d="' + U.polyD(pts, true) + '" fill="' + (color || INK) + '"/>' +
      '<ellipse cx="' + U.f1(hx - 1) + '" cy="' + U.f1(hy - 1) + '" rx="' + U.f1(len * 0.09) + '" ry="' + U.f1(len * 0.05) + '" transform="rotate(' + ang + ' ' + U.f1(hx - 1) + ' ' + U.f1(hy - 1) + ')" fill="' + C.pith + '" opacity=".8"/>';
  };

  root.SceneInk = SceneInk;
})(typeof self !== 'undefined' ? self : this);
