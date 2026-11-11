/* dinner-table — family Sunday dinner: wallpapered dining room, window with gingham curtains, cuckoo clock,
 * china cabinet, pendant lamp; a laid table with a big bowl of potato salad, sausages, bread, mustard.
 * The whole table is the fg layer (characters sit / stand behind it). Static set (no ambient). (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 760, TB = { yb: 730, yf: 836, xb0: 380, xb1: 1540, xf0: 280, xf1: 1640, drape: 112 }, FOOD_DY = 40;

  function gingham(S, pts, col, gap) {
    return S.hatch(pts, { ang: 0, gap: gap || 16, w: 7, op: 0.45, color: col }) + S.hatch(pts, { ang: 90, gap: gap || 16, w: 7, op: 0.45, color: col });
  }
  function curtain(S, x0, x1, y0, y1, side) {
    // gathered curtain, tied back toward the frame side
    var mid = y0 + (y1 - y0) * 0.55, inner = side < 0 ? x1 : x0, outer = side < 0 ? x0 : x1;
    var inEdge = U.catmull([[inner, y0], [inner - side * 4, y0 + 110], [outer + (inner - outer) * 0.42, mid], [inner - (inner - outer) * 0.05, y1 - 60], [inner + side * 12, y1]], 6, false);
    var pts = [[outer, y0]].concat(inEdge).concat([[outer, y1]]);
    var s = S.shape(pts, '#efe3cc', { w: 2.6, extra: 3 });
    s += gingham(S, pts, P.red, 18);
    var folds = [];
    for (var i = 1; i < 4; i++) { var fx = outer + (inner - outer) * i / 5; folds.push([[fx, y0 + 6], [fx + side * 4, mid - 20]]); folds.push([[fx, mid + 20], [fx - side * 6, y1 - 4]]); }
    s += S.lines(folds, { w: 1.8, ta: 0.2, tb: 0.3, min: 0.3 }, P.ink, ' opacity=".55"');
    // tie-back
    var ty = mid + 4, tx0 = outer + side * 4, tx1 = outer + (inner - outer) * 0.62;
    s += S.line([[tx0, ty], [tx1, ty + 6]], { w: 10, ta: 0.05, tb: 0.05, min: 0.8 }, P.mustard) + S.line([[tx0, ty - 5], [tx1, ty + 1]], { w: 1.6, ta: 0.05, tb: 0.05 });
    return s;
  }
  function cuckoo(S, x, y) {
    var s = '', w = 130;
    // pine-cone weights + chains
    s += S.seg(x - 24, y + 150, x - 24, y + 320, 1.4) + S.seg(x + 24, y + 150, x + 24, y + 270, 1.4);
    [[x - 24, y + 320], [x + 24, y + 270]].forEach(function (c) {
      var cone = U.catmull([[c[0], c[1]], [c[0] + 12, c[1] + 14], [c[0] + 10, c[1] + 50], [c[0], c[1] + 62], [c[0] - 10, c[1] + 50], [c[0] - 12, c[1] + 14]], 4, true);
      s += S.shape(cone, P.woodD, { w: 2, extra: 2 }) + S.hatch(cone, { ang: 45, gap: 6, w: 1.1, op: 0.5 }) + S.hatch(cone, { ang: -45, gap: 6, w: 1.1, op: 0.5 });
    });
    s += S.seg(x, y + 150, x + 6, y + 230, 2) + S.circ(x + 6, y + 236, 10, P.mustard, { w: 1.6, extra: 1.2 });
    s += S.drop(x - w / 2, y, w, 150, 8, 10);
    var house = S.poly([[x - w / 2, y + 30], [x, y - 34], [x + w / 2, y + 30], [x + w / 2 - 6, y + 150], [x - w / 2 + 6, y + 150]], 24, 1);
    s += S.shape(house, P.woodM, { w: 3, extra: 3.5 }) + A.shadeSide(S, house, [1, 0.3], 0.3, { ang: 75, gap: 7 });
    s += S.line([[x - w / 2 - 18, y + 40], [x, y - 44], [x + w / 2 + 18, y + 40]], { w: 12, ta: 0.05, tb: 0.05, min: 0.8 }, P.woodDD);
    // carved leaves on the roof
    s += S.lines([[[x - 30, y - 4], [x - 10, y - 20]], [[x + 30, y - 4], [x + 10, y - 20]], [[x, y - 32], [x, y - 56]]], { w: 3, ta: 0.3, tb: 0.5 }, P.green);
    s += S.box(x - 14, y + 10, 28, 24, '#2a1d14', { w: 1.6, extra: 1.2, step: 20, hatch: false });
    s += S.clock(x, y + 86, 38, 2, 50);
    return s;
  }
  function cabinet(S, x, y, w, h) {
    var s = S.floorShadow(x + w / 2, y + h + 2, w * 0.6, 14, 0.22);
    s += S.drop(x, y, w, h, 12, 10);
    s += S.box(x, y, w, h, P.woodD, { w: 3.4, extra: 4, hatch: 'r', hk: 0.15 });
    s += S.box(x - 12, y - 22, w + 24, 26, P.woodM, { w: 3, extra: 3.5, hatch: 'b', hk: 0.5 });
    // glass doors with plates
    var gx = x + 20, gw = w - 40, gy = y + 22, gh = h * 0.56;
    s += S.box(gx, gy, gw, gh, '#5d6b5c', { w: 2.4, extra: 2, hatch: false });
    s += S.box(gx, gy + gh * 0.5 - 6, gw, 10, P.woodM, { w: 1.8, extra: 1.6, step: 40, hatch: false });
    for (var r = 0; r < 2; r++) for (var i = 0; i < 3; i++) {
      var px = gx + gw * (i + 0.5) / 3, py = gy + gh * (r * 0.5 + 0.26);
      s += S.circ(px, py, gw / 8, '#f1e8d0', { w: 2, extra: 1.6 });
      s += S.shape(S.ellipse(px, py, gw / 13, gw / 13, 24), null, { w: 1.6, extra: 0.6, color: P.blue });
    }
    s += S.hatch(S.rect(gx, gy, gw, gh), { ang: -50, gap: 8, w: 1.4, op: 0.18, color: '#ffffff', cond: function (X, Y) { var u = (X - gx) + (Y - gy) * 0.5; return (u > gw * 0.15 && u < gw * 0.35); } });
    s += S.seg(x + w / 2, gy, x + w / 2, gy + gh, 3);
    // drawers
    var dy = gy + gh + 22;
    s += S.box(gx, dy, gw, h - (dy - y) - 20, P.woodM, { w: 2.4, extra: 2.4, hatch: 'b', hk: 0.3 });
    s += S.seg(gx + gw / 2 - 20, dy + 40, gx + gw / 2 + 20, dy + 40, 5);
    // vase with flowers on top
    var vx = x + w * 0.7, vy = y - 22;
    for (var k = 0; k < 6; k++) {
      var a = -Math.PI / 2 + (k - 2.5) * 0.28, ex = vx + Math.cos(a) * 80, ey = vy - 60 + Math.sin(a) * 70;
      s += S.line([[vx, vy - 40], [ex, ey]], { w: 2.2, ta: 0.05, tb: 0.2 }, P.green);
      s += S.circ(ex, ey, 13, [P.red, P.yellow, '#f1e8d0'][k % 3], { w: 1.8, extra: 1.4 }) + S.circ(ex, ey, 4, P.ochre, { w: 0 });
    }
    var vase = U.catmull([[vx - 18, vy - 70], [vx - 26, vy - 30], [vx - 20, vy], [vx + 20, vy], [vx + 26, vy - 30], [vx + 18, vy - 70]], 5, false);
    s += S.shape(vase, P.blue, { w: 2.4, extra: 2.6 }) + A.shadeSide(S, vase, [1, 0], 0.2, { ang: 80, gap: 6 });
    return s;
  }
  function chairBack(S, x, yTop, yBot) {
    var s = '', w = 150;
    [[x - w / 2, 1], [x + w / 2 - 18, 1]].forEach(function (p) { s += S.box(p[0], yTop + 10, 18, yBot - yTop, P.woodD, { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.4 }); });
    var top = S.poly([[x - w / 2 - 8, yTop + 20], [x - w / 2, yTop - 6], [x + w / 2, yTop - 6], [x + w / 2 + 8, yTop + 20], [x + w / 2 - 8, yTop + 46], [x - w / 2 + 8, yTop + 46]], 30, 0.8);
    s += S.shape(top, P.wood, { w: 2.8, extra: 3.2 }) + A.shadeSide(S, top, [0, 1], 0.2, { ang: 10, gap: 6 });
    var sp = [];
    for (var i = 1; i < 5; i++) sp.push([[x - w / 2 + 9 + (w - 18) * i / 5, yTop + 46], [x - w / 2 + 9 + (w - 18) * i / 5, yBot]]);
    s += S.lines(sp, { w: 8, ta: 0.05, tb: 0.05, min: 0.85 });
    s += S.lines(sp, { w: 4, ta: 0.05, tb: 0.05, min: 0.85 }, P.woodM);
    return s;
  }

  function build(S) {
    var bg = '', fg = '';
    // ── room: wallpaper, wainscot, floor + rug ──
    bg += S.wall(0, WALL_Y, '#cdbd8b', { top: 46, op: 0.3 });
    // damask-ish wallpaper: soft stripes + small motif
    var st = '';
    for (var x = 0; x < 1940; x += 80) st += '<rect x="' + (x + 24) + '" y="0" width="32" height="' + WALL_Y + '" fill="#c2b07c" opacity=".7"/>';
    bg += st;
    var mot = '';
    for (x = 40; x < 1940; x += 80) for (var y = 70 + ((x / 80) % 2) * 50; y < 560; y += 100) {
      mot += 'M' + x + ' ' + (y - 9) + 'q6 9 0 18q-6 -9 0 -18Z';
      mot += 'M' + (x - 9) + ' ' + y + 'q9 -6 18 0q-9 6 -18 0Z';
    }
    bg += '<path d="' + mot + '" fill="#8a7a3e" opacity=".55"/>';
    // wainscot
    bg += S.fillOnly([[-20, 560], [1940, 560], [1940, WALL_Y], [-20, WALL_Y]], '#a77a47');
    bg += S.line([[-20, 556], [1940, 558]], { w: 5, ta: 0.02, tb: 0.02, min: 0.6 });
    bg += S.box(-20, 546, 1960, 18, P.woodM, { w: 2.6, extra: 2.6, step: 60, hatch: 'b', hk: 0.4 });
    for (x = 20; x < 1920; x += 190) bg += S.box(x, 588, 150, 146, '#b0844f', { w: 2, extra: 2, hatch: 'l', hk: 0.15 });
    bg += S.floor(WALL_Y, { kind: 'boards', gap: 90, fill: '#a9824f', vx: 960, vy: 380, lop: 0.5, hop: 0.25 });
    bg += S.skirting(WALL_Y, 18, '#7d5733');
    // rug
    var rug = S.poly([[160, 900], [1760, 900], [1900, 1100], [20, 1100]], 50, 1.4);
    bg += S.shape(rug, '#8a4636', { w: 3, extra: 3 });
    var rIn = S.poly([[220, 926], [1700, 926], [1820, 1100], [100, 1100]], 50, 1);
    bg += S.shape(rIn, '#9a5442', { w: 2, extra: 1.6 });
    bg += S.hatch(rIn, { ang: 0, gap: 12, w: 1.2, op: 0.2 });
    var dia = '';
    for (x = 260; x < 1700; x += 120) dia += 'M' + x + ' 913l12 -8l12 8l-12 8z';
    bg += '<path d="' + dia + '" fill="' + P.mustard + '" opacity=".8"/>';

    // ── window with gingham curtains (left) ──
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), '#c9dcd6');
    view += S.glow(300, 240, 300, 240, '#fff6dc', 0.7);
    var hedge = S.poly([[100, 520], [160, 440], [240, 470], [330, 420], [420, 460], [480, 430], [520, 520]], 20, 4);
    view += S.shape(U.catmull(hedge, 3, true), P.greenM, { w: 2, extra: 2 }) + S.hatch(hedge, { ang: 60, gap: 7, w: 1.1, op: 0.35 });
    view += S.circ(380, 300, 90, P.greenL, { w: 2.2, extra: 2 }) + S.circ(320, 340, 70, P.greenM, { w: 2, extra: 2 }) + S.box(352, 380, 22, 120, P.woodD, { w: 2, extra: 2 });
    view += S.hatch(S.ellipse(380, 300, 88, 88, 30), { ang: 50, gap: 7, w: 1.1, op: 0.35, cond: function (X, Y) { return X + Y > 720; } });
    bg += S.window(120, 150, 360, 360, { view: view, panes: [2, 2], frame: '#efe5cc' });
    bg += S.line([[60, 128], [540, 128]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, P.woodDD);
    bg += S.circ(56, 128, 9, P.woodDD, { w: 1.6, extra: 1 }) + S.circ(544, 128, 9, P.woodDD, { w: 1.6, extra: 1 });
    bg += curtain(S, 70, 200, 132, 548, 1) + curtain(S, 400, 530, 132, 548, -1);
    // sunlight patch on the wall
    bg += A.shaft([[500, 230], [600, 230], [720, 560], [610, 560]], '#fff3cf', 0.2);

    // ── wall decor ──
    bg += S.frame(650, 170, 190, 140, '#d9e2cf', function (x, y, w, h) {
      // little alpine landscape
      var m = S.poly([[x - 10, y + h], [x + 50, y + 40], [x + 90, y + 80], [x + 140, y + 20], [x + w + 10, y + h]], 14, 1);
      return S.fillOnly(S.rect(x, y, w, h), '#cfe0e0') + S.shape(m, '#8fa596', { w: 1.6, extra: 1.4 }) +
        S.shape(S.poly([[x + 128, y + 34], [x + 140, y + 20], [x + 152, y + 34]], 8, 0.4), '#f6f1e2', { w: 1.2, extra: 0.6 }) +
        S.fillOnly(S.rect(x, y + h - 26, w, 30), P.greenM);
    }, { frame: P.mustard });
    bg += cuckoo(S, 1210, 120);
    // oval portrait of grandpa
    bg += S.drop(1418, 190, 110, 140, 6, 8);
    bg += S.shape(S.ellipse(1470, 258, 58, 74, 48), P.woodDD, { w: 3, extra: 3 }) + S.shape(S.ellipse(1470, 258, 46, 62, 48), '#d8c8a2', { w: 1.6, extra: 1 });
    bg += S.shape(S.poly([[1424, 330], [1440, 288], [1470, 280], [1500, 288], [1516, 330]], 14, 0.6), '#4a4038', { w: 1.6, extra: 1.2 });
    var pear = U.catmull([[1470, 208], [1484, 222], [1486, 244], [1500, 268], [1490, 292], [1470, 298], [1450, 292], [1440, 268], [1456, 244], [1456, 222]], 4, true);
    bg += S.shape(pear, '#c9b24a', { w: 1.8, extra: 1.8 }) + A.shadeSide(S, pear, [1, 0.4], 0.3, { ang: 60, gap: 5, op: 0.4 });
    bg += S.line([[1470, 208], [1474, 196]], { w: 3, ta: 0.1, tb: 0.4 }, P.woodDD);
    bg += S.dot(1462, 256, 2.6) + S.dot(1480, 256, 2.6) + S.line(U.catmull([[1456, 272], [1464, 266], [1471, 270], [1478, 266], [1486, 272]], 3, false), { w: 4, ta: 0.3, tb: 0.3, min: 0.4 });
    bg += cabinet(S, 1650, 300, 240, 450);

    // pendant lamp over the table
    bg += S.pendant(960, -10, 330, 150, P.green, { cone: 420, op: 0.28 });

    // chair backs behind the table
    [560, 960, 1360].forEach(function (cx) { bg += chairBack(S, cx, 540, 720); });

    // ═════ fg: the table (everything in front of seated characters) ═════
    var top = S.poly([[TB.xb0, TB.yb], [TB.xb1, TB.yb], [TB.xf1, TB.yf], [TB.xf0, TB.yf]], 50, 1);
    fg += S.shape(top, '#f1e8d0', { w: 3.4, extra: 3 });
    fg += S.hatch(top, { ang: 0, gap: 9, w: 1.1, op: 0.18, cond: function (X, Y) { return Y < TB.yb + 22; } });
    // lamp light pool on the cloth
    fg += S.glow(960, 790, 560, 70, '#fff3c4', 0.5);
    // drape with red border + scallops
    var dy1 = TB.yf + TB.drape, drape = [[TB.xf0, TB.yf]];
    for (var i = 0; i <= 26; i++) { var xx = TB.xf0 - 10 + (TB.xf1 - TB.xf0 + 20) * i / 26; drape.push([xx, dy1 + (i % 2 ? 10 : 0)]); }
    drape.push([TB.xf1, TB.yf]);
    // legs + shadow under the drape
    fg += S.floorShadow(960, dy1 + 8, 720, 22, 0.3);
    fg += S.shape(drape, '#efe3c6', { w: 3.4, extra: 4 });
    fg += S.hatch(drape, { ang: 90, gap: 70, w: 2, op: 0.25 });
    fg += A.shadeSide(S, drape, [0, 1], 0.45, { ang: 10, gap: 7, op: 0.35 });
    var bd = S.poly([[TB.xf0 - 6, dy1 - 34], [TB.xf1 + 6, dy1 - 34], [TB.xf1 + 8, dy1 - 18], [TB.xf0 - 8, dy1 - 18]], 60, 0.8);
    fg += S.shape(bd, P.red, { w: 1.6, extra: 1.2 });
    var cross = '';
    for (x = TB.xf0 + 20; x < TB.xf1; x += 34) cross += 'M' + x + ' ' + (dy1 - 30) + 'l8 8m0 -8l-8 8';
    fg += '<path d="' + cross + '" stroke="#f3ead3" stroke-width="2" fill="none"/>';
    fg += S.line([[TB.xf0 - 4, TB.yf], [TB.xf1 + 4, TB.yf]], { w: 4.5, ta: 0.02, tb: 0.02, min: 0.6 });

    // ── food & tableware ──
    function plate(px, py, r, food) {
      var s = S.shape(S.ellipse(px + 4, py + 6, r, r * 0.32, 40), 'rgba(80,55,20,.18)', { w: 0 });
      s += S.shape(S.ellipse(px, py, r, r * 0.32, 48, 0.004), '#f6f0e0', { w: 2.4, extra: 2.6 });
      s += S.shape(S.ellipse(px, py + 2, r * 0.66, r * 0.2, 40, 0.004), null, { w: 1.2, extra: 0.6, color: P.blue });
      if (food) s += food(px, py, r);
      return s;
    }
    function sausage(x0, y0, len, rot, col) {
      var pts = U.xf(U.catmull([[-len / 2, 0], [-len / 4, -5], [len / 4, -5], [len / 2, 0]], 5, false), x0, y0, rot);
      var s = S.line(pts, { w: 22, ta: 0.25, tb: 0.25, min: 0.6, jit: 0.05 });
      s += S.line(pts, { w: 16, ta: 0.25, tb: 0.25, min: 0.6, jit: 0.05 }, col || '#c46a3c');
      s += S.line(U.xf([[-len / 3, -4], [len / 3, -5]], x0, y0, rot), { w: 3, ta: 0.3, tb: 0.3, min: 0.3 }, '#f0b58a', ' opacity=".8"');
      return s;
    }
    function potatoes(cx, cy, rx, ry, n) {
      var s = '';
      for (var k = 0; k < n; k++) {
        var a = S.r() * Math.PI * 2, rr = Math.sqrt(S.r());
        var px = cx + Math.cos(a) * rx * rr, py = cy + Math.sin(a) * ry * rr - (1 - rr) * ry * 0.8, sz = S.rand(9, 14);
        var cube = U.xf(S.poly([[-sz, -sz * 0.7], [sz, -sz * 0.8], [sz * 1.05, sz * 0.7], [-sz * 0.9, sz * 0.75]], 8, 1.5), px, py, S.rand(-30, 30));
        s += S.shape(cube, S.r() < 0.5 ? '#ecd27a' : '#e2c262', { w: 1.3, extra: 1.3 });
      }
      // chives + pickles
      var chv = '';
      for (k = 0; k < n * 0.6; k++) { var qa = S.r() * Math.PI * 2, q = Math.sqrt(S.r()); var X = cx + Math.cos(qa) * rx * q, Y = cy + Math.sin(qa) * ry * q - (1 - q) * ry * 0.8; chv += 'M' + U.f1(X) + ' ' + U.f1(Y) + 'l' + U.f1(S.rand(-5, 5)) + ' ' + U.f1(S.rand(-3, 3)); }
      s += '<path d="' + chv + '" stroke="' + P.green + '" stroke-width="3" stroke-linecap="round"/>';
      return s;
    }
    var food = '';
    // bread basket (left back)
    var bx = 760, by = 712;
    food += S.shape(S.ellipse(bx, by, 86, 26, 40), P.woodL, { w: 2.4, extra: 2.6 });
    for (i = 0; i < 4; i++) { var rx = bx - 50 + i * 32, ry = by - 14 - (i % 2) * 8; food += S.shape(U.xf(S.ellipse(0, 0, 30, 18, 24, 0.04), rx, ry, -10 + i * 8), '#c98f4a', { w: 2, extra: 2 }) + S.line(U.xf([[-14, -2], [12, -6]], rx, ry, -10 + i * 8), { w: 2, ta: 0.2, tb: 0.2 }, '#f1d9a8'); }
    food += S.shape(U.catmull([[bx - 88, by], [bx - 80, by + 26], [bx, by + 40], [bx + 80, by + 26], [bx + 88, by]], 5, false).concat([[bx + 86, by + 4]]), P.woodM, { w: 2.4, extra: 2.6 });
    food += S.hatch(S.poly([[bx - 86, by + 2], [bx + 86, by + 2], [bx + 70, by + 34], [bx - 70, by + 34]], 20, 0.5), { ang: 45, gap: 8, w: 1.1, op: 0.4 }) + S.hatch(S.poly([[bx - 86, by + 2], [bx + 86, by + 2], [bx + 70, by + 34], [bx - 70, by + 34]], 20, 0.5), { ang: -45, gap: 8, w: 1.1, op: 0.4 });
    // sausage platter (right back)
    var sx = 1170, sy = 716;
    food += S.shape(S.ellipse(sx + 4, sy + 6, 120, 30, 40), 'rgba(80,55,20,.18)', { w: 0 });
    food += S.shape(S.ellipse(sx, sy, 120, 30, 48), '#f6f0e0', { w: 2.4, extra: 2.6 });
    for (i = 0; i < 5; i++) food += sausage(sx - 30 + (i % 2) * 40 - (i > 2 ? 20 : 0), sy + 8 - i * 9, 120, -6 + (i % 3) * 5);
    // mustard jar
    food += S.box(1300, 690, 44, 54, P.yellow, { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.35 }) + S.box(1296, 680, 52, 14, P.red, { w: 2, extra: 2, step: 30 });
    food += S.T(1322, 724, 'SENF', { f: 'Oswald', s: 13, a: 'middle' });
    // water jug + glasses
    var jx = 640, jy = 730;
    var jug = U.catmull([[jx - 26, jy - 110], [jx - 34, jy - 60], [jx - 30, jy - 10], [jx, jy], [jx + 30, jy - 10], [jx + 34, jy - 60], [jx + 26, jy - 110]], 5, false);
    food += S.shape(jug, 'rgba(200,225,225,.55)', { w: 2.4, extra: 2.4 }) + S.fillOnly(U.catmull([[jx - 33, jy - 64], [jx - 30, jy - 10], [jx, jy], [jx + 30, jy - 10], [jx + 33, jy - 64]], 5, false), 'rgba(140,185,195,.45)');
    food += S.line(U.catmull([[jx + 30, jy - 96], [jx + 58, jy - 86], [jx + 52, jy - 40], [jx + 32, jy - 30]], 5, false), { w: 5, ta: 0.05, tb: 0.05, min: 0.8 });
    food += S.line([[jx - 14, jy - 90], [jx - 16, jy - 30]], { w: 3, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".7"');
    function glass(gx, gy, fill) {
      var gl = S.poly([[gx - 16, gy - 62], [gx + 16, gy - 62], [gx + 13, gy], [gx - 13, gy]], 14, 0.6);
      return S.fillOnly(S.poly([[gx - 15, gy - 34], [gx + 15, gy - 34], [gx + 13, gy], [gx - 13, gy]], 14, 0.4), fill) + S.shape(gl, 'rgba(220,235,235,.35)', { w: 2, extra: 2 }) +
        S.line([[gx - 9, gy - 54], [gx - 8, gy - 10]], { w: 2.4, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".7"');
    }
    food += glass(470, 752, 'rgba(220,170,60,.75)') + glass(1460, 752, 'rgba(160,40,40,.7)') + glass(1060, 704, 'rgba(220,170,60,.7)');
    // cutlery + napkins helpers
    function setting(cx, cy) {
      var s = '';
      s += S.shape(U.xf(S.poly([[-24, -10], [24, -12], [28, 10], [-26, 12]], 16, 1), cx - 130, cy + 4, -6), P.red, { w: 1.8, extra: 1.6 }) + gingham(S, U.xf(S.poly([[-24, -10], [24, -12], [28, 10], [-26, 12]], 16, 1), cx - 130, cy + 4, -6), '#f3ead3', 9);
      s += S.line([[cx - 118, cy - 8], [cx - 100, cy + 22]], { w: 4, ta: 0.05, tb: 0.3, min: 0.6 }, '#9aa0a0') + S.line([[cx - 118, cy - 8], [cx - 100, cy + 22]], { w: 1.4, ta: 0.05, tb: 0.3, min: 0.6 });
      s += S.line([[cx + 112, cy - 8], [cx + 98, cy + 24]], { w: 5, ta: 0.05, tb: 0.05, min: 0.8 }, '#9aa0a0') + S.line([[cx + 112, cy - 8], [cx + 98, cy + 24]], { w: 1.4, ta: 0.05, tb: 0.05 });
      return s;
    }
    // plates in front of the seated slots
    [[560, 768], [1360, 768]].forEach(function (pp, j) {
      food += setting(pp[0], pp[1]);
      food += plate(pp[0], pp[1], 92, function (px, py) {
        return potatoes(px - 26, py - 2, 30, 9, 9) + sausage(px + 26, py - 2, 70, j ? -14 : 12) + sausage(px + 30, py + 8, 66, j ? -4 : 22);
      });
    });
    // THE potato salad bowl (centre front)
    var ox = 960, oy = 716, orx = 160, ory = 36;
    food += S.shape(S.ellipse(ox + 8, oy + 96, orx * 0.8, 20, 40), 'rgba(80,55,20,.22)', { w: 0 });
    var bowl = U.catmull([[ox - orx, oy], [ox - orx * 0.95, oy + 50], [ox - orx * 0.62, oy + 92], [ox, oy + 104], [ox + orx * 0.62, oy + 92], [ox + orx * 0.95, oy + 50], [ox + orx, oy]], 6, false);
    // salad mound above the rim (behind the front wall of the bowl)
    var mound = U.catmull([[ox - orx + 10, oy + 4], [ox - orx * 0.7, oy - 34], [ox - orx * 0.2, oy - 58], [ox + orx * 0.3, oy - 54], [ox + orx * 0.75, oy - 30], [ox + orx - 10, oy + 4]], 5, false);
    food += S.shape(S.ellipse(ox, oy, orx, ory, 60), '#cdb25a', { w: 2.4, extra: 1.6 });
    food += S.shape(mound, '#e9cf78', { w: 2.4, extra: 2.4 });
    food += potatoes(ox, oy + 6, orx * 0.86, 22, 40);
    food += potatoes(ox, oy - 18, orx * 0.74, 32, 44);
    food += A.shadeSide(S, mound, [0.8, 0.6], 0.3, { ang: 50, gap: 6, op: 0.35 });
    // serving spoon
    food += S.line([[ox + 40, oy - 30], [ox + 150, oy - 150]], { w: 12, ta: 0.05, tb: 0.05, min: 0.85 }) + S.line([[ox + 42, oy - 32], [ox + 148, oy - 148]], { w: 7, ta: 0.05, tb: 0.05, min: 0.85 }, '#b8bcbc');
    food += S.shape(U.xf(S.ellipse(0, 0, 32, 20, 24), ox + 30, oy - 20, -40), '#b8bcbc', { w: 2, extra: 2 });
    // front of bowl: white ceramic with blue onion pattern band
    var front = bowl.concat(S.ellipse(ox, oy, orx, ory, 30, 0, 0, Math.PI));
    food += S.shape(front, '#f4efe2', { w: 3, extra: 3.5 });
    food += S.line(U.catmull([[ox - orx * 0.97, oy + 28], [ox - orx * 0.5, oy + 60], [ox, oy + 66], [ox + orx * 0.5, oy + 60], [ox + orx * 0.97, oy + 28]], 5, false), { w: 3, ta: 0.05, tb: 0.05, min: 0.6 }, P.blue);
    var orn = '';
    for (i = -4; i <= 4; i++) { var ex = ox + i * 32, ey = oy + 44 + 18 * (1 - Math.pow(i / 4.6, 2)); orn += 'M' + ex + ' ' + (ey - 9) + 'q8 9 0 18q-8 -9 0 -18Z'; }
    food += '<path d="' + orn + '" fill="' + P.blue + '"/>';
    food += A.shadeSide(S, front, [0.9, 0.4], 0.35, { ang: 70, gap: 6, op: 0.4 });
    // little salt & pepper
    food += S.box(1520, 740, 18, 32, '#f3ead3', { w: 1.8, extra: 1.6, step: 20, hatch: 'r' }) + S.box(1544, 744, 18, 30, P.navyL, { w: 1.8, extra: 1.6, step: 20, hatch: false });
    fg += '<g transform="translate(0 ' + FOOD_DY + ')">' + food + '</g>';
    return { bg: bg, fg: fg };
  }

  A.define('dinner-table', {
    seed: 23, build: build,
    slots: {
      // seated behind the table (feet/seat hidden by the fg table; for a 'sit' pose put the hips at seatY)
      'table-left':  A.slot(560, 925, 0.93, { face: 1, seated: true, seatY: 800 }),
      'table-head':  A.slot(960, 915, 0.9, { seated: true, seatY: 795 }),
      'table-right': A.slot(1360, 925, 0.93, { face: -1, seated: true, seatY: 800 }),
      // standing at the ends of the table / in the room
      left:   A.slot(170, 1000, 1.04, { face: 1 }),
      center: A.slot(960, 915, 0.9),
      right:  A.slot(1740, 1000, 1.04, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
