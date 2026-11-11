/* Set "street-day" — generic German street by day, seen across the road: a row of Altbau facades (stucco cornices,
 * window pediments, flower boxes, dormers), ground-floor Bäckerei with striped awning + hanging pretzel, Café, house
 * door with number, cobbled street, kerb, near sidewalk with a lamppost (street sign, orange bin) and a leaning bicycle,
 * a street tree on the left. Characters stand on the near sidewalk; "across" is a small slot on the far pavement.
 * Variants: '' · 'evening' (warm low sun, lit shop windows). Illustrator B · see engine/sets/kit-b.js
 */
(function (root) {
  'use strict';
  var K = root.SetKitB || require('./kit-b.js');
  var P = K.P, U = K.U;
  var GF = 690, CURB = 806; // facade ground line, kerb

  var HOUSES = [
    { x: -30, w: 400, top: 150, col: '#d9b26a', roof: '#8a4e3a', shop: 'door', no: '12' },
    { x: 370, w: 420, top: 120, col: '#e8dcc0', roof: '#6b4a3a', shop: 'baker' },
    { x: 790, w: 360, top: 170, col: '#a9b48e', roof: '#7b5a4a', shop: 'door', no: '16' },
    { x: 1150, w: 420, top: 132, col: '#d99a82', roof: '#6b4a3a', shop: 'cafe' },
    { x: 1570, w: 390, top: 160, col: '#aab7b8', roof: '#5a4a44', shop: 'door', no: '20' }
  ];

  function sky(S, evening) {
    var s = S.fillOnly([[-20, -20], [1940, -20], [1940, GF], [-20, GF]], S.linear(evening ? [[0, '#e9b98a'], [1, '#f3dcb4']] : [[0, '#a9c6cf'], [1, '#dfe6d6']], 0, 0, 0, 1));
    [[260, 70, 1], [900, 50, 1.3], [1500, 84, 0.9]].forEach(function (c) {
      var k = c[2], pts = U.catmull([[c[0] - 90 * k, c[1] + 20], [c[0] - 70 * k, c[1] - 10], [c[0] - 20 * k, c[1] - 24], [c[0] + 30 * k, c[1] - 30], [c[0] + 80 * k, c[1] - 6], [c[0] + 100 * k, c[1] + 20]], 5, true);
      s += S.shape(pts, '#f4eedf', { w: 1.8, extra: 1.4 });
      s += S.hatch(pts, { ang: 0, gap: 6, w: 1, op: 0.3, cond: function (X, Y) { return Y > c[1] + 8; } });
    });
    return s;
  }

  function house(S, h, evening) {
    var s = '', x = h.x, w = h.w, top = h.top;
    // roof with dormers + chimney
    var roof = S.poly([[x - 6, top], [x + w + 6, top], [x + w - 30, top - 70], [x + 30, top - 70]], 30, 1);
    s += S.box(x + w * 0.7, top - 120, 30, 60, '#7b4a3a', { w: 2, extra: 2, step: 20 });
    s += S.shape(roof, h.roof, { w: 2.6, extra: 3 });
    s += S.hatch(roof, { ang: 0, gap: 7, w: 1.1, op: 0.4 });
    [x + w * 0.25, x + w * 0.62].forEach(function (dx) {
      s += S.shape(S.poly([[dx - 26, top - 4], [dx + 26, top - 4], [dx + 26, top - 44], [dx, top - 66], [dx - 26, top - 44]], 14, 0.6), P.cream, { w: 2, extra: 2 });
      s += S.box(dx - 13, top - 42, 26, 32, '#4a5a66', { w: 1.4, extra: 1, step: 20 });
    });
    // facade body
    var body = S.rect(x, top, w, GF - top, 40, 1);
    s += S.shape(body, h.col, { w: 3, extra: 3.5 });
    s += S.hatch(body, { ang: 70, gap: 9, w: 1.2, op: 0.3, cond: function (X) { return X > x + w - 40; } });
    // cornice under the roof + floor bands
    s += S.box(x - 8, top - 2, w + 16, 16, P.cream, { w: 2.2, extra: 2.4, step: 40, hatch: 'b', hk: 0.5 });
    var floors = [top + 40, top + 145, top + 250, top + 355], gTop = GF - 150;
    floors = floors.filter(function (fy) { return fy + 80 < gTop - 10; });
    s += S.box(x, gTop - 14, w, 14, P.cream, { w: 2, extra: 2.2, step: 40 });
    var nWin = Math.round(w / 100);
    floors.forEach(function (fy, fi) {
      for (var i = 0; i < nWin; i++) {
        var wx = x + (w / nWin) * (i + 0.5) - 22, ww = 44, wh = 74;
        var glass = evening && (i + fi) % 3 === 0 ? P.amber : '#5a6a78';
        s += S.box(wx - 5, fy - 5, ww + 10, wh + 10, P.white, { w: 1.8, extra: 1.8, step: 30 });
        s += S.fillOnly(S.rect(wx, fy, ww, wh, 30, 0.4), glass);
        s += S.seg(wx + ww / 2, fy, wx + ww / 2, fy + wh, 2.4, P.white) + S.seg(wx, fy + wh * 0.38, wx + ww, fy + wh * 0.38, 2.4, P.white);
        s += S.line([[wx + 6, fy + 6], [wx + 14, fy + 26]], { w: 2.4, ta: 0.3, tb: 0.3 }, '#ffffff', ' opacity=".5"');
        // pediments on the first floor, flower boxes on some
        if (fi === floors.length - 1 || fi === 1) s += S.shape(S.poly([[wx - 10, fy - 8], [wx + ww + 10, fy - 8], [wx + ww / 2, fy - 28]], 12, 0.6), P.cream, { w: 1.8, extra: 1.8 });
        else s += S.box(wx - 8, fy - 14, ww + 16, 8, P.cream, { w: 1.6, extra: 1.6, step: 30 });
        if ((i + fi + h.x) % 3 === 0) {
          s += S.box(wx - 4, fy + wh + 2, ww + 8, 12, P.woodD, { w: 1.6, extra: 1.6, step: 30 });
          for (var f = 0; f < 4; f++) s += S.dot(wx + 2 + f * 13, fy + wh - 2 + (f % 2) * 3, 5, f % 2 ? P.red : '#e2a3a0') + S.dot(wx + 8 + f * 13, fy + wh + 1, 4, P.greenM);
        }
      }
    });
    // balcony on one house
    if (h.shop === 'cafe') {
      var by = floors[1] + 80;
      s += S.box(x + w / 2 - 90, by, 180, 12, P.cream, { w: 2, extra: 2.2, step: 30 });
      var BL = [];
      for (var bx = x + w / 2 - 84; bx <= x + w / 2 + 84; bx += 12) BL.push([[bx, by - 40], [bx, by]]);
      s += S.lines(BL, { w: 2, ta: 0.05, tb: 0.05 }, '#2c333b') + S.seg(x + w / 2 - 90, by - 42, x + w / 2 + 90, by - 42, 3, '#2c333b');
    }
    // ground floor
    var gx = x + 20, gw = w - 40;
    if (h.shop === 'baker' || h.shop === 'cafe') {
      var baker = h.shop === 'baker';
      s += S.box(gx, gTop + 20, gw, GF - gTop - 20, baker ? '#7b4a3a' : '#3f6329', { w: 2.6, extra: 3 });
      var win = S.rect(gx + 20, gTop + 70, gw * 0.55, GF - gTop - 84, 30, 0.6);
      s += S.fillOnly(win, evening ? '#f2c46a' : '#c9d6d2');
      s += '<g clip-path="url(#' + S.clip(win) + ')">' + (baker ? S.box(gx + 40, GF - 50, gw * 0.45, 30, '#e6d3a8', { w: 1.4, extra: 1, step: 30 }) +
        S.circ(gx + 70, GF - 58, 12, '#d9a15a', { w: 1.2, extra: 1 }) + S.circ(gx + 104, GF - 58, 12, '#d9a15a', { w: 1.2, extra: 1 }) + S.circ(gx + 138, GF - 58, 12, '#b8712f', { w: 1.2, extra: 1 }) :
        S.circ(gx + 80, GF - 50, 16, P.white, { w: 1.2, extra: 1 }) + S.circ(gx + 140, GF - 46, 14, P.white, { w: 1.2, extra: 1 })) + '</g>';
      s += S.shape(win, null, { w: 2.2, extra: 2 });
      s += S.box(gx + gw * 0.66, gTop + 64, gw * 0.26, GF - gTop - 64, baker ? '#5e3a2a' : '#2f4d26', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.2 });
      s += S.fillOnly(S.rect(gx + gw * 0.69, gTop + 80, gw * 0.2, 60, 20, 0.4), evening ? '#f2c46a' : '#c9d6d2');
      // sign board
      s += S.box(gx + 10, gTop - 6, gw - 20, 40, baker ? P.cream : '#2f4d26', { w: 2.4, extra: 2.6, step: 40 });
      s += S.T(x + w / 2, gTop + 25, baker ? 'BÄCKEREI' : 'CAFÉ AM ECK', { f: baker ? 'Fraunces' : 'Oswald', s: baker ? 32 : 26, a: 'middle', c: baker ? P.redD : P.cream, ls: baker ? 2 : 4 });
      // striped awning
      var aw = [[gx + 6, gTop + 36], [gx + gw - 6, gTop + 36], [gx + gw + 14, gTop + 84], [gx - 14, gTop + 84]];
      s += S.fillOnly(aw, baker ? P.cream : '#e6dcc0');
      var st = '', n = 12;
      for (var k = 0; k < n; k += 2) {
        var a0 = k / n, a1 = (k + 1) / n;
        st += 'M' + U.f1(gx + 6 + (gw - 12) * a0) + ' ' + (gTop + 36) + 'L' + U.f1(gx + 6 + (gw - 12) * a1) + ' ' + (gTop + 36) + 'L' + U.f1(gx - 14 + (gw + 28) * a1) + ' ' + (gTop + 84) + 'L' + U.f1(gx - 14 + (gw + 28) * a0) + ' ' + (gTop + 84) + 'Z';
      }
      s += '<path d="' + st + '" fill="' + (baker ? P.red : P.green) + '"/>';
      var sc = '';
      for (var q = 0; q <= n; q++) { var xx = gx - 14 + (gw + 28) * q / n; sc += (q ? 'L' : 'M') + U.f1(xx) + ' ' + (gTop + 84) + 'Q' + U.f1(xx + (gw + 28) / n / 2) + ' ' + (gTop + 100) + ' ' + U.f1(xx + (gw + 28) / n) + ' ' + (gTop + 84); }
      s += '<path d="' + sc + 'L' + (gx - 14) + ' ' + (gTop + 84) + 'Z" fill="' + (baker ? P.red : P.green) + '"/>';
      s += S.shape(aw, null, { w: 2.2, extra: 2.4 });
      if (baker) {
        s += S.line([[x + w - 10, gTop - 40], [x + w + 46, gTop - 40]], { w: 4, ta: 0.02, tb: 0.02, min: 0.8 });
        s += S.seg(x + w + 30, gTop - 40, x + w + 30, gTop - 26, 1.6);
        var pz = U.catmull([[x + w + 4, gTop - 14], [x + w + 14, gTop + 10], [x + w + 30, gTop + 16], [x + w + 46, gTop + 10], [x + w + 56, gTop - 14], [x + w + 40, gTop - 26], [x + w + 30, gTop - 6], [x + w + 20, gTop - 26]], 5, true);
        s += S.line(pz.concat([pz[0]]), { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line(pz.concat([pz[0]]), { w: 5, ta: 0.02, tb: 0.02, min: 0.9 }, '#c9a24a');
      } else {
        // café tables outside on the far pavement
        [x + 60, x + w - 70].forEach(function (tx) {
          s += S.seg(tx, GF - 44, tx, GF + 6, 3, '#2c333b') + S.shape(S.ellipse(tx, GF - 46, 30, 7, 16), '#e6dcc0', { w: 1.6, extra: 1.4 });
          s += S.box(tx + 30, GF - 40, 22, 40, '#2c333b', { w: 1.2, extra: 1, step: 20 });
        });
      }
    } else {
      // house door with arch + number
      var dx = x + w / 2 - 44;
      s += S.shape(U.catmull([[dx - 14, GF], [dx - 14, gTop + 60], [dx + 44, gTop + 20], [dx + 102, gTop + 60], [dx + 102, GF]], 6, false).concat([[dx - 14, GF]]), P.cream, { w: 2.2, extra: 2.4 });
      s += S.box(dx, gTop + 64, 88, GF - gTop - 64, '#5e3a2a', { w: 2.4, extra: 2.6, hatch: 'r', hk: 0.25 });
      s += S.seg(dx + 44, gTop + 70, dx + 44, GF, 2, '#2a1d12');
      s += S.box(dx + 26, gTop + 20, 36, 26, '#2c4a7a', { w: 1.4, extra: 1, step: 20 }) + S.T(dx + 44, gTop + 41, h.no, { f: 'Oswald', s: 18, a: 'middle', c: P.white });
      for (var gi = 0; gi < 2; gi++) {
        var wx2 = gi ? x + w - 110 : x + 30;
        s += S.box(wx2, gTop + 40, 80, 90, P.white, { w: 1.8, extra: 1.8, step: 30 });
        s += S.fillOnly(S.rect(wx2 + 6, gTop + 46, 68, 78, 30, 0.4), evening ? P.amber : '#5a6a78');
      }
    }
    return s;
  }

  function street(S) {
    var s = '';
    // far pavement
    s += S.fillOnly([[-20, GF], [1940, GF], [1940, GF + 26], [-20, GF + 26]], '#c9c2b0');
    s += S.line([[-20, GF], [1940, GF + 1]], { w: 3.4, ta: 0.02, tb: 0.02, min: 0.6 });
    s += S.line([[-20, GF + 26], [1940, GF + 27]], { w: 2.6, ta: 0.02, tb: 0.02, min: 0.6 });
    // cobbled road
    var road = [[-20, GF + 27], [1940, GF + 27], [1940, CURB], [-20, CURB]];
    s += S.fillOnly(road, '#8a8478');
    var arcs = [];
    for (var y = GF + 36, r = 0; y < CURB - 4; y += 11 + r * 2, r++) {
      var sp = 16 + r * 4;
      for (var x = -20 + (r % 2) * sp / 2; x < 1940; x += sp) arcs.push([[x, y + 4], [x + sp * 0.5, y - 1], [x + sp, y + 4]]);
    }
    s += S.lines(arcs, { w: 1.3, ta: 0.15, tb: 0.15, min: 0.4 }, '#3a3630', ' opacity=".55"');
    s += S.hatch(road, { ang: 0, gap: 6, w: 1, op: 0.25, cond: function (X, Y) { return Y < GF + 50; } });
    // kerb + near sidewalk slabs
    s += S.box(-20, CURB, 1960, 16, '#b8b2a2', { w: 3, extra: 3, step: 60 });
    var walk = [[-20, CURB + 16], [1940, CURB + 16], [1940, 1100], [-20, 1100]];
    s += S.fillOnly(walk, '#d9d3c2');
    var L = [];
    [CURB + 16, 880, 975].forEach(function (yy) { L.push([[-20, yy], [1940, yy + 0.5]]); });
    for (var bx = -2000; bx < 4000; bx += 210) L.push([[960 + (bx - 960) * 0.62, CURB + 16], [bx, 1100]]);
    s += S.lines(L, { w: 1.5, ta: 0.05, tb: 0.05, min: 0.5 }, P.ink, ' opacity=".35"');
    s += S.hatch(walk, { ang: 0, gap: 9, w: 1, op: 0.15, cond: function (X, Y) { return Y < 870; } });
    return s;
  }

  function tree(S) {
    var s = '', x = 150;
    s += S.box(x - 70, 900, 140, 18, '#6a6a62', { w: 2, extra: 2, step: 30 });
    s += S.line(U.catmull([[x + 4, 905], [x - 6, 700], [x + 10, 480], [x - 4, 300]], 6, false), { w: 30, ta: 0.02, tb: 0.4, min: 0.5 }, '#5e3f22');
    s += S.line([[x + 4, 520], [x + 90, 400]], { w: 12, ta: 0.05, tb: 0.6, min: 0.3 }, '#5e3f22');
    s += S.hatch(S.rect(x - 10, 300, 26, 600), { ang: 80, gap: 6, w: 1.1, op: 0.5, cond: function (X) { return X > x + 4; } });
    // canopy: clusters of leaf blobs
    var blobs = [[x - 40, 170, 140], [x + 110, 210, 130], [x - 120, 290, 110], [x + 40, 320, 120], [x + 190, 330, 90], [x - 20, 60, 110]];
    blobs.forEach(function (b, i) {
      var pts = [];
      for (var k = 0; k < 18; k++) { var a = k / 18 * Math.PI * 2, rr = b[2] * (0.85 + 0.2 * Math.sin(k * 2.7 + i)); pts.push([b[0] + rr * Math.cos(a), b[1] + rr * 0.8 * Math.sin(a)]); }
      pts = U.catmull(pts, 3, true);
      s += S.shape(pts, [P.greenM, '#5f8c3c', P.green, '#7aa04f'][i % 4], { w: 2.2, extra: 2.6 });
      s += S.hatch(pts, { ang: 50, gap: 7, w: 1.1, op: 0.45, cond: function (X, Y) { return (X - b[0]) * 0.5 + (Y - b[1]) > b[2] * 0.25; } });
    });
    return s;
  }

  function lamppostBike(S) {
    var s = '', x = 1640, base = 960;
    s += S.floorShadow(x + 20, base + 4, 70, 10, 0.25);
    s += S.box(x - 22, base - 50, 44, 50, '#2f4d3a', { w: 2.4, extra: 2.6, step: 20 });
    s += S.line([[x, base - 50], [x, 250]], { w: 16, ta: 0.02, tb: 0.02, min: 0.7 }, '#2f4d3a');
    s += S.line([[x - 5, base - 60], [x - 5, 270]], { w: 3, ta: 0.1, tb: 0.1 }, '#ffffff', ' opacity=".3"');
    // lantern
    s += S.line(U.catmull([[x, 260], [x + 20, 210], [x + 60, 200]], 5, false), { w: 6, ta: 0.05, tb: 0.05 }, '#2f4d3a');
    var lan = S.poly([[x + 40, 200], [x + 84, 200], [x + 96, 250], [x + 28, 250]], 12, 0.5);
    s += S.shape(lan, '#e6dcc0', { w: 2.4, extra: 2.6 });
    s += S.shape(S.poly([[x + 32, 200], [x + 92, 200], [x + 62, 180]], 10, 0.4), '#2f4d3a', { w: 2, extra: 2 });
    // street sign
    s += S.box(x - 120, 330, 240, 46, '#2c4a7a', { w: 2.6, extra: 3 });
    s += S.shape(S.rect(x - 112, 336, 224, 34, 30, 0.4), null, { w: 1.4, extra: 0.4, color: P.white });
    s += S.T(x, 362, 'Goethestraße', { f: 'Oswald', s: 24, a: 'middle', c: P.white, ls: 1 });
    // orange bin
    s += S.box(x + 8, 600, 70, 100, '#d9773a', { w: 2.4, extra: 2.8, hatch: 'r', hk: 0.3 });
    s += S.box(x + 4, 594, 78, 12, '#c4612a', { w: 1.8, extra: 1.8, step: 20 });
    // bicycle leaning on the post (left of it)
    var g = 948, wr = 78, w1 = [x - 330, g - wr], w2 = [x - 80, g - wr];
    function wheel(c) {
      var r = S.circ(c[0], c[1], wr, null, { w: 4, extra: 2 }) + S.circ(c[0], c[1], wr - 8, null, { w: 1.6, extra: 0.6 });
      var sp = [];
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; sp.push([[c[0], c[1]], [c[0] + (wr - 8) * Math.cos(a), c[1] + (wr - 8) * Math.sin(a)]]); }
      return r + S.lines(sp, { w: 1, ta: 0.05, tb: 0.05 }, P.ink, ' opacity=".7"') + S.circ(c[0], c[1], 7, '#9a9d96', { w: 1.2, extra: 1 });
    }
    s += wheel(w1) + wheel(w2);
    var bb = [x - 200, g - wr + 4], seat = [x - 236, g - 220], head = [x - 116, g - 232];
    var frame = [[w1, bb], [bb, seat], [seat, w1], [seat, head], [head, bb], [head, w2]];
    frame.forEach(function (f) { s += S.line([f[0], f[1]], { w: 9, ta: 0.02, tb: 0.02, min: 0.9 }) + S.line([f[0], f[1]], { w: 5, ta: 0.02, tb: 0.02, min: 0.9 }, '#c43d33'); });
    s += S.shape(S.rrect(seat[0] - 30, seat[1] - 16, 60, 14, 7), '#3b2a24', { w: 1.8, extra: 1.8 });
    s += S.line(U.catmull([[head[0], head[1]], [head[0] + 14, head[1] - 30], [head[0] + 50, head[1] - 34]], 5, false), { w: 6, ta: 0.05, tb: 0.05 });
    s += S.box(w2[0] - 30, g - wr * 2 - 30, 70, 40, '#a07a4a', { w: 2, extra: 2.2, step: 20 }); // basket
    s += S.circ(bb[0], bb[1], 12, '#9a9d96', { w: 1.6, extra: 1.2 });
    return s;
  }

  K.define('street-day', {
    seed: 97,
    variants: ['', 'evening'],
    slots: {
      left: K.slot(560, 988, 1.08, { face: 1 }), center: K.slot(960, 990, 1.08), right: K.slot(1340, 988, 1.08, { face: -1 }),
      bike: K.slot(1180, 975, 1.04, { face: 1 }),          // next to the bicycle
      tree: K.slot(300, 985, 1.06, { face: 1 }),           // under the tree
      across: K.slot(700, 712, 0.42, { face: 1 })          // far pavement, in front of the bakery
    },
    build: function (opts) {
      var ev = opts.variant === 'evening';
      return {
        bg: function (S) {
          var s = sky(S, ev);
          HOUSES.forEach(function (h) { s += house(S, h, ev); });
          s += street(S) + tree(S) + lamppostBike(S);
          if (ev) s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.linear([[0, '#f0a35a', 0.18], [1, '#5a2a40', 0.18]], 0, 0, 1, 1) + '"/>';
          s += '<rect x="0" y="0" width="1920" height="1080" fill="' + S.radial([[0.6, '#3a2a18', 0], [1, '#3a2a18', 0.22]], { cx: '50%', cy: '45%', r: '75%' }) + '"/>';
          return s;
        }
      };
    }
  });
})(typeof self !== 'undefined' ? self : this);
