/* biergarten — Bavarian beer garden under chestnut trees: string lights with blue-white pennants, far rows of beer
 * tables, a serving kiosk with barrels, gravel; in front a long beer table (fg) with Maßkrüge, pretzels, radish.
 * Ambient: string lights twinkle. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var GROUND = 630, T = { y0: 770, y1: 812, x0: 330, x1: 1470 };
  var BLUE = '#4f78a8';

  function canopy(S, cx, cy, rw, rh, seed) {
    var s = '', r = U.rng(seed);
    for (var i = 0; i < 9; i++) {
      var bx = cx + (r() - 0.5) * rw * 1.6, by = cy + (r() - 0.6) * rh, br = rw * (0.32 + r() * 0.22), pts = [];
      for (var k = 0; k < 40; k++) { var a = k / 40 * Math.PI * 2, q = br * (0.92 + 0.08 * Math.abs(Math.sin(a * 6 + i))); pts.push([bx + Math.cos(a) * q, by + Math.sin(a) * q * 0.7]); }
      var col = [P.green, '#4d7536', P.greenM, '#3a5a2a'][i % 4];
      s += S.shape(pts, col, { w: 2.4, extra: 2.8 });
      s += S.hatch(pts, { ang: 40, gap: 7, w: 1.2, op: 0.4, cond: function (X, Y) { return Y > by + br * 0.1; } });
      // palmate leaf marks (5 fingers)
      var lf = [];
      for (k = 0; k < 4; k++) {
        var lx = bx + (r() - 0.5) * br * 1.2, ly = by + (r() - 0.5) * br * 0.7;
        for (var f = -2; f <= 2; f++) { var fa = -Math.PI / 2 + f * 0.42; lf.push([[lx, ly], [lx + Math.cos(fa) * 18, ly + Math.sin(fa) * 18]]); }
      }
      s += S.lines(lf, { w: 2.2, ta: 0.1, tb: 0.6, min: 0.3 }, '#24391a', ' opacity=".55"');
      // white blossom candles
      for (k = 0; k < 2; k++) {
        var wx = bx + (r() - 0.5) * br * 1.3, wy = by + (r() - 0.7) * br * 0.6;
        for (var q = 0; q < 4; q++) s += S.circ(wx + (q % 2 ? 2 : -2), wy - q * 8, 7 - q * 1.4, q === 1 ? '#f3e2d6' : '#f6f1e2', { w: 1.2, extra: 0.8, n: 12 });
        s += S.dot(wx - 1, wy - 6, 1.6, '#d65a5a');
      }
    }
    return s;
  }
  function trunk(S, x, top, bot, w) {
    var t = U.catmull([[x - w, bot], [x - w * 0.7, (top + bot) / 2], [x - w * 0.9, top], [x + w * 0.9, top], [x + w * 0.7, (top + bot) / 2], [x + w, bot]], 5, false);
    return S.floorShadow(x + 20, bot + 4, w * 3, 12, 0.25) + S.shape(t, '#6b4a2f', { w: 3, extra: 3.4 }) + A.shadeSide(S, t, [1, 0], 0.1, { ang: 80, gap: 6, op: 0.55 }) +
      S.lines([[[x - w * 0.3, top + 40], [x - w * 0.2, bot - 30]], [[x + w * 0.2, top + 80], [x + w * 0.3, bot - 60]]], { w: 1.6, ta: 0.3, tb: 0.3 }, P.ink, ' opacity=".6"');
  }
  function farTable(S, x, y, w, sc) {
    var s = S.floorShadow(x + w / 2, y + 4 * sc, w * 0.55, 6 * sc, 0.2);
    s += S.box(x, y - 60 * sc, w, 10 * sc, P.woodM, { w: 1.8, extra: 1.8, step: 40, hatch: false });
    s += S.lines([[[x + 20 * sc, y - 50 * sc], [x + 40 * sc, y]], [[x + 40 * sc, y - 50 * sc], [x + 20 * sc, y]], [[x + w - 20 * sc, y - 50 * sc], [x + w - 40 * sc, y]], [[x + w - 40 * sc, y - 50 * sc], [x + w - 20 * sc, y]]], { w: 3 * sc, ta: 0.05, tb: 0.05 });
    s += S.box(x + 10, y - 30 * sc, w - 20, 7 * sc, P.wood, { w: 1.4, extra: 1.4, step: 40, hatch: false });
    for (var i = 0; i < 3; i++) { var mx = x + w * (0.25 + i * 0.25); s += S.box(mx - 7 * sc, y - 82 * sc, 14 * sc, 22 * sc, '#e9b24a', { w: 1.4, extra: 1.2, step: 20, hatch: false }) + S.box(mx - 7 * sc, y - 86 * sc, 14 * sc, 6 * sc, '#f6f1e2', { w: 1, extra: 0.6, step: 20, hatch: false }); }
    return s;
  }
  function mass(S, x, y, h, fill) {
    // Maßkrug: dimpled glass mug with beer + foam, handle on the right
    var w = h * 0.62, s = '';
    s += S.line(U.catmull([[x + w / 2 - 2, y - h * 0.82], [x + w / 2 + w * 0.42, y - h * 0.78], [x + w / 2 + w * 0.42, y - h * 0.3], [x + w / 2 - 2, y - h * 0.24]], 5, false), { w: h * 0.14, ta: 0.02, tb: 0.02, min: 0.9 });
    s += S.line(U.catmull([[x + w / 2 - 2, y - h * 0.82], [x + w / 2 + w * 0.42, y - h * 0.78], [x + w / 2 + w * 0.42, y - h * 0.3], [x + w / 2 - 2, y - h * 0.24]], 5, false), { w: h * 0.07, ta: 0.02, tb: 0.02, min: 0.9 }, '#efe6c4');
    var body = S.poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 2, y], [x - w / 2 + 2, y]], 16, 0.6);
    s += S.shape(body, fill || '#e9b24a', { w: 2.4, extra: 2.6 });
    // dimples
    var dm = ''; for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) dm += '<ellipse cx="' + f1(x - w * 0.3 + c * w * 0.3) + '" cy="' + f1(y - h * 0.7 + r * h * 0.18) + '" rx="' + f1(w * 0.1) + '" ry="' + f1(h * 0.06) + '" fill="#fff4cf" opacity=".45"/>';
    s += dm;
    s += A.shadeSide(S, body, [1, 0], 0.35, { ang: 80, gap: 5, op: 0.4 });
    // foam
    var foam = U.catmull([[x - w / 2 - 3, y - h + 4], [x - w / 2, y - h - 14], [x - w * 0.1, y - h - 20], [x + w * 0.25, y - h - 14], [x + w / 2 + 3, y - h - 6], [x + w / 2 + 2, y - h + 6]], 4, false);
    s += S.shape(foam, '#f8f3e4', { w: 2, extra: 2 });
    return s;
  }
  function pretzel(S, x, y, sz) {
    var p = [];
    for (var k = 0; k <= 60; k++) { var t = k / 60 * Math.PI * 2; p.push([x + Math.sin(t) * sz * (1 + 0.15 * Math.cos(2 * t)), y - sz * 0.15 + Math.sin(2 * t) * sz * 0.38 - Math.cos(t) * sz * 0.5 * 0.4]); }
    var s = S.line(p, { w: sz * 0.42, ta: 0.15, tb: 0.15, min: 0.7, jit: 0.1 });
    s += S.line(p, { w: sz * 0.3, ta: 0.15, tb: 0.15, min: 0.7, jit: 0.1 }, '#9b5a2a');
    var salt = ''; for (k = 0; k < 14; k++) { var q = p[Math.floor(k * 4.2)]; salt += 'M' + f1(q[0] + 2) + ' ' + f1(q[1] - 2) + 'h0'; }
    return s + '<path d="' + salt + '" stroke="#f6f1e2" stroke-width="4" stroke-linecap="round"/>';
  }

  function build(S) {
    var bg = '', fg = '';
    // ── sky + canopy ──
    bg += S.fillOnly(S.rect(-20, -20, 1960, GROUND + 40), S.linear([[0, '#cfe0d8'], [0.6, '#f2e2b0'], [1, '#f1d38c']], 0, 0, 0, 1));
    bg += S.glow(1300, 420, 700, 260, '#fff2c8', 0.5);
    // distant bushes + far tables
    var bush = [[-20, GROUND + 10]];
    for (var x = -20; x <= 1960; x += 50) bush.push([x, GROUND - 60 - 30 * Math.abs(Math.sin(x / 90))]);
    bush.push([1960, GROUND + 10]);
    bg += S.shape(bush, '#7f9a63', { w: 2.2, extra: 2 }) + S.hatch(bush, { ang: 60, gap: 8, w: 1.1, op: 0.3 });
    // ground (gravel)
    var ground = [[-20, GROUND], [1940, GROUND], [1940, 1100], [-20, 1100]];
    bg += S.fillOnly(ground, '#d6c59c');
    bg += S.stipple(ground, 2600, { r: 2.6, op: 0.35, cond: function (X, Y) { return Y < 920 ? 1 : 0.35; } });
    bg += S.fillOnly(S.rect(-20, GROUND, 1960, 30), 'rgba(60,40,20,.15)');
    // kiosk "Ausschank" (right back)
    var kx = 1480, kw = 380, ky = 360;
    bg += S.box(kx, ky, kw, GROUND - ky, '#a9764a', { w: 3, extra: 3.5, hatch: 'r', hk: 0.15 });
    bg += S.box(kx + 30, ky + 90, kw - 60, 110, '#3b2c22', { w: 2.4, extra: 2.4, hatch: false });
    bg += S.glow(kx + kw / 2, ky + 150, 160, 60, '#ffd98a', 0.4);
    bg += S.box(kx - 20, ky + 196, kw + 40, 22, P.woodM, { w: 2.4, extra: 2.6, hatch: 'b', hk: 0.4 });
    var roof = S.poly([[kx - 40, ky + 4], [kx + kw / 2, ky - 70], [kx + kw + 40, ky + 4]], 30, 1);
    bg += S.shape(roof, '#7d4a43', { w: 3, extra: 3.4 }) + S.hatch(roof, { ang: 0, gap: 9, w: 1.2, op: 0.4 });
    bg += S.box(kx + 60, ky + 24, kw - 120, 50, '#f3ead3', { w: 2.2, extra: 2.4, hatch: false }) + S.T(kx + kw / 2, ky + 60, 'AUSSCHANK', { f: 'Oswald', s: 30, ls: 4, a: 'middle' });
    // barrels
    [[kx + 60, GROUND], [kx + 150, GROUND], [kx + 105, GROUND - 82]].forEach(function (b) {
      var bar = U.catmull([[b[0] - 34, b[1]], [b[0] - 40, b[1] - 40], [b[0] - 34, b[1] - 80], [b[0] + 34, b[1] - 80], [b[0] + 40, b[1] - 40], [b[0] + 34, b[1]]], 4, false);
      bg += S.shape(bar, P.woodM, { w: 2.4, extra: 2.6 }) + S.lines([[[b[0] - 38, b[1] - 20], [b[0] + 38, b[1] - 20]], [[b[0] - 38, b[1] - 60], [b[0] + 38, b[1] - 60]]], { w: 4, ta: 0.05, tb: 0.05, min: 0.8 }, '#4a4038') + A.shadeSide(S, bar, [1, 0], 0.3, { ang: 80, gap: 6 });
    });
    // far tables
    bg += farTable(S, 120, GROUND + 40, 300, 0.7) + farTable(S, 560, GROUND + 30, 280, 0.65) + farTable(S, 980, GROUND + 36, 300, 0.68);
    bg += farTable(S, 330, GROUND + 110, 380, 0.85) + farTable(S, 1060, GROUND + 120, 380, 0.88);
    // maypole (Maibaum) in the distance
    bg += S.line([[880, GROUND - 40], [884, 120]], { w: 10, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[880, GROUND - 40], [884, 120]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }, '#f3ead3');
    var spir = []; for (var y = 140; y < GROUND - 60; y += 34) spir.push([[877, y], [887, y + 14]]);
    bg += S.lines(spir, { w: 5, ta: 0.05, tb: 0.05, min: 0.8 }, BLUE);
    // trunks + canopy
    bg += trunk(S, 260, 260, GROUND + 70, 30) + trunk(S, 1280, 280, GROUND + 40, 24) + trunk(S, 1880, 240, GROUND + 90, 34);
    bg += canopy(S, 260, 120, 360, 200, 3) + canopy(S, 1280, 110, 340, 180, 7) + canopy(S, 1860, 120, 320, 220, 11) + canopy(S, 760, 40, 300, 120, 19);
    // string lights with blue-white pennants (catenaries between trunks)
    var swags = [[[200, 330], [1280, 340], 90], [[1280, 340], [1960, 300], 70]];
    var bulbs = [];
    swags.forEach(function (sw, j) {
      var a = sw[0], b = sw[1], sag = sw[2], pts = [];
      for (var k = 0; k <= 40; k++) { var t = k / 40; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)]); }
      bg += S.line(pts, { w: 2.4, ta: 0.02, tb: 0.02, min: 0.7 });
      var n = Math.floor((b[0] - a[0]) / 70);
      for (k = 0; k < n; k++) {
        var t = (k + 0.5) / n, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t);
        if (k % 2) { var pen = S.poly([[px - 20, py], [px + 20, py], [px, py + 44]], 12, 0.6); bg += S.shape(pen, '#f4efe0', { w: 1.8, extra: 1.6 }); bg += S.hatch(pen, { ang: 45, gap: 10, w: 5, op: 0.85, color: BLUE }); }
        else bulbs.push([px, py + 10]);
      }
    });
    bg += '<!--amb:lights-->';
    // gentle hatching to darken canopy top edge
    bg += S.hatch(S.rect(-20, -20, 1960, 60), { ang: 30, gap: 9, w: 1.3, op: 0.3 });

    // ═════ fg: the long beer table + bench in front of the characters ═════
    fg += S.floorShadow(900, 960, 640, 20, 0.28);
    // trestle legs
    [[T.x0 + 90, 1], [T.x1 - 90, -1]].forEach(function (l) {
      fg += S.lines([[[l[0] - 50, T.y1], [l[0] + 50, 955]], [[l[0] + 50, T.y1], [l[0] - 50, 955]]], { w: 14, ta: 0.02, tb: 0.02, min: 0.9 });
      fg += S.lines([[[l[0] - 50, T.y1], [l[0] + 50, 955]], [[l[0] + 50, T.y1], [l[0] - 50, 955]]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, '#5a4d40');
    });
    var top = S.poly([[T.x0 + 20, T.y0], [T.x1 - 20, T.y0], [T.x1, T.y1], [T.x0, T.y1]], 50, 1);
    fg += S.shape(top, '#c79a60', { w: 3, extra: 3.2 });
    var planks = []; for (var i = 1; i < 4; i++) planks.push([[T.x0 + 6 + i * 4, T.y0 + i * 10.5], [T.x1 - 6 - i * 4, T.y0 + i * 10.5]]);
    fg += S.lines(planks, { w: 1.6, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".6"');
    fg += S.box(T.x0, T.y1, T.x1 - T.x0, 22, P.wood, { w: 3, extra: 3.4, hatch: 'b', hk: 0.4 });
    // tableware (on the table top, y ≈ T.y0..T.y1)
    // beer mats
    [[520, 794], [760, 790], [1070, 792], [1290, 796]].forEach(function (m) { fg += S.shape(S.ellipse(m[0], m[1], 30, 8, 24), '#f4efe0', { w: 1.6, extra: 1.2 }); });
    fg += mass(S, 520, 796, 84) + mass(S, 760, 792, 82) + mass(S, 1070, 794, 84, '#d9962f') + mass(S, 1290, 798, 84);
    // pretzels on a plate + radish + obatzda
    fg += S.shape(S.ellipse(900, 792, 80, 18, 32), '#f6f0e0', { w: 2, extra: 2.2 });
    fg += pretzel(S, 900, 776, 36);
    fg += S.shape(S.ellipse(1180, 798, 50, 12, 24), '#f6f0e0', { w: 1.8, extra: 1.8 });
    fg += S.shape(U.catmull([[1150, 794], [1160, 772], [1190, 768], [1210, 790]], 4, false), '#e9a14a', { w: 1.8, extra: 1.8 });   // Obatzda
    var radi = U.catmull([[620, 800], [600, 780], [612, 756], [640, 760], [648, 786]], 4, true);
    fg += S.shape(S.ellipse(630, 800, 40, 10, 24), '#f6f0e0', { w: 1.6, extra: 1.4 }) + S.shape(radi, '#f2ede0', { w: 1.8, extra: 1.8 }) + S.lines([[[624, 758], [612, 730]], [[630, 758], [636, 728]], [[634, 760], [652, 736]]], { w: 4, ta: 0.05, tb: 0.5 }, P.greenM);
    // bench in front
    fg += S.box(T.x0 + 40, 880, T.x1 - T.x0 - 80, 22, '#b98a52', { w: 2.8, extra: 3, hatch: 'b', hk: 0.4 });
    [[T.x0 + 110], [T.x1 - 110]].forEach(function (l) { fg += S.lines([[[l[0] - 26, 902], [l[0] + 26, 960]], [[l[0] + 26, 902], [l[0] - 26, 960]]], { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }); });

    // ambient: bulbs twinkle
    var amb = {
      lights: function (t) {
        var on = '', glow = '';
        bulbs.forEach(function (b, k) {
          var a = 0.75 + 0.25 * Math.sin(t * 3 + k * 1.7) * Math.sin(t * 1.3 + k);
          glow += '<circle cx="' + f1(b[0]) + '" cy="' + f1(b[1]) + '" r="' + f1(14 + 6 * a) + '" fill="#ffe7a0" opacity="' + f1(0.25 * a) + '"/>';
          on += 'M' + f1(b[0]) + ' ' + f1(b[1]) + 'h0';
        });
        return glow + '<path d="' + on + '" stroke="' + P.ink + '" stroke-width="15" stroke-linecap="round"/><path d="' + on + '" stroke="#fff3c4" stroke-width="10" stroke-linecap="round"/>';
      }
    };
    return { bg: bg, fg: fg, amb: amb };
  }

  A.define('biergarten', {
    seed: 81, ambient: true, build: build,
    slots: {
      'table-left':  A.slot(640, 905, 0.92, { face: 1, seated: true, seatY: 800 }),
      'table-right': A.slot(1160, 905, 0.92, { face: -1, seated: true, seatY: 800 }),
      'table-center': A.slot(900, 900, 0.9, { seated: true, seatY: 795 }),
      waiter: A.slot(1640, 960, 1.04, { face: -1 }),       // standing right of the table (room for a tray of mugs)
      left:   A.slot(200, 960, 1.02, { face: 1 }),
      right:  A.slot(1640, 960, 1.04, { face: -1 }),
      back:   A.slot(1020, 760, 0.72)
    }
  });
})(typeof self !== 'undefined' ? self : this);
