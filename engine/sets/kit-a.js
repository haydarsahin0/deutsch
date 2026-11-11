/*!
 * SetKitA — thin layer on top of SetKitB (engine/sets/kit-b.js) used by Illustrator A's sets.
 * All drawing goes through SetKitB.ink(name, seed) so both illustrators share one vocabulary
 * (palette, wall/floor/window/plant/note/clock…, prefixed ids, embedded fonts via SetFonts).
 * SetKitA adds:
 *  - baked ink wobble: MeloB.parts.displace() with a smooth noise field while the static layers are built
 *    (the cheap stand-in for the banner's feTurbulence/feDisplacementMap "rough" filter, like engine/character/rig.js),
 *  - define(name, def): registers the set; static layers are cached per seed/variant, and ambient sets splice small
 *    per-frame bits (<!--amb:key--> tokens) into the cached strings, so a frame costs a string replace + tiny markup,
 *  - a few extra helpers (shadeSide, shaft, heat shimmer lines).
 * Browser: melo-b.js, scene-ink.js, fonts-embed.js, sets.js, kit-b.js, kit-a.js, then the set files. Node: require works.
 *
 * def = { slots, ambient?, variants?, build(S, opts, A) → { bg: markup, fg?: markup, amb?: { key: function (t, opts) → markup } } }
 * render(opts) → { bg, fg } (+ `still: {bg, fg}` without ambient bits for ambient sets).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SetKitA = api;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (G) {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof require === 'function';
  var KB = G.SetKitB || (isNode ? require('./kit-b.js') : null);
  var Sets = G.Sets || (isNode ? require('./sets.js') : null);
  var MB = KB.MeloB || G.MeloB, U = MB._util, PP = MB.parts, P = KB.P;

  // ───────── baked ink wobble ─────────
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
    var f = 0.022, ff = 0.42, A = 1.5 * amp, Gm = 0.3 * amp;
    return (FIELDS[k] = function (x, y) {
      return [A * (nx(x * f, y * f) + 0.5 * nx(x * f * 2.3 + 7, y * f * 2.3 + 3)) + Gm * gx(x * ff, y * ff),
              A * (ny(x * f, y * f) + 0.5 * ny(x * f * 2.3 + 5, y * f * 2.3 + 9)) + Gm * gy(x * ff, y * ff)];
    });
  }
  function withWobble(seed, amp, fn) {
    var prev = PP.displace(amp > 0 ? field(seed, amp) : null);
    try { return fn(); } finally { PP.displace(prev); }
  }

  // ───────── extra helpers ─────────
  // hatch only on one side of a polygon: side = direction of the dark side (normalised box coords), k = threshold
  function shadeSide(S, pts, side, k, o) {
    o = o || {};
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 || 1, hh = (y1 - y0) / 2 || 1;
    return S.hatch(pts, { ang: o.ang == null ? 60 : o.ang, gap: o.gap || 8, w: o.w || 1.3, op: o.op == null ? 0.5 : o.op, color: o.color,
      cond: function (X, Y) { return ((X - cx) / hw) * side[0] + ((Y - cy) / hh) * side[1] > k; } });
  }
  // translucent polygon (light shafts, glows)
  function shaft(pts, fill, op) { return '<path d="' + U.polyD(pts, true) + '" fill="' + fill + '" opacity="' + (op == null ? 0.2 : op) + '"/>'; }
  // wavy heat-shimmer strokes rising in a box, phase t (ambient)
  function shimmer(S, x, y, w, h, t, o) {
    o = o || {};
    var n = o.n || 6, L = [];
    for (var i = 0; i < n; i++) {
      var bx = x + w * (i + 0.5) / n, ph = t * (o.speed || 1.4) + i * 1.7, rise = ((t * 0.35 + i * 0.37) % 1);
      var yb = y + h - rise * h * 0.6, pts = [];
      for (var k = 0; k <= 10; k++) { var u = k / 10; pts.push([bx + Math.sin(u * 7 + ph) * 9, yb - u * h * 0.4]); }
      L.push(pts);
    }
    return S.lines(L, { w: o.w || 2.4, ta: 0.4, tb: 0.4, min: 0.1, smooth: 0 }, o.color || P.ink, ' opacity="' + (o.op || 0.25) + '"');
  }

  // ───────── define + register ─────────
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function define(name, def) {
    var cache = {};
    function statics(opts) {
      var seed = opts.seed || 0, key = seed + '|' + (opts.variant || '');
      if (cache[key]) return cache[key];
      var t0 = now(), base = (def.seed || 1) * 1000 + seed * 7 + 1;
      var S = KB.ink(name, base);
      var b = withWobble(base, def.wobble == null ? 1 : def.wobble, function () { return def.build(S, opts, api); });
      var out = S.out(b.bg, b.fg || '');
      var st = { bg: out.bg, fg: out.fg, amb: b.amb || {}, ms: now() - t0 };
      cache[key] = st;
      return st;
    }
    function splice(s, st, t, opts) {
      if (s.indexOf('<!--amb:') < 0) return s;
      return s.replace(/<!--amb:(\w+)-->/g, function (m, k) { return st.amb[k] ? st.amb[k](t || 0, opts) : ''; });
    }
    var full = {
      slots: def.slots, ambient: !!def.ambient, variants: def.variants || [],
      render: function (opts) {
        opts = opts || {};
        var st = statics(opts);
        var r = { bg: splice(st.bg, st, opts.t, opts), fg: splice(st.fg, st, opts.t, opts) };
        if (def.ambient) r.still = { bg: st.bg.replace(/<!--amb:\w+-->/g, ''), fg: st.fg.replace(/<!--amb:\w+-->/g, '') };
        return r;
      },
      _statics: statics
    };
    if (Sets) Sets.register(name, full);
    return full;
  }
  // per-frame ink for ambient bits (ids prefixed <name>-amb; no hatching recommended → cheap)
  function ambInk(name, seed) { return KB.ink(name + '-amb', seed || 1); }

  var api = { define: define, withWobble: withWobble, ambInk: ambInk, shadeSide: shadeSide, shaft: shaft, shimmer: shimmer,
    P: P, U: U, KB: KB, slot: KB.slot };
  return api;
});
