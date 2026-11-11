/* gym — small neighbourhood Fitnessstudio in the evening: bare concrete wall with a dusty-teal stripe, strip lights,
 * a mirror wall (soft reflections), dumbbell rack, kettlebells, rolled mats, two treadmills, a „Mitgliedschaft“ poster
 * with the fine print (24 Monate, Kündigung schriftlich) and dark windows. The reception desk (apples, towels, shakes,
 * card reader) is the FOREGROUND layer: `reception` stands behind it.
 * Slots: reception (behind fg desk), treadmill (on the front treadmill, facing its console), left, center, right.
 * (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var WY = 760, CON = '#a6a49b', TEAL = '#5f8f86', ORG = '#d9773f', RUB = '#3a3836';

  function room(S) {
    var s = '';
    s += S.wall(0, WY, CON, { top: 50, op: 0.34, hcol: '#1f1d1a' });
    // concrete formwork joints + tie holes
    var J = [];
    for (var x = 0; x < 1920; x += 320) J.push([[x, 40], [x + 1, WY]]);
    J.push([[-20, 400], [1940, 401]]);
    s += S.lines(J, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".22"');
    for (x = 80; x < 1920; x += 160) { s += S.dot(x, 220, 3.2, 'rgba(23,19,15,.4)'); s += S.dot(x, 580, 3.2, 'rgba(23,19,15,.4)'); }
    s += S.fillOnly([[-20, 640], [1940, 640], [1940, 676], [-20, 676]], TEAL);
    s += S.fillOnly([[-20, 676], [1940, 676], [1940, 686], [-20, 686]], ORG);
    // ceiling + strip lights
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, 34], [-20, 34]], '#2f2e2b');
    [300, 960, 1620].forEach(function (lx) {
      s += S.glow(lx, 60, 380, 140, '#f3f6ea', 0.32);
      s += S.box(lx - 200, 28, 400, 14, '#eceee4', { w: 2, extra: 2.2, step: 60, hatch: false });
    });
    // rubber floor with mat joints and speckle
    var fl = [[-20, WY], [1940, WY], [1940, 1100], [-20, 1100]];
    s += S.floor(WY, { kind: 'tiles', gap: 230, rows: 4, fill: RUB, fill2: '#353331', vx: 960, vy: 360, lop: 0.4 });
    s += S.stipple([[-20, WY], [1940, WY], [1940, 900], [-20, 900]], 900, { color: '#8a857a', r: 2, op: 0.35 });
    s += S.fillOnly([[-20, WY], [1940, WY], [1940, WY + 26], [-20, WY + 26]], 'rgba(0,0,0,.25)');
    s += S.box(-20, WY - 18, 1960, 18, '#2a2927', { w: 2.2, extra: 2.6, step: 80 });
    return s;
  }

  function darkWindow(S, x) {
    var view = S.fillOnly(S.rect(0, 0, 1920, 1080), S.linear([[0, '#1d2531'], [1, '#3a4656']], 0, 0, 0, 1));
    view += S.glow(x + 70, 160, 50, 50, P.amber, 0.7) + S.glow(x + 200, 190, 40, 40, P.amber, 0.5);
    return S.window(x, 90, 260, 200, { view: view, panes: [2, 1], frame: '#55585a', night: true, sill: false });
  }

  function mirror(S) {
    var s = '', x0 = 560, x1 = 1500, y0 = 140, y1 = WY - 40, n = 4, w = (x1 - x0) / n;
    s += S.drop(x0, y0, x1 - x0, y1 - y0, 10, 10, 'rgba(0,0,0,.25)');
    for (var i = 0; i < n; i++) {
      var r = S.rect(x0 + i * w + 4, y0, w - 8, y1 - y0, 40, 0.6);
      var g = S.fillOnly(S.rect(0, 0, 1920, 1080), S.linear([[0, '#c4cdcd'], [1, '#9aa5a6']], 0, 0, 0, 1));
      // soft reflections: opposite wall stripe, lamps, a ghost treadmill
      g += S.fillOnly(S.rect(x0, 560, x1 - x0, 30), TEAL, ' opacity=".35"') + S.glow(960, 190, 260, 50, '#ffffff', 0.4);
      g += S.fillOnly(S.poly([[x0 + 120, 640], [x0 + 330, 640], [x0 + 330, 660], [x0 + 120, 660]], 30, 1), '#5a5f60', ' opacity=".35"');
      g += S.line([[x0 + 300, 660], [x0 + 340, 520], [x0 + 380, 510]], { w: 6, ta: 0.05, tb: 0.05 }, '#5a5f60', ' opacity=".35"');
      s += S.shape(r, '#b3bdbe', { w: 2.4, extra: 2.4 });
      s += '<g clip-path="url(#' + S.clip(r) + ')">' + g + '</g>';
      s += S.hatch(r, { ang: -55, gap: 8, w: 1.4, op: 0.28, color: '#ffffff', cond: function (X, Y) { var u = (X + Y * 0.65) % 420; return u > 120 && u < 175; } });
    }
    s += S.box(x0 - 12, y0 - 14, x1 - x0 + 24, 16, '#7a7a74', { w: 2.4, extra: 2.6, step: 80 });
    return s;
  }

  function dumbbell(S, x, y, r, col) {
    var s = S.seg(x - r * 1.6, y, x + r * 1.6, y, r * 0.5, '#9a9c96');
    [-1, 1].forEach(function (d) { s += S.shape(S.ellipse(x + d * r * 1.4, y, r * 0.55, r, 6, 0.02, Math.PI / 6), col || '#2b2b2a', { w: 2, extra: 2 }); });
    return s;
  }
  function rack(S) {
    var s = '', x0 = 600, x1 = 1080;
    s += S.floorShadow((x0 + x1) / 2, 812, 260, 16, 0.3);
    s += S.box(x0 + 10, 640, 18, 170, '#1e1e1d', { w: 2, extra: 2, step: 40, hatch: false }) + S.box(x1 - 28, 640, 18, 170, '#1e1e1d', { w: 2, extra: 2, step: 40, hatch: false });
    [690, 770].forEach(function (yy, j) {
      s += S.box(x0, yy, x1 - x0, 16, '#2a2a29', { w: 2.4, extra: 2.6, step: 60 });
      for (var i = 0; i < 6; i++) s += dumbbell(S, x0 + 50 + i * 76, yy - 16 - j * 2, 14 + j * 4 + i * 1.2, i % 3 === 2 ? '#5a3c2a' : '#2b2b2a');
    });
    // kettlebells + rolled mats
    [[1120, 815, 30, ORG], [1180, 820, 36, '#2b2b2a']].forEach(function (k) {
      s += S.floorShadow(k[0], k[1] + 2, k[2] * 1.2, 8, 0.3);
      s += S.circ(k[0], k[1] - k[2], k[2], k[3], { w: 2.4, extra: 2.6 }) + S.line(S.ellipse(k[0], k[1] - k[2] * 2, k[2] * 0.6, k[2] * 0.6, 16, 0, Math.PI, Math.PI * 2), { w: 6, ta: 0.05, tb: 0.05 }, k[3]);
    });
    [[480, P.plum], [530, TEAL], [580, '#6b7d4a']].forEach(function (m) {
      s += S.box(m[0] - 18, 600, 40, 210, m[1], { w: 2.2, extra: 2.4, hatch: 'r', hk: 0.4 }) + S.circ(m[0] + 2, 600, 20, m[1], { w: 2, extra: 2, ry: 8 });
    });
    return s;
  }

  function poster(S) {
    var s = '', x = 1560, y = 160, w = 280, h = 380;
    s += S.drop(x, y, w, h, 8, 10, 'rgba(0,0,0,.3)');
    s += S.box(x, y, w, h, '#efe5cc', { w: 2.8, extra: 3.2 });
    s += S.box(x, y, w, 90, ORG, { w: 2.4, extra: 2.6, step: 60, hatch: false });
    s += S.T(x + w / 2, y + 60, 'MITGLIEDSCHAFT', { f: 'Oswald', s: 34, a: 'middle', c: P.white, ls: 1 });
    s += S.T(x + w / 2, y + 150, 'nur', { f: 'Caveat', s: 34, a: 'middle', c: P.ink });
    s += S.T(x + w / 2, y + 228, '24,90 €', { f: 'Anton', s: 72, a: 'middle', c: P.redD });
    s += S.T(x + w / 2, y + 262, 'im Monat*', { f: 'Caveat', s: 30, a: 'middle', c: P.ink });
    s += S.circ(x + w - 40, y + 120, 34, P.yellow, { w: 2, extra: 2 }) + S.T(x + w - 40, y + 128, 'TOP!', { f: 'Oswald', s: 18, a: 'middle', c: P.ink, r: 12 });
    s += S.T(x + w / 2, y + h - 52, '*Laufzeit 24 Monate', { f: 'Oswald', s: 14, a: 'middle', c: '#5a5040' });
    s += S.T(x + w / 2, y + h - 30, 'Kündigung nur schriftlich', { f: 'Oswald', s: 12, a: 'middle', c: '#5a5040' });
    return s;
  }

  function treadmill(S, x, y, k) {
    // x = rear end of the deck, y = floor; console on the right
    var s = '', L = 330 * k, dh = 34 * k;
    s += S.floorShadow(x + L / 2, y + 2, L * 0.6, 12, 0.35);
    s += S.box(x, y - dh - 10 * k, L, dh, '#2c2c2b', { w: 2.6, extra: 3, step: 60, hatch: 'b', hk: 0.4 });
    s += S.box(x + 10 * k, y - dh - 18 * k, L - 40 * k, 10 * k, '#1a1a19', { w: 1.6, extra: 1.6, step: 60, hatch: false });
    s += S.circ(x + 16 * k, y - 22 * k, 14 * k, '#5d5f5c', { w: 1.6, extra: 1.4 });
    var cx = x + L - 26 * k;
    s += S.line([[cx, y - dh - 10 * k], [cx + 36 * k, y - 330 * k]], { w: 12 * k, ta: 0.02, tb: 0.02, min: 0.8 }, '#4a4c4a');
    s += S.line([[cx - 4 * k, y - 300 * k], [cx - 110 * k, y - 296 * k]], { w: 8 * k, ta: 0.05, tb: 0.2, min: 0.6 }, '#7c7e7a');
    var con = U.xf(S.rect(-60 * k, -30 * k, 120 * k, 60 * k, 30, 0.6), cx + 30 * k, y - 360 * k, -18);
    s += S.shape(con, '#3b3d3c', { w: 2.4, extra: 2.6 });
    s += S.fillOnly(U.xf(S.rect(-44 * k, -18 * k, 88 * k, 30 * k, 30, 0.4), cx + 30 * k, y - 362 * k, -18), '#8fd0b5');
    return s;
  }

  // ── fg: reception desk ──
  function desk(S) {
    var s = '', x1 = 560, top = 770;
    var front = [[-20, top + 18], [x1, top + 18], [x1 + 14, 1100], [-20, 1100]];
    s += S.shape(front, '#5c5a55', { w: 3, extra: 3.4 });
    s += S.hatch(front, { ang: 90, gap: 14, w: 1.1, op: 0.2 });
    s += S.fillOnly([[-20, 860], [x1 + 4, 860], [x1 + 5, 878], [-20, 878]], ORG);
    s += S.T(250, 840, 'FIT AM ECK', { f: 'Oswald', s: 34, a: 'middle', c: '#e9e3d2', ls: 4 });
    s += S.box(-30, top, x1 + 50, 24, '#c9b48a', { w: 3, extra: 3.4, hatch: 'b', hk: 0.45 });
    // bowl of apples
    var bw = U.catmull([[40, top - 30], [52, top - 4], [110, top + 2], [168, top - 4], [180, top - 30]], 5, false);
    [[70, P.red], [100, P.greenL], [132, P.red], [160, '#c9a03c'], [88, P.redD], [118, P.red]].forEach(function (a, i) { s += S.circ(a[0], top - 34 - (i > 3 ? 18 : 0), 17, a[1], { w: 1.6, extra: 1.4 }); });
    s += S.shape(bw.concat([[180, top - 30]]), P.cream, { w: 2.2, extra: 2.4 });
    // rolled towels
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3 - i; j++) s += S.circ(250 + j * 46 + i * 23, top - 22 - i * 38, 21, [P.white, TEAL, P.white][j % 3], { w: 1.8, extra: 1.6 }) + S.circ(250 + j * 46 + i * 23, top - 22 - i * 38, 7, null, { w: 1.2, extra: 0.6 });
    // card reader + shaker
    s += S.box(420, top - 46, 60, 46, '#2b2b2a', { w: 2, extra: 2, step: 30, hatch: false }) + S.box(428, top - 40, 44, 14, '#8fd0b5', { w: 1, extra: 0.6, step: 20, hatch: false });
    s += S.bottle(520, top, 74, '#3e6d7a', { wr: 0.5, cap: '#2b2b2a', label: P.white });
    return s;
  }

  function build(S) {
    var bg = room(S) + darkWindow(S, 120) + mirror(S) + rack(S) + poster(S);
    // back wall behind reception: shake shelf + check-in sign
    bg += S.shelf(80, 470, 470, '#6b6a64');
    [110, 160, 210, 260, 320, 370, 420].forEach(function (bx, i) { bg += S.bottle(bx, 470, 70 + (i % 2) * 14, [TEAL, ORG, '#efe5cc', P.plum][i % 4], { wr: 0.42, cap: '#2b2b2a' }); });
    bg += S.box(130, 520, 260, 54, '#2b2b2a', { w: 2.2, extra: 2.4, step: 60, hatch: false }) + S.T(260, 557, 'CHECK-IN →', { f: 'Oswald', s: 28, a: 'middle', c: '#8fd0b5', ls: 2 });
    bg += treadmill(S, 1610, 880, 0.82) + treadmill(S, 1240, 905, 1.0);
    bg += S.clock(1700, 620, 40, 20, 5);
    return { bg: bg, fg: desk(S) };
  }

  A.define('gym', {
    seed: 204, build: build,
    slots: {
      reception: A.slot(250, 960, 0.98, { face: 1, behind: 'desk' }),   // behind the fg reception desk
      treadmill: A.slot(1390, 872, 0.95, { face: 1 }),                 // standing/running on the front treadmill
      left:      A.slot(720, 950, 1.0, { face: 1 }),
      center:    A.slot(960, 950, 1.0),
      right:     A.slot(1180, 955, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
