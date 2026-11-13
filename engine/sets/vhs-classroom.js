/* vhs-classroom — a course room of a Volkshochschule on a bright morning: tables in a U (two arms in the fg, the back
 * table with empty chairs, bags and jackets under the whiteboard), whiteboard „Wo? → Dativ · in der Küche · auf dem
 * Tisch" vs. „Wohin? → Akkusativ · in die Küche · auf den Tisch" (blue / red marker), pinboard „Kurs B1.2", two
 * windows with trees, filter-coffee machine + mugs on the windowsill, clock. Slot `teacher` = in the U opening in
 * front of the whiteboard; `desk-left` / `desk-right` = behind the two fg table arms (chest-up). Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 760, WB = { x: 360, y: 140, w: 820, h: 380 }, SILL = 590;

  function chairBack(S, x, y, col) {
    var cb = U.catmull([[x - 56, y + 90], [x - 60, y], [x, y - 14], [x + 60, y], [x + 56, y + 90]], 5, true);
    return S.shape(cb, col, { w: 2.2, extra: 2.2 }) + S.hatch(cb, { ang: 70, gap: 8, w: 1.1, op: 0.3 });
  }
  function arm(S, pts, panelB) {   // a table arm of the U: top quad + front panel down to panelB
    var s = '', top = S.poly(pts, 40, 0.5), fr = S.poly([pts[3], pts[2], [pts[2][0], panelB], [pts[3][0], panelB]], 40, 0.5);
    s += S.floorShadow((pts[3][0] + pts[2][0]) / 2, 990, Math.abs(pts[2][0] - pts[3][0]) / 2 + 20, 12, 0.25);
    [pts[3][0] + 30, pts[2][0] - 30].forEach(function (x) { s += S.line([[x, panelB - 10], [x, 990]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 }, '#5a5f63'); });
    s += S.shape(fr, '#c9b48a', { w: 2.6, extra: 2.6 }) + S.hatch(fr, { ang: 82, gap: 11, w: 1.2, op: 0.25 }) + S.fillOnly(S.poly([pts[3], pts[2], [pts[2][0], pts[2][1] + 22], [pts[3][0], pts[3][1] + 22]], 40, 0.3), 'rgba(60,40,20,.2)');
    s += S.shape(top, '#e3d3a8', { w: 3, extra: 3 }) + S.hatch(top, { ang: 0, gap: 6, w: 1, op: 0.18 });
    return s;
  }

  function build(S) {
    var bg = '', fg = '', i;
    bg += S.wall(0, WALL_Y, '#e3dcc6', { top: 40, op: 0.24, side: 0.04 });
    bg += S.fillOnly(S.rect(-20, 600, 1960, WALL_Y - 600), '#b9c4a8') + S.line([[-20, 600], [1940, 601]], { w: 5, ta: 0.02, tb: 0.02, min: 0.8 }, '#7d8a6c');
    bg += S.floor(WALL_Y, { kind: 'tiles', fill: '#b9bcae', fill2: '#a9ad9e', gap: 140, rows: 7, lop: 0.28 });
    bg += S.skirting(WALL_Y, 12, '#6b7560');
    bg += S.glow(1500, 420, 700, 420, '#fff4d0', 0.35);

    // ── whiteboard ──
    var W = WB;
    bg += S.drop(W.x, W.y, W.w, W.h, 10, 12) + S.box(W.x - 12, W.y - 12, W.w + 24, W.h + 24, '#b5bcbc', { w: 3, extra: 3 }) + S.box(W.x, W.y, W.w, W.h, '#f6f5ee', { w: 2, extra: 1.6 });
    bg += S.hatch(S.rect(W.x, W.y, W.w, W.h), { ang: -40, gap: 9, w: 1.2, op: 0.12, color: '#9aa3a6', cond: function (X, Y) { var u = X + Y * 0.6; return (u > 700 && u < 760) || (u > 1290 && u < 1310); } });
    var mid = W.x + W.w / 2, BLUE = '#35588a', RED = '#c43d33';
    bg += S.line([[mid, W.y + 40], [mid + 2, W.y + W.h - 40]], { w: 3, ta: 0.1, tb: 0.1 }, '#3a3a3a', ' opacity=".7"');
    bg += S.T(W.x + W.w / 4, W.y + 86, 'Wo?', { f: 'Caveat', s: 76, c: BLUE, a: 'middle' }) + S.T(W.x + W.w * 3 / 4, W.y + 86, 'Wohin?', { f: 'Caveat', s: 76, c: RED, a: 'middle' });
    bg += S.T(W.x + W.w / 4, W.y + 146, '→ Dativ', { f: 'Kalam', s: 38, c: BLUE, a: 'middle' }) + S.T(W.x + W.w * 3 / 4, W.y + 146, '→ Akkusativ', { f: 'Kalam', s: 38, c: RED, a: 'middle' });
    bg += S.T(W.x + 50, W.y + 214, 'in der Küche', { f: 'Kalam', s: 34, c: '#2b2b2b' }) + S.T(W.x + 50, W.y + 264, 'auf dem Tisch', { f: 'Kalam', s: 34, c: '#2b2b2b' });
    bg += S.T(mid + 50, W.y + 214, 'in die Küche', { f: 'Kalam', s: 34, c: '#2b2b2b' }) + S.T(mid + 50, W.y + 264, 'auf den Tisch', { f: 'Kalam', s: 34, c: '#2b2b2b' });
    bg += S.circ(W.x + 110, W.y + 320, 12, BLUE, { w: 1.4, extra: 1 }) + S.circ(W.x + 110, W.y + 320, 30, null, { w: 2, extra: 1, color: BLUE });
    bg += S.line([[mid + 70, W.y + 320], [mid + 200, W.y + 320]], { w: 3.4, ta: 0.05, tb: 0.05 }, RED) + S.line([[mid + 180, W.y + 304], [mid + 202, W.y + 320], [mid + 180, W.y + 336]], { w: 3.4, ta: 0.05, tb: 0.05 }, RED);
    bg += S.seg(W.x + 46, W.y + 226, W.x + 98, W.y + 226, 2.6, BLUE) + S.seg(mid + 46, W.y + 226, mid + 90, W.y + 226, 2.6, RED);   // der / die underlined
    bg += S.box(W.x + 80, W.y + W.h + 10, W.w - 160, 14, '#9aa3a6', { w: 2, extra: 2, hatch: false });
    [[W.x + 140, BLUE], [W.x + 190, RED], [W.x + 240, '#2b2b2b']].forEach(function (m) { bg += S.box(m[0], W.y + W.h + 2, 40, 10, m[1], { w: 1.2, extra: 0.8, hatch: false }); });
    bg += S.clock(W.x + W.w + 90, 120, 40, 9, 10);

    // ── pinboard (left) ──
    bg += S.box(40, 200, 250, 290, '#c49a6c', { w: 3, extra: 3 }) + S.stipple(S.rect(40, 200, 250, 290), 400, { r: 2, op: 0.3, color: '#6b4a2f' });
    bg += S.note(120, 270, 120, 70, -4, '#f4eedf', [{ t: 'Kurs B1.2', f: 'Oswald', s: 20 }], { fs: 20, top: 40 });
    bg += S.note(225, 300, 90, 90, 5, P.yellow, ['Haus-', 'aufgaben'], { fs: 20 });
    bg += S.note(130, 400, 140, 100, 2, '#bfe0c4', [], {}) + S.scribble(80, 395, 100, 3, 14, P.ink, 0.5);
    bg += S.note(240, 430, 70, 80, -6, '#a9cde0', [], {});

    // ── windows + sill with the coffee machine (right) ──
    [1290, 1590].forEach(function (x) {
      var view = S.fillOnly(S.rect(x, 130, 280, SILL - 150), S.linear([[0, '#cfe0e4'], [1, '#eef0e0']], 0, 0, 0, 1));
      view += S.circ(x + 140, 420, 150, '#8db15e', { w: 2, extra: 2, jit: 0.25 }) + S.hatch(S.ellipse(x + 140, 420, 150, 150, 30, 0.2), { ang: 50, gap: 8, w: 1.1, op: 0.3 });
      view += S.line([[x + 140, SILL], [x + 140, 470]], { w: 10, ta: 0.02, tb: 0.02 }, '#5e3f22');
      bg += S.window(x, 130, 280, SILL - 150, { sky: '#e6eee8', view: view, panes: [1, 2], frame: '#f1ece0', sill: false });
    });
    bg += S.box(1260, SILL - 16, 640, 22, '#e9e4d2', { w: 3, extra: 3, hatch: 'b', hk: 0.4 });
    bg += A.shaft([[1300, WALL_Y + 4], [1860, WALL_Y + 4], [1700, 1000], [1060, 1000]], '#fff4d0', 0.14);
    // filter coffee machine + mugs + plant on the sill
    var cm = 1690, sy = SILL - 16;
    bg += S.box(cm, sy - 150, 110, 150, '#2f3236', { w: 2.6, extra: 2.6, hatch: 'r', hk: 0.3 }) + S.box(cm - 6, sy - 162, 122, 16, '#45494e', { w: 2, extra: 2, hatch: false });
    var pot = U.catmull([[cm + 14, sy - 70], [cm + 10, sy - 30], [cm + 20, sy - 2], [cm + 70, sy - 2], [cm + 80, sy - 30], [cm + 76, sy - 70]], 5, true);
    bg += S.shape(pot, 'rgba(200,220,225,.6)', { w: 2, extra: 1.6 }) + S.fillOnly(S.rect(cm + 16, sy - 36, 62, 32), 'rgba(80,45,20,.75)');
    bg += S.mug(1560, sy, 36, 34, '#c43d33') + S.mug(1610, sy, 36, 34, '#f4eedf') + S.mug(1860, sy, 36, 34, '#4f6d86');
    bg += S.plant(1350, sy, 110, { n: 8, pot: '#b5562f' });

    // ── back table of the U with empty chairs, bags, jackets ──
    [640, 820, 1000, 1180].forEach(function (x, k) { bg += chairBack(S, x, 590, k % 2 ? '#c4532f' : '#35588a'); });
    var bt = S.poly([[540, 652], [1280, 652], [1290, 674], [530, 674]], 40, 0.5);
    bg += S.shape(bt, '#e3d3a8', { w: 2.6, extra: 2.6 }) + S.box(530, 674, 760, 70, '#c9b48a', { w: 2.4, extra: 2.4, hatch: 'b', hk: 0.4 });
    bg += S.shape(U.catmull([[600, 620], [580, 660], [630, 690], [660, 640]], 4, true), '#6b7a8a', { w: 1.8, extra: 1.8 });   // jacket over a chair
    bg += S.box(1110, 610, 70, 44, '#8d6236', { w: 2, extra: 2 }) + S.line([[1120, 610], [1145, 592], [1170, 610]], { w: 3, ta: 0.05, tb: 0.05 });   // bag
    bg += S.box(760, 640, 90, 14, '#f4eedf', { w: 1.4, extra: 1, hatch: false }) + S.box(940, 638, 70, 16, '#4f6d86', { w: 1.4, extra: 1, hatch: false });   // books

    // ═════ fg: the two front arms of the U ═════
    fg += arm(S, [[300, 730], [730, 712], [750, 740], [282, 762]], 930);
    fg += arm(S, [[1190, 712], [1620, 730], [1638, 762], [1170, 740]], 930);
    // items on the arms: open workbook + pencil case (left), notebook + mug (right)
    fg += S.shape(S.poly([[380, 722], [520, 716], [528, 740], [372, 746]], 20, 0.4), '#f4eedf', { w: 1.8, extra: 1.4 }) + S.scribble(390, 728, 120, 2, 6, P.ink, 0.45);
    fg += S.box(560, 704, 90, 20, '#c43d33', { w: 1.8, extra: 1.6, hatch: false });
    fg += S.shape(S.poly([[1380, 716], [1500, 720], [1506, 744], [1372, 740]], 20, 0.4), '#a9cde0', { w: 1.8, extra: 1.4 }) + S.mug(1560, 730, 34, 32, '#f4eedf', { top: '#3a1c12' });
    return { bg: bg, fg: fg };
  }

  A.define('vhs-classroom', {
    seed: 308, build: build,
    slots: {
      teacher:      A.slot(960, 885, 0.88, { face: -1 }),                          // in the U opening, in front of the whiteboard
      'desk-left':  A.slot(500, 990, 0.95, { face: 1, seated: true, seatY: 760 }),   // behind the left arm of the U
      'desk-right': A.slot(1420, 990, 0.95, { face: -1, seated: true, seatY: 760 }), // behind the right arm
      left:  A.slot(140, 1000, 1.04, { face: 1 }),                                   // by the pinboard
      center: A.slot(960, 885, 0.88),
      right: A.slot(1790, 1000, 1.04, { face: -1 })                                  // by the windows
    }
  });
})(typeof self !== 'undefined' ? self : this);
