/* Set "exam-room" — exam hall in one-point perspective, seen from the front: rows of single desks with exam sheets
 * (and the chairs behind them) recede to the back wall with the chalkboard ("Prüfung Deutsch B2"), a big wall clock
 * and a red "RUHE BITTE!" sign; windows on the left wall, door + notices on the right wall, fluorescent panels above,
 * bags piled along the back wall. The two front-row desks are the FOREGROUND layer (seated examinees desk-left /
 * desk-right); proctor walks the aisle further back. Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var VX = 960, VY = 400, BW = { x0: 330, x1: 1590, y0: 70, y1: 560 };   // vanishing point, back wall rect
  var WALL = '#e4dcc4', SIDE = '#d6cdb2', FLOOR = '#a3ab92';

  // floor point for world x (units) at depth d (1 = back wall); px per metre there
  function fy(d) { return VY + (BW.y1 - VY) / d; }
  function fx(X, d) { return VX + X * 95 / d; }
  function ppm(d) { return 102 / d; }
  // point on the left/right wall plane: x on screen, h = 0 (floor) … 1 (ceiling)
  function wallY(x, h, right) {
    var bx = right ? BW.x1 : BW.x0, t = (x - VX) / (bx - VX);
    var yF = VY + (BW.y1 - VY) * t, yC = VY + (BW.y0 - VY) * t;
    return yF + (yC - yF) * h;
  }

  function room(S) {
    var s = '';
    // ceiling
    var ceil = [[-20, -20], [1940, -20], [BW.x1, BW.y0], [BW.x0, BW.y0]];
    s += S.fillOnly(ceil, '#ece6d2');
    // fluorescent panels in perspective
    [0.36, 0.5, 0.75].forEach(function (d) {
      [-1.6, 1.6].forEach(function (X) {
        var y = VY - (VY - BW.y0) / d, x = fx(X, d), w = 60 / d, h = 10 / d;
        if (y < -10) return;
        var pts = [[x - w, y - h], [x + w, y - h], [x + w * 1.05, y + h], [x - w * 1.05, y + h]];
        s += S.shape(pts, '#f8f2dc', { w: 1.8, extra: 1.6 });
        s += S.glow(x, y + 30, w * 2, 60 / d, '#fff8dc', 0.4);
      });
    });
    s += S.hatch(ceil, { ang: 0, gap: 9, w: 1.1, op: 0.18 });
    // left wall + windows
    var lw = [[-20, wallY(-20, 1)], [BW.x0, BW.y0], [BW.x0, BW.y1], [-20, wallY(-20, 0)]];
    s += S.fillOnly(lw, SIDE);
    [[20, 150], [190, 290]].forEach(function (w) {
      var q = [[w[0], wallY(w[0], 0.82)], [w[1], wallY(w[1], 0.82)], [w[1], wallY(w[1], 0.36)], [w[0], wallY(w[0], 0.36)]];
      s += S.shape(q, '#cfe0e0', { w: 3, extra: 3 });
      var mx = (w[0] + w[1]) / 2;
      s += S.line([[mx, wallY(mx, 0.82)], [mx, wallY(mx, 0.36)]], { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, P.white);
      s += S.hatch(q, { ang: -50, gap: 9, w: 1.4, op: 0.35, color: '#ffffff', cond: function (X, Y) { return ((X + Y) % 140) < 40; } });
      // light falling in
      s += '<path d="M' + w[0] + ' ' + U.f1(wallY(w[0], 0.36)) + 'L' + w[1] + ' ' + U.f1(wallY(w[1], 0.36)) + 'L' + (w[1] + 520) + ' 1080L' + (w[0] + 240) + ' 1080Z" fill="#fff6d8" opacity=".12"/>';
    });
    s += S.hatch(lw, { ang: 80, gap: 9, w: 1.1, op: 0.25 });
    // right wall: door + notice board
    var rw = [[1940, wallY(1940, 1, true)], [BW.x1, BW.y0], [BW.x1, BW.y1], [1940, wallY(1940, 0, true)]];
    s += S.fillOnly(rw, SIDE);
    var d0 = 1640, d1 = 1760;
    var door = [[d0, wallY(d0, 0.72, true)], [d1, wallY(d1, 0.72, true)], [d1, wallY(d1, 0, true)], [d0, wallY(d0, 0, true)]];
    s += S.shape(door, '#7a5236', { w: 3, extra: 3.4 });
    s += S.hatch(door, { ang: 80, gap: 8, w: 1.2, op: 0.4 });
    s += S.circ(d0 + 16, wallY(d0 + 16, 0.33, true), 6, '#c9a24a', { w: 1.4, extra: 1 });
    var nb = [[1820, wallY(1820, 0.8, true)], [1930, wallY(1930, 0.8, true)], [1930, wallY(1930, 0.5, true)], [1820, wallY(1820, 0.5, true)]];
    s += S.shape(nb, '#c9a466', { w: 2.4, extra: 2.6 });
    s += S.hatch(rw, { ang: 100, gap: 9, w: 1.1, op: 0.25 });
    // back wall
    var bw = S.rect(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0, 60, 0.8);
    s += S.shape(bw, WALL, { w: 2.4, extra: 1.6 });
    s += S.box(BW.x0, BW.y1 - 60, BW.x1 - BW.x0, 60, '#cfc5aa', { w: 1.8, extra: 1.6, step: 60 });
    // floor
    var fl = [[-20, wallY(-20, 0)], [BW.x0, BW.y1], [BW.x1, BW.y1], [1940, wallY(1940, 0, true)], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(fl, FLOOR);
    var L = [];
    for (var X = -14; X <= 14; X += 1) L.push([[fx(X, 1), BW.y1], [fx(X, 0.24), fy(0.24)]]);
    [0.8, 0.62, 0.48, 0.38, 0.31, 0.26].forEach(function (d) { L.push([[-20, fy(d)], [1940, fy(d)]]); });
    s += '<g clip-path="url(#' + S.clip(fl) + ')">' + S.lines(L, { w: 1.4, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".3"') + '</g>';
    s += '<rect x="-10" y="880" width="1940" height="210" fill="' + S.linear([[0, FLOOR, 0], [1, FLOOR, 0.6]], 0, 0, 0, 1) + '"/>';
    // corner lines
    s += S.line([[BW.x0, BW.y0], [-20, wallY(-20, 1)]], { w: 2.6, ta: 0.02, tb: 0.02 }) + S.line([[BW.x0, BW.y1], [-20, wallY(-20, 0)]], { w: 2.6, ta: 0.02, tb: 0.02 });
    s += S.line([[BW.x1, BW.y0], [1940, wallY(1940, 1, true)]], { w: 2.6, ta: 0.02, tb: 0.02 }) + S.line([[BW.x1, BW.y1], [1940, wallY(1940, 0, true)]], { w: 2.6, ta: 0.02, tb: 0.02 });
    return s;
  }

  function backWallStuff(S) {
    var s = '';
    // chalkboard
    var bx = 560, by = 250, bw = 800, bh = 220;
    s += S.drop(bx, by, bw, bh, 8, 10);
    s += S.box(bx, by, bw, bh, '#8a6040', { w: 3, extra: 3.5 });
    s += S.fillOnly(S.rect(bx + 14, by + 14, bw - 28, bh - 28, 40, 0.5), '#28322c');
    s += S.T(bx + bw / 2, by + 74, 'Prüfung Deutsch B2', { f: 'Caveat', s: 52, a: 'middle', c: '#eee8d6' });
    s += S.line([[bx + 230, by + 88], [bx + 570, by + 84]], { w: 3.4, ta: 0.15, tb: 0.3 }, '#f2cf5b');
    s += S.T(bx + bw / 2, by + 136, 'Beginn 9:00 · Ende 11:00', { f: 'Caveat', s: 36, a: 'middle', c: '#eee8d6' });
    s += S.T(bx + bw / 2, by + 182, 'Handys aus!', { f: 'Caveat', s: 36, a: 'middle', c: '#f08a7a' });
    s += S.box(bx - 8, by + bh - 6, bw + 16, 14, '#6b4a2f', { w: 2, extra: 2.2, step: 60 });
    // clock: fünf vor elf
    s += S.clock(960, 160, 62, 10, 55, { sec: 12 });
    // RUHE BITTE sign
    s += S.drop(1400, 120, 170, 96, 8, 10);
    s += S.box(1400, 120, 170, 96, P.red, { w: 3, extra: 3.5 });
    s += S.shape(S.rect(1408, 128, 154, 80, 30, 0.4), null, { w: 1.4, extra: 0.4, color: P.cream });
    s += S.T(1485, 164, 'RUHE', { f: 'Fraunces', s: 34, a: 'middle', c: P.cream });
    s += S.T(1485, 198, 'BITTE!', { f: 'Oswald', s: 24, a: 'middle', c: P.cream, ls: 4 });
    // bag pile along the back wall + sign
    s += S.note(440, 200, 150, 70, -2, P.paperL, ['Taschen hier', 'abstellen'], { fs: 20, top: 28, lh: 1.15, tape: true });
    var bags = [[370, '#3c4a5c'], [420, P.red], [470, '#5a6a3a'], [520, P.mustard], [1440, P.teal], [1500, '#6b4a3a']];
    bags.forEach(function (b, i) {
      var x = b[0], y = BW.y1 + 4, w = 44 + (i % 2) * 10, h = 54 + (i % 3) * 8;
      var bag = U.catmull([[x - w / 2, y], [x - w / 2 - 2, y - h * 0.6], [x - w * 0.3, y - h], [x + w * 0.3, y - h], [x + w / 2 + 2, y - h * 0.6], [x + w / 2, y]], 4, false);
      s += S.shape(bag, b[1], { w: 2, extra: 2.2 });
      s += S.line(U.catmull([[x - w * 0.2, y - h], [x, y - h - 16], [x + w * 0.2, y - h]], 4, false), { w: 3, ta: 0.05, tb: 0.05 });
      s += S.hatch(bag, { ang: 70, gap: 5, w: 1, op: 0.4, cond: function (X) { return X > x + 6; } });
    });
    return s;
  }

  // a single exam desk at world X, depth d (+ chair behind it); front = true → bigger front panel (fg)
  function desk(S, X, d, o) {
    o = o || {};
    var x = fx(X, d), y = fy(d), m = ppm(d), s = '';
    var w = 0.62 * m * (o.wm || 1), dep = 0.1 * m, h = 0.74 * m;
    if (o.top) h = o.top;
    // chair behind (further back → slightly smaller, higher on screen)
    if (!o.noChair) {
      var cm = ppm(d + 0.05), cy = fy(d + 0.05), cx = fx(X, d + 0.05);
      s += S.line([[cx - 0.18 * cm, cy], [cx - 0.18 * cm, cy - 0.85 * cm]], { w: Math.max(2, 0.03 * cm), ta: 0.02, tb: 0.02, min: 0.8 }, '#5a5a62');
      s += S.line([[cx + 0.18 * cm, cy], [cx + 0.18 * cm, cy - 0.85 * cm]], { w: Math.max(2, 0.03 * cm), ta: 0.02, tb: 0.02, min: 0.8 }, '#5a5a62');
      s += S.box(cx - 0.21 * cm, cy - 0.86 * cm, 0.42 * cm, 0.16 * cm, '#4f6d86', { w: Math.max(1.4, 0.012 * cm), extra: 1.6, step: 30 });
    }
    // legs
    var lw = Math.max(2, 0.028 * m);
    [[-w / 2 + lw, 0], [w / 2 - lw, 0]].forEach(function (l) { s += S.line([[x + l[0], y - h], [x + l[0], y]], { w: lw, ta: 0.02, tb: 0.02, min: 0.8 }, '#5a5a62'); });
    // top surface + edge
    var tp = [[x - w / 2 + dep * 0.3, y - h - dep], [x + w / 2 - dep * 0.3, y - h - dep], [x + w / 2, y - h], [x - w / 2, y - h]];
    s += S.shape(tp, '#d8b27a', { w: Math.max(1.4, 0.014 * m), extra: 1.6 });
    s += S.box(x - w / 2, y - h, w, Math.max(4, 0.035 * m), '#a07650', { w: Math.max(1.2, 0.012 * m), extra: 1.4, step: 40 });
    if (o.panel) s += S.box(x - w / 2 + lw, y - h + 0.035 * m, w - 2 * lw, o.panel, '#c9a466', { w: 2.2, extra: 2.6, hatch: 'r', hk: 0.15, hop: 0.35 });
    // exam sheet + pencil
    var px = x - w * 0.18, sw = w * 0.36, sy = y - h - dep * 0.25;
    s += S.fillOnly([[px - sw / 2 + 2, sy - dep * 0.55], [px + sw / 2 - 2, sy - dep * 0.55], [px + sw / 2, sy], [px - sw / 2, sy]], P.white);
    s += S.line([[x + w * 0.12, sy - dep * 0.3], [x + w * 0.32, sy - dep * 0.45]], { w: Math.max(1.5, 0.015 * m), ta: 0.05, tb: 0.4 }, P.mustard);
    if (o.big) {
      // readable top sheet on the front desks
      s += S.T(px, sy - dep * 0.18, 'Aufgabe 1', { f: 'Caveat', s: 20, a: 'middle', c: P.ink, op: 0.8 });
    }
    return s;
  }

  K.define('exam-room', {
    seed: 109,
    slots: {
      'desk-left': K.slot(560, 1000, 1.0, { face: 1, seated: true, seatY: 888 }),
      'desk-right': K.slot(1360, 1000, 1.0, { face: -1, seated: true, seatY: 888 }),
      proctor: K.slot(1340, 724, 0.66, { face: -1 }),          // walking the aisle between the rows
      left: K.slot(150, 1004, 1.08, { face: 1 }),
      center: K.slot(960, 1004, 1.06),                         // front aisle, between the front desks
      right: K.slot(1780, 1004, 1.08, { face: -1 })
    },
    build: function () {
      return {
        bg: function (S) {
          var s = room(S) + backWallStuff(S);
          [0.86, 0.68, 0.54, 0.43].forEach(function (d) { [-3, -1, 1, 3].forEach(function (X) { s += desk(S, X, d); }); });
          s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.6, '#3a2a18', 0], [1, '#3a2a18', 0.25]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
          return s;
        },
        // front row: desk top at y≈850 so seated characters show head + shoulders
        fg: function (S) {
          return S.floorShadow(560, 1004, 220, 16, 0.25) + S.floorShadow(1360, 1004, 220, 16, 0.25) +
            desk(S, -1.124, 0.267, { top: 150, noChair: true, panel: 96, big: true, wm: 1.45 }) + desk(S, 1.124, 0.267, { top: 150, noChair: true, panel: 96, big: true, wm: 1.45 });
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
