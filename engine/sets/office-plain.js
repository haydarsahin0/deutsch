/* Set "office-plain" — neutral modern office for small talk with boss/colleagues: glass meeting room with whiteboard,
 * window strip over two workstations, coffee corner (big espresso machine, mugs, water cooler), team pinboard,
 * linear pendant lights, big plant. Cooler and tidier than SetKitA's "office-hot". Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var YH = 760, WALL = '#e3e1d6', BIRCH = '#d9bf8f', GREY = '#9aa0a0';

  function room(S) {
    var s = '';
    s += S.wall(-10, YH, WALL, { top: 40, op: 0.22 });
    s += S.floor(YH, { kind: 'tiles', vx: 960, vy: 380, gap: 170, rows: 5, fill: '#a9aea8', fill2: '#9da29c', lop: 0.25 });
    s += '<rect x="-10" y="860" width="1940" height="230" fill="' + S.linear([[0, '#a9aea8', 0], [1, '#a9aea8', 0.6]], 0, 0, 0, 1) + '"/>';
    s += S.skirting(YH, 10, '#f1efe6');
    // linear pendant lights
    [[520, 70], [1300, 60]].forEach(function (l) {
      s += S.seg(l[0] - 200, -10, l[0] - 200, l[1], 1.6) + S.seg(l[0] + 200, -10, l[0] + 200, l[1], 1.6);
      s += S.box(l[0] - 240, l[1], 480, 18, '#2c333b', { w: 2, extra: 2.2, step: 60 });
      s += '<path d="M' + (l[0] - 236) + ' ' + (l[1] + 18) + 'L' + (l[0] + 236) + ' ' + (l[1] + 18) + 'L' + (l[0] + 420) + ' ' + (l[1] + 420) + 'L' + (l[0] - 420) + ' ' + (l[1] + 420) + 'Z" fill="' + S.linear([[0, '#fffbe8', 0.3], [1, '#fffbe8', 0]], 0, 0, 0, 1) + '"/>';
    });
    return s;
  }

  function meetingRoom(S) {
    var s = '', x0 = 30, x1 = 560, y0 = 150;
    // interior (slightly darker), whiteboard, table edge, chairs
    s += S.fillOnly(S.rect(x0, y0, x1 - x0, YH - y0, 40, 0.5), '#d6d6cc');
    s += S.box(x0 + 60, y0 + 70, 330, 200, P.white, { w: 2.6, extra: 3 });
    s += S.T(x0 + 90, y0 + 112, 'Q4 – Ziele', { f: 'Caveat', s: 34, c: '#2f5d74' });
    s += S.line([[x0 + 90, y0 + 230], [x0 + 150, y0 + 190], [x0 + 210, y0 + 210], [x0 + 290, y0 + 140], [x0 + 350, y0 + 150]], { w: 3.4, ta: 0.1, tb: 0.2 }, P.red);
    s += S.lines([[[x0 + 90, y0 + 140], [x0 + 90, y0 + 240]], [[x0 + 90, y0 + 240], [x0 + 360, y0 + 240]]], { w: 2.4, ta: 0.05, tb: 0.1 }, '#2f5d74');
    [[x0 + 410, y0 + 100, P.yellow], [x0 + 440, y0 + 170, '#9fe08a'], [x0 + 400, y0 + 240, '#f08a7a']].forEach(function (n, i) { s += S.box(n[0], n[1], 52, 48, n[2], { w: 1.6, extra: 1.6, step: 20 }); });
    s += S.box(x0 + 40, YH - 170, 420, 20, BIRCH, { w: 2.4, extra: 2.6, step: 60 });
    [x0 + 100, x0 + 240, x0 + 380].forEach(function (cx) { s += S.shape(S.rrect(cx - 40, YH - 270, 80, 100, 14), '#4f6d86', { w: 2, extra: 2.2 }); });
    s += S.seg(x0 + 70, YH - 150, x0 + 70, YH - 10, 4, GREY) + S.seg(x0 + 430, YH - 150, x0 + 430, YH - 10, 4, GREY);
    // glass partition: frame, mullions, frosted band, reflections
    var glass = S.rect(x0, y0, x1 - x0, YH - y0, 40, 0.4);
    s += S.fillOnly(glass, 'rgba(200,222,224,.32)');
    s += S.fillOnly(S.rect(x0, y0 + 300, x1 - x0, 40, 40, 0.3), 'rgba(240,242,236,.75)');
    s += S.T((x0 + x1) / 2, y0 + 328, 'BESPRECHUNG', { f: 'Oswald', s: 22, a: 'middle', c: '#6b7a80', ls: 8 });
    s += S.hatch(glass, { ang: -55, gap: 9, w: 1.6, op: 0.35, color: '#ffffff', cond: function (X, Y) { var u = X + (Y - y0) * 0.7; return (u % 300) > 230 && (u % 300) < 260; } });
    s += S.box(x0 - 8, y0 - 10, x1 - x0 + 16, 14, GREY, { w: 2.4, extra: 2.4, step: 60 });
    [x0, (x0 + x1) / 2, x1].forEach(function (mx) { s += S.box(mx - 5, y0, 10, YH - y0, GREY, { w: 1.8, extra: 1.8, step: 60 }); });
    s += S.box(x1 - 70, y0 + 380, 8, 90, '#6b7a80', { w: 1.2, extra: 1, step: 20 });
    return s;
  }

  function windowsDesks(S) {
    var s = '';
    var view = (function () {
      var v = '', bx = 600, i = 0;
      while (bx < 1360) { var bw = 70 + S.r() * 80, bh = 120 + S.r() * 160; v += S.box(bx, 430 - bh, bw, bh + 10, ['#b7c2c2', '#a8b4b6', '#c2c9c4'][i % 3], { w: 1.4, extra: 1, step: 40 }); bx += bw + 10; i++; }
      return v;
    })();
    s += S.window(620, 110, 720, 300, { sky: S.linear([[0, '#bcd4dc'], [1, '#e6ece4']], 0, 0, 0, 1), panes: [3, 1], frame: '#f1efe6', view: view, sill: true, sillCol: '#f1efe6' });
    // two workstations against the wall (back, slightly smaller)
    [760, 1180].forEach(function (cx, i) {
      s += S.shape(S.rrect(cx - 60, 520, 120, 140, 18), '#2c333b', { w: 2.4, extra: 2.6 });         // chair back
      s += S.box(cx - 170, 610, 340, 16, BIRCH, { w: 2.4, extra: 2.6, step: 60, hatch: 'b', hk: 0.4 });
      s += S.seg(cx - 150, 626, cx - 150, YH, 4, GREY) + S.seg(cx + 150, 626, cx + 150, YH, 4, GREY);
      s += S.box(cx - 90, 486, 180, 112, '#2a2e36', { w: 2.4, extra: 2.6 });                         // monitor
      s += S.fillOnly(S.rect(cx - 80, 494, 160, 92, 30, 0.4), i ? '#cfe4ef' : '#e8e2d2');
      s += S.scribble(cx - 66, 516, 120, 3, 18, '#2c333b', 0.4);
      s += S.box(cx - 10, 598, 20, 12, '#2a2e36', { w: 1.2, extra: 1, step: 20 });
      s += S.mug(cx + 120, 610, 28, 34, i ? P.mustard : P.white);
      if (!i) s += S.plant(cx - 140, 610, 56, { pot: P.white, n: 6 });
    });
    return s;
  }

  function coffeeCorner(S) {
    var s = '', x0 = 1420, x1 = 1900, top = 560;
    // pinboard
    s += S.drop(1440, 100, 300, 220, 8, 10);
    s += S.box(1440, 100, 300, 220, '#c9a466', { w: 3, extra: 3.5 });
    s += S.stipple(S.rect(1450, 110, 280, 200), 260, { r: 2, op: 0.3, color: P.woodDD });
    s += S.note(1530, 170, 140, 80, -4, P.white, ['Team-Event', { t: 'Freitag!', c: P.red }], { fs: 24, top: 32, lh: 1.15 });
    s += S.note(1670, 180, 90, 80, 6, P.yellow, ['Kuchen', 'mitbringen'], { fs: 18, top: 30, lh: 1.2, pinCol: P.navy });
    s += S.note(1520, 270, 110, 60, 3, '#9fe08a', ['Kaffee leer?'], { fs: 18, top: 34 });
    s += S.box(1650, 250, 76, 56, '#8fb3a6', { w: 1.6, extra: 1.4, step: 20 });
    // counter
    s += S.box(x0, top + 20, x1 - x0 + 40, YH - top - 34, '#f1efe6', { w: 3, extra: 3.5 });
    for (var d = 0; d < 3; d++) s += S.box(x0 + 14 + d * 166, top + 44, 150, YH - top - 70, '#e6e3d8', { w: 2, extra: 2.2, hatch: 'r', hk: 0.12, hop: 0.3 });
    s += S.box(x0 - 10, top, x1 - x0 + 60, 22, BIRCH, { w: 3, extra: 3.4, step: 60, hatch: 'b', hk: 0.5 });
    // espresso machine
    var mx = 1560;
    s += S.box(mx - 90, top - 190, 180, 190, '#b9bcb4', { w: 3, extra: 3.5, hatch: 'r', hk: 0.25 });
    s += S.box(mx - 90, top - 190, 180, 40, '#2c333b', { w: 2.4, extra: 2.6, step: 40 });
    s += S.box(mx - 60, top - 130, 120, 40, '#1d1c28', { w: 1.6, extra: 1.6, step: 30 });
    s += S.T(mx, top - 102, 'BEREIT', { f: 'Oswald', s: 16, a: 'middle', c: '#9fe08a', ls: 2 });
    s += S.box(mx - 20, top - 84, 40, 18, '#2c333b', { w: 1.6, extra: 1.6, step: 20 });
    s += S.mug(mx, top - 4, 34, 40, P.red);
    s += S.box(mx - 70, top - 16, 140, 12, '#6b7a80', { w: 1.4, extra: 1.4, step: 30 });
    // mug row + sugar jar
    [[1690, P.white], [1730, P.navy], [1770, P.mustard]].forEach(function (m) { s += S.mug(m[0], top, 30, 36, m[1]); });
    s += S.box(1810, top - 50, 40, 50, 'rgba(226,232,222,.9)', { w: 1.8, extra: 1.8, step: 20 });
    // water cooler at the far right edge
    s += S.box(1870, 440, 90, 320, '#e6e3d8', { w: 2.6, extra: 3 });
    s += S.shape(S.rrect(1878, 300, 74, 140, 24), 'rgba(160,200,215,.75)', { w: 2.4, extra: 2.6 });
    // big plant in front of the counter's left end
    s += S.plant(1380, YH + 30, 220, { pot: '#e6e3d8', n: 11, tall: 1.2, leafW: 0.24 });
    return s;
  }

  K.define('office-plain', {
    seed: 179,
    slots: {
      left: K.slot(560, 988, 1.08, { face: 1 }), center: K.slot(960, 990, 1.08), right: K.slot(1360, 988, 1.08, { face: -1 }),
      coffee: K.slot(1640, 980, 1.06, { face: -1 }),       // at the coffee machine
      glass: K.slot(300, 990, 1.08, { face: 1 }),          // in front of the meeting room
      back: K.slot(960, 830, 0.84, { face: 1 })            // passing by the workstations
    },
    build: function () {
      return {
        bg: function (S) {
          return room(S) + meetingRoom(S) + windowsDesks(S) + coffeeCorner(S) +
            '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.6, '#2a2418', 0], [1, '#2a2418', 0.22]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
