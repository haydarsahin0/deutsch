/* calendar-wall — a room wall in the evening with a huge hand-made 30-day calendar („30 Tage · KI als Lehrer"):
 * Mo–So grid, four coloured week strips (Sprechpartner, Korrektor, Grammatik, Prüfer), red ink crosses on the days
 * already done, a red marker hanging on a string. Warm floor lamp (left), plant + framed photo (right), wooden floor.
 * Variants: '' = day 0 (no crosses), 'tagN' (N = 1…30) = days 1…N-1 crossed and day N circled, 'tag30' = all crossed.
 * Static. (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 805, CAL = { x: 430, y: 90, w: 1060, h: 580 }, LBL = 200;
  var WEEKS = [['Woche 1', 'Sprechpartner', '#5f8f86'], ['Woche 2', 'Korrektor', '#c43d33'], ['Woche 3', 'Grammatik', '#d6a03c'], ['Woche 4', 'Prüfer', '#4f6d86'], ['Tag 29–30', 'Fazit', '#9a917c']];

  function build(S, opts) {
    var bg = '', i, m = /^tag(\d+)$/.exec(opts.variant || ''), N = m ? Math.min(30, +m[1]) : 0;
    // wall + floor
    bg += S.wall(0, WALL_Y, '#cdb98f', { top: 50, op: 0.32, side: 0.08 });
    bg += S.stripes(0, WALL_Y, 90, '#8d6236', 0.1);
    bg += S.glow(220, 420, 520, 520, '#ffd98a', 0.32);
    bg += S.floor(WALL_Y, { kind: 'boards', fill: '#9a7550', gap: 120, vx: 960, lop: 0.5, hop: 0.25 });
    bg += S.skirting(WALL_Y, 16, '#e3d6b6');

    // ── the calendar ──
    var C = CAL, gx = C.x + LBL, cw = (C.w - LBL - 20) / 7, top = C.y + 120, rh = (C.h - 140) / 5;
    bg += S.drop(C.x, C.y, C.w, C.h, 14, 16, 'rgba(60,40,20,.28)');
    var sheet = S.rect(C.x, C.y, C.w, C.h, 40, 1.4);
    bg += S.shape(sheet, '#f1e8d0', { w: 3, extra: 3.2 }) + S.hatch(sheet, { ang: 30, gap: 11, w: 1.1, op: 0.12, cond: function (X, Y) { return Y > C.y + C.h - 60 || X > C.x + C.w - 50; } });
    bg += S.T(C.x + C.w / 2, C.y + 62, '30 Tage · KI als Lehrer', { f: 'Fraunces', s: 46, a: 'middle' });
    bg += S.seg(C.x + 300, C.y + 78, C.x + C.w - 300, C.y + 80, 2.6, P.red);
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(function (d, k) { bg += S.T(gx + cw * (k + 0.5), top - 10, d, { f: 'Kalam', s: 24, a: 'middle', c: k > 4 ? P.red : P.ink }); });
    // week strips
    WEEKS.forEach(function (w, r) {
      var y = top + r * rh;
      var strip = S.rect(C.x + 16, y + 6, LBL - 22, rh - 12, 30, 0.8);
      bg += S.shape(strip, w[2], { w: 1.8, extra: 1.6 }) + S.hatch(strip, { ang: 70, gap: 8, w: 1.1, op: 0.25 });
      bg += S.T(C.x + 16 + (LBL - 22) / 2, y + rh * 0.42, w[0], { f: 'Oswald', s: 20, a: 'middle', c: P.white });
      bg += S.T(C.x + 16 + (LBL - 22) / 2, y + rh * 0.78, w[1], { f: 'Kalam', s: 21, a: 'middle', c: P.white });
      bg += S.fillOnly(S.rect(gx, y + 4, cw * 7, rh - 8), w[2], ' opacity=".09"');
    });
    // grid
    var L = [];
    for (i = 0; i <= 7; i++) L.push([[gx + cw * i, top], [gx + cw * i, top + rh * 5]]);
    for (i = 0; i <= 5; i++) L.push([[gx, top + rh * i], [gx + cw * 7, top + rh * i]]);
    bg += S.lines(L, { w: 1.8, ta: 0.05, tb: 0.05, min: 0.6 }, P.ink, ' opacity=".75"');
    var X = [];
    for (var d = 1; d <= 30; d++) {
      var r = Math.floor((d - 1) / 7), c = (d - 1) % 7, x = gx + cw * c, y = top + rh * r;
      bg += S.T(x + 12, y + 30, String(d), { f: 'Kalam', s: 24, c: c > 4 ? P.red : P.ink });
      var crossed = N === 30 ? true : d < N;
      if (crossed) {
        var j = function () { return (S.r() - 0.5) * 10; };
        X.push([[x + 22 + j(), y + 16 + j()], [x + cw - 16 + j(), y + rh - 12 + j()]], [[x + cw - 18 + j(), y + 14 + j()], [x + 20 + j(), y + rh - 12 + j()]]);
      } else if (d === N) {
        bg += S.line(U.catmull(S.ellipse(x + cw / 2, y + rh / 2, cw / 2 - 6, rh / 2 - 6, 9, 0.12), 4, true).concat([[x + cw / 2 + 30, y + 6]]), { w: 3.6, ta: 0.1, tb: 0.3, min: 0.4 }, P.red);
      }
    }
    if (X.length) bg += S.lines(X, { w: 4.2, ta: 0.15, tb: 0.35, min: 0.5, jit: 0.4 }, P.red, ' opacity=".88"');
    // pins
    [[C.x + 24, C.y + 18], [C.x + C.w - 24, C.y + 18]].forEach(function (q) { bg += S.circ(q[0], q[1], 9, P.red, { w: 1.6, extra: 1.2 }); });
    // marker on a string
    var mx = C.x + C.w + 34, my = 470;
    bg += S.line([[C.x + C.w - 24, C.y + 20], [C.x + C.w + 10, C.y + 160], [mx - 2, my - 70]], { w: 1.4, ta: 0.05, tb: 0.05, min: 0.6, smooth: 6 }, '#5e3f22');
    var mk = U.xf(S.rect(-11, -70, 22, 140, 20, 0.5), mx, my, 6);
    bg += S.shape(mk, '#efe6cf', { w: 2, extra: 2 }) + S.shape(U.xf(S.rect(-12, -70, 24, 34, 12, 0.4), mx, my, 6), P.red, { w: 1.8, extra: 1.6 });
    bg += S.shape(U.xf(S.poly([[-7, 70], [7, 70], [0, 88]], 10, 0.3), mx, my, 6), P.red, { w: 1.4, extra: 1 });

    // ── left: floor lamp with warm glow ──
    var lx = 110;
    bg += S.floorShadow(lx, WALL_Y + 170, 70, 10, 0.3);
    bg += S.line([[lx, WALL_Y + 168], [lx + 4, 330]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }, '#3a2f26');
    bg += S.shape(S.ellipse(lx, WALL_Y + 166, 46, 10, 24), '#3a2f26', { w: 1.8, extra: 1.6 });
    var shade = S.poly([[lx - 60, 330], [lx + 66, 330], [lx + 44, 230], [lx - 38, 230]], 20, 0.8);
    bg += S.glow(lx, 330, 220, 120, '#ffe2a0', 0.4) + S.shape(shade, '#e9cf98', { w: 2.4, extra: 2.6 }) + S.hatch(shade, { ang: 80, gap: 7, w: 1.1, op: 0.3, cond: function (X) { return X > lx + 20; } });

    // ── right: framed photo + small shelf + tall plant ──
    bg += S.frame(1600, 200, 170, 210, '#e9dfc4', function (x, y, w, h) {
      return S.fillOnly(S.rect(x, y, w, h), '#b9c4b0') + S.fillOnly(S.poly([[x, y + h], [x + 40, y + 90], [x + 90, y + 130], [x + 130, y + 70], [x + w, y + h]], 20, 1), '#6f9a49') + S.circ(x + 40, y + 40, 14, '#e2b13b', { w: 1.2, extra: 1 });
    });
    bg += S.shelf(1580, 1820, 520, P.woodD);
    bg += S.books(1600, 1720, 520, 70) + S.mug(1770, 520, 40, 40, '#4f6d86');
    bg += S.plant(1830, WALL_Y + 20, 230, { n: 12, pot: '#b5562f', tall: 1.3 });
    bg += S.plant(600, WALL_Y + 10, 120, { n: 7, pot: '#6b4a2f' });
    return { bg: bg };
  }

  var variants = [];
  for (var n = 1; n <= 30; n++) variants.push('tag' + n);
  A.define('calendar-wall', {
    seed: 302, build: build, variants: variants,
    slots: {
      left:   A.slot(300, 995, 1.02, { face: 1 }),
      center: A.slot(960, 1000, 1.04),                     // in front of the calendar (covers its lowest row)
      right:  A.slot(1640, 995, 1.02, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
