/* sunday-balcony — sunny Sunday morning on a small Altbau balcony: bright sky, view over red-tiled rooftops with
 * chimneys and dormers to a church tower (clock, belfry, green copper spire) whose bells ring (doodled bells + sound
 * arcs, ambient swing), birds, a wrought-iron railing with a geranium box, herbs and a lemon tree in pots, the open
 * French door with a light curtain, and a bistro table with coffee (ambient steam), croissant and an open diary.
 * Slots: chair (seated at the bistro table), railing (standing at the railing), left, center, right.
 * (Set A — see engine/sets/kit-a.js) */
(function (root) {
  'use strict';
  var A = root.SetKitA || require('./kit-a.js');
  var P = A.P, U = A.U;
  var RT = 588, FY = 792;                         // railing top, balcony floor line
  var IRON = '#2b322d', TERRA = '#c9714f', TERRAD = '#a85a3e', ROOF = '#b9533f';
  var TW = { x: 1060, w: 150 };                   // church tower

  function sky(S) {
    var s = S.fillOnly(S.rect(-20, -20, 1960, FY), S.linear([[0, '#9cc3d6'], [0.7, '#d7e6dc'], [1, '#f3e6c4']], 0, 0, 0, 1));
    s += S.glow(1620, 90, 520, 260, '#fff4cf', 0.75);
    [[700, 110, 150], [380, 70, 100], [1450, 200, 120]].forEach(function (c) {
      var pts = U.catmull([[c[0] - c[2], c[1] + 18], [c[0] - c[2] * 0.6, c[1] - 12], [c[0] - c[2] * 0.1, c[1] - 30], [c[0] + c[2] * 0.4, c[1] - 16], [c[0] + c[2], c[1] + 16]], 6, false);
      s += S.shape(pts, '#f8f2e2', { w: 1.4, extra: 1.2 });
    });
    return s;
  }

  function roofRow(S, y, h, col, n, seed, o) {
    o = o || {};
    var s = '', x = -60;
    while (x < 1980) {
      var w = S.rand(180, 300), pk = S.r() < 0.5, top = y - S.rand(0, h * 0.4);
      if (o.skip && x + w > o.skip[0] && x < o.skip[1]) { x += w; continue; }
      var pts = pk ? [[x, y + h], [x, top + h * 0.5], [x + w / 2, top], [x + w, top + h * 0.5], [x + w, y + h]] : [[x, y + h], [x + 20, top], [x + w - 20, top], [x + w, y + h]];
      s += S.shape(S.poly(pts, 30, 1), col, { w: o.w || 2, extra: o.w || 2 });
      if (o.tiles) {
        var L = [];
        for (var ty = top + 16; ty < y + h; ty += 16) L.push([[x + 10, ty], [x + w - 10, ty + 0.5]]);
        s += '<g clip-path="url(#' + S.clip(S.poly(pts, 30, 0)) + ')">' + S.lines(L, { w: 1.2, ta: 0.05, tb: 0.05, min: 0.4 }, P.ink, ' opacity=".35"') + '</g>';
      }
      if (S.r() < 0.6) { var cx = x + S.rand(40, w - 60); s += S.box(cx, top - 30 + (pk ? h * 0.3 : 0), 30, 52, o.chim || '#a8705a', { w: 1.8, extra: 1.6, step: 20, hatch: 'r', hk: 0.3 }); }
      if (o.dormer && S.r() < 0.5) { var dx = x + w * 0.35; s += S.box(dx, top + h * 0.3, 54, 50, '#e8dcc0', { w: 1.8, extra: 1.6, step: 20, hatch: false }) + S.box(dx + 12, top + h * 0.3 + 12, 30, 30, '#5f7480', { w: 1.2, extra: 0.8, step: 20, hatch: false }); }
      x += w - 10;
    }
    return s;
  }

  function tower(S) {
    var s = '', x = TW.x, w = TW.w, cx = x + w / 2, top = 230, base = 640;
    s += S.box(x, top, w, base - top, '#ddcfae', { w: 3, extra: 3.4, hatch: 'r', hk: 0.25 });
    // belfry louvres
    [x + 22, x + w - 56].forEach(function (lx) {
      var ar = U.catmull([[lx, top + 120], [lx, top + 70], [lx + 17, top + 52], [lx + 34, top + 70], [lx + 34, top + 120]], 5, false);
      s += S.shape(ar, '#3a3330', { w: 1.8, extra: 1.6 });
      s += S.lines([0, 1, 2, 3].map(function (k) { return [[lx + 4, top + 78 + k * 10], [lx + 30, top + 82 + k * 10]]; }), { w: 1.4, ta: 0.05, tb: 0.05 }, '#8a7e6a');
    });
    // clock
    s += S.clock(cx, top + 200, 38, 9, 58, { face: '#f1e8d0' });
    // spire (copper green)
    var sp = [[x - 10, top], [cx, top - 200], [x + w + 10, top]];
    s += S.shape(sp, '#7fa08a', { w: 3, extra: 3.4 }) + A.shadeSide(S, sp, [1, 0], 0.05, { gap: 6, op: 0.45 });
    s += S.box(x - 16, top - 6, w + 32, 14, '#c9b98c', { w: 2, extra: 2.2, step: 40 });
    s += S.seg(cx, top - 200, cx, top - 250, 3) + S.seg(cx - 16, top - 232, cx + 16, top - 232, 3) + S.circ(cx, top - 205, 7, P.mustard, { w: 1.2, extra: 0.8 });
    s += '<!--amb:bells-->';
    return s;
  }

  // ambient: two doodled bells swinging + sound arcs pulsing
  function bells(t) {
    var Sa = A.ambInk('sunday-balcony', 2), cx = TW.x + TW.w / 2, y = 300, s = '', ph = Math.sin(t * 2.6);
    [[-1, cx - 120], [1, cx + 120]].forEach(function (b, i) {
      var a = ph * 14 * (i ? -1 : 1), bx = b[1], by = y - 40 + i * 30;
      var bell = U.xf([[-14, -20], [14, -20], [18, 6], [26, 16], [-26, 16], [-18, 6]], bx, by, a);
      s += Sa.shape(U.catmull(bell, 4, true), P.mustard, { w: 2, extra: 2 }) + Sa.dot(bx + Math.sin(a * Math.PI / 180) * 24, by + 24, 5);
    });
    var k = (t * 0.8) % 1, L = [];
    for (var j = 0; j < 3; j++) {
      var r = 40 + ((k + j / 3) % 1) * 110;
      L.push(U.catmull([[cx - r * 0.9, y + 40 - r * 0.6], [cx - r, y + 40], [cx - r * 0.9, y + 40 + r * 0.5]], 4, false));
      L.push(U.catmull([[cx + r * 0.9, y + 40 - r * 0.6], [cx + r, y + 40], [cx + r * 0.9, y + 40 + r * 0.5]], 4, false));
    }
    s += Sa.lines(L, { w: 2.4, ta: 0.3, tb: 0.3, min: 0.2 }, P.ink, ' opacity=".4"');
    return s;
  }

  function view(S) {
    var s = sky(S);
    s += roofRow(S, 430, 90, '#b9b4a6', 0, 1, { w: 1.4, chim: '#a8a092' });           // far, hazy
    s += S.fillOnly(S.rect(-20, 420, 1960, 140), '#e7e3d2', ' opacity=".35"');
    s += tower(S);
    s += roofRow(S, 520, 120, '#c27860', 0, 2, { tiles: true, chim: '#9a5a44', skip: [TW.x - 40, TW.x + TW.w + 40] });
    s += roofRow(S, 640, 160, ROOF, 0, 3, { tiles: true, dormer: true, w: 2.4 });
    // birds
    var B = [];
    [[520, 240], [560, 220], [610, 255], [1360, 140]].forEach(function (b) { B.push([[b[0] - 14, b[1] - 6], [b[0], b[1]], [b[0] + 14, b[1] - 7]]); });
    s += S.lines(B, { w: 2.2, ta: 0.2, tb: 0.2, min: 0.4, smooth: 3 }, P.ink, ' opacity=".7"');
    return s;
  }

  function balcony(S) {
    var s = '';
    // floor: terracotta tiles, quiet in the subtitle zone
    s += S.floor(FY, { kind: 'tiles', gap: 150, rows: 5, fill: TERRA, fill2: '#c06a49', vx: 960, vy: 380, lop: 0.3 });
    s += S.fillOnly([[-20, FY], [1940, FY], [1940, FY + 24], [-20, FY + 24]], 'rgba(60,30,15,.18)');
    s += S.fillOnly([[-20, 900], [1940, 900], [1940, 1100], [-20, 1100]], 'rgba(80,40,20,.08)');
    // railing: posts + bars with curls
    s += S.box(-20, FY - 10, 1960, 18, TERRAD, { w: 2.6, extra: 3, step: 80 });
    var bars = [];
    for (var x = 230; x < 1940; x += 34) bars.push([[x, RT + 10], [x + 0.5, FY - 8]]);
    s += S.lines(bars, { w: 4, ta: 0.02, tb: 0.02, min: 0.8 }, IRON);
    var curls = '';
    for (x = 247; x < 1920; x += 68) {
      curls += S.line(U.catmull([[x - 17, RT + 60], [x - 6, RT + 40], [x + 6, RT + 48], [x, RT + 60], [x - 6, RT + 54]], 4, false), { w: 2.2, ta: 0.1, tb: 0.3, min: 0.4 }, IRON);
    }
    s += curls + S.seg(220, RT + 80, 1940, RT + 80, 3.4, IRON) + S.seg(220, FY - 30, 1940, FY - 30, 3.4, IRON);
    s += S.box(210, RT - 6, 1740, 18, IRON, { w: 2.4, extra: 2.6, step: 80 });
    s += S.line([[220, RT - 2], [1940, RT - 1]], { w: 2, ta: 0.05, tb: 0.05 }, '#6f7a70', ' opacity=".7"');
    // geranium box hung on the railing
    var gx = 330, gw = 300;
    for (var i = 0; i < 14; i++) {
      var fx = gx + 16 + i * 20, fy = RT - 34 - (i % 3) * 14;
      s += S.circ(fx, fy + 22, 16, i % 2 ? P.greenM : P.green, { w: 1.4, extra: 1.2 });
      if (i % 2) s += S.circ(fx, fy, 11, i % 4 === 1 ? P.red : '#d8577a', { w: 1.2, extra: 1 });
    }
    s += S.box(gx, RT - 20, gw, 52, TERRA, { w: 2.6, extra: 3, hatch: 'b', hk: 0.4 });
    return s;
  }

  function frenchDoor(S) {
    var s = '', x1 = 200;
    s += S.fillOnly(S.rect(-20, -20, x1 + 20, FY + 20, 40, 0.5), '#e7d3b0');
    s += S.hatch(S.rect(-20, -20, x1 + 20, FY + 20), { ang: 28, gap: 10, w: 1.2, op: 0.3 });
    s += S.line([[x1, -20], [x1 + 2, FY]], { w: 3.6, ta: 0.02, tb: 0.02, min: 0.6 });
    // door opening (dark room) + open leaf + curtain drifting out
    s += S.box(30, 120, 150, FY - 120, '#5b4a3c', { w: 2.6, extra: 2.8 });
    s += S.shape([[180, 120], [236, 140], [236, FY + 4], [180, FY]], '#e9e3d0', { w: 2.4, extra: 2.6 });
    s += S.fillOnly([[192, 170], [226, 182], [226, 520], [192, 512]], '#a9c4cc');
    var cu = U.catmull([[36, 126], [110, 126], [150, 300], [196, 500], [160, 566], [100, 530], [56, 380]], 6, true);
    s += S.shape(cu, 'rgba(244,236,214,.85)', { w: 1.6, extra: 1.4 }) + S.hatch(cu, { ang: 80, gap: 9, w: 1.1, op: 0.25 }) + S.lines([[[70, 140], [100, 420]], [[96, 140], [150, 470]]], { w: 1.6, ta: 0.2, tb: 0.4, min: 0.3 }, P.ink, ' opacity=".4"');
    return s;
  }

  function pots(S) {
    var s = '';
    s += S.plant(300, 900, 130, { n: 9, pot: TERRAD });                       // basil
    s += S.plant(420, 885, 100, { n: 11, pot: P.cream, leafW: 0.1, tall: 1.3, c: 2 }); // rosemary
    // lemon tree
    var x = 120, y = 930;
    s += S.floorShadow(x + 20, y + 4, 80, 10, 0.25);
    s += S.seg(x, y - 110, x + 4, y - 360, 5, P.woodD);
    s += S.shape(S.ellipse(x, y - 420, 105, 85, 30, 0.08), '#2f4c20', { w: 2, extra: 2 });
    for (var i = 0; i < 30; i++) {
      var a = i / 22 * Math.PI * 2, r = (i < 22 ? 70 : 20) + S.rand(0, 40);
      s += S.circ(x + Math.cos(a) * r * 0.9, y - 420 + Math.sin(a) * r * 0.75, 22, i % 3 ? P.green : P.greenM, { w: 1.4, extra: 1.2, ry: 14 });
    }
    [[x - 40, y - 400], [x + 50, y - 440], [x + 10, y - 360], [x - 70, y - 450]].forEach(function (l) { s += S.circ(l[0], l[1], 14, P.yellow, { w: 1.6, extra: 1.4, ry: 11 }); });
    var pot = S.poly([[x - 60, y - 110], [x + 60, y - 110], [x + 46, y], [x - 46, y]], 14, 0.8);
    s += S.shape(pot, TERRA, { w: 2.6, extra: 3 }) + S.hatch(pot, { ang: 75, gap: 6, w: 1.1, op: 0.45, cond: function (X) { return X > x + 14; } });
    return s;
  }

  function bistro(S) {
    var s = '', tx = 1660, top = 742;
    // chair (left of the table, facing it)
    var cx = 1440, seat = 790;
    s += S.floorShadow(cx, 906, 80, 10, 0.25) + S.floorShadow(tx, 906, 110, 12, 0.25);
    s += S.line(U.catmull([[cx - 50, seat], [cx - 60, 640], [cx - 30, 620], [cx - 10, 650], [cx - 22, seat]], 5, false), { w: 6, ta: 0.02, tb: 0.02, min: 0.8 }, IRON);
    s += S.box(cx - 64, seat, 128, 14, '#4f6b5a', { w: 2.2, extra: 2.4, step: 40 });
    s += S.seg(cx - 54, seat + 14, cx - 64, 902, 5, IRON) + S.seg(cx + 54, seat + 14, cx + 64, 902, 5, IRON);
    // round table
    s += S.seg(tx, top + 10, tx, 890, 6, IRON) + S.seg(tx - 60, 900, tx + 60, 900, 6, IRON);
    s += S.shape(S.ellipse(tx, top, 150, 26, 40, 0.01), '#4f6b5a', { w: 2.6, extra: 3 });
    s += S.shape(S.ellipse(tx, top + 8, 150, 26, 40, 0.01, 0, Math.PI), null, { w: 2, extra: 1.4 });
    // diary open
    var dl = [[tx - 140, top - 4], [tx - 30, top - 14], [tx - 20, top + 10], [tx - 132, top + 18]], dr = [[tx - 30, top - 14], [tx + 60, top - 22], [tx + 76, top - 2], [tx - 20, top + 10]];
    s += S.shape(dl, P.white, { w: 1.6, extra: 1.4 }) + S.shape(dr, P.white, { w: 1.6, extra: 1.4 });
    s += S.T(tx - 82, top + 2, 'Sonntag', { f: 'Caveat', s: 18, a: 'middle', c: P.ink, r: -5 });
    s += S.lines([[[tx - 120, top + 8], [tx - 40, top]], [[tx - 10, top - 6], [tx + 50, top - 12]], [[tx - 6, top + 2], [tx + 56, top - 4]]], { w: 1.2, ta: 0.1, tb: 0.2, min: 0.4 }, P.ink, ' opacity=".6"');
    s += S.seg(tx + 20, top + 14, tx + 74, top + 4, 3, P.red);
    // coffee + croissant + tiny vase
    s += S.shape(S.ellipse(tx + 100, top - 4, 34, 8, 20), P.white, { w: 1.4, extra: 1 }) + S.mug(tx + 100, top - 6, 40, 40, P.white, { top: '#4a2a18' });
    s += '<!--amb:steam-->';
    var cr = U.catmull([[tx - 160, top - 18], [tx - 140, top - 44], [tx - 100, top - 52], [tx - 60, top - 40], [tx - 46, top - 16], [tx - 100, top - 22]], 6, true);
    s += S.shape(cr, '#d9a24e', { w: 2, extra: 2 }) + S.lines([[[tx - 130, top - 40], [tx - 120, top - 20]], [[tx - 100, top - 48], [tx - 98, top - 22]], [[tx - 72, top - 42], [tx - 76, top - 20]]], { w: 1.4, ta: 0.1, tb: 0.1, min: 0.4 }, P.woodD);
    s += S.box(tx + 40, top - 70, 22, 56, '#9fc0c8', { w: 1.6, extra: 1.4, step: 20, hatch: false }) + S.circ(tx + 51, top - 84, 12, P.yellow, { w: 1.2, extra: 1 });
    return s;
  }

  function build(S) {
    var bg = view(S) + frenchDoor(S) + balcony(S) + pots(S) + bistro(S);
    // warm sunlight wash from the upper right
    bg += A.shaft([[1920, 0], [1920, 1080], [900, 1080], [1300, 0]], '#fff1c8', 0.1);
    return {
      bg: bg,
      amb: {
        bells: bells,
        steam: function (t) { var Sa = A.ambInk('sunday-balcony', 3 + Math.floor(t * 10)); return Sa.steam(1760, 690, 60, t, 0.4); }
      }
    };
  }

  A.define('sunday-balcony', {
    seed: 207, ambient: true, build: build,
    slots: {
      chair:   A.slot(1440, 900, 0.95, { face: 1, seated: true, seatY: 780 }),   // at the bistro table (diary, coffee)
      railing: A.slot(780, 915, 0.97, { face: 1 }),                              // standing at the railing, view over the roofs
      left:    A.slot(560, 940, 1.0, { face: 1 }),
      center:  A.slot(960, 945, 1.0),
      right:   A.slot(1240, 945, 1.0, { face: -1 })
    }
  });
})(typeof self !== 'undefined' ? self : this);
