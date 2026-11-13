/* oral-exam — the room of an oral language exam (telc/Goethe style): pale institutional green walls, linoleum floor,
 * window with half-lowered blinds, wall clock, door with the sign „Prüfung – bitte nicht stören". One long table:
 * two candidates on the left (task-sheet table tent „Teil 3 · Gemeinsam etwas planen", task sheets), water carafe
 * + glasses in the middle, two examiners on the right (rating sheets on clipboards, pen, stopwatch, name tents
 * „Prüferin"). fg = the table with its modesty panel (all four slots sit behind it, chest-up). Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 800, DADO = 590, TB = { x0: 290, x1: 1730, back: 690, front: 716, panel: 884, yl: 985 };
  var SEAT_Y = 722, XS = { cl: 420, cr: 680, el: 1240, er: 1500 };

  function chairBack(S, x, col) {
    var cb = U.catmull([[x - 78, 740], [x - 82, 560], [x, 540], [x + 82, 560], [x + 78, 740]], 5, true);
    return S.shape(cb, col, { w: 2.6, extra: 2.6 }) + S.hatch(cb, { ang: 70, gap: 8, w: 1.2, op: 0.35 });
  }
  function tent(S, x, y, w, h, lines, col) {
    var s = S.shape(S.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 6, y - h], [x - w / 2 + 6, y - h]], 30, 0.5), col || '#f4eedf', { w: 2, extra: 1.8 });
    s += S.shape(S.poly([[x + w / 2 - 6, y - h], [x + w / 2 + 6, y - h + 6], [x + w / 2 + 8, y]], 10, 0.3), '#d8cfb8', { w: 1.4, extra: 1 });
    lines.forEach(function (l, k) { s += S.T(x, y - h + 26 + k * 26, l[0], { f: l[1] || 'Oswald', s: l[2] || 20, a: 'middle', c: l[3] }); });
    return s;
  }
  function sheet(S, x, y, rot, grid) {
    var r = U.xf(S.poly([[-46, -10], [46, -10], [52, 12], [-52, 12]], 20, 0.4), x, y, rot), s = S.shape(r, '#f4eedf', { w: 1.6, extra: 1.2 });
    if (grid) s += S.lines([[[x - 36, y - 4], [x + 36, y - 4]], [[x - 40, y + 3], [x + 40, y + 3]], [[x - 10, y - 8], [x - 12, y + 10]], [[x + 14, y - 8], [x + 16, y + 10]]].map(function (l) { return U.xf(l.map(function (p) { return [p[0] - x, p[1] - y]; }), x, y, rot); }), { w: 1, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".55"');
    return s;
  }

  function build(S) {
    var bg = '', fg = '', i;
    // walls: pale green over a darker dado, linoleum floor
    bg += S.wall(0, WALL_Y, '#c9ccb2', { top: 44, op: 0.26, side: 0.05 });
    bg += S.fillOnly(S.rect(-20, DADO, 1960, WALL_Y - DADO), '#9aa58a') + S.line([[-20, DADO], [1940, DADO + 1]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, '#6b7560');
    bg += S.floor(WALL_Y, { kind: 'tiles', fill: '#bdb79c', fill2: '#aea88c', gap: 150, rows: 6, lop: 0.3 });
    bg += S.skirting(WALL_Y, 14, '#5e6656');
    bg += S.glow(960, 330, 620, 300, '#fff4d8', 0.3);

    // ── window with half-lowered blinds + radiator ──
    var W = { x: 770, y: 140, w: 400, h: 380 }, view = '';
    view += S.fillOnly(S.rect(W.x, W.y, W.w, W.h), S.linear([[0, '#cfe0e4'], [1, '#eef0e0']], 0, 0, 0, 1));
    view += S.circ(W.x + 300, W.y + 330, 120, '#8db15e', { w: 2, extra: 2, jit: 0.25 }) + S.circ(W.x + 80, W.y + 360, 100, '#6f9a49', { w: 2, extra: 2, jit: 0.25 });
    var sl = [];
    for (var by = W.y + 16; by < W.y + 180; by += 20) view += S.fillOnly(S.rect(W.x, by, W.w, 14, 60, 0.3), '#e3dcc6'), sl.push([[W.x + 16, by + 14], [W.x + W.w - 16, by + 14]]);
    view += S.lines(sl, { w: 1.3, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".5"');
    bg += S.window(W.x, W.y, W.w, W.h, { sky: '#dfe8e4', view: view, panes: [2, 1], frame: '#e9e4d2' });
    bg += A.shaft([[W.x + 20, WALL_Y + 4], [W.x + W.w - 20, WALL_Y + 4], [W.x + W.w + 160, 960], [W.x + 60, 960]], '#fff4d8', 0.12);

    // ── wall clock + door with sign (left) ──
    bg += S.clock(560, 250, 58, 10, 22, { sec: 41 });
    var D = { x: 40, y: 220, w: 230, h: WALL_Y - 220 };
    bg += S.box(D.x - 14, D.y - 14, D.w + 28, D.h + 14, '#e9e4d2', { w: 3, extra: 3 });
    bg += S.box(D.x, D.y, D.w, D.h, '#a77d52', { w: 3, extra: 3, hatch: 'r', hk: 0.3 });
    bg += S.line([[D.x + D.w - 40, D.y + 300], [D.x + D.w - 80, D.y + 300]], { w: 8, ta: 0.05, tb: 0.05 }, '#c9c2ae');
    bg += S.note(D.x + D.w / 2, D.y + 130, 180, 110, -2, '#f4eedf', [{ t: 'Prüfung', f: 'Oswald', s: 26 }, { t: 'bitte nicht', s: 24 }, { t: 'stören!', s: 24 }], { tape: true, fs: 24, top: 34 });

    // ── right: coat rack + plant + room plate ──
    bg += S.box(1600, 300, 120, 40, '#e9e4d2', { w: 2, extra: 1.6 }) + S.T(1660, 328, 'Raum 112', { f: 'Oswald', s: 20, a: 'middle' });
    bg += S.plant(1850, WALL_Y + 16, 200, { n: 11, pot: '#8a8f80', tall: 1.2 });

    // chair backs behind the four sitters
    bg += chairBack(S, XS.cl, '#3f5a6b') + chairBack(S, XS.cr, '#3f5a6b') + chairBack(S, XS.el, '#4a4f55') + chairBack(S, XS.er, '#4a4f55');

    // ═════ fg: the long table ═════
    var T = TB;
    fg += S.floorShadow((T.x0 + T.x1) / 2, T.yl + 2, 800, 14, 0.25);
    [T.x0 + 40, T.x1 - 60, 960].forEach(function (x) { fg += S.line([[x, T.panel], [x, T.yl]], { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }, '#5a5f63'); });
    var pan = S.rect(T.x0 + 10, T.front, T.x1 - T.x0 - 20, T.panel - T.front, 40, 0.6);
    fg += S.shape(pan, '#b8b4a2', { w: 2.6, extra: 2.6 }) + S.hatch(pan, { ang: 80, gap: 10, w: 1.2, op: 0.28 }) + S.fillOnly(S.rect(T.x0 + 10, T.front, T.x1 - T.x0 - 20, 24), 'rgba(40,40,30,.2)');
    var top = S.poly([[T.x0 + 10, T.back], [T.x1 - 10, T.back], [T.x1, T.front], [T.x0, T.front]], 40, 0.5);
    fg += S.shape(top, '#d8cfb4', { w: 3, extra: 3 }) + S.hatch(top, { ang: 0, gap: 6, w: 1, op: 0.2 });
    // candidates: task sheets + table tent
    fg += sheet(S, XS.cl + 40, T.back + 12, -4, false) + sheet(S, XS.cr - 30, T.back + 12, 3, false);
    fg += S.scribble(XS.cl + 10, T.back + 10, 60, 1, 6, P.ink, 0.4) + S.scribble(XS.cr - 60, T.back + 10, 60, 1, 6, P.ink, 0.4);
    fg += tent(S, 550, T.back + 14, 250, 64, [['Teil 3', 'Oswald', 20], ['Gemeinsam etwas planen', 'Kalam', 19]]);
    // water carafe + glasses (middle)
    fg += S.bottle(930, T.back + 14, 110, 'rgba(200,225,230,.65)', { wr: 0.42 }) + S.fillOnly(S.rect(912, T.back - 40, 36, 50), 'rgba(140,190,210,.35)');
    [990, 1040].forEach(function (x) { fg += S.shape(S.poly([[x - 16, T.back - 42], [x + 16, T.back - 42], [x + 13, T.back + 12], [x - 13, T.back + 12]], 12, 0.4), 'rgba(210,230,235,.55)', { w: 1.8, extra: 1.4 }) + S.fillOnly(S.rect(x - 13, T.back - 14, 26, 24), 'rgba(140,190,210,.4)'); });
    // examiners: clipboards with rating sheets, pen, stopwatch, name tents
    [XS.el - 60, XS.er - 60].forEach(function (x, k) {
      var cbp = U.xf(S.poly([[-60, -12], [60, -12], [66, 14], [-66, 14]], 20, 0.4), x, T.back + 10, k ? 3 : -3);
      fg += S.shape(cbp, '#8d6236', { w: 2, extra: 1.8 }) + sheet(S, x, T.back + 8, k ? 3 : -3, true);
    });
    fg += S.line([[XS.el + 40, T.back + 14], [XS.el + 110, T.back + 6]], { w: 5, ta: 0.02, tb: 0.3, min: 0.5 }, P.red);
    fg += S.circ(1380, T.back + 6, 18, '#e9e4d2', { w: 2, extra: 1.6 }) + S.seg(1380, T.back + 6, 1386, T.back - 6, 1.6, P.red) + S.box(1374, T.back - 20, 12, 8, '#5a5f63', { w: 1.2, extra: 0.8, hatch: false });
    fg += tent(S, XS.el + 20, T.back + 16, 130, 44, [['Prüferin', 'Kalam', 20]]) + tent(S, XS.er + 30, T.back + 16, 130, 44, [['Prüferin', 'Kalam', 20]]);
    return { bg: bg, fg: fg };
  }

  A.define('oral-exam', {
    seed: 306, build: build,
    slots: {
      'candidate-left':  A.slot(XS.cl, 990, 0.92, { face: 1, seated: true, seatY: SEAT_Y }),
      'candidate-right': A.slot(XS.cr, 990, 0.92, { face: 1, seated: true, seatY: SEAT_Y }),
      'examiner-left':   A.slot(XS.el, 990, 0.92, { face: -1, seated: true, seatY: SEAT_Y }),
      'examiner-right':  A.slot(XS.er, 990, 0.92, { face: -1, seated: true, seatY: SEAT_Y }),
      left:   A.slot(150, 995, 1.02, { face: 1 }),          // in the doorway
      center: A.slot(960, 1000, 1.04),                       // behind the table, standing
      right:  A.slot(1840, 995, 1.02, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
