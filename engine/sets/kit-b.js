/* SetKitB — shared drawing helpers for Illustrator B's sets (engine/sets/<name>.js).
 * Built on SceneInk (brand/channel/scene-ink.js) / MeloB._Ink so the line quality matches the banner and Melo.
 * Browser: load melo-b.js, scene-ink.js, fonts-embed.js, sets.js, kit-b.js, then the set files.
 * Node:    require('./kit-b.js') pulls everything in itself.
 *
 *   var S = SetKitB.ink('wg-kitchen', seed)   // SceneInk with set-prefixed clip/gradient ids + helpers below
 *   …draw… → return S.out(bgMarkup, fgMarkup)  // { bg, fg } with <defs> (clips, gradients, embedded fonts)
 */
(function (root) {
  'use strict';
  var isNode = typeof module === 'object' && module.exports;
  var MB = root.MeloB;
  if (!MB && isNode) { MB = require('../../brand/concepts/b/melo-b.js'); global.MeloB = MB; }
  var SI = root.SceneInk || (isNode ? require('../../brand/channel/scene-ink.js').SceneInk : null);
  var Fonts = root.SetFonts || (isNode ? require('./fonts-embed.js') : { css: function () { return ''; } });
  var U = MB._util, C = MB.PALETTE;

  // banner palette (+ a few night / interior tones in the same muted vintage key)
  var P = {
    ink: C.ink, paper: '#e9dfc4', paperD: '#e0d2b0', paperL: '#f1e8d0', cream: '#efe5cc', white: '#f4eedf',
    red: '#c43d33', redD: '#9d2c27', redL: '#e9a596', mustard: '#dca842', ochre: '#d6a03c', yellow: '#f0c74e',
    green: '#3f6329', greenM: '#6f9a49', greenL: '#8db15e', sage: '#9fb08a', teal: '#5f8f86', tealL: '#8fb3a6',
    slate: '#28322c', navy: '#2c333b', navyL: '#46505a', blue: '#4f6d86', blueL: '#8aa5b5',
    wood: '#b98a52', woodD: '#8d6236', woodM: '#c79a60', woodL: '#d8b27a', woodDD: '#5e3f22',
    floor: '#cdb98f', brown: '#6b4a2f', plum: '#7d4a5a', pink: '#e2a3a0',
    shadow: 'rgba(80,55,20,.22)', shadowD: 'rgba(23,19,15,.35)',
    night: '#1d2531', nightL: '#2e3a4a', amber: '#f2c46a', glow: '#ffdf9a'
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function f1(n) { return U.f1(n); }

  // add the helpers below to a SceneInk instance (clip/gradient ids prefixed with the set name)
  function extend(S, prefix) {
    var nClip = 0, nG = 0;
    S.P = P; S.U = U; S.C = C; S.prefix = prefix;
    S.clip = function (pts) {
      var id = prefix + '-c' + (++nClip);
      this.defs += '<clipPath id="' + id + '"><path d="' + U.polyD(pts, true) + '"/></clipPath>';
      return id;
    };
    // ── gradients (ids prefixed) ──
    S.radial = function (stops, o) {
      o = o || {}; var id = prefix + '-g' + (++nG);
      this.defs += '<radialGradient id="' + id + '"' + (o.user ? ' gradientUnits="userSpaceOnUse" cx="' + o.cx + '" cy="' + o.cy + '" r="' + o.r + '"' + (o.fx != null ? ' fx="' + o.fx + '" fy="' + o.fy + '"' : '') : ' cx="' + (o.cx || '50%') + '" cy="' + (o.cy || '50%') + '" r="' + (o.r || '50%') + '"') + (o.tf ? ' gradientTransform="' + o.tf + '"' : '') + '>' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + (s[2] == null ? 1 : s[2]) + '"/>'; }).join('') + '</radialGradient>';
      return 'url(#' + id + ')';
    };
    S.linear = function (stops, x1, y1, x2, y2, user) {
      var id = prefix + '-g' + (++nG);
      this.defs += '<linearGradient id="' + id + '"' + (user ? ' gradientUnits="userSpaceOnUse"' : '') + ' x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + (s[2] == null ? 1 : s[2]) + '"/>'; }).join('') + '</linearGradient>';
      return 'url(#' + id + ')';
    };
    // soft light pool / glow: ellipse filled with a radial gradient (cheap; no blur filter)
    S.glow = function (cx, cy, rx, ry, col, op) {
      var g = this.radial([[0, col, op == null ? 0.6 : op], [0.55, col, (op == null ? 0.6 : op) * 0.35], [1, col, 0]]);
      return '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="' + g + '"/>';
    };

    // ── text ── o: {f: family, s: size, w: weight, c: fill, a: anchor, r: rot, ls: letter-spacing, op, it}
    S.T = function (x, y, txt, o) {
      o = o || {};
      var fam = o.f || 'Caveat', w = o.w || (fam === 'Oswald' || fam === 'Caveat' || fam === 'Kalam' ? 700 : fam === 'Anton' ? 400 : 900);
      return '<text x="' + f1(x) + '" y="' + f1(y) + '"' + (o.r ? ' transform="rotate(' + f1(o.r) + ' ' + f1(x) + ' ' + f1(y) + ')"' : '') +
        ' font-family="' + fam + '" font-weight="' + w + '" font-size="' + (o.s || 30) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') +
        (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.it ? ' font-style="italic"' : '') +
        ' fill="' + (o.c || P.ink) + '">' + esc(txt) + '</text>';
    };

    // ── basic shapes ──
    // ink-outlined box; o: {w, extra, hatch: 'r'|'b'|'l'|'t'|'all', hgap, hop, hang, step, jit}
    S.box = function (x, y, w, h, fill, o) {
      o = o || {};
      var r = this.rect(x, y, w, h, o.step || 40, o.jit == null ? 1.1 : o.jit), s = this.shape(r, fill, { w: o.w == null ? 3 : o.w, extra: o.extra == null ? 3.5 : o.extra, color: o.color });
      if (o.hatch) s += this.hatchSide(r, x, y, w, h, o.hatch, o);
      return s;
    };
    S.hatchSide = function (r, x, y, w, h, side, o) {
      o = o || {}; var k = o.hk || 0.22;
      var cond = side === 'r' ? function (X) { return X > x + w * (1 - k); } : side === 'l' ? function (X) { return X < x + w * k; } :
        side === 'b' ? function (X, Y) { return Y > y + h * (1 - k); } : side === 't' ? function (X, Y) { return Y < y + h * k; } : null;
      return this.hatch(r, { ang: o.hang == null ? (side === 'b' || side === 't' ? 20 : 70) : o.hang, gap: o.hgap || 8, w: o.hw || 1.3, op: o.hop == null ? 0.45 : o.hop, cond: cond });
    };
    // soft offset shadow behind an object
    S.drop = function (x, y, w, h, dx, dy, col) { return this.fillOnly(this.rect(x + (dx == null ? 12 : dx), y + (dy == null ? 14 : dy), w, h, 60, 1), col || P.shadow); };
    // rounded rectangle outline points (radius per corner: r or [tl, tr, br, bl])
    S.rrect = function (x, y, w, h, r, jit) {
      var rr = typeof r === 'number' ? [r, r, r, r] : r, out = [], self = this, j = jit == null ? 0.8 : jit;
      function arc(cx, cy, R, a0) { for (var i = 0; i <= 6; i++) { var a = a0 + i / 6 * Math.PI / 2; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } }
      function edge(x0, y0, x1, y1) { var L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 34)); for (var i = 1; i < n; i++) out.push([x0 + (x1 - x0) * i / n + (self.r() - 0.5) * j, y0 + (y1 - y0) * i / n + (self.r() - 0.5) * j]); }
      arc(x + rr[0], y + rr[0], rr[0], Math.PI); edge(x + rr[0], y, x + w - rr[1], y);
      arc(x + w - rr[1], y + rr[1], rr[1], -Math.PI / 2); edge(x + w, y + rr[1], x + w, y + h - rr[2]);
      arc(x + w - rr[2], y + h - rr[2], rr[2], 0); edge(x + w - rr[2], y + h, x + rr[3], y + h);
      arc(x + rr[3], y + h - rr[3], rr[3], Math.PI / 2); edge(x, y + h - rr[3], x, y + rr[0]);
      return out;
    };
    S.circ = function (cx, cy, r, fill, o) { o = o || {}; return this.shape(this.ellipse(cx, cy, r, o.ry || r, o.n || 40, o.jit || 0.01), fill, { w: o.w == null ? 2.6 : o.w, extra: o.extra == null ? 2.6 : o.extra, color: o.color }); };
    S.dot = function (cx, cy, r, fill) { return '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + (fill || P.ink) + '"/>'; };
    S.seg = function (x0, y0, x1, y1, w, col, extra) { return this.line([[x0, y0], [x1, y1]], { w: w || 2.4, ta: 0.05, tb: 0.05, min: 0.6 }, col, extra); };

    // ── room ──
    // back wall (flat, frontal) with engraved hatch shading toward ceiling and corners
    S.wall = function (y0, y1, fill, o) {
      o = o || {};
      var s = this.fillOnly([[-20, y0], [1940, y0], [1940, y1], [-20, y1]], fill || P.paper);
      var R = [[-20, y0 - 10], [1940, y0 - 10], [1940, y1], [-20, y1]], top = o.top == null ? 40 : o.top, side = o.side == null ? 0.05 : o.side;
      s += this.hatch(R, { ang: 28, gap: o.gap || 10, w: 1.3, op: o.op == null ? 0.3 : o.op, color: o.hcol, cond: function (X, Y) {
        var e = Math.min(X, 1920 - X) / 1920;
        return (Y < y0 + top + 18 * Math.sin(X / 170)) || (e < side + 0.012 * Math.sin(Y / 90) && Y > y0 + 60);
      } });
      return s;
    };
    // vertical wallpaper / panel stripes (subtle)
    S.stripes = function (y0, y1, gap, col, op, x0, x1) {
      var L = [], a = x0 == null ? 0 : x0, b = x1 == null ? 1920 : x1;
      for (var x = a + gap / 2; x < b; x += gap) L.push([[x + (this.r() - 0.5) * 2, y0], [x + (this.r() - 0.5) * 2, y1]]);
      return this.lines(L, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.5, jit: 0.3 }, col || P.ink, ' opacity="' + (op == null ? 0.18 : op) + '"');
    };
    // perspective floor from horizon line yH down to 1080, boards or tiles converging to (vx, vy)
    // o: {kind:'boards'|'tiles'|'plain', gap (px at yH), fill, fill2 (tiles), rows, calm (y from which marks get lighter)}
    S.floor = function (yH, o) {
      o = o || {};
      var vx = o.vx == null ? 960 : o.vx, vy = o.vy == null ? yH - 380 : o.vy, s = '', self = this;
      var poly = [[-20, yH], [1940, yH], [1940, 1100], [-20, 1100]];
      s += this.fillOnly(poly, o.fill || P.floor);
      function xb(xt, y) { return vx + (xt - vx) * (y - vy) / (yH - vy); }
      var gap = o.gap || 120, kind = o.kind || 'boards';
      if (kind === 'tiles') {
        // depth rows: equal steps in 1/z
        var rows = [], n = o.rows || 7, z0 = 1, z1 = (1100 - vy) / (yH - vy);
        for (var i = 0; i <= n + 2; i++) { var z = 1 / (1 / z0 - (1 / z0 - 1 / z1) * i / n); var y = vy + (yH - vy) * z; if (y > 1110) break; rows.push(Math.min(y, 1110)); }
        if (rows[rows.length - 1] < 1100) rows.push(1110);
        var dark = '', xs = [];
        for (var xt = vx - gap * 40; xt <= vx + gap * 40; xt += gap) xs.push(xt);
        for (i = 0; i < rows.length - 1; i++) {
          var ya = rows[i], yb = rows[i + 1];
          for (var j = 0; j < xs.length - 1; j++) {
            if ((i + j) % 2) continue;
            var q = [[xb(xs[j], ya), ya], [xb(xs[j + 1], ya), ya], [xb(xs[j + 1], yb), yb], [xb(xs[j], yb), yb]];
            if (q[1][0] < -40 || q[0][0] > 1960) continue;
            dark += 'M' + q.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L') + 'Z';
          }
        }
        s += '<path d="' + dark + '" fill="' + (o.fill2 || P.paperD) + '"/>';
        var L = [];
        rows.forEach(function (y) { L.push([[-20, y], [1940, y + (self.r() - 0.5) * 2]]); });
        xs.forEach(function (x) { var a = [x, yH], b = [xb(x, 1100), 1100]; if (Math.max(a[0], b[0]) < -60 || Math.min(a[0], b[0]) > 1980) return; L.push([a, b]); });
        s += this.lines(L, { w: 1.8, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity="' + (o.lop || 0.55) + '"');
      } else if (kind === 'boards') {
        var L2 = [];
        for (var x2 = vx - gap * 40; x2 <= vx + gap * 40; x2 += gap) {
          var bx = xb(x2, 1100); if (Math.max(x2, bx) < -60 || Math.min(x2, bx) > 1980) continue;
          L2.push([[x2, yH + 2], [bx, 1100]]);
        }
        s += this.lines(L2, { w: 1.8, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity="' + (o.lop || 0.6) + '"');
        // staggered butt joints
        var J = [];
        for (var k = 0; k < 9; k++) {
          var yy = yH + (1100 - yH) * Math.pow((k + 0.6) / 9, 1.5);
          for (var x3 = vx - gap * 40 + (k % 2) * gap * 0.5; x3 <= vx + gap * 40; x3 += gap * 2) {
            var xa = xb(x3, yy), xc = xb(x3 + gap, yy); if (xc < -20 || xa > 1940) continue;
            if (this.r() < 0.45) J.push([[xa, yy], [xc, yy + 0.5]]);
          }
        }
        s += this.lines(J, { w: 1.6, ta: 0.1, tb: 0.1, min: 0.4 }, P.ink, ' opacity="' + (o.lop || 0.6) * 0.8 + '"');
        // grain hatch (horizontal, lighter near the viewer)
        s += this.hatch(poly, { ang: 0, gap: o.hgap || 9, w: 1.2, op: o.hop == null ? 0.3 : o.hop, cond: function (X, Y) { return Y < yH + 90 || self.r() < 0.35; } });
      }
      // depth shading: darker band at the wall
      s += this.fillOnly([[-20, yH], [1940, yH], [1940, yH + 40], [-20, yH + 40]], 'rgba(60,40,20,.12)');
      return s;
    };
    // skirting board along the wall/floor junction
    S.skirting = function (yH, h, fill) {
      var s = this.fillOnly([[-20, yH - h], [1940, yH - h], [1940, yH], [-20, yH]], fill || P.paperL);
      s += this.line([[-20, yH - h], [1940, yH - h + 1]], { w: 2.6, ta: 0.02, tb: 0.02, min: 0.6 });
      s += this.line([[-20, yH], [1940, yH - 1]], { w: 4.5, ta: 0.02, tb: 0.02, min: 0.6 });
      return s;
    };
    // window: o {sky: fill or gradient, panes: [cols, rows], frame, sill, night, curtains: color}
    S.window = function (x, y, w, h, o) {
      o = o || {}; var s = '', fr = o.frame || P.paperL, t = o.t || 16;
      s += this.drop(x - 6, y - 6, w + 12, h + 12, 10, 12);
      s += this.box(x - 8, y - 8, w + 16, h + 16, fr, { w: 3.5, extra: 4 });
      var glass = this.rect(x + t, y + t, w - 2 * t, h - 2 * t, 40, 0.8);
      s += this.fillOnly(glass, o.sky || '#bcd3d4');
      if (o.view) s += '<g clip-path="url(#' + this.clip(glass) + ')">' + o.view + '</g>';
      // glass sheen
      s += this.hatch(glass, { ang: -50, gap: 7, w: 1.4, op: o.night ? 0.12 : 0.22, color: o.night ? '#cfe0f0' : '#ffffff', cond: function (X, Y) { var u = (X - x) + (Y - y) * 0.7; return (u > w * 0.18 && u < w * 0.3) || (u > w * 0.38 && u < w * 0.43); } });
      var cols = (o.panes || [2, 2])[0], rows = (o.panes || [2, 2])[1], L = [];
      for (var i = 1; i < cols; i++) { var xx = x + t + (w - 2 * t) * i / cols; s += this.box(xx - 6, y + t, 12, h - 2 * t, fr, { w: 2, extra: 2, step: 60 }); }
      for (i = 1; i < rows; i++) { var yy = y + t + (h - 2 * t) * i / rows; s += this.box(x + t, yy - 6, w - 2 * t, 12, fr, { w: 2, extra: 2, step: 60 }); }
      s += this.shape(glass, null, { w: 2.6, extra: 2.4, dir: [-0.55, -0.83] });
      if (o.sill !== false) s += this.box(x - 26, y + h + 4, w + 52, 20, o.sillCol || fr, { w: 3, extra: 3.5, hatch: 'b', hk: 0.45 });
      return s;
    };
    // potted plant; leaves fan out above (x, y = pot bottom centre)
    S.plant = function (x, y, sz, o) {
      o = o || {}; var s = '', ph = sz * 0.55, pw = sz * 0.5, self = this;
      var pot = this.poly([[x - pw / 2, y - ph], [x + pw / 2, y - ph], [x + pw * 0.38, y], [x - pw * 0.38, y]], 14, 0.8);
      var leaves = '', n = o.n || 9;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / (n - 1) - 0.5) * (o.spread || 2.4) + (this.r() - 0.5) * 0.25, L = sz * (0.6 + this.r() * 0.45) * (o.tall || 1);
        var bx = x + (this.r() - 0.5) * pw * 0.3, by = y - ph + 4, tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L;
        var mx = (bx + tx) / 2, my = (by + ty) / 2, nx = -(ty - by) / L, ny = (tx - bx) / L, bw = L * (o.leafW || 0.2);
        var leaf = U.catmull([[bx, by], [mx + nx * bw, my + ny * bw], [tx, ty], [mx - nx * bw * 0.7, my - ny * bw * 0.7]], 6, true);
        var col = [P.greenM, P.green, P.greenL, P.sage][(i + (o.c || 0)) % 4];
        if (o.wilt) leaf = leaf.map(function (p) { var d = Math.max(0, by - p[1]); return [p[0] + (p[0] - x) * d * 0.004, p[1] + d * d * 0.0022]; });
        leaves += this.shape(leaf, col, { w: 1.8, extra: 2 });
        leaves += this.line([[bx, by], [mx, my], [tx, ty]].map(function (p) { return p; }), { w: 1.1, ta: 0.1, tb: 0.6, min: 0.3 }, P.ink, ' opacity=".7"');
      }
      s += leaves;
      s += this.shape(pot, o.pot || P.red, { w: 2.6, extra: 3 });
      s += this.hatch(pot, { ang: 75, gap: 7, w: 1.2, op: 0.5, cond: function (X) { return X > x + pw * 0.12; } });
      s += this.box(x - pw / 2 - 4, y - ph - 6, pw + 8, 14, o.pot || P.red, { w: 2.4, extra: 2.4, step: 30 });
      return s;
    };
    // framed picture; inner(x,y,w,h) → markup
    S.frame = function (x, y, w, h, fill, inner, o) {
      o = o || {}; var s = '';
      s += this.drop(x, y, w, h, 8, 10);
      s += this.box(x, y, w, h, o.frame || P.woodD, { w: 3, extra: 3.5 });
      var m = o.mat || 12, r = this.rect(x + m, y + m, w - 2 * m, h - 2 * m, 30, 0.8);
      s += this.shape(r, fill || P.paperL, { w: 1.8, extra: 1.2, dir: [-0.55, -0.83] });
      if (inner) s += '<g clip-path="url(#' + this.clip(r) + ')">' + inner(x + m, y + m, w - 2 * m, h - 2 * m) + '</g>';
      return s;
    };
    // mug (x = centre, y = bottom)
    S.mug = function (x, y, w, h, col, o) {
      o = o || {}; var s = '';
      var body = U.catmull([[x - w / 2, y - h], [x - w / 2 + 1, y - h / 2], [x - w / 2 + 4, y - 5], [x, y + 1], [x + w / 2 - 4, y - 5], [x + w / 2 - 1, y - h / 2], [x + w / 2, y - h]], 5, false);
      var hd = U.catmull([[x + w / 2 - 3, y - h * 0.78], [x + w / 2 + w * 0.32, y - h * 0.76], [x + w / 2 + w * 0.36, y - h * 0.45], [x + w / 2 + w * 0.2, y - h * 0.25], [x + w / 2 - 3, y - h * 0.27]], 5, false);
      s += this.line(hd, { w: w * 0.2, ta: 0.02, tb: 0.02, min: 0.9, jit: 0.05 });
      s += this.line(hd, { w: w * 0.1, ta: 0.02, tb: 0.02, min: 0.9, jit: 0.05 }, col);
      s += this.shape(body, col, { w: 2.4, extra: 3 });
      s += this.hatch(body, { ang: 80, gap: 6, w: 1.1, op: 0.5, cond: function (X) { return X > x + w * 0.2; } });
      s += this.shape(this.ellipse(x, y - h, w / 2, Math.max(3, w * 0.09), 24), o.top || '#3a1c12', { w: 2, extra: 0.8 });
      if (o.label) s += this.T(x - w * 0.05, y - h * 0.4, o.label, { f: 'Oswald', s: o.ls || w * 0.24, a: 'middle', c: o.lc || P.white });
      return s;
    };
    // steam wisps (static); t optional for ambient drift
    S.steam = function (x, y, h, t, op) {
      var s = '', ph = (t || 0) * 1.6;
      for (var i = 0; i < 2; i++) {
        var ox = (i ? 12 : -8), pts = [];
        for (var k = 0; k <= 8; k++) { var u = k / 8; pts.push([x + ox + Math.sin(u * 5 + ph + i * 2) * 6, y - u * h]); }
        s += this.line(pts, { w: 3, ta: 0.3, tb: 0.6, min: 0.2, jit: 0.1 }, P.ink, ' opacity="' + (op || 0.45) + '"');
      }
      return s;
    };
    // sticky note / paper slip pinned to a wall
    S.note = function (x, y, w, h, rot, col, lines, o) {
      o = o || {}; var s = '', r = U.xf(this.rect(-w / 2, -h / 2, w, h, 26, 1.2), x, y, rot);
      s += this.fillOnly(U.xf(this.rect(-w / 2 + 5, -h / 2 + 7, w, h, 26, 1), x, y, rot), P.shadow);
      s += this.shape(r, col || P.yellow, { w: o.w || 2.2, extra: 2.4 });
      var fs = o.fs || 26, tx = '';
      (lines || []).forEach(function (l, i) {
        var t = typeof l === 'string' ? { t: l } : l;
        tx += S.T(0, -h / 2 + (o.top || fs * 1.35) + i * fs * (o.lh || 1.05), t.t, { f: t.f || o.f || 'Caveat', s: t.s || fs, a: 'middle', c: t.c || P.ink });
      });
      s += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ')">' + tx + (o.scribble ? o.scribble : '') + '</g>';
      if (o.pin !== false) {
        var pin = U.xf([[0, -h / 2 + 9]], x, y, rot)[0];
        s += o.tape ? this.fillOnly(U.xf(this.rect(-22, -h / 2 - 9, 44, 18, 20, 0.6), x, y, rot), 'rgba(240,232,205,.75)') : this.circ(pin[0], pin[1], 6, o.pinCol || P.red, { w: 1.6, extra: 1.2 });
      }
      return s;
    };
    // hand-scribbled text lines (illegible) inside a box
    S.scribble = function (x, y, w, rows, gap, col, op) {
      var L = [];
      for (var i = 0; i < rows; i++) {
        var yy = y + i * gap, ww = w * (i === rows - 1 ? 0.55 : 0.75 + this.r() * 0.25), pts = [];
        for (var k = 0; k <= 10; k++) pts.push([x + ww * k / 10, yy + Math.sin(k * 2.3 + i) * 1.6]);
        L.push(pts);
      }
      return this.lines(L, { w: 1.6, ta: 0.1, tb: 0.2, min: 0.4 }, col || P.ink, ' opacity="' + (op == null ? 0.7 : op) + '"');
    };
    // pendant lamp hanging from ceiling with warm light cone
    S.pendant = function (x, y0, y1, w, col, o) {
      o = o || {}; var s = '';
      if (o.light !== false) {
        s += '<path d="M' + f1(x - w * 0.4) + ' ' + f1(y1) + 'L' + f1(x - w * 2.6) + ' ' + f1(y1 + (o.cone || 520)) + 'L' + f1(x + w * 2.6) + ' ' + f1(y1 + (o.cone || 520)) + 'L' + f1(x + w * 0.4) + ' ' + f1(y1) + 'Z" fill="' +
          this.linear([[0, P.glow, o.op || 0.35], [1, P.glow, 0]], 0, 0, 0, 1) + '"/>';
      }
      s += this.line([[x, y0], [x + 1, y1 - w * 0.45]], { w: 2.4, ta: 0.02, tb: 0.02, min: 0.7 });
      var sh = U.catmull([[x - w * 0.12, y1 - w * 0.5], [x - w * 0.3, y1 - w * 0.3], [x - w * 0.5, y1], [x + w * 0.5, y1], [x + w * 0.3, y1 - w * 0.3], [x + w * 0.12, y1 - w * 0.5]], 5, false);
      s += this.shape(sh, col || P.green, { w: 2.6, extra: 3 });
      s += this.hatch(sh, { ang: 70, gap: 6, w: 1.1, op: 0.45, cond: function (X) { return X > x + w * 0.1; } });
      s += this.shape(this.ellipse(x, y1 + 2, w * 0.2, w * 0.1, 20), P.glow, { w: 1.6, extra: 1 });
      return s;
    };
    // bottle (x centre, y bottom)
    S.bottle = function (x, y, h, col, o) {
      o = o || {}; var w = h * (o.wr || 0.28), nk = w * 0.36, s = '';
      var pts = U.catmull([[x - nk / 2, y - h], [x - nk / 2, y - h * 0.72], [x - w / 2, y - h * 0.55], [x - w / 2, y - 3], [x, y], [x + w / 2, y - 3], [x + w / 2, y - h * 0.55], [x + nk / 2, y - h * 0.72], [x + nk / 2, y - h]], 4, false);
      s += this.shape(pts, col, { w: 2, extra: 2.4 });
      s += this.line([[x - w * 0.25, y - h * 0.5], [x - w * 0.25, y - h * 0.12]], { w: 2.4, ta: 0.2, tb: 0.2 }, '#ffffff', ' opacity=".4"');
      if (o.label) s += this.box(x - w / 2 + 1, y - h * 0.45, w - 2, h * 0.22, o.label, { w: 1.4, extra: 1, step: 20 });
      if (o.cap) s += this.box(x - nk / 2 - 1, y - h - 5, nk + 2, 7, o.cap, { w: 1.4, extra: 1, step: 20 });
      return s;
    };
    // wobbly shelf plank (x0..x1 at y)
    S.shelf = function (x0, x1, y, col) {
      var s = this.box(x0, y, x1 - x0, 16, col || P.wood, { w: 2.8, extra: 3, hatch: 'b', hk: 0.5 });
      s += this.line([[x0 + 30, y + 16], [x0 + 30, y + 40], [x0 + 54, y + 16]], { w: 2.4, ta: 0.05, tb: 0.05 });
      s += this.line([[x1 - 30, y + 16], [x1 - 30, y + 40], [x1 - 54, y + 16]], { w: 2.4, ta: 0.05, tb: 0.05 });
      return s;
    };
    // books standing on a shelf (x0..x1 at y bottom)
    S.books = function (x0, x1, y, hmax, cols) {
      var s = '', x = x0, i = 0;
      cols = cols || [P.red, P.green, P.mustard, P.navy, P.cream, P.teal, P.woodD];
      while (x < x1 - 14) {
        var bw = 14 + this.r() * 16, bh = hmax * (0.7 + this.r() * 0.3), lean = (this.r() < 0.12 && x > x0 + 30) ? 8 : 0;
        if (x + bw > x1) break;
        var pts = this.poly([[x, y], [x + bw, y], [x + bw + lean, y - bh], [x + lean, y - bh]], 30, 0.6);
        s += this.shape(pts, cols[(i * 3 + Math.floor(this.r() * 2)) % cols.length], { w: 1.8, extra: 1.6 });
        s += this.line([[x + 2 + lean * 0.2, y - bh * 0.78], [x + bw - 2 + lean * 0.2, y - bh * 0.78]], { w: 1.4, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".6"');
        x += bw + 1; i++;
      }
      return s;
    };
    // round wall clock
    S.clock = function (cx, cy, R, hh, mm, o) {
      o = o || {}; var s = '';
      s += this.shape(this.ellipse(cx + 7, cy + 9, R + 4, R + 4, 48), P.shadow, { w: 0 });
      s += this.shape(this.ellipse(cx, cy, R, R, 60, 0.01), o.face || '#efe6cf', { w: 4, extra: 4.5 });
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2, r0 = R * 0.78, r1 = R * (i % 3 ? 0.68 : 0.6);
        s += this.seg(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a), cx + r1 * Math.sin(a), cy - r1 * Math.cos(a), i % 3 ? 2.4 : 4.4);
      }
      var ah = (hh % 12 + mm / 60) / 12 * Math.PI * 2, am = mm / 60 * Math.PI * 2;
      s += this.line([[cx, cy], [cx + R * 0.45 * Math.sin(ah), cy - R * 0.45 * Math.cos(ah)]], { w: R * 0.08, ta: 0.02, tb: 0.5, min: 0.5 });
      s += this.line([[cx, cy], [cx + R * 0.68 * Math.sin(am), cy - R * 0.68 * Math.cos(am)]], { w: R * 0.05, ta: 0.02, tb: 0.6, min: 0.4 });
      if (o.sec != null) { var as = o.sec / 60 * Math.PI * 2; s += this.seg(cx - R * 0.15 * Math.sin(as), cy + R * 0.15 * Math.cos(as), cx + R * 0.72 * Math.sin(as), cy - R * 0.72 * Math.cos(as), 1.6, P.red); }
      s += this.circ(cx, cy, R * 0.07, P.red, { w: 1.4, extra: 1 });
      s += this.hatch(this.ellipse(cx, cy, R * 0.9, R * 0.9, 40), { ang: 40, gap: 7, w: 1.1, op: 0.3, cond: function (X, Y) { return (X - cx) + (Y - cy) > R * 0.6; } });
      return s;
    };
    // cast shadow ellipse on the floor (for furniture feet etc.)
    S.floorShadow = function (cx, cy, rx, ry, op) { return '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="rgba(40,26,12,' + (op || 0.18) + ')"/>'; };

    // ── output ──
    S.out = function (bg, fg) {
      var d = this.defs;
      var res = { bg: '<defs>' + Fonts.css(bg) + d + '</defs>' + bg };
      res.fg = fg ? '<defs>' + Fonts.css(fg) + d + '</defs>' + fg : '';
      return res;
    };
    return S;
  }
  function ink(prefix, seed) { return extend(new SI(seed || 1), prefix); }

  // ── baked ink wobble (same field as SetKitA: cheap stand-in for the banner's feTurbulence/feDisplacementMap) ──
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
  function vnoise(seed) {
    var tab = new Float32Array(1024), r = U.rng(hash(seed) || 1);
    for (var i = 0; i < 1024; i++) tab[i] = r() * 2 - 1;
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
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
    var prev = MB.parts.displace(amp > 0 ? field(seed, amp) : null);
    try { return fn(); } finally { MB.parts.displace(prev); }
  }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // ── define + register a set (same contract as SetKitA.define) ──
  // def = { slots, ambient?, variants?, seed?, wobble?, build(opts) → { bg: S => markup, fg?: S => markup, amb?: { key: (t, opts, S) => markup } } }
  // bg/fg may contain <!--amb:key--> tokens, replaced per frame by amb[key](t) (ambient sets only; keep those cheap: no hatching).
  // render(opts) → { bg, fg } (+ still: {bg, fg} without the ambient bits, for ambient sets). Static layers are cached per seed|variant.
  function define(name, def) {
    var cache = {}, Sets = root.Sets || (isNode ? require('./sets.js') : null);
    function layer(seed, fn, tag) {
      var S = ink(name + tag, seed);
      var body = withWobble(seed, def.wobble == null ? 1 : def.wobble, function () { return fn(S); });
      return (S.defs ? '<defs>' + S.defs + '</defs>' : '') + body;
    }
    function statics(opts) {
      var seed = opts.seed || 0, key = seed + '|' + (opts.variant || '');
      if (cache[key]) return cache[key];
      var t0 = now(), b = def.build(opts || {}), base = (def.seed || 1) * 1000 + seed * 7;
      var bg = layer(base + 1, b.bg, ''), fg = b.fg ? layer(base + 2, b.fg, '-fg') : '';
      var fb = Fonts.css(bg), ff = fg ? Fonts.css(fg) : '';
      return (cache[key] = { bg: (fb ? '<defs>' + fb + '</defs>' : '') + bg, fg: fg ? (ff ? '<defs>' + ff + '</defs>' : '') + fg : '', amb: b.amb || {}, ms: now() - t0 });
    }
    var ambInk = {};
    function splice(s, st, t, opts) {
      return s.replace(/<!--amb:(\w+)-->/g, function (m, k) {
        if (!st.amb[k]) return '';
        var S = ambInk[k] || (ambInk[k] = ink(name + '-a' + k, 77));
        S.defs = ''; S.r = U.rng(991 + Math.round((t || 0) * 30));
        var body = st.amb[k](t || 0, opts, S);
        return (S.defs ? '<defs>' + S.defs + '</defs>' : '') + body;
      });
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
    for (var k in def.extra || {}) full[k] = def.extra[k];
    if (Sets) Sets.register(name, full);
    return full;
  }

  // slot helper: {x, y, scale, [face: 1|-1 (which way the character should look)]}
  function slot(x, y, scale, extra) { var o = { x: x, y: y, scale: scale }; for (var k in extra || {}) o[k] = extra[k]; return o; }

  var api = { ink: ink, extend: extend, define: define, withWobble: withWobble, P: P, U: U, esc: esc, slot: slot, MeloB: MB };
  if (isNode) module.exports = api;
  root.SetKitB = api;
})(typeof self !== 'undefined' ? self : this);
