/* office-hot — open-plan office in July: broken AC with a taped "DEFEKT" note, desk fan, wilting plant,
 * thermometer at 35 °C, window with glaring sun, cubicle partitions, papers. Ambient: fan spin, heat shimmer,
 * a fluttering paper, an AC drip. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 770;


  // drooping ficus-like plant in a terracotta pot (x = pot bottom centre)
  function wiltPlant(S, x, y, h) {
    var s = '', pw = 150, ph = 170, stems = '', leaves = '';
    var tops = [[-170, 0, 0.92], [-90, 0, 1.0], [-25, 0, 1.08], [40, 0, 0.98], [120, 0, 0.9], [-130, 0, 0.7], [80, 0, 0.72]];
    tops.forEach(function (tp, i) {
      var bx = x + tp[0] * 0.12, by = y - ph + 8, hh = h * tp[2];
      // rise, then arch over and hang down
      var c = [[bx, by], [bx + tp[0] * 0.3, by - hh * 0.5], [bx + tp[0] * 0.8, by - hh * 0.72], [bx + tp[0] * 1.35, by - hh * 0.62], [bx + tp[0] * 1.7, by - hh * 0.36]];
      var pts = U.catmull(c, 6, false);
      stems += S.line(pts, { w: 4, ta: 0.02, tb: 0.6, min: 0.35 });
      for (var k = 6; k < pts.length; k += 3) {
        var p = pts[k], side = (k / 3) % 2 ? 1 : -1, ll = S.rand(38, 54);
        var ang = Math.PI / 2 + side * S.rand(0.15, 0.5) + (tp[0] > 0 ? -0.15 : 0.15); // hanging down
        var lw = ll * 0.34, lp = [];
        for (var q = 0; q < 16; q++) {
          var u = q / 16 * Math.PI * 2, ux = (1 - Math.cos(u)) / 2 * ll, uy = Math.sin(u) * lw * Math.sin((1 - Math.cos(u)) / 2 * Math.PI);
          lp.push([p[0] + ux * Math.cos(ang) - uy * Math.sin(ang), p[1] + ux * Math.sin(ang) + uy * Math.cos(ang)]);
        }
        var r = S.r(), col = r < 0.18 ? '#c3a24e' : r < 0.32 ? '#9a8a3e' : r < 0.66 ? P.greenM : P.green;
        leaves += S.shape(lp, col, { w: 1.6, extra: 1.8 });
        leaves += S.line([p, [p[0] + Math.cos(ang) * ll * 0.8, p[1] + Math.sin(ang) * ll * 0.8]], { w: 1.1, ta: 0.1, tb: 0.5, min: 0.3 }, P.ink, ' opacity=".7"');
      }
    });
    s += stems + leaves;
    var pot = S.poly([[x - pw / 2, y - ph], [x + pw / 2, y - ph], [x + pw / 2 - 20, y], [x - pw / 2 + 20, y]], 20, 1);
    s += S.shape(pot, '#b5562f', { w: 3, extra: 3.5 });
    s += A.shadeSide(S, pot, [1, 0.2], 0.15, { ang: 78, gap: 7 });
    s += S.box(x - pw / 2 - 8, y - ph - 8, pw + 16, 26, '#c96a3c', { w: 2.8, extra: 3, hatch: 'b', hk: 0.4 });
    // cracked dry soil + sweat drops on the pot
    s += S.lines([[[x - 30, y - ph + 32], [x - 10, y - ph + 40], [x + 6, y - ph + 34]], [[x + 20, y - ph + 50], [x + 34, y - ph + 44]]], { w: 1.6, ta: 0.1, tb: 0.3 }, '#f3d6b8', ' opacity=".8"');
    return s;
  }
  // office swivel chair (x = centre, y = floor)
  function chair(S, x, y) {
    var s = S.floorShadow(x, y + 4, 120, 16, 0.2);
    var legs = [];
    [[-110, 4], [-56, 18], [56, 18], [110, 4], [0, -10]].forEach(function (l) { legs.push([[x, y - 36], [x + l[0], y - 6 + l[1] * 0.3]]); });
    s += S.lines(legs, { w: 9, ta: 0.05, tb: 0.05, min: 0.8 });
    [[-110, 4], [-56, 18], [56, 18], [110, 4]].forEach(function (l) { s += S.circ(x + l[0], y + l[1] * 0.3 + 2, 9, P.navy, { w: 1.6, extra: 1.2 }); });
    s += S.box(x - 9, y - 120, 18, 86, '#56645d', { w: 2.2, extra: 2.2, hatch: 'r' });
    var back = U.catmull([[x - 70, y - 300], [x, y - 320], [x + 70, y - 300], [x + 78, y - 200], [x + 60, y - 150], [x - 60, y - 150], [x - 78, y - 200]], 5, true);
    s += S.box(x + 50, y - 200, 12, 70, '#3a4038', { w: 1.8, extra: 1.6, hatch: false });
    s += S.shape(back, P.navyL, { w: 3, extra: 3.5 }) + A.shadeSide(S, back, [1, 0.3], 0.2, { ang: 70, gap: 7, op: 0.45 });
    var seat = S.poly([[x - 92, y - 140], [x + 92, y - 140], [x + 100, y - 112], [x - 100, y - 112]], 30, 1);
    s += S.shape(seat, P.navy, { w: 3, extra: 3.5 }) + A.shadeSide(S, seat, [0, 1], 0.1, { ang: 10, gap: 6, op: 0.5 });
    // a jacket thrown over the backrest
    var jk = U.catmull([[x - 76, y - 300], [x - 30, y - 316], [x + 10, y - 304], [x + 4, y - 250], [x - 16, y - 200], [x - 52, y - 190], [x - 84, y - 230]], 5, true);
    s += S.shape(jk, '#a8573a', { w: 2.4, extra: 2.6 }) + A.shadeSide(S, jk, [1, 0.4], 0.25, { ang: 60, gap: 6, op: 0.45 });
    var sl = U.catmull([[x - 84, y - 236], [x - 60, y - 226], [x - 70, y - 170], [x - 82, y - 128], [x - 104, y - 132], [x - 100, y - 180]], 5, true);
    s += S.shape(sl, '#9a4c31', { w: 2.2, extra: 2.4 }) + S.box(x - 106, y - 140, 26, 14, '#f3ead3', { w: 1.6, extra: 1.2, step: 20, hatch: false });
    s += S.line([[x - 40, y - 312], [x - 24, y - 280], [x - 8, y - 304]], { w: 2, ta: 0.1, tb: 0.1 });
    s += S.lines([[[x - 30, y - 270], [x - 36, y - 210]]], { w: 1.6, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".7"');
    return s;
  }

  function build(S, opts) {
    var bg = '', s;
    var HOT = '#ecd5a2', HOT_D = '#e2c690';

    // ── wall, ceiling band, floor ──
    bg += S.wall(0, WALL_Y, HOT, { top: 70, op: 0.32 });
    bg += S.stripes(70, WALL_Y, 96, P.ink, 0.07);
    // ceiling band with fluorescent panels
    bg += S.fillOnly([[-20, -20], [1940, -20], [1940, 62], [-20, 62]], '#d8bf8b');
    bg += S.line([[-20, 62], [1940, 64]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    [[700, 260], [1300, 260]].forEach(function (p) {
      var pts = S.poly([[p[0] - p[1] / 2, 18], [p[0] + p[1] / 2, 18], [p[0] + p[1] / 2 + 14, 48], [p[0] - p[1] / 2 - 14, 48]], 30, 0.8);
      bg += S.shape(pts, '#f6eccd', { w: 2.6, extra: 2.6 });
      bg += S.lines([[[p[0] - p[1] / 2 + 10, 33], [p[0] + p[1] / 2 - 10, 33]]], { w: 1.4, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".5"');
    });
    bg += S.floor(WALL_Y, { kind: 'tiles', gap: 104, rows: 8, fill: '#bcae8e', fill2: '#b2a383', vx: 960, vy: 420, lop: 0.3 });
    bg += S.skirting(WALL_Y, 22, '#d9c398');

    // ── window with glaring sun (left) ──
    var wx = 70, wy = 112, ww = 560, wh = 470;
    var sky = S.linear([[0, '#fbf1c6'], [0.55, '#f3d98a'], [1, '#e9bf6a']], 0, 0, 0, 1);
    var view = '';
    view += S.glow(wx + 330, wy + 150, 330, 300, '#fffbe6', 0.95);
    // sun with ink rays
    var sx = wx + 330, sy = wy + 150;
    var rays = [];
    for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2; rays.push([[sx + Math.cos(a) * 82, sy + Math.sin(a) * 82], [sx + Math.cos(a) * (i % 2 ? 128 : 160), sy + Math.sin(a) * (i % 2 ? 128 : 160)]]); }
    view += S.lines(rays, { w: 4, ta: 0.1, tb: 0.6, min: 0.3 }, P.ochre);
    view += S.circ(sx, sy, 66, '#f7cf55', { w: 3, extra: 2.5 });
    view += S.hatch(S.ellipse(sx, sy, 64, 64, 40), { ang: 45, gap: 7, w: 1.2, op: 0.35, cond: function (X, Y) { return (X - sx) + (Y - sy) > 50; } });
    // hazy roofs
    var roofs = [[-10, 380, 120, 330], [100, 400, 90, 300], [180, 370, 140, 350], [310, 410, 100, 320], [400, 360, 160, 340]];
    roofs.forEach(function (r, j) {
      var x0 = wx + r[0], top = wy + r[3] + 40, pts = S.poly([[x0, wy + wh], [x0, top], [x0 + r[2] * 0.5, top - 46], [x0 + r[2], top], [x0 + r[2], wy + wh]], 30, 1);
      view += S.shape(pts, j % 2 ? '#d7a65e' : '#cf9a52', { w: 2, extra: 2 });
      view += S.hatch(pts, { ang: 70, gap: 7, w: 1.1, op: 0.35, cond: function (X) { return X > x0 + r[2] * 0.6; } });
      // tiny windows
      for (var q = 0; q < 3; q++) view += S.box(x0 + 18 + q * (r[2] / 3.4), top + 30, 14, 20, '#f6e2a8', { w: 1.4, extra: 1, step: 20 });
    });
    view += '<!--amb:winShimmer-->';
    bg += S.window(wx, wy, ww, wh, { sky: sky, view: view, panes: [2, 1], frame: '#efe5cc' });
    // venetian blind, pulled half way, one slat hanging crooked
    var bl = '';
    bl += S.box(wx - 14, wy - 30, ww + 28, 28, '#d9cfb4', { w: 2.6, extra: 3, hatch: 'b', hk: 0.5 });
    for (i = 0; i < 5; i++) {
      var yy = wy + 8 + i * 22, tilt = i === 4 ? 18 : 0;
      bl += S.shape(S.poly([[wx + 10, yy], [wx + ww - 10, yy - tilt], [wx + ww - 10, yy - tilt + 13], [wx + 10, yy + 13]], 40, 0.8), '#efe7d0', { w: 1.8, extra: 1.6 });
    }
    bl += S.seg(wx + 60, wy - 2, wx + 60, wy + 112, 1.4) + S.seg(wx + ww - 60, wy - 2, wx + ww - 60, wy + 100, 1.4);
    bl += S.seg(wx + ww - 40, wy, wx + ww - 40, wy + 300, 1.6) + S.circ(wx + ww - 40, wy + 306, 7, P.cream, { w: 1.4, extra: 1 });
    bg += bl;
    // glare spilling into the room + light pool on the floor
    bg += S.glow(wx + 330, wy + 160, 640, 460, '#fff3c4', 0.5);
    bg += A.shaft([[wx + 40, wy + wh + 30], [wx + ww - 20, wy + wh + 30], [1180, 1090], [330, 1090]], '#fff1bd', 0.22);

    // ── thermometer at 35 °C ──
    var tx = 770, ty = 140;
    bg += S.drop(tx - 46, ty, 92, 380, 10, 12);
    bg += S.box(tx - 46, ty, 92, 380, '#efe5cc', { w: 3, extra: 3.5, hatch: 'r', hk: 0.25 });
    var tick = [];
    for (i = 0; i <= 8; i++) { var ty2 = ty + 60 + i * 30; tick.push([[tx - 14, ty2], [tx - (i % 2 ? 26 : 36), ty2]]); }
    bg += S.lines(tick, { w: 2.2, ta: 0.05, tb: 0.05, min: 0.6 });
    ['40', '30', '20', '10', '0'].forEach(function (n, k) { bg += S.T(tx + 18, ty + 66 + k * 60, n, { f: 'Oswald', s: 17, a: 'start', c: P.ink }); });
    bg += S.line([[tx, ty + 40], [tx, ty + 318]], { w: 20, ta: 0.04, tb: 0.04, min: 0.95, jit: 0.05 });
    bg += S.line([[tx, ty + 42], [tx, ty + 318]], { w: 13, ta: 0.04, tb: 0.04, min: 0.95, jit: 0.05 }, '#f7f1df');
    bg += S.line([[tx, ty + 72], [tx, ty + 330]], { w: 8, ta: 0.02, tb: 0.02, min: 0.95, jit: 0.05 }, P.red);
    bg += S.circ(tx, ty + 336, 22, P.red, { w: 3, extra: 2.5 });
    bg += S.circ(tx - 7, ty + 329, 5, '#f3a597', { w: 0 });
    bg += S.T(tx - 6, ty + 26, '°C', { f: 'Oswald', s: 18, a: 'middle' });
    // "35°" label + sweat marks
    bg += S.T(tx + 158, ty + 112, '35°', { f: 'Fraunces', s: 92, c: P.red, r: -6, a: 'middle' });
    bg += S.line(U.catmull([[tx + 82, ty + 132], [tx + 150, ty + 126], [tx + 232, ty + 108]], 5, false), { w: 6, ta: 0.1, tb: 0.5, min: 0.3 }, P.red);
    bg += S.lines([[[tx - 64, ty + 50], [tx - 82, ty + 40]], [[tx - 66, ty + 76], [tx - 90, ty + 76]], [[tx + 62, ty + 36], [tx + 76, ty + 22]]], { w: 3, ta: 0.1, tb: 0.5, min: 0.3 });

    // ── calendar "JULI" (right wall) ──
    var cx0 = 1688, cy0 = 150, cw = 168, ch = 214;
    bg += S.drop(cx0, cy0, cw, ch, 8, 10);
    bg += S.box(cx0, cy0, cw, ch, '#f3ead3', { w: 2.6, extra: 3 });
    bg += S.box(cx0, cy0, cw, 52, P.red, { w: 2.6, extra: 3, hatch: 'b', hk: 0.4 });
    bg += S.T(cx0 + cw / 2, cy0 + 40, 'JULI', { f: 'Oswald', s: 34, c: '#f3ead3', ls: 4, a: 'middle' });
    var grid = [];
    for (i = 1; i < 7; i++) grid.push([[cx0 + 10 + i * 21, cy0 + 64], [cx0 + 10 + i * 21, cy0 + ch - 12]]);
    for (i = 1; i < 5; i++) grid.push([[cx0 + 10, cy0 + 64 + i * 28], [cx0 + cw - 10, cy0 + 64 + i * 28]]);
    bg += S.lines(grid, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".55"');
    bg += S.line(U.catmull(S.ellipse(cx0 + 94, cy0 + 132, 20, 15, 10, 0.1), 3, true).concat([[cx0 + 118, cy0 + 122]]), { w: 3, ta: 0.05, tb: 0.3, min: 0.4 }, P.red);
    bg += S.seg(cx0 + cw / 2, cy0 - 18, cx0 + cw / 2, cy0 + 6, 2) + S.circ(cx0 + cw / 2, cy0 - 20, 5, P.ink, { w: 0 });

    // ── broken AC unit + "DEFEKT" note ──
    var ax = 1150, ay = 104, aw = 440, ah = 150;
    bg += S.drop(ax, ay, aw, ah, 12, 14);
    var acBody = S.poly([[ax, ay + 10], [ax + 10, ay], [ax + aw - 10, ay], [ax + aw, ay + 10], [ax + aw, ay + ah - 18], [ax + aw - 24, ay + ah], [ax + 24, ay + ah], [ax, ay + ah - 18]], 40, 0.8);
    bg += S.shape(acBody, '#ece6d6', { w: 3.4, extra: 4 });
    bg += A.shadeSide(S, acBody, [0.2, 1], 0.35, { ang: 10, gap: 7, op: 0.45 });
    var vents = [];
    for (i = 0; i < 4; i++) vents.push([[ax + 40, ay + ah - 46 + i * 9], [ax + aw - 40, ay + ah - 46 + i * 9]]);
    bg += S.lines(vents, { w: 2, ta: 0.04, tb: 0.04, min: 0.6 });
    bg += S.box(ax + aw - 110, ay + 26, 76, 34, '#3a4038', { w: 2, extra: 2 });
    bg += S.T(ax + aw - 72, ay + 52, '– –', { f: 'Oswald', s: 22, c: P.red, a: 'middle' });
    // crossed-out snowflake
    var sfx = ax + 64, sfy = ay + 44, sf = [];
    for (i = 0; i < 3; i++) { var aa = i / 3 * Math.PI; sf.push([[sfx - Math.cos(aa) * 18, sfy - Math.sin(aa) * 18], [sfx + Math.cos(aa) * 18, sfy + Math.sin(aa) * 18]]); }
    bg += S.lines(sf, { w: 2.6, ta: 0.05, tb: 0.05, min: 0.6 }, P.blue);
    bg += S.line([[sfx - 24, sfy + 22], [sfx + 24, sfy - 22]], { w: 4, ta: 0.1, tb: 0.3, min: 0.4 }, P.red);
    // dangling cable + scorch hatch
    bg += S.line(U.catmull([[ax + aw - 6, ay + 120], [ax + aw + 34, ay + 160], [ax + aw + 20, ay + 250], [ax + aw + 40, ay + 330]], 6, false), { w: 4, ta: 0.02, tb: 0.1, min: 0.6 });
    bg += S.box(ax + aw + 28, ay + 326, 26, 18, P.navyL, { w: 1.8, extra: 1.4, step: 20 });
    bg += S.lines([[[ax + aw + 36, ay + 344], [ax + aw + 34, ay + 356]], [[ax + aw + 46, ay + 344], [ax + aw + 48, ay + 356]]], { w: 2.2, ta: 0.05, tb: 0.05 });
    bg += S.note(ax + 230, ay + 74, 200, 92, -7, '#f6efd9', [{ t: 'DEFEKT!', c: P.red, f: 'Kalam', s: 46 }], { fs: 46, top: 58, pin: true, tape: true });
    bg += S.seg(ax + 156, ay + 112, ax + 300, ay + 98, 3, P.red);
    bg += '<!--amb:drip-->';

    // ── cubicle partitions with monitors (mid ground) ──
    var px0 = 700, px1 = 1940, pTop = 560, pBot = WALL_Y + 4;
    // things peeking over partitions (behind them)
    bg += S.box(860, 470, 150, 100, '#3a4038', { w: 3, extra: 3 }) + S.box(872, 482, 126, 76, '#a9c3b4', { w: 1.8, extra: 1.4 });
    bg += S.hatch(S.rect(872, 482, 126, 76), { ang: -40, gap: 9, w: 1.2, op: 0.25, color: '#ffffff' });
    bg += S.box(1490, 486, 140, 90, '#3a4038', { w: 3, extra: 3 }) + S.box(1501, 497, 118, 66, '#a9c3b4', { w: 1.8, extra: 1.4 });
    bg += S.scribble(1512, 512, 90, 3, 14, P.ink, 0.4);
    bg += S.scribble(886, 498, 80, 3, 14, P.ink, 0.35) + S.hatch(S.rect(1501, 497, 118, 66), { ang: -40, gap: 9, w: 1.2, op: 0.22, color: '#ffffff' });
    bg += S.line(U.catmull([[1004, 480], [1010, 452], [1002, 430]], 4, false), { w: 2.4, ta: 0.3, tb: 0.6 }, P.ink, ' opacity=".5"');
    bg += S.box(1130, 500, 38, 70, P.mustard, { w: 2.2, extra: 2, hatch: 'r' }) + S.box(1172, 512, 30, 58, P.green, { w: 2.2, extra: 2, hatch: 'r' });
    // desk lamp
    bg += S.line([[1300, 562], [1290, 500], [1336, 470]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 });
    bg += S.shape(S.poly([[1324, 452], [1366, 470], [1350, 500], [1316, 486]], 14, 0.6), P.red, { w: 2.4, extra: 2.4 });
    // partitions
    var panels = [[px0, 1000], [1004, 1300], [1304, 1640], [1644, 1940]];
    panels.forEach(function (pn, j) {
      var pts = S.rect(pn[0], pTop, pn[1] - pn[0], pBot - pTop, 40, 1);
      bg += S.shape(pts, j % 2 ? '#8fa596' : '#9aae9f', { w: 3, extra: 3.5 });
      bg += S.hatch(pts, { ang: 90, gap: 6, w: 1, op: 0.18 });
      bg += A.shadeSide(S, pts, [0, 1], 0.55, { ang: 15, gap: 6, op: 0.4 });
      bg += S.box(pn[0] - 4, pTop - 10, pn[1] - pn[0] + 8, 14, '#c8c0aa', { w: 2.2, extra: 2.2, step: 40 });
    });
    // pinned papers on partitions
    bg += S.note(800, 640, 92, 110, -4, '#f3ead3', [], { pin: true });
    bg += S.scribble(770, 612, 60, 4, 16, P.ink, 0.45);
    bg += S.note(1090, 620, 84, 70, 5, P.yellow, ['heiß!'], { fs: 28, top: 44 });
    bg += S.note(1560, 640, 100, 120, 3, '#f3ead3', [], { pin: true });
    bg += S.scribble(1526, 612, 70, 5, 16, P.ink, 0.45);
    // wilting plant + fallen leaves (right)
    bg += S.floorShadow(1800, 952, 110, 18, 0.2);
    bg += chair(S, 1540, 905);
    bg += wiltPlant(S, 1800, 950, 420);
    var lv = [[1700, 968, 20], [1872, 980, -30], [1650, 990, 50]];
    lv.forEach(function (l) { bg += S.shape(U.xf(S.ellipse(0, 0, 18, 7, 14), l[0], l[1], l[2]), '#b49a4a', { w: 1.6, extra: 1.4 }); });

    // ── left desk with fan, papers, mug (foreground left) ──
    var dTop = 730, dx1 = 420;
    var deskTop = S.poly([[-30, dTop], [dx1 - 20, dTop], [dx1, dTop + 34], [-30, dTop + 34]], 40, 1);
    var deskFront = S.rect(-30, dTop + 34, dx1 + 30, 46, 40, 1);
    bg += S.floorShadow(200, 1060, 260, 26, 0.22);
    // drawer pedestal + leg
    var ped = S.rect(150, dTop + 80, 220, 1100 - dTop - 80, 40, 1);
    bg += S.shape(ped, P.woodM, { w: 3, extra: 3.5 }) + A.shadeSide(S, ped, [1, 0], 0.3, { ang: 80, gap: 8 });
    bg += S.box(176, dTop + 104, 168, 70, P.woodM, { w: 2.2, extra: 2, hatch: false }) + S.box(176, dTop + 190, 168, 70, P.woodM, { w: 2.2, extra: 2, hatch: false });
    bg += S.seg(236, dTop + 138, 284, dTop + 138, 5) + S.seg(236, dTop + 224, 284, dTop + 224, 5);
    bg += S.shape(deskTop, '#d1a76c', { w: 3.4, extra: 3.5 });
    bg += S.shape(deskFront, P.wood, { w: 3.4, extra: 4 }) + A.shadeSide(S, deskFront, [0, 1], 0.1, { ang: 0, gap: 7, op: 0.4 });
    // paper stack + mug
    for (i = 0; i < 5; i++) bg += S.shape(S.poly([[20 + i * 2, dTop + 6 - i * 7], [140 + i * 3, dTop + 4 - i * 7], [146, dTop + 10 - i * 7], [16, dTop + 12 - i * 7]], 30, 1), i % 2 ? '#f3ead3' : '#ebe1c8', { w: 1.6, extra: 1.4 });
    bg += S.mug(370, dTop + 18, 52, 60, P.red, { label: '', top: '#3a1c12' });
    // desk fan (static parts; blades are ambient)
    var fx = 250, fy = 560, fr = 92;
    bg += S.shape(S.ellipse(fx, dTop + 10, 70, 16, 30), '#4b5a54', { w: 2.6, extra: 2.6 });
    bg += S.box(fx - 12, fy + 40, 24, dTop - fy - 34, '#56645d', { w: 2.4, extra: 2.4, hatch: 'r' });
    bg += S.circ(fx, fy, fr + 6, 'rgba(240,235,215,.25)', { w: 3.4, extra: 3.4 });
    bg += '<!--amb:fan-->';
    // cage
    var cage = [];
    for (i = 0; i < 16; i++) { var ca = i / 16 * Math.PI * 2; cage.push([[fx + Math.cos(ca) * 22, fy + Math.sin(ca) * 22], [fx + Math.cos(ca) * (fr + 4), fy + Math.sin(ca) * (fr + 4)]]); }
    bg += S.lines(cage, { w: 1.6, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".8"');
    bg += S.shape(S.ellipse(fx, fy, fr * 0.6, fr * 0.6, 40, 0.01), null, { w: 1.4, extra: 0.6 });
    bg += S.circ(fx, fy, 20, P.teal, { w: 2.4, extra: 2 });
    bg += S.T(fx, fy + 6, 'MAX', { f: 'Oswald', s: 13, c: '#f3ead3' });
    // flying paper (ambient)
    bg += '<!--amb:paper-->';
    bg += '<!--amb:floorShimmer-->';

    // ── ambient pieces (static geometry prebuilt; per frame only transforms / a few strokes) ──
    var blades = '';
    for (i = 0; i < 3; i++) {
      var b0 = i / 3 * 360;
      var blade = U.xf(U.catmull([[0, -14], [fr * 0.45, -26], [fr * 0.82, -16], [fr * 0.86, 10], [fr * 0.4, 18], [0, 10]], 4, true), fx, fy, b0);
      blades += S.shape(blade, '#8fb3a6', { w: 2.2, extra: 2 });
    }
    var paperG = S.shape(S.poly([[-46, -32], [46, -36], [50, 32], [-42, 36]], 20, 1), '#f3ead3', { w: 2, extra: 2 }) + S.scribble(-30, -16, 60, 4, 12, P.ink, 0.45);
    var dropG = S.shape(U.catmull([[0, -12], [7, 2], [0, 9], [-7, 2]], 4, true), '#a9c8d6', { w: 1.6, extra: 1.2 });

    var amb = {
      fan: function (t) {
        var a = (t * 260) % 360;
        return '<circle cx="' + fx + '" cy="' + fy + '" r="' + (fr * 0.86) + '" fill="#8fb3a6" opacity=".22"/><g transform="rotate(' + A.U.f1(a) + ' ' + fx + ' ' + fy + ')">' + blades + '</g>';
      },
      paper: function (t) {
        var k = Math.sin(t * 3.1) * 6 + Math.sin(t * 7.3) * 2, dy = Math.sin(t * 2.2) * 10;
        return '<g transform="translate(' + A.U.f1(470 + Math.sin(t * 1.3) * 8) + ' ' + A.U.f1(470 + dy) + ') rotate(' + A.U.f1(-18 + k) + ')">' + paperG + '</g>' +
          '<g opacity=".5">' + speedLines(t) + '</g>';
      },
      drip: function (t) {
        var ph = (t * 0.7) % 1, y = ay + ah + 10 + ph * ph * 420;
        return ph < 0.92 ? '<g transform="translate(' + (ax + 120) + ' ' + A.U.f1(y) + ')">' + dropG + '</g>' : '';
      },
      winShimmer: function (t) { var Sa = A.ambInk('office-hot', 3 + Math.floor(t * 12)); return A.shimmer(Sa, wx + 30, wy + 240, ww - 60, 220, t, { n: 7, op: 0.22, color: '#b07a2a' }); },
      floorShimmer: function (t) { var Sa = A.ambInk('office-hot', 5 + Math.floor(t * 12)); return A.shimmer(Sa, 560, 700, 820, 150, t + 3, { n: 6, op: 0.12, color: '#8a5a1a', w: 2 }); }
    };
    function speedLines(t) {
      var o = (t * 40) % 30, d = '';
      [[380, 452], [372, 486], [390, 512]].forEach(function (p, j) { d += 'M' + (p[0] - 50 + o * 0.3) + ' ' + p[1] + 'h' + (34 - j * 6); });
      return '<path d="' + d + '" stroke="' + P.ink + '" stroke-width="2.4" stroke-linecap="round"/>';
    }
    return { bg: bg, amb: amb };
  }

  A.define('office-hot', {
    seed: 11, ambient: true, build: build,
    slots: {
      left:   A.slot(600, 940, 1.0, { face: 1 }),
      center: A.slot(960, 930, 0.98),
      right:  A.slot(1380, 940, 1.0, { face: -1 }),
      back:   A.slot(1190, 800, 0.78),
      fan:    A.slot(520, 950, 1.02, { face: -1 }),       // next to the desk fan
      ac:     A.slot(1300, 935, 1.0),                     // under the broken AC
      window: A.slot(760, 935, 1.0, { face: -1 })         // facing the window / thermometer
    }
  });
})(typeof self !== 'undefined' ? self : this);
