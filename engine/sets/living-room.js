/* living-room — cosy apartment living room: front door (left) with doormat, coat rack, sofa with cushions,
 * floor lamp, bookshelf, window with plants, pictures. For „Ich gehe nach Hause / Ich bin zu Hause". Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WALL_Y = 800;

  function door(S, x, y, w, h) {
    var s = '';
    // frame
    s += S.box(x - 22, y - 22, w + 44, h + 22, '#e9e2cf', { w: 3, extra: 3.5, hatch: 'r', hk: 0.08 });
    var leaf = S.rect(x, y, w, h, 40, 1);
    s += S.shape(leaf, '#6d8a8a', { w: 3.4, extra: 4 }) + A.shadeSide(S, leaf, [1, 0.2], 0.6, { ang: 80, gap: 7, op: 0.45 });
    // panels
    s += S.box(x + 30, y + 40, w - 60, h * 0.36, '#7a9796', { w: 2.2, extra: 2, hatch: 'l', hk: 0.12 });
    s += S.box(x + 30, y + h * 0.5, w - 60, h * 0.42, '#7a9796', { w: 2.2, extra: 2, hatch: 'l', hk: 0.12 });
    // handle, lock, peephole, name plate
    s += S.box(x + w - 46, y + h * 0.48, 14, 50, '#c9b06a', { w: 1.8, extra: 1.6, step: 20, hatch: false });
    s += S.line([[x + w - 40, y + h * 0.5], [x + w - 82, y + h * 0.5 + 2]], { w: 9, ta: 0.05, tb: 0.1, min: 0.8 }) + S.line([[x + w - 40, y + h * 0.5], [x + w - 80, y + h * 0.5 + 2]], { w: 5, ta: 0.05, tb: 0.1, min: 0.8 }, '#d8bf72');
    s += S.circ(x + w / 2, y + 120, 7, '#3a3631', { w: 1.4, extra: 1 });
    s += S.box(x + w / 2 - 50, y + 150, 100, 26, '#d8c08a', { w: 1.6, extra: 1.4, step: 20, hatch: false }) + S.T(x + w / 2, y + 169, 'MELO', { f: 'Oswald', s: 15, ls: 3, a: 'middle' });
    // hinges
    s += S.box(x - 4, y + 60, 8, 30, '#a99a6a', { w: 1.4, extra: 1, step: 20, hatch: false }) + S.box(x - 4, y + h - 90, 8, 30, '#a99a6a', { w: 1.4, extra: 1, step: 20, hatch: false });
    return s;
  }
  function coatRack(S, x, y) {
    var s = S.floorShadow(x, y + 4, 80, 10, 0.25), top = y - 520;
    s += S.line([[x, y - 10], [x, top]], { w: 12, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[x, y - 10], [x, top]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }, P.woodD);
    s += S.lines([[[x, y - 20], [x - 70, y]], [[x, y - 20], [x + 70, y]], [[x, y - 20], [x + 10, y + 6]]], { w: 9, ta: 0.05, tb: 0.05, min: 0.8 });
    s += S.lines([[[x, top + 20], [x - 46, top - 10]], [[x, top + 20], [x + 46, top - 10]], [[x, top + 40], [x - 50, top + 20]], [[x, top + 40], [x + 50, top + 20]]], { w: 6, ta: 0.05, tb: 0.4, min: 0.6 });
    s += S.circ(x, top - 6, 12, P.woodD, { w: 2, extra: 1.6 });
    // coat (mustard) on the left hook
    var coat = U.catmull([[x - 50, top + 10], [x - 20, top + 30], [x - 6, top + 120], [x + 4, top + 300], [x - 40, top + 330], [x - 110, top + 320], [x - 104, top + 140], [x - 80, top + 30]], 5, true);
    s += S.shape(coat, P.mustard, { w: 2.8, extra: 3.2 }) + A.shadeSide(S, coat, [1, 0.3], 0.2, { ang: 70, gap: 7, op: 0.45 });
    s += S.lines([[[x - 56, top + 40], [x - 50, top + 310]], [[x - 80, top + 30], [x - 64, top + 80], [x - 50, top + 40]]], { w: 2, ta: 0.1, tb: 0.2 });
    s += S.dot(x - 44, top + 140, 4) + S.dot(x - 44, top + 200, 4) + S.dot(x - 44, top + 260, 4);
    // umbrella + bag on the right
    s += S.line(U.catmull([[x + 46, top + 16], [x + 58, top + 6], [x + 66, top + 18]], 4, false), { w: 4, ta: 0.05, tb: 0.05 });
    var um = S.poly([[x + 56, top + 30], [x + 84, top + 330], [x + 40, top + 340], [x + 50, top + 30]], 20, 1);
    s += S.shape(um, P.navy, { w: 2.4, extra: 2.6 }) + S.line([[x + 58, top + 18], [x + 58, top + 32]], { w: 4 });
    s += S.line([[x + 60, top + 340], [x + 62, top + 370]], { w: 4, ta: 0.05, tb: 0.3 });
    // hat on top
    var hat = U.catmull([[x - 40, top - 20], [x - 30, top - 60], [x + 30, top - 64], [x + 40, top - 20]], 4, false).concat([[x + 58, top - 14], [x - 58, top - 14]]);
    s += S.shape(hat, P.red, { w: 2.4, extra: 2.6 }) + S.box(x - 40, top - 34, 80, 12, P.ink, { w: 1, extra: 0.6, step: 20, hatch: false });
    return s;
  }
  function sofa(S, x0, x1, y) {
    var s = S.floorShadow((x0 + x1) / 2, y + 8, (x1 - x0) * 0.55, 22, 0.3), col = '#b5503e', colD = '#9c4535';
    var back = S.poly([[x0 + 30, y - 270], [x1 - 30, y - 270], [x1 - 20, y - 120], [x0 + 20, y - 120]], 50, 1.2);
    s += S.shape(U.catmull(back, 2, true), col, { w: 3.2, extra: 3.6 }) + A.shadeSide(S, back, [0, 1], 0.3, { ang: 10, gap: 7, op: 0.35 });
    // cushions (back)
    var cw = (x1 - x0 - 120) / 2;
    [x0 + 60, x0 + 60 + cw].forEach(function (cx, i) {
      var c = U.catmull(S.rect(cx + 6, y - 250, cw - 12, 120, 40, 2), 2, true);
      s += S.shape(c, i ? '#c25a46' : '#bd5543', { w: 2.4, extra: 2.6 }) + A.shadeSide(S, c, [0.4, 1], 0.4, { ang: 20, gap: 6, op: 0.35 });
    });
    // seat
    var seat = S.rect(x0 + 50, y - 140, x1 - x0 - 100, 70, 40, 1);
    s += S.shape(seat, '#c55d48', { w: 3, extra: 3.4 }) + S.seg((x0 + x1) / 2, y - 138, (x0 + x1) / 2, y - 72, 2);
    s += S.box(x0 + 40, y - 74, x1 - x0 - 80, 60, colD, { w: 3, extra: 3.4, hatch: 'b', hk: 0.5 });
    // arms
    [[x0, 1], [x1 - 80, -1]].forEach(function (a) {
      var arm = U.catmull([[a[0], y - 170], [a[0] + 40, y - 200], [a[0] + 80, y - 170], [a[0] + 78, y - 20], [a[0] + 2, y - 20]], 4, true);
      s += S.shape(arm, col, { w: 3, extra: 3.4 }) + A.shadeSide(S, arm, [1, 0.2], 0.25, { ang: 75, gap: 6 });
    });
    [x0 + 40, x1 - 60].forEach(function (lx) { s += S.box(lx, y - 20, 20, 22, P.woodDD, { w: 1.8, extra: 1.6, step: 20, hatch: false }); });
    // throw pillows
    var p1 = U.xf(U.catmull(S.rect(-50, -46, 100, 92, 30, 3), 2, true), x0 + 130, y - 170, -12);
    s += S.shape(p1, P.mustard, { w: 2.4, extra: 2.6 }) + S.hatch(p1, { ang: 45, gap: 12, w: 4, op: 0.35, color: '#f3ead3' });
    var p2 = U.xf(U.catmull(S.rect(-46, -44, 92, 88, 30, 3), 2, true), x1 - 130, y - 168, 10);
    s += S.shape(p2, P.teal, { w: 2.4, extra: 2.6 }) + S.circ(x1 - 130, y - 168, 14, '#f3ead3', { w: 1.6, extra: 1.2 });
    return s;
  }
  function floorLamp(S, x, y) {
    var s = S.floorShadow(x, y + 4, 60, 10, 0.25);
    s += S.shape(S.ellipse(x, y - 4, 50, 12, 24), P.navy, { w: 2, extra: 2 });
    s += S.line([[x, y - 8], [x, y - 470]], { w: 7, ta: 0.02, tb: 0.02, min: 0.9 });
    var shade = S.poly([[x - 50, y - 560], [x + 50, y - 560], [x + 80, y - 460], [x - 80, y - 460]], 20, 1);
    s += S.glow(x, y - 420, 260, 300, '#ffe6a8', 0.45);
    s += S.shape(shade, '#f0d79a', { w: 2.6, extra: 3 }) + A.shadeSide(S, shade, [1, 0], 0.4, { ang: 75, gap: 6, op: 0.35 });
    return s;
  }
  function bookshelf(S, x, y, w, h) {
    var s = S.floorShadow(x + w / 2, y + 4, w * 0.6, 12, 0.25);
    s += S.box(x, y - h, w, h, P.woodD, { w: 3, extra: 3.5, hatch: 'r', hk: 0.1 });
    var n = 4, sh = (h - 30) / n;
    for (var i = 0; i < n; i++) {
      var by = y - h + 15 + (i + 1) * sh;
      s += S.fillOnly(S.rect(x + 14, by - sh + 10, w - 28, sh - 10), '#4a3626');
      if (i === 1) { s += S.books(x + 16, x + w * 0.55, by, sh * 0.8) + S.plant(x + w * 0.76, by, 70, { n: 7, pot: P.cream }); }
      else if (i === 3) { s += S.box(x + 20, by - 50, w - 40, 50, '#c9b48a', { w: 2, extra: 2, hatch: false }) + S.T(x + w / 2, by - 18, 'FOTOS', { f: 'Kalam', s: 22, a: 'middle' }); }
      else s += S.books(x + 16, x + w - 16, by, sh * 0.8);
      s += S.box(x + 8, by - 4, w - 16, 12, P.woodM, { w: 2, extra: 2, step: 40, hatch: false });
    }
    return s;
  }

  function build(S) {
    var bg = '';
    bg += S.wall(0, WALL_Y, '#e4d3ae', { top: 40, op: 0.28 });
    bg += S.stripes(0, WALL_Y, 120, P.ochre, 0.18);
    bg += S.skirting(WALL_Y, 24, '#efe5cc');
    bg += S.floor(WALL_Y, { kind: 'boards', gap: 95, fill: '#b98f5c', vx: 960, vy: 420, lop: 0.5, hop: 0.24 });
    // rug
    var rug = S.poly([[720, 880], [1700, 880], [1820, 1040], [600, 1040]], 50, 1.4);
    bg += S.shape(rug, '#5f8f86', { w: 2.6, extra: 2.6 }) + S.shape(S.poly([[760, 896], [1662, 896], [1760, 1022], [660, 1022]], 50, 1), null, { w: 1.6, extra: 0.8, color: '#e9dfc4' });
    bg += S.hatch(rug, { ang: 0, gap: 11, w: 1.1, op: 0.2 });

    // ── front door (left) + doormat + coat rack ──
    bg += door(S, 140, 300, 270, WALL_Y - 300);
    bg += S.shape(S.poly([[110, WALL_Y + 10], [440, WALL_Y + 10], [462, WALL_Y + 54], [90, WALL_Y + 54]], 30, 1), '#8a6a3e', { w: 2.4, extra: 2.6 });
    bg += S.hatch(S.poly([[110, WALL_Y + 10], [440, WALL_Y + 10], [462, WALL_Y + 54], [90, WALL_Y + 54]], 30, 1), { ang: 90, gap: 5, w: 1, op: 0.35 });
    bg += S.T(276, WALL_Y + 42, 'Willkommen', { f: 'Kalam', s: 26, c: '#f3ead3', a: 'middle' });
    bg += coatRack(S, 560, WALL_Y + 20);
    // key board + light switch
    bg += S.box(470, 360, 60, 34, P.woodM, { w: 2, extra: 2, hatch: false }) + S.lines([[[484, 394], [484, 418]], [[504, 394], [506, 412]]], { w: 2.2, ta: 0.05, tb: 0.05 }) + S.circ(484, 420, 5, '#c9b06a', { w: 1.2, extra: 0.8 });
    bg += S.box(450, 470, 30, 44, '#f1ead8', { w: 1.8, extra: 1.6, hatch: false });

    // ── window with plants (centre back) ──
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), '#bfd6d8') + S.glow(900, 260, 300, 200, '#fff4d6', 0.6);
    view += S.fillOnly(S.poly([[700, 520], [760, 400], [840, 420], [880, 360], [960, 380], [1010, 330], [1060, 520]], 20, 3), '#9fb3a6');
    view += S.box(760, 420, 60, 100, '#d9c7a4', { w: 1.6, extra: 1.2, hatch: false }) + S.box(900, 380, 70, 140, '#cdb894', { w: 1.6, extra: 1.2, hatch: false });
    bg += S.window(760, 160, 340, 380, { view: view, panes: [2, 3], frame: '#f1ead8' });
    bg += S.plant(840, 560, 110, { n: 9 }) + S.plant(1010, 560, 90, { n: 7, pot: P.mustard, c: 1 });

    // ── sofa + floor lamp + pictures (right) ──
    bg += S.frame(1180, 230, 170, 210, '#e6c79a', function (x, y, w, h) {
      return S.fillOnly(S.rect(x, y, w, h), '#e9b86a') + S.circ(x + w / 2, y + h * 0.45, 40, P.red, { w: 2, extra: 1.6 }) + S.fillOnly(S.rect(x, y + h * 0.7, w, h * 0.3), P.green);
    }, { frame: P.ink });
    bg += S.frame(1380, 270, 220, 150, '#dfe7e2', function (x, y, w, h) {
      return S.fillOnly(S.rect(x, y, w, h), '#cbdcd9') + S.shape(S.poly([[x - 4, y + h], [x + 60, y + 50], [x + 110, y + 90], [x + 160, y + 30], [x + w + 4, y + h]], 14, 1), '#7d9a8a', { w: 1.6, extra: 1.4 });
    }, { frame: P.woodD });
    bg += sofa(S, 1130, 1660, WALL_Y + 100);
    bg += bookshelf(S, 1800, WALL_Y + 40, 150, 600);
    bg += floorLamp(S, 1718, WALL_Y + 90);
    return { bg: bg };
  }

  A.define('living-room', {
    seed: 51, build: build,
    slots: {
      door:          A.slot(275, 805, 0.88, { face: 1 }),     // standing in the doorway
      left:          A.slot(700, 950, 1.0, { face: 1 }),
      center:        A.slot(960, 950, 1.0),
      right:         A.slot(1250, 960, 1.0, { face: -1 }),
      'sofa-left':   A.slot(1270, 900, 0.95, { face: 1, seated: true, seatY: 770 }),
      'sofa-right':  A.slot(1520, 900, 0.95, { face: -1, seated: true, seatY: 770 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
