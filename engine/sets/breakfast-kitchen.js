/* breakfast-kitchen — bright kitchen-diner at sunrise: big window with a peach sunrise over roofs + church spire,
 * low golden light shafts across the room, small bistro table by the window (toast, coffee, jam, boiled egg), sage
 * walls with a blue-white tile splash, counter with toaster (toast popping), moka pot on the stove, a smart speaker
 * on the shelf playing a podcast (sound-wave doodles), wall clock 6:45, calendar. Terracotta floor tiles.
 * fg = the table (slot `table` sits behind it). Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 800, WIN = { x: 790, y: 110, w: 500, h: 440 }, TB = { x0: 860, x1: 1240, yb: 742, yf: 784, cloth: 870 };

  function build(S) {
    var bg = '', fg = '', i;
    // ── walls: sage, warmed by the sunrise ──
    bg += S.wall(0, WALL_Y, '#cfd8bd', { top: 40, op: 0.28 });
    bg += S.glow(WIN.x + WIN.w / 2, 360, 900, 520, '#ffcf9a', 0.32);
    // tile splash behind the counter (blue-white)
    var tl = S.rect(-20, 400, 700, 220), tiles = [];
    bg += S.fillOnly(tl, '#e8ece2');
    for (var tx = 0; tx <= 700; tx += 44) tiles.push([[tx - 10, 400], [tx - 10, 620]]);
    for (var ty = 400; ty <= 620; ty += 44) tiles.push([[-20, ty], [680, ty]]);
    bg += S.lines(tiles, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.5 }, '#7f9bb0', ' opacity=".7"');
    for (i = 0; i < 18; i++) { var cx = 12 + (i % 8) * 88 + ((i >> 3) % 2) * 44, cy = 422 + Math.floor(i / 8) * 88; if (cx < 680) bg += S.circ(cx, cy, 8, 'none', { w: 1.4, extra: 0.6, color: '#4f6d86' }); }
    // ── window with sunrise ──
    var W = WIN, view = '';
    view += S.fillOnly(S.rect(W.x, W.y, W.w, W.h), S.linear([[0, '#a9bfcc'], [0.45, '#f2d2b0'], [0.75, '#f6b083'], [1, '#e9906a']], 0, 0, 0, 1));
    view += S.glow(W.x + 330, W.y + 330, 260, 200, '#fff0c8', 0.75);
    view += S.circ(W.x + 330, W.y + 330, 46, '#fff1c4', { w: 0 });
    // clouds streaks
    view += S.lines([[[W.x + 30, W.y + 120], [W.x + 220, W.y + 116]], [[W.x + 260, W.y + 170], [W.x + 470, W.y + 166]], [[W.x + 80, W.y + 200], [W.x + 200, W.y + 198]]], { w: 7, ta: 0.4, tb: 0.4, min: 0.2 }, '#fbe6d0', ' opacity=".8"');
    // birds
    [[W.x + 120, W.y + 80], [W.x + 150, W.y + 96], [W.x + 380, W.y + 60]].forEach(function (b) { view += S.line([[b[0] - 10, b[1] - 4], [b[0], b[1] + 2], [b[0] + 10, b[1] - 5]], { w: 2, ta: 0.2, tb: 0.2, min: 0.4 }, '#5a4a52'); });
    // rooftops + spire (lilac silhouettes)
    var sky = [[W.x - 10, W.y + W.h], [W.x - 10, W.y + 330], [W.x + 60, W.y + 300], [W.x + 120, W.y + 330], [W.x + 120, W.y + 300], [W.x + 180, W.y + 300], [W.x + 180, W.y + 250],
      [W.x + 196, W.y + 150], [W.x + 212, W.y + 250], [W.x + 212, W.y + 300], [W.x + 270, W.y + 320], [W.x + 300, W.y + 370], [W.x + 380, W.y + 340], [W.x + 440, W.y + 360], [W.x + W.w + 10, W.y + 340], [W.x + W.w + 10, W.y + W.h]];
    view += S.fillOnly(sky, '#8e7d8e') + S.hatch(sky, { ang: 60, gap: 9, w: 1.1, op: 0.25 });
    view += S.fillOnly(S.poly([[W.x - 10, W.y + W.h], [W.x - 10, W.y + 390], [W.x + 140, W.y + 380], [W.x + 300, W.y + 400], [W.x + W.w + 10, W.y + 384], [W.x + W.w + 10, W.y + W.h]], 40, 4), '#6f6274');
    bg += S.window(W.x, W.y, W.w, W.h, { sky: '#f2d2b0', view: view, panes: [2, 2], frame: '#f1ead8' });
    // short café curtain + plant on the sill
    bg += S.shape(S.poly([[W.x + 16, W.y + 300], [W.x + W.w - 16, W.y + 300], [W.x + W.w - 16, W.y + 400], [W.x + 16, W.y + 400]], 30, 1.5), 'rgba(244,238,223,.55)', { w: 1.6, extra: 1.2 });
    bg += S.line([[W.x + 10, W.y + 298], [W.x + W.w - 10, W.y + 298]], { w: 3.4, ta: 0.02, tb: 0.02 }, '#b9a27a');
    bg += S.plant(W.x + 70, W.y + W.h + 4, 90, { n: 7, pot: P.ochre }) + S.plant(W.x + W.w - 60, W.y + W.h + 4, 70, { n: 6, pot: '#b5562f', c: 2 });

    // ── floor: terracotta tiles ──
    bg += S.floor(WALL_Y, { kind: 'tiles', gap: 130, rows: 6, fill: '#c98a64', fill2: '#b87654', vx: 1040, vy: 380, lop: 0.35 });
    bg += S.skirting(WALL_Y, 14, '#e9e2cf');
    // sun shafts: from the window across the floor (left-down)
    bg += A.shaft([[W.x + 20, W.y + W.h], [W.x + W.w - 20, W.y + W.h], [W.x + 240, 1080], [W.x - 520, 1080]], '#ffd59a', 0.18);
    bg += A.shaft([[W.x + 90, W.y + 30], [W.x + 200, W.y + 30], [W.x - 260, WALL_Y], [W.x - 460, WALL_Y]], '#ffe2b0', 0.12);

    // ── left: counter run with upper cabinets ──
    for (i = 0; i < 3; i++) bg += S.box(20 + i * 210, 140, 200, 200, '#e9e2cf', { w: 2.8, extra: 3, hatch: 'b', hk: 0.2 }) + S.seg(100 + i * 210, 316, 140 + i * 210, 316, 4, '#a9a08a');
    bg += S.box(-20, 620, 700, 34, '#b98a52', { w: 3, extra: 3.4, hatch: 'b', hk: 0.4 });   // worktop
    bg += S.box(-20, 654, 700, WALL_Y - 654, '#dcd5bf', { w: 3, extra: 3.2 });
    for (i = 0; i < 3; i++) bg += S.box(10 + i * 220, 670, 200, 112, '#e6dfca', { w: 2, extra: 2, hatch: 'r', hk: 0.12 }) + S.seg(90 + i * 220, 690, 130 + i * 220, 690, 4, '#8f8a7a');
    // stove + moka pot + steam
    bg += S.box(380, 610, 200, 12, '#3a3a38', { w: 1.8, extra: 1.4, hatch: false });
    var moka = S.poly([[450, 610], [500, 610], [492, 572], [504, 540], [446, 540], [458, 572]], 20, 0.6);
    bg += S.shape(moka, '#a8a594', { w: 2.4, extra: 2.4 }) + A.shadeSide(S, moka, [1, 0], 0.2, { ang: 80, gap: 5, op: 0.5 }) + S.box(462, 528, 30, 12, '#2f2a26', { w: 1.4, extra: 1, hatch: false });
    bg += S.line([[504, 560], [520, 552], [520, 590], [500, 596]], { w: 5, ta: 0.05, tb: 0.05, min: 0.8 }, '#2f2a26') + S.steam(475, 520, 70, 0, 0.4);
    // toaster with toast popping
    bg += S.shape(S.poly([[120, 560], [124, 520], [134, 516], [130, 548]], 10, 0.5), '#e2b46a', { w: 1.8, extra: 1.6 });
    var toa = S.rrect(90, 548, 170, 74, 18);
    bg += S.box(130, 522, 50, 40, '#e2b46a', { w: 2, extra: 2, hatch: false }) + S.box(190, 516, 50, 46, '#d9a75a', { w: 2, extra: 2, hatch: false });
    bg += S.shape(toa, '#c43d33', { w: 2.8, extra: 3 }) + A.shadeSide(S, toa, [1, 0.4], 0.3, { ang: 70, gap: 6, op: 0.4 }) + S.seg(110, 572, 240, 572, 2, '#efe6cf', ' opacity=".6"');
    bg += S.lines([[[150, 510], [146, 496]], [[200, 502], [204, 488]], [[230, 508], [240, 496]]], { w: 2.4, ta: 0.2, tb: 0.2, min: 0.4 });  // pop lines
    // jars on the counter
    bg += S.bottle(320, 620, 80, '#e8e3b3', { wr: 0.6, cap: P.red, label: '#efe6cf' }) + S.bottle(620, 620, 64, '#c9a46a', { wr: 0.7, cap: P.green });

    // ── shelf with smart speaker playing a podcast ──
    bg += S.shelf(1390, 1800, 330, '#b98a52');
    var spk = S.rrect(1430, 220, 74, 110, 26);
    bg += S.shape(spk, '#46505a', { w: 2.6, extra: 2.8 }) + S.hatch(spk, { ang: 0, gap: 6, w: 1, op: 0.35, color: '#9aa3a6' }) + S.box(1448, 228, 38, 8, '#8fb3a6', { w: 1, extra: 0.6, hatch: false });
    for (i = 1; i <= 3; i++) {
      bg += S.line(S.ellipse(1467, 270, 52 + i * 26, 46 + i * 24, 12, 0, -0.75, 0.75), { w: 3, ta: 0.2, tb: 0.2, min: 0.4 }, P.red, ' opacity="' + (0.85 - i * 0.18) + '"');
      bg += S.line(S.ellipse(1467, 270, 52 + i * 26, 46 + i * 24, 12, 0, Math.PI - 0.75, Math.PI + 0.75), { w: 3, ta: 0.2, tb: 0.2, min: 0.4 }, P.red, ' opacity="' + (0.85 - i * 0.18) + '"');
    }
    bg += S.T(1560, 210, '♪', { f: 'Fraunces', s: 40, c: P.redD, r: 12 });
    bg += S.T(1560, 316, 'Podcast', { f: 'Caveat', s: 30, c: P.navy });
    bg += S.books(1640, 1790, 330, 90, [P.mustard, P.teal, P.red, P.cream]);
    // wall clock 6:45 + calendar
    bg += S.clock(1500, 520, 62, 6, 45);
    var cal = '';
    bg += S.drop(1640, 420, 180, 230, 6, 8) + S.box(1640, 420, 180, 230, '#f4eedf', { w: 2.4, extra: 2.6 }) + S.box(1640, 420, 180, 50, P.red, { w: 2, extra: 2, hatch: false });
    bg += S.T(1730, 456, 'NOVEMBER', { f: 'Oswald', s: 24, c: P.white, a: 'middle' });
    for (i = 0; i < 28; i++) cal += S.dot(1660 + (i % 7) * 23, 494 + Math.floor(i / 7) * 36, 3, P.ink);
    bg += cal + S.circ(1706, 530, 15, 'none', { w: 2.2, extra: 1, color: P.red });
    bg += S.T(1730, 640, 'Besichtigung!', { f: 'Caveat', s: 22, c: P.red, a: 'middle' });
    // radiator under the calendar? → small bench + plant right
    bg += S.plant(1840, WALL_Y + 10, 170, { n: 10, pot: '#d9d3c0', tall: 1.2 });

    // ── chairs behind the table (bg) ──
    [[1050, 1]].forEach(function (c) {
      var x = c[0], back = S.poly([[x - 60, 760], [x - 56, 600], [x + 56, 600], [x + 60, 760]], 30, 1);
      bg += S.shape(back, '#d9b27a', { w: 2.8, extra: 3 }) + S.hatch(S.rect(x - 44, 616, 88, 120), { ang: 90, gap: 22, w: 3, op: 0.5 });
    });

    // ═════ fg: bistro table with checked cloth ═════
    var top = S.poly([[TB.x0 + 18, TB.yb], [TB.x1 - 18, TB.yb], [TB.x1, TB.yf], [TB.x0, TB.yf]], 40, 0.8);
    fg += S.floorShadow((TB.x0 + TB.x1) / 2, 980, 220, 12, 0.3);
    fg += S.line([[1050, TB.cloth], [1050, 970]], { w: 18, ta: 0.02, tb: 0.02, min: 0.9 }, '#2f2a26');
    fg += S.shape(S.poly([[980, 975], [1120, 975], [1110, 960], [990, 960]], 20, 0.6), '#2f2a26', { w: 1.6, extra: 1 });
    fg += S.shape(top, '#f4eedf', { w: 3, extra: 3 });
    var cloth = S.poly([[TB.x0, TB.yf], [TB.x1, TB.yf], [TB.x1 + 6, TB.cloth], [TB.x0 - 6, TB.cloth]], 30, 1);
    var chk = '';
    for (var cx2 = TB.x0 - 10; cx2 < TB.x1 + 10; cx2 += 30) chk += S.fillOnly(S.rect(cx2, TB.yf, 15, TB.cloth - TB.yf, 40, 0.3), 'rgba(196,61,51,.45)');
    for (var cy2 = TB.yf + 8; cy2 < TB.cloth; cy2 += 30) chk += S.fillOnly(S.rect(TB.x0 - 10, cy2, TB.x1 - TB.x0 + 20, 15, 60, 0.3), 'rgba(196,61,51,.35)');
    fg += S.shape(cloth, '#f1e6d0', { w: 0 }) + '<g clip-path="url(#' + S.clip(cloth) + ')">' + chk + '</g>' + S.shape(cloth, null, { w: 3, extra: 3 });
    fg += A.shadeSide(S, cloth, [0.6, 1], 0.4, { ang: 15, gap: 7, op: 0.3 });
    // breakfast: plate with toast, coffee cup, jam jar, egg cup, sun patch
    fg += S.glow(1010, TB.yb + 20, 220, 30, '#ffe6b0', 0.6);
    fg += S.shape(S.ellipse(960, TB.yb + 26, 70, 16, 30), '#efe9da', { w: 2, extra: 2 });
    fg += S.shape(S.poly([[920, TB.yb + 22], [930, TB.yb - 14], [996, TB.yb - 10], [1000, TB.yb + 24]], 12, 0.8), '#d9a75a', { w: 2, extra: 2 }) + S.hatch(S.poly([[920, TB.yb + 22], [930, TB.yb - 14], [996, TB.yb - 10], [1000, TB.yb + 24]], 12, 0.8), { ang: 30, gap: 8, w: 1, op: 0.35 });
    fg += S.mug(1120, TB.yb + 30, 46, 40, '#f4eedf', { top: '#4a2a14' }) + S.steam(1114, TB.yb - 14, 50, 0, 0.35);
    fg += S.bottle(1190, TB.yb + 30, 46, '#a33a32', { wr: 0.85, cap: '#efe6cf' });
    fg += S.shape(S.poly([[1040, TB.yb + 30], [1064, TB.yb + 30], [1060, TB.yb + 8], [1044, TB.yb + 8]], 10, 0.4), '#e2b13b', { w: 1.6, extra: 1.4 }) + S.circ(1052, TB.yb - 6, 15, '#f4eedf', { w: 1.8, extra: 1.6, ry: 18 });
    return { bg: bg, fg: fg };
  }

  A.define('breakfast-kitchen', {
    seed: 202, build: build,
    slots: {
      left:   A.slot(380, 980, 1.0, { face: 1 }),                        // in front of the counter
      center: A.slot(660, 985, 1.02, { face: 1 }),
      right:  A.slot(1500, 985, 1.0, { face: -1 }),                      // under the clock / speaker
      table:  A.slot(1050, 990, 0.95, { seated: true, seatY: 820 })      // behind the bistro table (fg), window behind
    }
  });
})(typeof self !== 'undefined' ? self : this);
