/* Set "university" — lecture hall seen from the front corner: on the left the front wall with sliding green boards,
 * a big projection screen (slide "Konjunktiv II") lit by the ceiling projector, lectern with microphone; on the right
 * the tiered rows of folding seats rising to the back (green EXIT sign, high windows). The nearest desk row is the
 * FOREGROUND layer (seated students facing the lecturer). slots.screen = text area on the projection screen.
 * Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var FLOOR = 900, WOOD = '#b98a52', SEATC = '#4f6d86';
  var SCR = [[70, 90], [620, 150], [620, 500], [70, 540]]; // projection screen (slight perspective)

  function hall(S) {
    var s = '';
    // walls: front wall (left) + back wall above the tiers
    s += S.fillOnly([[-20, -20], [1940, -20], [1940, FLOOR], [-20, FLOOR]], '#ddd5bd');
    s += S.fillOnly([[700, -20], [1940, -20], [1940, 440], [700, 440]], '#d2c8ac');
    s += S.hatch([[700, -20], [1940, -20], [1940, 440], [700, 440]], { ang: 80, gap: 10, w: 1.1, op: 0.2 });
    s += S.line([[700, -20], [700, 440]], { w: 3, ta: 0.02, tb: 0.02 });
    // acoustic wood slats on the front wall
    var L = [];
    for (var x = 10; x < 690; x += 22) L.push([[x, 560], [x, FLOOR - 10]]);
    s += S.fillOnly([[-20, 560], [700, 560], [700, FLOOR], [-20, FLOOR]], '#c9a466');
    s += S.lines(L, { w: 2, ta: 0.05, tb: 0.05 }, P.woodD, ' opacity=".7"');
    // high windows on the back wall
    for (var i = 0; i < 4; i++) s += S.window(780 + i * 290, 60, 200, 110, { sky: S.linear([[0, '#b5cdd2'], [1, '#e2e6d6']], 0, 0, 0, 1), panes: [2, 1], frame: '#ece6d2', sill: false, t: 12 });
    // EXIT sign + clock
    s += S.box(1760, 210, 120, 50, '#2f7a4a', { w: 2.4, extra: 2.6 });
    s += S.T(1820, 244, 'AUSGANG', { f: 'Oswald', s: 20, a: 'middle', c: P.white, ls: 2 });
    s += S.clock(1640, 240, 40, 10, 15, {});
    // sliding boards (two, staggered) under the screen
    s += S.box(30, 300, 640, 290, '#5e3f22', { w: 3, extra: 3.4 });
    s += S.fillOnly(S.rect(44, 314, 612, 262, 40, 0.5), '#2b3a30');
    s += S.T(90, 560, 'würde · hätte · wäre', { f: 'Caveat', s: 34, c: '#eee8d6', op: 0.75 });
    s += S.box(30, 586, 640, 14, '#7a5236', { w: 2, extra: 2.2, step: 60 });
    // projection screen + beam
    s += S.shape(SCR, '#f4f0e2', { w: 3, extra: 3 });
    s += S.box(50, 70, 590, 22, '#4a4f5a', { w: 2.4, extra: 2.6, step: 60 });
    s += S.T(345, 230, 'Vorlesung 7', { f: 'Oswald', s: 22, a: 'middle', c: '#2f5d74', ls: 4, op: 0.7 });
    s += S.T(345, 300, 'Konjunktiv II', { f: 'Fraunces', s: 54, a: 'middle', c: P.ink, op: 0.75 });
    s += S.scribble(170, 360, 340, 3, 30, P.ink, 0.35);
    s += S.hatch(SCR, { ang: 0, gap: 6, w: 1, op: 0.12, cond: function (X) { return X > 560; } });
    s += '<path d="M1180 30L70 92L70 540L1150 52Z" fill="' + S.linear([[0, '#fff8dc', 0.22], [1, '#fff8dc', 0.04]], 1, 0, 0, 0) + '"/>';
    s += S.box(1130, 18, 90, 40, '#d6d0be', { w: 2.4, extra: 2.6, step: 30 });
    s += S.circ(1140, 40, 12, '#fff8dc', { w: 1.6, extra: 1.2 });
    s += S.seg(1175, -20, 1175, 18, 4, '#4a4f5a');
    // floor in front
    s += S.fillOnly([[-20, FLOOR], [1940, FLOOR], [1940, 1100], [-20, 1100]], '#8f8a78');
    s += S.line([[-20, FLOOR], [1940, FLOOR]], { w: 4, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.hatch([[-20, FLOOR], [1940, FLOOR], [1940, 1100], [-20, 1100]], { ang: 0, gap: 8, w: 1, op: 0.25, cond: function (X, Y) { return Y < 960; } });
    return s;
  }

  // one tier: long desk rail with folding seats behind it, rising toward the back
  function tier(S, y, x0, k, students) {
    var s = '', h = 90 * k;
    // riser step
    s += S.fillOnly([[x0, y], [1940, y], [1940, y + 120 * k], [x0, y + 120 * k]], '#a39a82');
    s += S.line([[x0, y], [1940, y]], { w: 2.4, ta: 0.02, tb: 0.02 });
    // seats (backs visible above the desk)
    for (var x = x0 + 60 * k; x < 1940; x += 110 * k) {
      s += S.shape(S.rrect(x - 34 * k, y - h - 40 * k, 68 * k, 70 * k, 10 * k), SEATC, { w: 1.8, extra: 2 });
    }
    // desk rail
    s += S.box(x0, y - h + 20 * k, 1960 - x0, 18 * k, WOOD, { w: 2.2, extra: 2.4, step: 60, hatch: 'b', hk: 0.4 });
    s += S.box(x0 + 8, y - h + 38 * k, 1950 - x0, h - 38 * k, '#c9a466', { w: 2, extra: 2.2, step: 60 });
    var L = [];
    for (var xx = x0 + 40; xx < 1940; xx += 70 * k) L.push([[xx, y - h + 42 * k], [xx, y - 4]]);
    s += S.lines(L, { w: 1.2, ta: 0.05, tb: 0.05 }, P.woodD, ' opacity=".5"');
    // a few things on the desk: laptops, coffee, bags
    (students || []).forEach(function (sx, i) {
      if (i % 2) s += S.box(sx - 30 * k, y - h - 10 * k, 60 * k, 30 * k, '#b9bcb4', { w: 1.6, extra: 1.6, step: 20 });
      else s += S.mug(sx, y - h + 20 * k, 26 * k, 30 * k, [P.red, P.mustard, P.white][i % 3]);
    });
    return s;
  }

  function lectern(S, x) {
    var s = S.floorShadow(x, FLOOR + 6, 90, 12, 0.25);
    var body = S.poly([[x - 70, FLOOR], [x + 70, FLOOR], [x + 84, FLOOR - 230], [x - 84, FLOOR - 230]], 30, 0.8);
    s += S.shape(body, '#7a5236', { w: 3, extra: 3.4 });
    s += S.hatch(body, { ang: 85, gap: 8, w: 1.2, op: 0.4, cond: function (X) { return X > x + 30; } });
    s += S.box(x - 96, FLOOR - 252, 192, 26, '#5e3f22', { w: 2.6, extra: 3, step: 40 });
    s += S.seed(x, FLOOR - 140, 54, -90, '#c9a24a');
    s += S.line(U.catmull([[x + 60, FLOOR - 250], [x + 70, FLOOR - 300], [x + 40, FLOOR - 330]], 5, false), { w: 3, ta: 0.05, tb: 0.05 });
    s += S.circ(x + 36, FLOOR - 334, 9, '#2c333b', { w: 1.4, extra: 1 });
    return s;
  }

  function frontRow(S) {
    var s = '', x0 = 860, top = 846;
    s += S.box(x0 - 10, top, 1960 - x0, 24, WOOD, { w: 3, extra: 3.4, step: 60, hatch: 'b', hk: 0.4 });
    s += S.box(x0, top + 24, 1950 - x0, 1010 - top - 24, '#c9a466', { w: 3, extra: 3.4, step: 60 });
    var L = [];
    for (var x = x0 + 50; x < 1940; x += 90) L.push([[x, top + 30], [x, 1004]]);
    s += S.lines(L, { w: 1.6, ta: 0.05, tb: 0.05 }, P.woodD, ' opacity=".55"');
    s += '<rect x="' + x0 + '" y="' + (top + 24) + '" width="' + (1960 - x0) + '" height="' + (1010 - top - 24) + '" fill="' + S.linear([[0, '#000', 0], [1, '#000', 0.22]], 0, 0, 0, 1) + '"/>';
    // things on the front desk: notebook, pen, a laptop back
    s += S.fillOnly([[1180, top - 2], [1300, top - 6], [1312, top + 4], [1176, top + 6]], P.white);
    s += S.line([[1320, top - 2], [1380, top - 10]], { w: 3.4, ta: 0.05, tb: 0.4 }, P.navy);
    s += S.box(1600, top - 90, 140, 88, '#b9bcb4', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.3 });
    s += S.seed(1670, top - 46, 26, -90, '#8f928b');
    return s;
  }

  K.define('university', {
    seed: 149,
    slots: {
      lecturer: K.slot(470, 960, 1.0, { face: 1 }),                                     // front, next to the lectern
      student: K.slot(1100, 1000, 1.0, { face: -1, seated: true, seatY: 888 }),          // front row (fg desk)
      'student-2': K.slot(1470, 1000, 1.0, { face: -1, seated: true, seatY: 888 }),
      left: K.slot(470, 960, 1.0, { face: 1 }), center: K.slot(730, 985, 1.04, { face: -1 }), right: K.slot(1470, 1000, 1.0, { face: -1, seated: true, seatY: 888 }),
      screen: { x: 110, y: 170, w: 470, h: 300 }                                        // text area on the projection screen
    },
    build: function () {
      return {
        bg: function (S) {
          var s = hall(S);
          s += tier(S, 440, 760, 0.55, [1100, 1420, 1700]) + tier(S, 560, 740, 0.68, [980, 1500]) + tier(S, 700, 720, 0.82, [1240, 1780]);
          s += lectern(S, 700);
          s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.55, '#2a2018', 0], [1, '#2a2018', 0.28]], { cx: '45%', cy: '45%', r: '75%' }) + '"/>';
          return s;
        },
        fg: function (S) { return frontRow(S); }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
