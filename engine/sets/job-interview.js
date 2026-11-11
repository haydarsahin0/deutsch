/* Set "job-interview" — formal HR office: binder shelf, tall ficus, framed company sign, wall clock, big window with a
 * skyline behind half-lowered blinds. The executive desk (nameplate PERSONALLEITUNG, CV with photo, laptop, coffee, water)
 * is the FOREGROUND layer; the interviewer sits behind it, the candidate sits on a chair (bg) at the desk's end.
 * Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YH = 770, WALL = '#d9d6c4', CARPET = '#7d8a8a', DESK = '#6e4a2e', DESK_L = '#8a6040';

  function room(S) {
    var s = '';
    s += S.wall(-10, YH, WALL, { top: 46, op: 0.3 });
    // wainscot rail + subtle vertical panels
    s += S.box(-20, 600, 1960, 14, '#ece6d2', { w: 2.4, extra: 2.4, step: 60 });
    s += S.stripes(614, YH, 120, P.ink, 0.12);
    // carpet floor
    s += S.fillOnly([[-20, YH], [1940, YH], [1940, 1100], [-20, 1100]], CARPET);
    s += S.hatch([[-20, YH], [1940, YH], [1940, 1100], [-20, 1100]], { ang: 0, gap: 6, w: 1, op: 0.25, cond: function (X, Y) { return Y < 880 || S.r() < 0.3; } });
    s += S.stipple([[-20, YH], [1940, YH], [1940, 1100], [-20, 1100]], 900, { r: 2, op: 0.25, color: '#3c4646' });
    s += S.skirting(YH, 16, '#ece6d2');
    return s;
  }

  function shelf(S) {
    var s = '', x = 50, y = 140, w = 320, h = YH - y;
    s += S.drop(x, y, w, h, 14, 0);
    s += S.box(x, y, w, h, '#5e3f22', { w: 3.4, extra: 4 });
    var rows = [y + 20, y + 170, y + 320, y + 470];
    rows.forEach(function (ry, i) {
      s += S.fillOnly(S.rect(x + 14, ry, w - 28, 136, 30, 0.6), '#3b2a1c');
      s += S.box(x + 10, ry + 136, w - 20, 14, '#7a5236', { w: 2, extra: 2, step: 40 });
      if (i < 3) {
        // binders with year labels
        var bx = x + 22, cols = [P.navy, P.red, P.green, P.mustard, P.navyL, P.cream];
        for (var k = 0; k < 7; k++) {
          var bw = 34, bh = 124 - (k % 3) * 4;
          if (i === 1 && k > 4) break;
          var col = cols[(k + i * 2) % cols.length];
          s += S.box(bx, ry + 136 - bh, bw, bh, col, { w: 1.8, extra: 1.8, step: 30, hatch: 'r', hk: 0.3, hop: 0.4 });
          s += S.box(bx + 6, ry + 136 - bh + 16, bw - 12, 38, P.paperL, { w: 1, extra: 0.6, step: 20 });
          s += S.circ(bx + bw / 2, ry + 136 - 22, 6, P.paperL, { w: 1, extra: 0.6 });
          s += S.T(bx + bw / 2, ry + 136 - bh + 40, ['2019', '2020', '2021', '2022', '2023', '2024', '2025'][k], { f: 'Oswald', s: 10, a: 'middle', c: P.ink });
          bx += bw + 2;
        }
        if (i === 1) { s += S.books(bx + 10, x + w - 20, ry + 136, 110, [P.cream, P.redD, P.teal]); }
      } else {
        // bottom: a globe-ish trophy + leaning books
        s += S.books(x + 26, x + 160, ry + 136, 96, [P.green, P.navy, P.red, P.cream]);
        s += S.box(x + 190, ry + 60, 100, 76, P.paperL, { w: 2, extra: 2, step: 30 });
        s += S.T(x + 240, ry + 104, 'IHK', { f: 'Fraunces', s: 22, a: 'middle', c: P.navy });
      }
    });
    return s;
  }

  function ficus(S, x, y) {
    var s = '', self = S;
    // trunk + crown of small leaves
    s += S.line(U.catmull([[x, y - 120], [x - 10, y - 260], [x + 14, y - 380], [x - 6, y - 470]], 6, false), { w: 12, ta: 0.05, tb: 0.5, min: 0.4 }, P.woodDD);
    var leaves = '';
    for (var i = 0; i < 70; i++) {
      var a = S.r() * Math.PI * 2, rr = Math.sqrt(S.r()), cx = x + Math.cos(a) * 120 * rr, cy = y - 430 + Math.sin(a) * 140 * rr;
      var ang = S.r() * 360, lf = U.xf(U.catmull([[0, 0], [10, -8], [26, 0], [10, 8]], 4, true), cx, cy, ang);
      leaves += S.shape(lf, [P.green, P.greenM, '#4f7a37', P.greenL][i % 4], { w: 1.4, extra: 1.4 });
    }
    s += leaves;
    var pot = S.poly([[x - 62, y - 130], [x + 62, y - 130], [x + 48, y], [x - 48, y]], 20, 0.8);
    s += S.floorShadow(x, y + 2, 70, 12, 0.25);
    s += S.shape(pot, '#e6e0cf', { w: 3, extra: 3.5 });
    s += S.hatch(pot, { ang: 80, gap: 7, w: 1.2, op: 0.45, cond: function (X) { return X > x + 18; } });
    return s;
  }

  function windowSkyline(S) {
    var x = 1250, y = 92, w = 560, h = 470;
    var view = (function () {
      var v = '';
      v += S.glow(x + w * 0.3, y + 80, 260, 160, '#fff4d8', 0.6);
      // skyline: towers of varying height
      var bx = x - 10, i = 0;
      while (bx < x + w) {
        var bw = 50 + S.r() * 60, bh = 140 + S.r() * 220 + (i === 3 ? 120 : 0), col = ['#9aaab0', '#8796a0', '#a9b4b2', '#7f8e96'][i % 4];
        v += S.box(bx, y + h - bh, bw, bh + 10, col, { w: 1.6, extra: 1.4, step: 40 });
        var L = [];
        for (var wy = y + h - bh + 16; wy < y + h; wy += 18) L.push([[bx + 8, wy], [bx + bw - 8, wy]]);
        v += S.lines(L, { w: 1.2, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".35"');
        if (i === 3) v += S.seg(bx + bw / 2, y + h - bh, bx + bw / 2, y + h - bh - 60, 3);
        bx += bw + 6; i++;
      }
      return v;
    })();
    var s = S.window(x, y, w, h, { sky: S.linear([[0, '#c6d8dc'], [1, '#e8e6d4']], 0, 0, 0, 1), panes: [2, 1], frame: '#ece6d2', view: view, sill: true });
    // half-lowered venetian blind
    var by = y + 16, bh2 = h * 0.42, L2 = [];
    s += S.fillOnly(S.rect(x + 16, by, w - 32, bh2, 40, 0.5), 'rgba(236,230,210,.85)');
    for (var yy = by + 10; yy < by + bh2; yy += 14) L2.push([[x + 18, yy], [x + w - 18, yy + 1]]);
    s += S.lines(L2, { w: 1.6, ta: 0.05, tb: 0.05 }, P.ink, ' opacity=".55"');
    s += S.box(x + 8, by + bh2 - 4, w - 16, 14, '#ece6d2', { w: 2.2, extra: 2.4, step: 40 });
    s += S.line([[x + w - 60, by + bh2 + 10], [x + w - 60, by + bh2 + 120]], { w: 1.6, ta: 0.05, tb: 0.05 });
    s += S.box(x - 30, y - 34, w + 60, 26, '#ece6d2', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.4 });
    // sunlight patch on the floor
    s += '<path d="M1280 ' + (YH + 4) + 'L1820 ' + (YH + 4) + 'L1700 1060L1060 1060Z" fill="#fff4d8" opacity=".14"/>';
    return s;
  }

  function backWall(S) {
    var s = '';
    // company sign
    s += S.drop(560, 150, 470, 150, 10, 12);
    s += S.box(560, 150, 470, 150, P.navy, { w: 3.4, extra: 4 });
    s += S.shape(S.rect(574, 164, 442, 122, 40, 0.5), null, { w: 1.6, extra: 0.6, color: '#c9a24a' });
    s += S.seed(626, 226, 52, -60, '#c9a24a');
    s += S.T(820, 222, 'KERN & PARTNER', { f: 'Fraunces', s: 40, a: 'middle', c: P.white });
    s += S.T(820, 262, 'PERSONALBERATUNG · SEIT 1987', { f: 'Oswald', s: 16, a: 'middle', c: '#c9a24a', ls: 3 });
    // certificate frames
    s += S.frame(1080, 160, 120, 150, P.paperL, function (x, y, w, h) {
      return S.T(x + w / 2, y + 32, 'Urkunde', { f: 'Caveat', s: 22, a: 'middle', c: P.navy }) + S.scribble(x + 14, y + 52, w - 28, 4, 14, P.ink, 0.5) + S.circ(x + w - 24, y + h - 24, 12, P.red, { w: 1.2, extra: 0.8 });
    }, { frame: '#c9a24a', mat: 10 });
    // clock
    s += S.clock(450, 230, 56, 10, 10, { sec: 34 });
    return s;
  }

  // high-backed leather chair behind the interviewer (bg)
  function bossChair(S, x) {
    var s = '';
    var back = S.rrect(x - 120, 470, 240, 330, [60, 60, 18, 18]);
    s += S.shape(back, '#3b2a24', { w: 3.4, extra: 4 });
    var L = [];
    for (var i = 1; i < 4; i++) L.push([[x - 120 + i * 60, 500], [x - 120 + i * 60, 780]]);
    s += S.lines(L, { w: 2, ta: 0.1, tb: 0.1 }, '#1a120e');
    for (var r = 0; r < 3; r++) for (var c = 1; c < 4; c++) s += S.dot(x - 120 + c * 60, 540 + r * 80, 4, '#8a6a4a');
    s += S.hatch(back, { ang: 75, gap: 7, w: 1.2, op: 0.45, cond: function (X) { return X > x + 50; } });
    return s;
  }

  // candidate's chair (bg): side-ish view, seat at seatY
  function guestChair(S, x, seatY) {
    var s = '';
    s += S.floorShadow(x, 990, 110, 16, 0.22);
    [[x - 70, 990], [x + 64, 990]].forEach(function (l) { s += S.line([[l[0] + (l[0] < x ? 8 : -8), seatY + 16], [l[0], l[1]]], { w: 7, ta: 0.02, tb: 0.02, min: 0.8 }, '#9a9d96'); });
    s += S.line([[x + 56, seatY + 6], [x + 92, seatY - 200]], { w: 8, ta: 0.02, tb: 0.02, min: 0.8 }, '#9a9d96');
    var back = U.xf(S.rrect(-34, -150, 68, 150, 18), x + 92, seatY - 70, 10);
    s += S.shape(back, '#2c4a5a', { w: 2.8, extra: 3 });
    s += S.box(x - 92, seatY, 176, 26, '#2c4a5a', { w: 2.8, extra: 3, step: 30, hatch: 'b', hk: 0.4 });
    return s;
  }

  function desk(S) {
    var s = '', x0 = 330, x1 = 1180, top = 776;
    // top surface (visible as a thin band)
    var tp = [[x0 - 20, top - 22], [x1 + 20, top - 22], [x1 + 34, top + 6], [x0 - 34, top + 6]];
    // items standing on the desk (behind the front edge)
    var it = '';
    // laptop (lid seen from behind)
    var lid = S.poly([[430, top - 18], [610, top - 18], [600, top - 150], [440, top - 150]], 30, 0.6);
    it += S.shape(lid, '#b9bcb4', { w: 2.6, extra: 3 });
    it += S.hatch(lid, { ang: 80, gap: 6, w: 1.1, op: 0.4, cond: function (X) { return X > 560; } });
    it += S.seed(520, top - 88, 30, -90, '#8f928b');
    // desk lamp
    it += S.line([[350, top - 20], [374, top - 190], [450, top - 230]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, P.green);
    it += S.shape(U.xf(S.poly([[-36, 0], [36, 0], [20, -44], [-20, -44]], 12, 0.6), 462, top - 206, 128), P.green, { w: 2.4, extra: 2.6 });
    it += S.box(330, top - 30, 60, 14, P.green, { w: 2, extra: 2, step: 20 });
    // coffee mug + water glass
    it += S.mug(990, top - 14, 44, 52, P.white, { label: '' });
    var gl = S.poly([[1090, top - 14], [1130, top - 14], [1134, top - 86], [1086, top - 86]], 12, 0.4);
    it += S.fillOnly(gl, 'rgba(200,225,230,.6)') + S.fillOnly(S.poly([[1091, top - 16], [1129, top - 16], [1132, top - 60], [1088, top - 60]], 12, 0.3), 'rgba(150,190,205,.6)');
    it += S.shape(gl, null, { w: 1.8, extra: 1.4 });
    // paper tray
    it += S.box(1180 - 150, top - 40, 120, 24, '#9a9d96', { w: 2, extra: 2, step: 30 });
    s += it;
    s += S.shape(tp, DESK_L, { w: 3, extra: 3 });
    s += S.hatch(tp, { ang: 2, gap: 6, w: 1, op: 0.3 });
    // CV lying on the desk (foreshortened)
    var cv = S.poly([[700, top - 16], [880, top - 20], [900, top + 2], [690, top + 4]], 20, 0.4);
    s += S.shape(cv, P.white, { w: 1.6, extra: 1.2 });
    s += S.box(708, top - 13, 26, 13, '#9fb08a', { w: 1, extra: 0.5, step: 10 });
    s += S.line([[760, top - 9], [860, top - 11]], { w: 1.4, ta: 0.1, tb: 0.1 }, P.ink, ' opacity=".6"');
    s += S.line([[920, top - 6], [990, top - 16]], { w: 4, ta: 0.05, tb: 0.4 }, P.navy);
    // front panel
    var fr = [[x0 - 34, top + 6], [x1 + 34, top + 6], [x1 + 20, 1010], [x0 - 20, 1010]];
    s += S.floorShadow((x0 + x1) / 2, 1012, (x1 - x0) * 0.58, 20, 0.3);
    s += S.shape(fr, DESK, { w: 3.6, extra: 4 });
    s += S.box(x0, top + 40, x1 - x0, 150, '#7a5236', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.1, hop: 0.4 });
    s += S.hatch(fr, { ang: 2, gap: 9, w: 1.1, op: 0.25 });
    s += '<path d="M' + (x0 - 34) + ' ' + (top + 6) + 'L' + (x1 + 34) + ' ' + (top + 6) + 'L' + (x1 + 20) + ' 1010L' + (x0 - 20) + ' 1010Z" fill="' + S.linear([[0, '#000', 0], [1, '#000', 0.25]], 0, 0, 0, 1) + '"/>';
    // nameplate facing the camera
    var nx = 560, ny = top - 4;
    var np = S.poly([[nx - 120, ny], [nx + 120, ny], [nx + 112, ny - 54], [nx - 112, ny - 54]], 30, 0.5);
    s += S.shape(np, '#2a2420', { w: 2.6, extra: 2.6 });
    s += S.shape(S.rect(nx - 104, ny - 48, 208, 42, 30, 0.4), null, { w: 1.2, extra: 0.4, color: '#c9a24a' });
    s += S.T(nx, ny - 19, 'PERSONALLEITUNG', { f: 'Oswald', s: 22, a: 'middle', c: '#c9a24a', ls: 2 });
    return s;
  }

  K.define('job-interview', {
    seed: 59,
    slots: {
      interviewer: K.slot(760, 968, 1.0, { face: 1, seated: true, seatY: 856 }),      // behind the desk (fg hides the lower body)
      candidate: K.slot(1400, 990, 1.0, { face: -1, seated: true, seatY: 878 }),      // on the guest chair, feet on the floor
      left: K.slot(190, 1000, 1.08, { face: 1 }),
      center: K.slot(760, 968, 1.0, { face: 1 }),                                      // standing behind the desk
      right: K.slot(1720, 1000, 1.08, { face: -1 })
    },
    build: function () {
      return {
        bg: function (S) {
          return room(S) + windowSkyline(S) + backWall(S) + shelf(S) + ficus(S, 1150, YH + 18) + bossChair(S, 760) + guestChair(S, 1400, 878) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.55, '#2a2418', 0], [1, '#2a2418', 0.3]], { cx: '55%', cy: '40%', r: '75%' }) + '"/>';
        },
        fg: function (S) { return desk(S); }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
