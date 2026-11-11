/* doctor-office — GP consulting room: examination couch with paper roll, framed diplomas, eye chart, desk with
 * computer + stethoscope, sink, medicine cabinet, window with blinds, skeleton model, plant. Static. (Set A) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U, f1 = U.f1;
  var WALL_Y = 790;

  function diploma(S, x, y, w, h, title, seal) {
    return S.frame(x, y, w, h, '#f6f0dc', function (ix, iy, iw, ih) {
      var s = S.T(ix + iw / 2, iy + ih * 0.3, title, { f: 'Fraunces', s: iw * 0.12, a: 'middle' });
      s += S.scribble(ix + iw * 0.16, iy + ih * 0.46, iw * 0.68, 3, ih * 0.11, P.ink, 0.45);
      s += S.circ(ix + iw * 0.78, iy + ih * 0.8, ih * 0.1, seal || P.red, { w: 1.4, extra: 1 });
      s += S.line([[ix + iw * 0.12, iy + ih * 0.84], [ix + iw * 0.5, iy + ih * 0.82]], { w: 2, ta: 0.2, tb: 0.6 });
      return s;
    }, { frame: '#3b2f25', mat: 8 });
  }
  function eyeChart(S, x, y) {
    var s = S.drop(x, y, 170, 260, 6, 8) + S.box(x, y, 170, 260, '#f8f4e8', { w: 2.4, extra: 2.6, hatch: false });
    var rows = [['E', 64], ['F P', 40], ['T O Z', 28], ['L P E D', 20], ['P E C F D', 14], ['E D F C Z P', 11]], yy = y + 66;
    rows.forEach(function (r) { s += S.T(x + 85, yy, r[0], { f: 'Oswald', s: r[1], ls: r[1] * 0.25, a: 'middle' }); yy += r[1] + 14; });
    s += S.seg(x + 20, yy - 4, x + 150, yy - 4, 2, P.red);
    return s;
  }
  function couch(S, x0, x1, y) {
    var s = S.floorShadow((x0 + x1) / 2, y + 6, (x1 - x0) * 0.55, 16, 0.25), top = y - 210;
    // legs (chrome)
    [x0 + 40, x1 - 60].forEach(function (lx) { s += S.line([[lx, top + 40], [lx, y]], { w: 12, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([[lx, top + 40], [lx, y]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }, '#b8bcbc'); });
    s += S.line([[x0 + 40, y - 40], [x1 - 60, y - 40]], { w: 8, ta: 0.02, tb: 0.02, min: 0.9 });
    // step stool
    s += S.box(x0 - 30, y - 70, 120, 70, '#b8bcbc', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.25 }) + S.box(x0 - 20, y - 76, 100, 12, '#2f3236', { w: 1.6, extra: 1.4, step: 30, hatch: false });
    // mattress + raised head part
    var mat = S.poly([[x0, top], [x1 - 150, top], [x1 - 150, top + 50], [x0, top + 50]], 40, 0.8);
    s += S.shape(mat, '#5f8f86', { w: 3, extra: 3.4 }) + A.shadeSide(S, mat, [0, 1], 0.3, { ang: 10, gap: 6 });
    var head = S.poly([[x1 - 160, top + 50], [x1 - 160, top], [x1 - 40, top - 70], [x1 - 10, top - 40], [x1 - 10, top + 50]], 30, 0.8);
    s += S.shape(head, '#5f8f86', { w: 3, extra: 3.4 }) + A.shadeSide(S, head, [1, 0.3], 0.3, { ang: 70, gap: 6 });
    // paper roll sheet
    var paper = S.poly([[x0 + 10, top - 4], [x1 - 170, top - 4], [x1 - 50, top - 66], [x1 - 30, top - 52], [x1 - 160, top + 10], [x0 + 10, top + 10]], 30, 0.8);
    s += S.shape(paper, '#f8f6ee', { w: 1.6, extra: 1.2 });
    s += S.circ(x0 - 4, top + 24, 28, '#f8f6ee', { w: 2, extra: 2 }) + S.circ(x0 - 4, top + 24, 8, '#b8bcbc', { w: 1.4, extra: 1 });
    s += S.line([[x0 - 4, top + 52], [x0 + 10, top + 76]], { w: 3, ta: 0.05, tb: 0.4 }, P.ink, ' opacity=".5"');
    return s;
  }
  function skeleton(S, x, y) {
    var s = '', B = '#efe9d6';
    s += S.line([[x, y], [x, y - 470]], { w: 6, ta: 0.02, tb: 0.02, min: 0.9 }) + S.shape(S.ellipse(x, y - 4, 60, 12, 24), '#3a3f44', { w: 2, extra: 2 });
    s += S.circ(x, y - 500, 34, B, { w: 2.4, extra: 2.4 }) + S.dot(x - 12, y - 502, 7) + S.dot(x + 12, y - 502, 7) + S.seg(x - 12, y - 478, x + 12, y - 478, 3);
    var ribs = []; for (var i = 0; i < 5; i++) ribs.push(U.catmull([[x - 40 + i * 2, y - 420 + i * 22], [x, y - 430 + i * 22], [x + 40 - i * 2, y - 420 + i * 22]], 4, false));
    s += S.lines(ribs, { w: 9, ta: 0.1, tb: 0.1, min: 0.7 }) + S.lines(ribs, { w: 5, ta: 0.1, tb: 0.1, min: 0.7 }, B);
    var bones = [[[x - 46, y - 440], [x - 70, y - 330], [x - 74, y - 230]], [[x + 46, y - 440], [x + 74, y - 330], [x + 84, y - 240]], [[x - 24, y - 290], [x - 30, y - 160], [x - 34, y - 40]], [[x + 24, y - 290], [x + 30, y - 160], [x + 34, y - 40]]];
    bones.forEach(function (b) { s += S.line(b, { w: 12, ta: 0.1, tb: 0.1, min: 0.8 }) + S.line(b, { w: 7, ta: 0.1, tb: 0.1, min: 0.8 }, B); });
    s += S.shape(U.catmull([[x - 40, y - 300], [x, y - 320], [x + 40, y - 300], [x + 30, y - 270], [x - 30, y - 270]], 4, true), B, { w: 2.2, extra: 2.2 });
    // a silly hat
    s += S.shape(S.poly([[x - 30, y - 528], [x, y - 590], [x + 30, y - 528]], 12, 0.6), P.red, { w: 2, extra: 2 }) + S.circ(x, y - 592, 7, P.yellow, { w: 1.4, extra: 1 });
    return s;
  }

  function build(S) {
    var bg = '';
    bg += S.wall(0, WALL_Y, '#dfe7dc', { top: 36, op: 0.25 });
    bg += S.fillOnly(S.rect(-20, 520, 1960, WALL_Y - 520), '#cfdccf') + S.line([[-20, 520], [1940, 521]], { w: 3, ta: 0.02, tb: 0.02, min: 0.6 });   // wipeable lower wall
    bg += S.floor(WALL_Y, { kind: 'tiles', gap: 120, rows: 7, fill: '#d9d8cc', fill2: '#cbcabd', vx: 960, vy: 420, lop: 0.3 });
    bg += S.skirting(WALL_Y, 16, '#b9c6b8');

    // window with blinds (left)
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), '#cfe0e2') + S.circ(260, 240, 60, '#e9eee0', { w: 0 });
    bg += S.window(120, 140, 320, 360, { view: view, panes: [1, 1], frame: '#f1f1ea' });
    var sl = []; for (var i = 0; i < 9; i++) sl.push(S.rect(136, 156 + i * 22, 288, 12, 40, 0.5));
    sl.forEach(function (r) { bg += S.shape(r, '#f4f2ea', { w: 1.4, extra: 1.2 }); });
    // desk with computer (left)
    var dx0 = 80, dx1 = 600, dTop = 700;
    bg += S.floorShadow(340, 930, 280, 16, 0.25);
    bg += S.box(dx0 + 20, dTop + 30, 180, 900 - dTop - 30, '#c7c2b2', { w: 2.6, extra: 3, hatch: 'r', hk: 0.2 });
    [dx0 + 40, dx0 + 120].forEach(function (yy, k) { bg += S.box(dx0 + 36, dTop + 50 + k * 80, 148, 64, '#d6d2c4', { w: 1.8, extra: 1.6, hatch: false }) + S.seg(dx0 + 90, dTop + 82 + k * 80, dx0 + 130, dTop + 82 + k * 80, 4); });
    bg += S.box(dx1 - 40, dTop + 30, 26, 900 - dTop - 30, '#b8bcbc', { w: 2, extra: 2.2, hatch: false });
    bg += S.box(dx0, dTop, dx1 - dx0, 32, '#e8e4d8', { w: 3, extra: 3.4, hatch: 'b', hk: 0.4 });
    bg += S.box(dx0 + 230, dTop - 190, 230, 150, '#2f3236', { w: 2.8, extra: 3, hatch: false }) + S.box(dx0 + 244, dTop - 176, 202, 116, '#cfe6dc', { w: 1.6, extra: 1.2, hatch: false });
    // ECG line on screen
    bg += S.line([[dx0 + 254, dTop - 116], [dx0 + 300, dTop - 116], [dx0 + 312, dTop - 150], [dx0 + 326, dTop - 86], [dx0 + 338, dTop - 116], [dx0 + 436, dTop - 116]], { w: 3, ta: 0.05, tb: 0.05, min: 0.6 }, P.red);
    bg += S.box(dx0 + 330, dTop - 40, 30, 40, '#2f3236', { w: 1.8, extra: 1.8, hatch: false }) + S.box(dx0 + 280, dTop - 8, 130, 10, '#2f3236', { w: 1.6, extra: 1.4, hatch: false });
    // stethoscope + pen holder on the desk
    bg += S.line(U.catmull([[dx0 + 40, dTop - 4], [dx0 + 60, dTop - 50], [dx0 + 110, dTop - 40], [dx0 + 140, dTop - 6], [dx0 + 180, dTop - 10]], 6, false), { w: 6, ta: 0.05, tb: 0.05, min: 0.8 }) + S.circ(dx0 + 190, dTop - 10, 12, '#b8bcbc', { w: 1.8, extra: 1.4 });
    bg += S.box(dx0 + 480, dTop - 60, 40, 60, P.teal, { w: 1.8, extra: 1.8, hatch: 'r' }) + S.lines([[[dx0 + 490, dTop - 60], [dx0 + 484, dTop - 90]], [[dx0 + 504, dTop - 60], [dx0 + 508, dTop - 94]]], { w: 3, ta: 0.05, tb: 0.3 }, P.red);

    // diplomas + eye chart (centre)
    bg += diploma(S, 600, 150, 190, 150, 'DIPLOM') + diploma(S, 820, 120, 170, 130, 'Dr. med.', P.mustard) + diploma(S, 820, 274, 170, 130, 'Zertifikat', P.blue);
    bg += eyeChart(S, 1040, 170);
    // medicine cabinet + sink (right-centre)
    bg += S.box(1250, 160, 220, 200, '#f1f1ea', { w: 2.8, extra: 3, hatch: 'r', hk: 0.15 });
    bg += S.box(1270, 180, 180, 160, '#cfe0e2', { w: 1.6, extra: 1.4, hatch: false });
    var meds = [P.red, P.blue, P.yellow, '#f3f1ea', P.greenM, '#e9a596'];
    for (i = 0; i < 6; i++) bg += S.bottle(1290 + (i % 3) * 56, 255 + Math.floor(i / 3) * 74, 56, meds[i], { label: '#f3f1ea', cap: P.ink, wr: 0.42 });
    bg += S.seg(1360, 180, 1360, 340, 2.4);
    bg += S.box(1340, 120, 40, 40, P.red, { w: 1.6, extra: 1.4, hatch: false }) + S.T(1360, 152, '+', { f: 'Oswald', s: 40, c: '#f3f1ea', a: 'middle' });

    // examination couch (right) + skeleton + plant
    bg += skeleton(S, 1840, 880);
    bg += couch(S, 1260, 1760, 900);
    bg += S.plant(560, 900, 150, { n: 9, pot: '#f1f1ea' });
    // wall clock
    bg += S.clock(1580, 230, 60, 10, 10);
    return { bg: bg };
  }

  A.define('doctor-office', {
    seed: 101, build: build,
    slots: {
      doctor:  A.slot(760, 950, 1.0, { face: 1 }),          // standing between desk and couch
      patient: A.slot(1480, 930, 0.95, { face: -1, seated: true, seatY: 700 }),   // sitting on the couch edge
      left:    A.slot(700, 955, 1.0, { face: 1 }),
      center:  A.slot(980, 955, 1.0),
      right:   A.slot(1200, 960, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
